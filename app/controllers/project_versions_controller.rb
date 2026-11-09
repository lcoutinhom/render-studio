class ProjectVersionsController < ApplicationController
  include DomainForms

  def index
    project = scoped_project
    authorize project, :show?
    policy_scope(Project)
    redirect_to project_path(project, anchor: "versions")
  end

  def create
    project = scoped_project
    authorize project, :update?
    version = ProjectVersions::Create.call(project, upload: params.dig(:version, :file), description: params.dig(:version, :description))
    redirect_to project_path(project, version_id: version.id), notice: "Versão enviada. Associe os ambientes presentes neste modelo.", status: :see_other
  rescue ProjectVersions::InspectUpload::Invalid, ActiveRecord::RecordInvalid, ArgumentError => error
    form_error(project_path(params[:project_id]), error)
  end

  def download
    project = scoped_project
    version = project.project_versions.find(params[:id])
    authorize version
    raise ActiveRecord::RecordNotFound unless version.original_file.attached?
    blob = version.original_file.blob
    response.headers["Content-Type"] = blob.content_type
    response.headers["Content-Length"] = blob.byte_size.to_s
    response.headers["Content-Disposition"] = ActionDispatch::Http::ContentDisposition.format(disposition: "attachment", filename: blob.filename.to_s)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    self.response_body = Enumerator.new { |output| blob.download { |chunk| output << chunk } }
  end
end
