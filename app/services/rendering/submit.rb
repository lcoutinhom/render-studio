require "digest"
module Rendering
  class Submit
    MAX_JOBS = 2000
    def self.call(user:, configuration:, idempotency_key:, environment_ids: nil, failure_environment_ids: [], adapter: "simulation", device: nil, output_types: nil, single_vr: false, custom_prompt: nil, reference_images: {})
      raise ArgumentError, "Configuração pertence a outro usuário" unless configuration.user_id == user.id
      unless idempotency_key.is_a?(String) && idempotency_key.match?(/\A[a-zA-Z0-9_-]{16,128}\z/)
        raise ArgumentError, "Chave de idempotência inválida"
      end
      raise ArgumentError, "Executor inválido" unless Engines::NAMES.include?(adapter)
      raise ArgumentError, "Blender desabilitado por feature flag." if adapter == "blender" && ENV["BLENDER_RENDER_ENABLED"] != "true"
      raise ArgumentError, "Passeio VR deve gerar somente um modelo" if single_vr && output_types != [ "vr" ]
      raise ArgumentError, "Falhas controladas são exclusivas da simulação" if adapter != "simulation" && failure_environment_ids.present?
      if adapter == "blender" && !%w[glb gltf_zip obj_zip].include?(configuration.project_version.format)
        raise ArgumentError, "Para Blender, envie GLB, glTF ZIP ou OBJ ZIP. Converta DAE para GLB."
      end
      device ||= adapter == "blender" ? ENV.fetch("BLENDER_DEVICE", "HIP") : "CPU"
      raise ArgumentError, "Dispositivo inválido" unless %w[CPU HIP].include?(device)
      if output_types
        raise ArgumentError, "Saídas inválidas" unless output_types.is_a?(Array) && output_types.any? && output_types.uniq == output_types && (output_types - %w[image video panorama vr]).empty?
      end
      prompt = adapter == "comfyui" ? LocalAi::Prompt.snapshot(custom_prompt: custom_prompt) : PromptBuilder.new(custom_prompt: custom_prompt).snapshot
      if adapter == "gemini"
        raise ArgumentError, "Renderização Gemini não configurada ou desabilitada." unless GeminiImage.enabled?
        raise ArgumentError, "Gemini requer um arquivo GLB." unless configuration.project_version.format == "glb"
      elsif adapter == "comfyui"
        raise ArgumentError, "Renderização local desativada." unless Engines.enabled?(adapter)
        raise ArgumentError, "A IA local requer um arquivo GLB." unless configuration.project_version.format == "glb"
        LocalAi::Client.new # Validate the loopback endpoint before persisting work.
      elsif prompt["custom_prompt"]
        raise ArgumentError, "Prompt personalizado requer um executor de IA."
      end
      raise ArgumentError, "Referências devem ser um objeto." unless reference_images.is_a?(Hash)
      snapshot = configuration.snapshot
      configured = snapshot.fetch("environments")
      ids = environment_ids.nil? ? configured.map { |item| item.fetch("environment_id") }.sort : parse_ids(environment_ids)
      failures = parse_ids(failure_environment_ids)
      raise ArgumentError, "Escolha ambientes da configuração, sem duplicatas" unless ids.size.between?(1, 500) && ids.uniq == ids && (ids - configured.map { |item| item.fetch("environment_id") }).empty?
      raise ArgumentError, "Falhas simuladas devem usar apenas ambientes selecionados" unless failures.uniq == failures && (failures - ids).empty?
      digest_inputs = { configuration_id: configuration.id, environment_ids: ids.sort, failure_environment_ids: failures.sort, adapter: adapter }
      digest_inputs[:device] = device unless device == "CPU"
      digest_inputs[:output_types] = output_types.sort if output_types
      digest_inputs[:single_vr] = true if single_vr
      digest_inputs[:references] = Digest::SHA256.hexdigest(reference_images.to_json) if Engines.image_ai?(adapter)
      digest_inputs[:custom_prompt] = prompt["custom_prompt"] if prompt["custom_prompt"]
      digest = Digest::SHA256.hexdigest(digest_inputs.to_json)
      batch = user.with_lock do
        existing = RenderBatch.find_by(user: user, idempotency_key: idempotency_key)
        if existing
          raise ArgumentError, "Esta chave já foi usada para outra solicitação; recarregue a página" unless existing.request_digest == digest
          next existing
        end
        project = configuration.project
        version = configuration.project_version
        raise ArgumentError, "Projeto arquivado ou excluído" if project.reload.deleted_at || project.status != "active"
        unless version.project_id == project.id && snapshot["project_version_id"] == version.id && snapshot["model_checksum"] == version.checksum && version.original_file.attached? && snapshot["model_blob_id"] == version.original_file.blob_id
          raise ArgumentError, "Original ou versão da configuração indisponível"
        end
        selected = configured.select { |item| ids.include?(item.fetch("environment_id")) }
        selected.each do |item|
          association = configuration.environment_versions.find_by(id: item.fetch("environment_version_id"), environment_id: item.fetch("environment_id"), project_version_id: version.id)
          unless association && association.status == "validated" && association.environment.deleted_at.nil? && association.environment.status == "active"
            raise ArgumentError, "#{item['name']}: ambiente ausente, arquivado ou associação não confirmada"
          end
          Settings.validate!(item.fetch("effective_settings"), complete: true)
          item.fetch("materials", []).each do |mapping|
            mapping.fetch("textures", []).each do |texture|
              raise ArgumentError, "Textura preservada indisponível" unless ActiveStorage::Blob.exists?(id: texture.fetch("blob_id"))
            end
          end
        end
        workloads = selected.flat_map do |environment|
          settings = environment.fetch("effective_settings")
          outputs = [ "image" ]
          outputs << "video" if settings["video_enabled"]
          outputs << "panorama" if settings["panorama_enabled"]
          outputs << "vr" if settings["vr_enabled"]
          raise ArgumentError, "Saída não habilitada na configuração" if output_types && (output_types - outputs).any?
          outputs &= output_types if output_types
          cameras = environment.fetch("cameras", []).presence || [ nil ]
          cameras.product(outputs).map { |camera, output| [ environment, camera, output ] }
        end
        raise ArgumentError, "#{Engines.label(adapter)} gera somente imagens; desative vídeo, panorama e VR." if Engines.image_ai?(adapter) && workloads.any? { |_, _, output| output != "image" }
        if single_vr
          entry = snapshot.dig("file_request", "choices", 0, "key")
          first = workloads.find { |_environment, camera, _output| camera&.dig("metadata", "source_choice") == entry } if entry
          workloads = [ first || workloads.first ].compact
        end
        raise ArgumentError, "A solicitação excede #{MAX_JOBS} tarefas; reduza ambientes, câmeras ou saídas" if workloads.size > MAX_JOBS
        created = RenderBatch.create!(user: user, project: project, project_version: version, render_configuration: configuration,
          adapter: adapter, idempotency_key: idempotency_key, request_digest: digest, environment_ids: ids.sort, failure_environment_ids: failures.sort)
        workloads.each do |environment, camera, output|
          key = "#{environment.fetch('environment_id')}:#{camera ? camera.fetch('id') : 'automatic'}:#{output}"
          payload = { "cycles_device" => device, "adapter" => adapter, "model_format" => version.format, "schema_version" => 1, "project_id" => project.id,
            "project_version_id" => version.id, "version_number" => snapshot.fetch("version_number"),
            "model_checksum" => snapshot.fetch("model_checksum"), "model_blob_id" => snapshot.fetch("model_blob_id"),
            "output_type" => output, "camera" => camera, "environment" => environment.deep_dup }
          if Engines.image_ai?(adapter)
            reference_key = if adapter == "comfyui" && environment.fetch("cameras", []).size > 1
              "#{environment.fetch('environment_id')}:#{camera.fetch('id')}"
            else
              environment.fetch("environment_id").to_s
            end
            reference = reference_images[reference_key]
            raise ArgumentError, "Imagem de referência ausente ou inválida; abra o arquivo GLB e selecione as cenas." unless reference.is_a?(String) && reference.bytesize <= 20.megabytes && reference.start_with?("data:image/png;base64,")
            begin
              bytes = Base64.strict_decode64(reference.delete_prefix("data:image/png;base64,"))
              raise ArgumentError unless bytes.start_with?("\x89PNG\r\n\x1a\n".b)
            rescue ArgumentError
              raise ArgumentError, "Imagem de referência inválida."
            end
            LocalAi::Client.validate_png!(bytes) if adapter == "comfyui"
            payload["reference_image"] = reference
          end
          payload["prompt"] = prompt.deep_dup if Engines.image_ai?(adapter)
          payload["gemini_model"] = GeminiImage.model if adapter == "gemini"
          payload["local_ai"] = LocalAi::Workflow.configuration if adapter == "comfyui"
          job = created.render_jobs.create!(user: user, project: project, project_version: version, render_configuration: configuration,
            environment_id: environment.fetch("environment_id"), environment_version_id: environment.fetch("environment_version_id"),
            camera_id: camera&.fetch("id"), workload_key: key, output_type: output, snapshot: payload,
            simulate_failure: failures.include?(environment.fetch("environment_id")))
          created.render_events.create!(render_job: job, kind: "queued", message: "Processamento aguardando envio à fila.")
        end
        created.render_events.create!(kind: "submitted", message: adapter == "simulation" ? "Solicitação de simulação criada; nenhum arquivo real será gerado." : "Renderização #{Engines.label(adapter)} solicitada.", details: { "environments" => ids.size, "jobs" => workloads.size })
        created
      end
      QueueKick.after_commit(batch.id)
      batch
    rescue LocalAi::Client::Failure => error
      raise ArgumentError, error.message
    end

    def self.parse_ids(raw)
      raise ArgumentError, "Envie uma lista de ambientes" unless raw.is_a?(Array) && raw.size <= 500
      raw.map { |id| Integer(id.to_s, 10) }.sort
    rescue TypeError
      raise ArgumentError, "Identificadores inválidos"
    end
  end
end
