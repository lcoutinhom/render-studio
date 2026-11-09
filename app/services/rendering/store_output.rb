require "digest"
module Rendering
  # Internal storage boundary for trusted executors. No HTTP upload endpoint and
  # no invocation from the simulation adapter. Every call appends an artifact.
  class StoreOutput
    def self.call(job:, io:, filename:, content_type:, metadata: {})
      raise ArgumentError, "A tarefa precisa estar concluída" unless job.status == "completed"
      raise ArgumentError, "Arquivo inválido ou maior que 1 GiB" unless io.respond_to?(:size) && io.size.between?(1, 1.gigabyte)
      raise ArgumentError, "Metadados devem ser um objeto JSON" unless metadata.is_a?(Hash)
      metadata = metadata.deep_stringify_keys
      io.rewind
      header = io.read(16).to_s.b
      signature = case content_type
      when "image/png" then header.start_with?("\x89PNG\r\n\x1a\n".b)
      when "image/jpeg" then header.start_with?("\xff\xd8\xff".b)
      when "image/x-exr" then header.start_with?([ 20000630 ].pack("V"))
      when "video/mp4" then header.byteslice(4, 4) == "ftyp"
      when "video/webm" then header.start_with?("\x1a\x45\xdf\xa3".b)
      when "model/gltf-binary" then header.start_with?("glTF".b)
      else false
      end
      raise ArgumentError, "Conteúdo incompatível com o formato declarado" unless signature
      io.rewind
      digest = Digest::SHA256.new
      while (chunk = io.read(1.megabyte))
        digest << chunk
      end
      checksum = digest.hexdigest
      io.rewind
      blob = nil
      job.with_lock do
        raise ArgumentError, "A tarefa precisa estar concluída" unless job.status == "completed"
        existing = job.render_outputs.find_by(checksum: checksum, filename: filename)
        if existing
          raise ArgumentError, "Metadados diferentes para o mesmo resultado" unless existing.content_type == content_type && existing.metadata == metadata
          return existing
        end
        blob = ActiveStorage::Blob.create_and_upload!(io: io, filename: filename, content_type: content_type, identify: false, metadata: { "analyzed" => true })
        output = job.render_outputs.build(kind: job.output_type, filename: filename, content_type: content_type, byte_size: blob.byte_size, checksum: checksum, metadata: metadata)
        output.file.attach(blob)
        output.save!
        output
      end
    rescue StandardError
      blob&.purge if blob&.persisted? && !blob.attachments.exists?
      raise
    ensure
      io.rewind if io.respond_to?(:rewind) && !io.closed?
    end
  end
end
