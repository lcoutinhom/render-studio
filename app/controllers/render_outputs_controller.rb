class RenderOutputsController < ApplicationController
  FILTERS = %w[project_id environment_id version_id job_id batch_id kind status].freeze
  def index
    authorize RenderOutput
    outputs = policy_scope(RenderOutput).joins(:render_job).includes(:file_attachment, render_job: [ :project, :environment ])
    filters = params.permit(*FILTERS).to_h
    { "project_id" => :project_id, "environment_id" => :environment_id, "version_id" => :project_version_id, "job_id" => :id, "batch_id" => :render_batch_id }.each do |key, column|
      outputs = outputs.where(render_jobs: { column => filters[key] }) if filters[key].present?
    end
    outputs = outputs.where(kind: filters["kind"]) if filters["kind"].present?
    outputs = outputs.where(render_jobs: { status: filters["status"] }) if filters["status"].present?
    page = [ params[:page].to_i, 1 ].max
    total = outputs.count
    projects = current_user.projects.order(:name)
    environments = Environment.where(project_id: projects.select(:id))
    versions = ProjectVersion.where(project_id: projects.select(:id)).includes(:project)
    render inertia: "outputs/index", props: { outputs: outputs.order(id: :desc).offset((page - 1) * 24).limit(24).map { |output| OutputPresenter.call(output) },
      total: total, page: page, filters: filters,
      projects: projects.map { |project| { id: project.id, name: project.deleted_at ? "#{project.name} (excluído)" : project.name } },
      environments: environments.order(:name).map { |environment| { id: environment.id, name: environment.name, project_id: environment.project_id } },
      versions: versions.order(version_number: :desc).map { |version| { id: version.id, project_id: version.project_id, name: "#{version.project.name} · v#{version.version_number}" } } }
  end
  def show
    output = policy_scope(RenderOutput).find(params[:id])
    authorize output
    render inertia: "outputs/show", props: { output: OutputPresenter.call(output), snapshot: output.render_job.snapshot }
  end
  def preview
    stream_file(inline: true)
  end
  def download
    stream_file(inline: false)
  end
  private
  def stream_file(inline:)
    output = policy_scope(RenderOutput).find(params[:id])
    authorize output, inline ? :preview? : :download?
    raise ActiveRecord::RecordNotFound unless output.file.attached? && (!inline || output.previewable?)
    blob = output.file.blob
    response.headers["Content-Type"] = output.content_type
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Disposition"] = ActionDispatch::Http::ContentDisposition.format(disposition: inline ? "inline" : "attachment", filename: output.filename)
    # Byte ranges keep large video playback/seeking private, without loading the full file.
    ranges = Rack::Utils.get_byte_ranges(request.headers["Range"], blob.byte_size)
    if request.headers["Range"].present?
      unless ranges&.one?
        response.headers["Content-Range"] = "bytes */#{blob.byte_size}"
        return head :range_not_satisfiable
      end
      range = ranges.first
      response.status = :partial_content
      response.headers["Content-Range"] = "bytes #{range.begin}-#{range.end}/#{blob.byte_size}"
      response.headers["Content-Length"] = range.size.to_s
      self.response_body = Enumerator.new do |body|
        position = range.begin
        while position <= range.end
          last = [ position + 1.megabyte - 1, range.end ].min
          body << blob.download_chunk(position..last)
          position = last + 1
        end
      end
    else
      response.headers["Content-Length"] = blob.byte_size.to_s
      self.response_body = Enumerator.new { |body| blob.download { |chunk| body << chunk } }
    end
    response.headers["Accept-Ranges"] = "bytes"
  end
end
