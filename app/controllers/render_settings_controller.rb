class RenderSettingsController < ApplicationController
  include DomainForms
  rate_limit to: 5, within: 1.minute, only: :suggest, by: -> { current_user.id }, with: -> { render json: { error: "Aguarde um minuto antes de pedir mais sugestões." }, status: :too_many_requests }
  def show
    authorize current_user, :show?
    render inertia: "render_settings/show", props: { schema: RenderingPresenter.schema, settings: Rendering::Settings.validate!(current_user.render_defaults, complete: true), presets: presets }
  end
  def update
    authorize current_user, :show?
    values = normalize
    if params[:project_id]
      project = scoped_project; authorize project, :update?; project.update!(settings: values)
      redirect_back fallback_location: project_path(project), notice: "Configurações do projeto salvas.", status: :see_other
    else
      current_user.update!(render_defaults: values)
      redirect_to render_defaults_path, notice: "Padrão salvo. Novos projetos herdarão estes valores; projetos existentes permanecem como estão.", status: :see_other
    end
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(params[:project_id] ? project_path(params[:project_id]) : render_defaults_path, error)
  end
  def validate_document
    authorize current_user, :show?
    render json: Rendering::SettingsDocument.dump(Rendering::SettingsDocument.load(params[:document].is_a?(ActionController::Parameters) ? params[:document].to_unsafe_h : params[:document]))
  rescue ArgumentError => error
    render json: { error: error.message }, status: :unprocessable_content
  end
  def export
    authorize current_user, :show?
    values = params[:project_id] ? scoped_project.settings : current_user.render_defaults
    send_data JSON.pretty_generate(Rendering::SettingsDocument.dump(values)), type: "application/json", filename: "render-settings.json", disposition: "attachment"
  end
  def suggest
    project = scoped_project; authorize project, :update?
    raw = params.dig(:configuration, :settings)
    render json: Rendering::GeminiSuggestion.call(description: params[:description], settings: settings_from(raw))
  rescue Rendering::GeminiSuggestion::Error, ArgumentError => error
    render json: { error: error.message }, status: :unprocessable_content
  end
  def preset
    project = scoped_project; authorize project, :update?
    RenderPreset.create!(user: current_user, name: params[:name], category: "custom", system: false, settings: Rendering::Settings.validate!(settings_from(params[:settings]), complete: true))
    redirect_back fallback_location: project_path(project), notice: "Preset salvo para reutilizar.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(project_path(params[:project_id]), error)
  end
  private
  def normalize
    params[:document] ? Rendering::SettingsDocument.load(params[:document].is_a?(ActionController::Parameters) ? params[:document].to_unsafe_h : params[:document]) : Rendering::Settings.validate!(settings_from(params[:settings]), complete: true)
  end
  def presets = policy_scope(RenderPreset).order(system: :desc, name: :asc).map { |item| RenderingPresenter.preset(item) }
end
