class RenderPreferencesController < ApplicationController
  include DomainForms
  def update
    project = scoped_project
    authorize project, :update?
    target = if params[:environment_id].present?
      environment = project.environments.kept.find(params[:environment_id])
      params[:version_id].present? ? environment.environment_versions.find_by!(project_version_id: project.project_versions.find(params[:version_id]).id) : environment
    else
      project
    end
    project.with_lock { target.update!(settings: Rendering::Settings.validate!(settings_from(params[:settings]))) }
    redirect_to destination(project), notice: "Configurações salvas.", status: :see_other
  rescue ArgumentError, ActiveRecord::RecordInvalid => error
    form_error(destination(params[:project_id]), error)
  end
  private
  def destination(project)
    if params[:environment_id].present?
      project_environment_path(project, params[:environment_id], version_id: params[:version_id])
    else
      project_path(project)
    end
  end
end
