module ProjectVersions
  class Create
    def self.call(project, upload:, description: nil, project_file: nil)
      inspection = InspectUpload.call(upload)
      blob = ActiveStorage::Blob.create_and_upload!(io: upload.tempfile, filename: upload.original_filename,
        content_type: inspection.fetch(:content_type), identify: false)
      project.with_lock do
        raise ArgumentError, "Projeto excluído ou arquivado" if project.deleted_at || project.status == "archived"
        if project_file
          raise ArgumentError, "Arquivo fora deste projeto ou arquivado" unless project_file.project_id == project.id && project_file.deleted_at.nil?
        else
          project_file = project.project_files.create!(name: upload.original_filename.to_s.first(160))
          project_file.update!(primary: true) if project.project_files.kept.count == 1
        end
        revision = project_file.project_versions.maximum(:file_revision).to_i + 1
        version = project.project_versions.build(inspection.except(:content_type).merge(
          project_file: project_file, file_revision: revision, version_number: project.project_versions.maximum(:version_number).to_i + 1, description: description))
        version.original_file.attach(blob)
        version.save!
        version
      end
    rescue StandardError
      blob&.purge if blob&.persisted? && !blob.attachments.exists?
      raise
    end
  end
end
