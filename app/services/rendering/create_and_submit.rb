module Rendering
  class CreateAndSubmit
    def self.call(user:, project:, version:, environment_ids:, settings:, camera_ids:, preset:, name:, mode:, previous:, idempotency_key:, adapter:)
      raise ArgumentError, "Chave de envio inválida; recarregue a página" unless idempotency_key.is_a?(String) && idempotency_key.match?(/\A[a-zA-Z0-9_-]{16,128}\z/)
      normalized = Settings.validate!(settings)
      user.with_lock do
        if (existing = RenderBatch.find_by(user: user, idempotency_key: idempotency_key))
          configuration = existing.render_configuration
          same = configuration.project_id == project.id && configuration.project_version_id == version.id && configuration.name == name && configuration.mode == mode && configuration.settings == normalized && configuration.camera_ids.sort == Array(camera_ids).map(&:to_i).sort && configuration.render_preset_id == preset&.id && configuration.previous_configuration_id == previous&.id && existing.environment_ids.sort == Array(environment_ids).map(&:to_i).sort && existing.adapter == adapter
          raise ArgumentError, "Este envio já foi usado com outras escolhas; recarregue a página" unless same
          next existing
        end
        configuration = CreateConfiguration.call(user: user, project: project, version: version, environment_ids: environment_ids,
          settings: normalized, camera_ids: camera_ids, preset: preset, name: name, mode: mode, previous: previous)
        Submit.call(user: user, configuration: configuration, idempotency_key: idempotency_key, adapter: adapter)
      end
    end
  end
end
