class ProjectExperiencePresenter
  def self.call(experience)
    primary = experience.project.project_files.kept.find_by(primary: true)
    latest = primary&.project_versions&.order(file_revision: :desc)&.first
    { id: experience.id, kind: experience.kind, file_name: experience.project_file.name,
      revision: experience.project_version.file_revision, status: experience.render_batch.status,
      progress: experience.render_batch.progress, batch_id: experience.render_batch_id,
      update_available: latest&.id != experience.project_version_id,
      created_at: experience.created_at.iso8601 }
  end
end
