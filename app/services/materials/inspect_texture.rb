require "digest"
require "zlib"
module Materials
  class InspectTexture
    def self.call(upload)
      raise ArgumentError, "Selecione uma textura PNG ou JPEG de até 20 MiB" unless upload.is_a?(ActionDispatch::Http::UploadedFile) && upload.size.between?(1, 20.megabytes)
      upload.rewind
      bytes = upload.read(20.megabytes + 1)
      extension = File.extname(upload.original_filename).downcase
      detected = Marcel::MimeType.for(StringIO.new(bytes))
      allowed = { ".png" => "image/png", ".jpg" => "image/jpeg", ".jpeg" => "image/jpeg" }
      unless bytes.bytesize == upload.size && allowed[extension] == detected && upload.content_type == detected
        raise ArgumentError, "Extensão, MIME ou conteúdo da textura incompatível"
      end
      width, height = if detected == "image/png"
        raise ArgumentError, "PNG inválido" unless bytes.start_with?("\x89PNG\r\n\x1a\n".b)
        offset = 8
        dimensions = nil
        image_data = false
        ended = false
        while offset < bytes.bytesize
          raise ArgumentError, "PNG truncado" if offset + 12 > bytes.bytesize
          length = bytes.byteslice(offset, 4).unpack1("N")
          type = bytes.byteslice(offset + 4, 4)
          raise ArgumentError, "PNG truncado" if offset + 12 + length > bytes.bytesize
          payload = bytes.byteslice(offset + 8, length)
          crc = bytes.byteslice(offset + 8 + length, 4).unpack1("N")
          raise ArgumentError, "Checksum PNG inválido" unless Zlib.crc32(type + payload) == crc
          if offset == 8
            raise ArgumentError, "Cabeçalho PNG inválido" unless type == "IHDR" && length == 13
            dimensions = payload.unpack("N2")
          end
          image_data ||= type == "IDAT" && length.positive?
          offset += 12 + length
          if type == "IEND"
            ended = length.zero? && offset == bytes.bytesize
            break
          end
        end
        raise ArgumentError, "PNG sem dados ou incompleto" unless image_data && ended
        dimensions
      else
        raise ArgumentError, "JPEG truncado" unless bytes.start_with?("\xff\xd8".b) && bytes.end_with?("\xff\xd9".b)
        offset = 2
        dimensions = nil
        while offset + 4 <= bytes.bytesize
          raise ArgumentError, "Marcador JPEG inválido" unless bytes.getbyte(offset) == 0xff
          offset += 1 while bytes.getbyte(offset) == 0xff
          marker = bytes.getbyte(offset)
          offset += 1
          break if marker == 0xda || marker == 0xd9
          length = bytes.byteslice(offset, 2)&.unpack1("n")
          raise ArgumentError, "Segmento JPEG truncado" unless length && length >= 2 && offset + length <= bytes.bytesize
          if [ 0xc0, 0xc1, 0xc2 ].include?(marker)
            raise ArgumentError, "Dimensões JPEG inválidas" if length < 8
            height, width = bytes.byteslice(offset + 3, 4).unpack("n2")
            dimensions = [ width, height ]
          end
          offset += length
        end
        raise ArgumentError, "JPEG sem dimensões suportadas" unless dimensions
        dimensions
      end
      raise ArgumentError, "Texturas devem ter de 1 a 16384 pixels por dimensão" unless [ width, height ].all? { |n| n.is_a?(Integer) && n.between?(1, 16384) }
      { checksum: Digest::SHA256.hexdigest(bytes), metadata: { "width" => width, "height" => height }, content_type: detected }
    ensure
      upload.rewind if upload.respond_to?(:rewind)
    end
  end
end
