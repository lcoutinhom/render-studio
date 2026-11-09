module Projects
  class Duplicate
    def self.call(project)
      project.with_lock do
        copy = project.dup
        copy.assign_attributes(name: "#{project.name.first(150)} (cópia)", status: "active", archived_at: nil, deleted_at: nil)
        copy.save!
        files = project.project_files.index_with do |file|
          cloned = file.dup; cloned.project = copy; cloned.save!; cloned
        end
        environments = project.environments.kept.index_with do |environment|
          new_environment = environment.dup
          new_environment.project_file = files[environment.project_file] if environment.project_file
          new_environment.assign_attributes(project: copy, stable_id: SecureRandom.uuid)
          new_environment.save!
          new_environment
        end
        project.project_versions.order(:version_number).each do |version|
          new_version = version.dup
          new_version.project = copy
          new_version.project_file = files[version.project_file] if version.project_file
          new_version.original_file.attach(version.original_file.blob) if version.original_file.attached?
          new_version.save!
          version.environment_versions.each do |association|
            next unless (target = environments[association.environment])
            cloned = association.dup
            cloned.assign_attributes(project: copy, project_version: new_version, environment: target)
            cloned.save!
          end
          version.render_cameras.kept.each do |camera|
            next unless (target = environments[camera.environment])
            cloned = camera.dup
            cloned.assign_attributes(project: copy, project_version: new_version, environment: target)
            cloned.save!
          end
          version.material_mappings.each do |mapping|
            target = mapping.environment_id ? environments[mapping.environment] : nil
            next if mapping.environment_id && !target
            cloned = mapping.dup
            cloned.assign_attributes(project: copy, project_version: new_version, environment: target)
            cloned.save!
          end
        end
        copy
      end
    end
  end
end
