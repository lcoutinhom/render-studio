class OutputPresenter
  def self.call(output)
    job = output.render_job
    { id: output.id, kind: output.kind, filename: output.filename, content_type: output.content_type, byte_size: output.byte_size,
      checksum: output.checksum, created_at: output.created_at, metadata: output.metadata,
      job_id: job.id, batch_id: job.render_batch_id, attempt: job.attempt, status: job.status,
      project_id: job.project_id, project_name: job.project.name, environment_id: job.environment_id,
      environment_name: job.snapshot.dig("environment", "name") || job.environment.name,
      file_id: job.project_version.project_file_id, file_revision: job.project_version.file_revision, file_name: job.project_version.project_file&.name, version_id: job.project_version_id, version_number: job.snapshot["version_number"],
      preview_url: output.previewable? ? "/outputs/#{output.id}/preview" : nil, download_url: "/outputs/#{output.id}/download" }
  end
end
