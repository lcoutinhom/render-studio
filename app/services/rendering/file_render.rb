require "digest"
module Rendering
  class FileRender
    def self.call(user:, project_file:, version:, choices:, settings:, key:, adapter: Engines.default, project_experience: nil, custom_prompt: nil, reference_images: {})
      custom_prompt = PromptBuilder.new(custom_prompt: custom_prompt).custom_prompt
      project = project_file.project
      raise ArgumentError, "Tipo de passeio inválido" unless project_experience.nil? || %w[vr tour].include?(project_experience)
      raise ArgumentError, "Arquivo indisponível" unless project.user_id == user.id && !project_file.deleted_at && version.project_file_id == project_file.id && project.status == "active" && !project.deleted_at
      raise ArgumentError, "Escolha entre 1 e 100 cenas" unless choices.is_a?(Array) && choices.size.between?(1, 100)
      values = Settings.validate!(Settings.validate!(project.settings, complete: true).merge(Settings.validate!(settings)), complete: true)
      values.merge!("vr_enabled" => project_experience == "vr", "panorama_enabled" => project_experience == "tour")
      values["video_enabled"] = false if project_experience
      values.merge!("video_enabled" => false, "panorama_enabled" => false, "vr_enabled" => false) if Engines.image_ai?(adapter) && project_experience.nil?
      raise ArgumentError, "Chave de envio inválida" unless key.is_a?(String) && key.match?(/\A[a-zA-Z0-9_-]{16,128}\z/)
      digest_inputs = { file: project_file.id, version: version.id, choices: choices, settings: values, adapter: adapter, project_experience: project_experience }
      if Engines.image_ai?(adapter)
        digest_inputs[:custom_prompt] = custom_prompt
        digest_inputs[:reference_digest] = Digest::SHA256.hexdigest(reference_images.to_json)
      end
      digest = Digest::SHA256.hexdigest(digest_inputs.to_json)
      user.with_lock do
        existing = RenderBatch.find_by(user: user, idempotency_key: key)
        if existing
          raise ArgumentError, "Este envio já foi usado com outras escolhas" unless existing.render_configuration.snapshot.dig("file_request", "digest") == digest
          next existing
        end
        project.with_lock do
          document = version.format == "glb" ? ProjectVersions::ReferenceCatalog.document(version) : nil
          valid_scenes = version.metadata.fetch("scenes", []).pluck("id")
          markers = ProjectVersions::ReferenceCatalog.call(version).fetch("view_markers", []).pluck("id")
          seen = []
          environment_ids = []; camera_ids = []; references = {}
          choices.each do |choice|
            raise ArgumentError, "Cena inválida" unless choice.is_a?(Hash)
            source = choice.fetch("key").to_s
            raise ArgumentError, "Cenas repetidas" if seen.include?(source)
            seen << source
            parts = source.split(":")
            kind = parts.first
            if kind == "scene"
              scene_id = parts[1]
              raise ArgumentError, "Cena inexistente" unless parts.size == 2 && (valid_scenes.include?(scene_id) || (scene_id == "model" && valid_scenes.empty?))
              camera = nil
            else
              camera = choice.fetch("camera")
              if kind == "camera"
                scene_id, node_id = parts[1..]
                raise ArgumentError, "Câmera inexistente" unless parts.size == 3 && node_id.to_s.match?(/\A\d+\z/) && document && document.fetch("nodes", [])[node_id.to_i]&.key?("camera")
              elsif kind == "manual"
                scene_id = parts[1]
                raise ArgumentError, "Câmera manual inválida" unless parts.size == 3 && parts[2].match?(/\A[a-zA-Z0-9_-]{8,100}\z/)
              else
                scene_id, node_id = parts
                raise ArgumentError, "Vista recuperada inexistente" unless parts.size == 2 && markers.include?(node_id)
              end
              raise ArgumentError, "Cena fora do arquivo" unless valid_scenes.include?(scene_id)
              if node_id && document
                visited = {}; pending = document.fetch("scenes")[scene_id.to_i].fetch("nodes", []).dup
                until pending.empty?
                  index = pending.pop; next if visited[index]; visited[index] = true
                  pending.concat(document.fetch("nodes")[index].fetch("children", []))
                end
                raise ArgumentError, "Vista não pertence à cena" unless visited[node_id.to_i]
              end
            end
            environment = project.environments.find_or_create_by!(project_file: project_file, file_scene_id: source) do |item|
              item.name = choice.fetch("name").to_s.first(160); item.environment_type = "custom"; item.custom_type = "Cena de arquivo"; item.position = project.environments.maximum(:position).to_i + 1
            end
            raise ArgumentError, "Cena arquivada" unless environment.deleted_at.nil? && environment.status == "active"
            environment.environment_versions.find_or_create_by!(project_version: version) do |item|
              item.project = project; item.status = "validated"; item.source_reference = scene_id == "model" ? { "kind" => "model" } : { "kind" => "scene", "references" => [ scene_id ] }
            end
            references[environment.id.to_s] = reference_images[source]
            environment_ids << environment.id
            if camera
              raise ArgumentError, "Enquadramento inválido" unless camera.is_a?(Hash)
              fields = camera.slice("position", "rotation", "focal_length", "field_of_view", "projection_type")
              fingerprint = Digest::SHA256.hexdigest({ source: source, fields: fields }.to_json)
              record = environment.render_cameras.kept.where(project_version: version).where("metadata->>'file_choice_key' = ?", fingerprint).first
              record ||= environment.render_cameras.create!(fields.merge(project: project, project_version: version, name: choice.fetch("name").to_s.first(120), metadata: { "file_choice_key" => fingerprint, "source_choice" => source, "lens_origin" => (kind == "camera" ? "exported" : kind == "manual" ? "manual" : "estimated") }))
              camera_ids << record.id
            end
          end
          configuration = CreateConfiguration.call(user: user, project: project, version: version, environment_ids: environment_ids.uniq, settings: values, camera_ids: camera_ids.uniq,
            name: "#{project_file.name.first(120)} — revisão #{version.file_revision}", mode: "custom", request_metadata: { "digest" => digest, "choice_digest" => Digest::SHA256.hexdigest(choices.to_json), "project_file_id" => project_file.id, "file_revision" => version.file_revision, "choices" => choices.map { |choice| choice.slice("key", "name") } })
          types = project_experience == "vr" ? [ "vr" ] : project_experience == "tour" ? [ "panorama" ] : nil
          Submit.call(user: user, configuration: configuration, idempotency_key: key, adapter: adapter, output_types: types, single_vr: project_experience == "vr", custom_prompt: custom_prompt, reference_images: references)
        end
      end
    rescue LocalAi::Client::Failure => error
      raise ArgumentError, error.message
    rescue KeyError, TypeError, IndexError
      raise ArgumentError, "Seleção de cenas incompleta ou inválida"
    end
  end
end
