class EnvironmentVersionsController < ApplicationController
  include DomainForms

  def update
    project = scoped_project
    environment = project.environments.kept.find(params[:environment_id])
    authorize environment, :update?
    version = project.project_versions.find(params[:version_id])
    association = environment.environment_versions.find_or_initialize_by(project_version: version)
    association.project = project
    raw = params.require(:association)
    source = settings_from(raw[:source_reference])
    bbox = raw[:bounding_box].present? ? settings_from(raw[:bounding_box]) : nil
    association.update!(source_reference: source, bounding_box: bbox, metadata: { "association_method" => "manual", "associated_by" => current_user.id },
      status: raw[:status].presence || "pending")
    redirect_to project_environment_path(project, environment, version_id: version.id), notice: "Associação desta versão atualizada.", status: :see_other
  rescue ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(project_environment_path(params[:project_id], params[:environment_id], version_id: params[:version_id]), error)
  end
end
