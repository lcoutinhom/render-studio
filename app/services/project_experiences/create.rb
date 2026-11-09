require "digest"
module ProjectExperiences
  class Create
    def self.call(user:, project:, kind:, revision_id:, choices:, key:)
      raise ArgumentError, "Tipo de passeio inválido" unless %w[vr tour].include?(kind)
      raise ArgumentError, "Projeto de outra conta" unless project.user_id == user.id
      user.with_lock do
        project.with_lock do
          existing = project.project_experiences.joins(:render_batch).find_by(render_batches: { user_id: user.id, idempotency_key: key })
          if existing
            raise ArgumentError, "Chave usada para outro passeio" unless existing.kind == kind && existing.project_version_id.to_s == revision_id.to_s
            raise ArgumentError, "Chave usada com outros pontos" unless existing.render_batch.render_configuration.snapshot.dig("file_request", "choice_digest") == Digest::SHA256.hexdigest(choices.to_json)
            return existing
          end
          file = project.project_files.kept.find_by(primary: true)
          raise ArgumentError, "Escolha o arquivo principal do projeto" unless file
          version = file.project_versions.order(file_revision: :desc).first
          raise ArgumentError, "O arquivo foi atualizado. Reabra a preparação do passeio" unless version && version.id.to_s == revision_id.to_s
          raise ArgumentError, "Escolha fotografias com câmera para os pontos do passeio" unless choices.is_a?(Array) && choices.any? && choices.all? { |choice| choice.is_a?(Hash) && choice["camera"].is_a?(Hash) }
          batch = Rendering::FileRender.call(user: user, project_file: file, version: version, choices: choices,
            settings: project.settings, key: key, adapter: "blender", project_experience: kind)
          project.project_experiences.create!(project_file: file, project_version: version, render_batch: batch, kind: kind)
        end
      end
    end
  end
end
