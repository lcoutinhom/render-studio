module Rendering
  class CreateConfiguration
    def self.call(user:, project:, version:, environment_ids:, settings:, camera_ids: [], preset: nil, name:, mode:, previous: nil, request_metadata: nil)
      raise ArgumentError, "Projeto pertence a outro usuário" unless project.user_id == user.id
      project.with_lock do
        snapshot = Resolve.call(project: project, version: version, environment_ids: environment_ids,
          settings: settings, preset: preset, camera_ids: camera_ids)
        snapshot["file_request"] = request_metadata if request_metadata
        configuration = RenderConfiguration.create!(user: user, project: project, project_version: version,
          render_preset: preset, previous_configuration: previous, name: name, mode: mode,
          settings: Settings.validate!(settings), camera_ids: camera_ids.map(&:to_i), snapshot: snapshot)
        snapshot.fetch("environments").each do |environment|
          configuration.render_configuration_environments.create!(environment_version_id: environment.fetch("environment_version_id"), project_version: version)
        end
        configuration
      end
    end
  end
end
