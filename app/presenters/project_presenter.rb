class ProjectPresenter
  def self.project(project)
    project.as_json(only: %i[id name description client_name client_id status settings archived_at created_at updated_at]).merge("client_archived" => project.client&.deleted_at.present?)
  end

  def self.environment(environment)
    environment.as_json(only: %i[id stable_id project_id name description environment_type custom_type status position settings])
  end

  def self.version(version, reference_types: false)
    return nil unless version
    data = version.as_json(only: %i[id version_number project_file_id file_revision description format checksum metadata created_at])
    data["metadata"] = version.metadata.merge(ProjectVersions::ReferenceCatalog.call(version)) if reference_types
    if version.original_file.attached?
      data["file"] = { "name" => version.original_file.filename.to_s, "size" => version.original_file.byte_size,
        "url" => Rails.application.routes.url_helpers.download_project_version_path(version.project_id, version.id) }
    end
    data
  end

  def self.association(association)
    association.as_json(only: %i[id environment_id project_version_id status source_reference bounding_box metadata settings])
  end
end
