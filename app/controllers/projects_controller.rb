class ProjectsController < ApplicationController
  include DomainForms

  def index
    authorize Project
    scope = policy_scope(Project)
    query = params[:q].to_s.first(160)
    scope = scope.where("name ILIKE :term OR client_name ILIKE :term", term: "%#{Project.sanitize_sql_like(query)}%") if query.present?
    scope = scope.where(client_id: params[:client_id]) if params[:client_id].present?
    scope = scope.where(status: params[:status]) if %w[active archived].include?(params[:status])
    sort = { "updated" => { updated_at: :desc, id: :desc }, "name" => { name: :asc, id: :asc }, "oldest" => { created_at: :asc, id: :asc } }.fetch(params[:sort], { updated_at: :desc, id: :desc })
    page = [ params[:page].to_i, 1 ].max
    render inertia: "projects/index", props: {
      projects: scope.order(sort).offset((page - 1) * 20).limit(20).map { |project| ProjectPresenter.project(project) },
      total: scope.count, page: page, filters: { q: query, status: params[:status].to_s, sort: params[:sort].presence || "updated" }
    }
  end

  def new
    authorize Project
    render inertia: "projects/form", props: { project: nil, clients: current_user.clients.kept.order(:name).as_json(only: %i[id name]), selected_client_id: params[:client_id], schema: RenderingPresenter.schema }
  end

  def create
    authorize Project
    attributes = project_params
    attributes[:settings] = Rendering::Settings.validate!(current_user.render_defaults, complete: true).merge(attributes[:settings] || {})
    project = current_user.projects.create!(attributes)
    redirect_to project_path(project), notice: "Projeto criado.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(new_project_path, error)
  end

  def edit
    project = scoped_project
    authorize project
    render inertia: "projects/form", props: { project: ProjectPresenter.project(project), clients: current_user.clients.where("deleted_at IS NULL OR id = ?", project.client_id).order(:name).as_json(only: %i[id name deleted_at]), selected_client_id: project.client_id, schema: RenderingPresenter.schema }
  end

  def show
    project = scoped_project
    authorize project
    output_page = [ params[:outputs_page].to_i, 1 ].max
    output_scope = policy_scope(RenderOutput).joins(:render_job).where(render_jobs: { project_id: project.id })
    versions = project.project_versions.with_attached_original_file.order(version_number: :desc)
    version = params[:version_id].present? ? versions.find(params[:version_id]) : versions.first
    render inertia: params[:version_id].present? || params[:advanced] == "1" ? "projects/show" : "projects/workspace", props: {
      files: project.project_files.kept.includes(:project_versions).order(updated_at: :desc).map { |file| file.as_json(only: %i[id name primary]).merge("revisions" => file.project_versions.map { |version| { id: version.id, revision: version.file_revision, format: version.format } }) },
      experiences: project.project_experiences.includes(:project_file, :project_version, :render_batch, :project).order(id: :desc).limit(30).map { |experience| ProjectExperiencePresenter.call(experience) },
      outputs_total: output_scope.count, outputs_page: output_page,
      outputs: output_scope.includes(:file_attachment, render_job: [ :project, :environment, :project_version ]).order(id: :desc).offset((output_page-1)*20).limit(20).map { |output| OutputPresenter.call(output) },
      presets: policy_scope(RenderPreset).order(system: :desc, name: :asc).map { |item| RenderingPresenter.preset(item) },
      gemini_enabled: Rendering::GeminiSuggestion.enabled?, blender_render_enabled: ENV["BLENDER_RENDER_ENABLED"] == "true",
      project: ProjectPresenter.project(project), environments: project.environments.kept.ordered.map { |environment| ProjectPresenter.environment(environment) },
      versions: versions.map { |item| ProjectPresenter.version(item).except("metadata") },
      selected_version: ProjectPresenter.version(version, reference_types: true),
      processing_history: policy_scope(RenderBatch).where(project: project).includes(:project_version).order(id: :desc).limit(20).map { |batch| batch.as_json(only: %i[id status progress created_at]).merge("version_number" => batch.project_version.version_number) },
      materials: policy_scope(Material).order(:name).map { |item| RenderingPresenter.material(item) },
      material_mappings: version ? version.material_mappings.includes(:material).map { |item| RenderingPresenter.mapping(item) } : [],
      schema: RenderingPresenter.schema,
      associations: version ? version.environment_versions.map { |association| ProjectPresenter.association(association) } : []
    }
  end

  def update
    project = scoped_project
    authorize project
    project.update!(project_params)
    redirect_to project_path(project), notice: "Projeto atualizado.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(edit_project_path(params[:id]), error)
  end

  def archive
    project = scoped_project
    authorize project
    project.archive!
    redirect_to project_path(project), notice: "Projeto arquivado.", status: :see_other
  end

  def duplicate
    project = scoped_project
    authorize project
    copy = Projects::Duplicate.call(project)
    redirect_to project_path(copy), notice: "Projeto duplicado sem copiar os arquivos 3D.", status: :see_other
  end

  def destroy
    project = scoped_project
    authorize project
    project.discard!
    redirect_to projects_path, notice: "Projeto excluído. Os vínculos históricos foram preservados.", status: :see_other
  end

  private

  def project_params
    permitted = params.require(:project).permit(:name, :description, :client_name, :client_id).to_h
    permitted["client_name"] = nil if permitted.key?("client_id") && permitted["client_id"].blank?
    if permitted["client_id"].present?
      client = current_user.clients.find(permitted["client_id"]); permitted["client_name"] = client.name
    end
    permitted[:settings] = Rendering::Settings.validate!(settings_from(params[:project][:settings])) if params[:project].key?(:settings)
    permitted
  end
end
