class RenderConfigurationsController < ApplicationController
  include DomainForms
  rate_limit to: 20, within: 1.minute, only: :create, by: -> { current_user.id }, with: -> { redirect_to renderings_path, alert: "Aguarde um minuto antes de criar mais renderizações.", status: :see_other }
  rate_limit to: 5, within: 1.minute, only: :suggest, by: -> { current_user.id }, with: -> { render json: { error: "Aguarde um minuto antes de pedir mais sugestões." }, status: :too_many_requests }
  def suggest
    authorize RenderConfiguration, :create?
    raw = params.require(:configuration)
    project, version, preset = selection(raw)
    snapshot = Rendering::Resolve.call(project: project, version: version, preset: preset, environment_ids: raw[:environment_ids], settings: settings_from(raw[:settings]), camera_ids: Array(raw[:camera_ids]))
    render json: Rendering::GeminiSuggestion.call(description: params[:description], settings: snapshot.fetch("environments").first.fetch("effective_settings"))
  rescue Rendering::GeminiSuggestion::Error => error
    render json: { error: error.message }, status: :service_unavailable
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    render json: { error: error.message }, status: :unprocessable_content
  end
  def index
    authorize RenderConfiguration
    scope = policy_scope(RenderConfiguration).includes(:project, :project_version).order(created_at: :desc)
    render inertia: "renderings/index", props: { configurations: scope.limit(100).map { |item| item.as_json(only: %i[id name mode created_at]).merge("project_name" => item.project.name, "version_number" => item.project_version.version_number, "environment_count" => item.snapshot.fetch("environments").size) } }
  end
  def new
    authorize RenderConfiguration
    render_form
  end
  def edit
    configuration = policy_scope(RenderConfiguration).find(params[:id])
    authorize configuration, :update?
    render_form(configuration)
  end
  def create
    authorize RenderConfiguration
    raw = params.require(:configuration)
    project, version, preset = selection(raw)
    previous = raw[:previous_configuration_id].present? ? policy_scope(RenderConfiguration).find(raw[:previous_configuration_id]) : nil
    if raw[:start_rendering] == true || raw[:start_rendering] == "1"
      batch = Rendering::CreateAndSubmit.call(user: current_user, project: project, version: version, preset: preset,
        environment_ids: raw[:environment_ids], settings: settings_from(raw[:settings]), camera_ids: Array(raw[:camera_ids]),
        name: raw[:name], mode: raw[:mode], previous: previous, idempotency_key: raw[:submission_key], adapter: raw[:adapter].presence || "blender")
      redirect_to render_batch_path(batch), notice: batch.adapter == "blender" ? "Tudo pronto! Seu render está na fila. Acompanhe os ambientes abaixo." : "Simulação enviada. Nenhum arquivo será produzido.", status: :see_other
    else
      configuration = Rendering::CreateConfiguration.call(user: current_user, project: project, version: version, preset: preset,
        environment_ids: raw[:environment_ids], settings: settings_from(raw[:settings]), camera_ids: Array(raw[:camera_ids]),
        name: raw[:name], mode: raw[:mode], previous: previous)
      redirect_to rendering_path(configuration), notice: "Configuração salva para usar depois.", status: :see_other
    end
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(new_rendering_path(project_id: params.dig(:configuration, :project_id), version_id: params.dig(:configuration, :project_version_id)), error)
  end
  def preview
    authorize RenderConfiguration, :create?
    raw = params.require(:configuration)
    project, version, preset = selection(raw)
    snapshot = Rendering::Resolve.call(project: project, version: version, preset: preset, environment_ids: raw[:environment_ids],
      settings: settings_from(raw[:settings]), camera_ids: Array(raw[:camera_ids]))
    render json: { snapshot: snapshot }
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    render json: { error: error.message }, status: :unprocessable_content
  end
  def show
    configuration = policy_scope(RenderConfiguration).find(params[:id])
    authorize configuration
    render inertia: "renderings/show", props: { configuration: configuration.as_json(only: %i[id name mode snapshot created_at]), blender_render_enabled: ENV["BLENDER_RENDER_ENABLED"] == "true", schema: RenderingPresenter.schema, submission_key: SecureRandom.uuid, batches: configuration.render_batches.order(id: :desc).limit(20).map { |batch| batch.as_json(only: %i[id status progress created_at adapter]) } }
  end
  def preset
    configuration = policy_scope(RenderConfiguration).find(params[:id])
    authorize configuration, :show?
    environment = configuration.snapshot.fetch("environments").find { |item| item["environment_id"].to_s == params[:environment_id].to_s }
    raise ArgumentError, "Escolha um ambiente da configuração" unless environment
    RenderPreset.create!(user: current_user, name: params[:name], category: "custom", settings: environment.fetch("effective_settings"))
    redirect_to rendering_path(configuration), notice: "Configurações do ambiente salvas como preset pessoal.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(rendering_path(params[:id]), error)
  end
  private
  def selection(raw)
    project = policy_scope(Project).find(raw[:project_id])
    version = project.project_versions.find(raw[:project_version_id])
    preset = raw[:render_preset_id].present? ? policy_scope(RenderPreset).find(raw[:render_preset_id]) : nil
    [ project, version, preset ]
  end
  def render_form(configuration = nil)
    projects = policy_scope(Project).where(status: "active").order(:name).to_a
    project_id = params[:project_id].presence || configuration&.project_id
    project = project_id ? projects.find { |item| item.id.to_s == project_id.to_s } : projects.first
    raise ActiveRecord::RecordNotFound if project_id && !project
    versions = project ? project.project_versions.with_attached_original_file.order(version_number: :desc).to_a : []
    version_id = params[:version_id].presence || configuration&.project_version_id
    version = version_id ? versions.find { |item| item.id.to_s == version_id.to_s } : versions.first
    raise ActiveRecord::RecordNotFound if version_id && !version
    environments = project ? project.environments.kept.ordered.to_a : []
    associations = version ? version.environment_versions.index_by(&:environment_id) : {}
    available_cameras = version ? RenderCamera.kept.where(project_version: version).map { |item| RenderingPresenter.camera(item) } : []
    visible_presets = policy_scope(RenderPreset).order(system: :desc, name: :asc).map { |item| RenderingPresenter.preset(item) }
    initial = configuration&.as_json(only: %i[id name mode settings camera_ids render_preset_id])&.merge("environment_ids" => configuration.snapshot.fetch("environments").map { |item| item["environment_id"] })
    warning = nil
    if initial
      valid_camera_ids = available_cameras.select { |camera| camera["available"] }.map { |camera| camera["id"] }
      initial["camera_ids"] &= valid_camera_ids
      if version&.id != configuration.project_version_id || initial["camera_ids"] != configuration.camera_ids
        warning = "A versão ou as referências mudaram. Ambientes e câmeras indisponíveis foram desmarcados; revise associações, câmeras e a trajetória antes de salvar a nova revisão."
      end
      unless visible_presets.any? { |preset| preset["id"] == initial["render_preset_id"] }
        initial["render_preset_id"] = nil
      end
    end
    render inertia: "renderings/form", props: { projects: projects.map { |item| ProjectPresenter.project(item) }, project: project && ProjectPresenter.project(project), versions: versions.map { |item| ProjectPresenter.version(item).except("metadata") }, selected_version: version && ProjectPresenter.version(version, reference_types: true),
      environments: environments.map { |environment| ProjectPresenter.environment(environment).merge("association_settings" => associations[environment.id]&.settings || {}, "eligible" => environment.status == "active" && associations[environment.id]&.status == "validated") },
      presets: visible_presets,
      cameras: available_cameras,
      materials: version ? version.material_mappings.includes(:material).map { |item| RenderingPresenter.mapping(item) } : [],
      gemini_enabled: Rendering::GeminiSuggestion.enabled?, blender_render_enabled: ENV["BLENDER_RENDER_ENABLED"] == "true", schema: RenderingPresenter.schema, guided_profiles: Rendering::GuidedProfiles.all, submission_key: SecureRandom.uuid, initial: initial, initial_warning: warning,
      initial_stage: params[:stage].to_i.clamp(0, 9), selected_environment_ids: Array(params[:environment_ids]).map(&:to_i) }
  end
end
