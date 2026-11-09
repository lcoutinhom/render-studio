module Materials
  class AttachTexture
    def self.call(material, slot:, upload:)
      raise ArgumentError, "Canal de textura inválido" unless MaterialTexture::SLOTS.include?(slot)
      inspection = InspectTexture.call(upload)
      blob = ActiveStorage::Blob.create_and_upload!(io: upload.tempfile, filename: upload.original_filename, content_type: inspection.fetch(:content_type), metadata: inspection.fetch(:metadata).merge("analyzed" => true), identify: false)
      material.with_lock do
        raise ArgumentError, "Material excluído" if material.deleted_at
        material.material_textures.current.where(slot: slot).each { |old| old.update!(superseded_at: Time.current) }
        texture = material.material_textures.build(slot: slot, checksum: inspection.fetch(:checksum), metadata: inspection.fetch(:metadata))
        texture.file.attach(blob)
        texture.save!
        texture
      end
    rescue StandardError
      blob&.purge if blob&.persisted? && !blob.attachments.exists?
      raise
    end
  end
end
