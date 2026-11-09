require "zip"
require "digest"
require "uri"
require "base64"
require "pathname"

module ProjectVersions
  class InspectUpload
    class Invalid < StandardError; end
    MAX_SIZE = 1.gigabyte
    MAX_EXPANDED = 2.gigabytes
    MAX_MANIFEST = 64.megabytes
    MAX_ENTRIES = 512
    MIME_TYPES = {
      ".glb" => %w[model/gltf-binary application/octet-stream],
      ".zip" => %w[application/zip application/x-zip-compressed application/octet-stream],
      ".dae" => %w[model/vnd.collada+xml application/xml text/xml text/plain application/octet-stream]
    }.freeze

    def self.call(upload) = new(upload).call

    def initialize(upload)
      @upload = upload
    end

    def call
      fail! "Selecione um arquivo GLB, ZIP glTF/OBJ ou DAE" unless @upload.is_a?(ActionDispatch::Http::UploadedFile)
      extension = File.extname(@upload.original_filename).downcase
      fail! "Formato não suportado. Use GLB, ZIP glTF/OBJ ou DAE" unless MIME_TYPES.key?(extension)
      fail! "MIME type incompatível com o formato" unless MIME_TYPES[extension].include?(@upload.content_type.to_s.split(";").first)
      fail! "O arquivo deve ter entre 1 byte e 1 GiB" unless @upload.size.between?(1, MAX_SIZE)
      @upload.rewind
      fail! "Arquivo truncado ou acima de 1 GiB" unless @upload.tempfile.size == @upload.size
      @metadata = { "byte_size" => @upload.size }
      format = case extension
      when ".glb" then inspect_glb
      when ".zip" then inspect_zip
      when ".dae" then inspect_dae
      end
      { format: format, checksum: Digest::SHA256.file(@upload.tempfile.path).hexdigest, metadata: @metadata,
        content_type: { "glb" => "model/gltf-binary", "dae" => "model/vnd.collada+xml" }.fetch(format, "application/zip") }
    rescue JSON::ParserError, Nokogiri::XML::SyntaxError, Zip::Error, EncodingError, ArgumentError, TypeError, NoMethodError, KeyError, Zlib::Error, EOFError => error
      raise Invalid, "Estrutura do arquivo inválida (#{error.class.name.demodulize})"
    ensure
      @upload.rewind if @upload.respond_to?(:rewind)
    end

    private

    def fail!(message) = raise(Invalid, message)

    def inspect_glb
      io = @upload.tempfile
      io.rewind
      header = io.read(12)
      fail! "Cabeçalho GLB inválido" unless header&.bytesize == 12 && header.byteslice(0, 4) == "glTF"
      version, length = header.byteslice(4, 8).unpack("V2")
      fail! "GLB deve ser versão 2 e possuir tamanho íntegro" unless version == 2 && length == @upload.size
      chunks = []
      document = nil
      while io.pos < length
        fail! "Chunk GLB truncado" if io.pos + 8 > length
        size, type = io.read(8).unpack("V2")
        fail! "Chunk GLB inválido" if size % 4 != 0 || io.pos + size > length
        fail! "Chunks GLB não suportados" if chunks.length >= 2
        if chunks.empty?
          fail! "GLB deve começar com JSON" unless type == 0x4e4f534a
          fail! "Manifesto JSON excede 64 MiB" if size > MAX_MANIFEST
          document = JSON.parse(io.read(size))
        else
          fail! "Chunk binário inválido" unless type == 0x004e4942
          io.seek(size, IO::SEEK_CUR)
        end
        chunks << [ type, size ]
      end
      fail! "GLB sem documento JSON" unless document
      inspect_gltf(document, binary_size: chunks[1]&.last)
      "glb"
    end

    def inspect_gltf(data, entries: nil, base: "", binary_size: nil)
      fail! "O documento deve ser glTF 2" unless data.is_a?(Hash) && data.dig("asset", "version") == "2.0"
      required = data.fetch("extensionsRequired", [])
      fail! "Extensões glTF obrigatórias não são suportadas neste visualizador" unless required.is_a?(Array) && required.empty?
      # Disallow arbitrary URI sources, including extension payloads, to keep uploads self-contained.
      collect_uris(data).each do |uri|
        fail! "URI inválida no modelo" unless uri.is_a?(String)
        next if uri.match?(%r{\Adata:(?:application/octet-stream|application/gltf-buffer|image/(?:png|jpeg|webp));base64,[A-Za-z0-9+/=]+\z})
        fail! "GLB deve ser autocontido, sem dependências externas" unless entries
        resolve_entry(entries, base, uri)
      end
      buffers = data.fetch("buffers", [])
      fail! "Lista de buffers inválida" unless buffers.is_a?(Array)
      sizes = buffers.each_with_index.map do |buffer, index|
        declared = buffer.fetch("byteLength")
        fail! "Tamanho de buffer inválido" unless declared.is_a?(Integer) && declared.positive?
        available = if buffer["uri"]&.start_with?("data:")
          Base64.strict_decode64(buffer["uri"].split(",", 2).last).bytesize
        elsif buffer["uri"] && entries
          resolve_entry(entries, base, buffer["uri"]).size
        elsif index.zero? && binary_size
          binary_size
        else
          0
        end
        fail! "Buffer ausente ou truncado" unless declared <= available
        declared
      end
      data.fetch("bufferViews", []).each do |view|
        buffer = view["buffer"]
        offset = view.fetch("byteOffset", 0)
        length = view["byteLength"]
        unless buffer.is_a?(Integer) && buffer >= 0 && sizes[buffer] && offset.is_a?(Integer) && offset >= 0 && length.is_a?(Integer) && length.positive? && offset + length <= sizes[buffer]
          fail! "Região de buffer fora dos limites"
        end
      end
      %w[nodes scenes materials].each do |key|
        items = data.fetch(key, [])
        fail! "Lista #{key} inválida ou muito extensa" unless items.is_a?(Array) && items.size <= 100_000
        @metadata[key] = items.each_with_index.map { |item, index| { "id" => index.to_s, "name" => item.fetch("name", "#{key} #{index}").to_s.first(160) } }.first(2000)
      end
      @metadata["reference_catalog_truncated"] = %w[nodes scenes].any? { |key| data.fetch(key, []).size > 2000 }
    end

    def collect_uris(value)
      case value
      when Hash then value.flat_map { |key, item| key == "uri" ? [ item ] : collect_uris(item) }
      when Array then value.flat_map { |item| collect_uris(item) }
      else []
      end
    end

    def safe_path?(name)
      name.is_a?(String) && name.present? && !name.match?(%r{[\\:\x00]}) && !name.start_with?("/") && !name.split("/").any? { |part| %w[.. .].include?(part) }
    end

    def resolve_entry(entries, base, reference)
      decoded = URI::DEFAULT_PARSER.unescape(reference)
      fail! "Dependência com caminho inseguro" if decoded.start_with?("/") || decoded.match?(%r{[\\:\x00?#]})
      name = Pathname.new(base.empty? ? decoded : "#{base}/#{decoded}").cleanpath.to_s
      fail! "Dependência fora do pacote" unless safe_path?(name)
      fail! "Dependência ausente no pacote: #{decoded.first(120)}" unless entries.key?(name)
      entries.fetch(name)
    end

    def inspect_zip
      Zip::File.open(@upload.tempfile.path) do |zip|
        fail! "ZIP excede 512 entradas" if zip.entries.size > MAX_ENTRIES
        files = zip.entries.reject(&:directory?)
        fail! "ZIP vazio" if files.empty?
        fail! "ZIP possui nomes repetidos" unless zip.entries.map(&:name).uniq.size == zip.entries.size
        fail! "ZIP excede limite descompactado" if files.sum(&:size) > MAX_EXPANDED
        @entries = {}
        total = 0
        zip.entries.each do |entry|
          fail! "ZIP contém caminho inseguro, link ou entrada criptografada" unless safe_path?(entry.name.delete_suffix("/")) && !entry.symlink? && !entry.encrypted?
          next if entry.directory?
          fail! "Entrada ZIP excede o limite" if entry.size > MAX_SIZE || entry.size > [ entry.compressed_size * 100, 1.megabyte ].max
          fail! "Tipo de arquivo não permitido no pacote" unless %w[.gltf .bin .obj .mtl .png .jpg .jpeg .webp].include?(File.extname(entry.name).downcase)
          size = 0
          crc = 0
          entry.get_input_stream do |io|
            while (chunk = io.read(1.megabyte))
              break if chunk.empty?
              size += chunk.bytesize
              total += chunk.bytesize
              fail! "ZIP excede limites declarados" if size > entry.size || total > MAX_EXPANDED
              crc = Zlib.crc32(chunk, crc)
            end
          end
          fail! "Entrada ZIP não confere com tamanho ou checksum" unless size == entry.size && crc == entry.crc
          @entries[entry.name] = entry
        end
        models = @entries.keys.select { |name| %w[.gltf .obj].include?(File.extname(name).downcase) }
        fail! "O pacote deve conter exatamente um modelo glTF ou OBJ" unless models.length == 1
        main = models.first
        base = File.dirname(main) == "." ? "" : File.dirname(main)
        @metadata["entrypoint"] = main
        @metadata["entries"] = @entries.keys
        if File.extname(main).downcase == ".gltf"
          inspect_gltf(JSON.parse(read_manifest(@entries[main])), entries: @entries, base: base)
          "gltf_zip"
        else
          inspect_obj(@entries[main], base)
          "obj_zip"
        end
      end
    end

    def read_manifest(entry)
      fail! "Manifesto excede 64 MiB" if entry.size > MAX_MANIFEST
      entry.get_input_stream { |io| io.read(MAX_MANIFEST + 1) }
    end

    def inspect_obj(entry, base)
      vertices = false
      faces = false
      entry.get_input_stream do |io|
        io.each_line do |line|
          text = line.dup.force_encoding(Encoding::UTF_8)
          fail! "OBJ deve ser texto UTF-8" unless text.valid_encoding?
          vertices ||= text.match?(/^v\s+[-+\d.]+\s+[-+\d.]+\s+[-+\d.]+/)
          faces ||= text.match?(/^f\s+\d/)
          next unless text.match?(/^mtllib\s+/)
          name = text.sub(/^mtllib\s+/, "").strip
          material = read_manifest(resolve_entry(@entries, base, name))
          directory = File.dirname(base.empty? ? name : "#{base}/#{name}")
          directory = "" if directory == "."
          material.scan(/^(?:map_\w+|bump|disp|decal|norm)\s+(.+)$/i).flatten.each do |reference|
            fail! "Opções de textura MTL não suportadas; use caminhos simples" if reference.strip.start_with?("-")
            resolve_entry(@entries, directory, reference.strip)
          end
        end
      end
      fail! "OBJ deve conter vértices e faces" unless vertices && faces
    end

    def inspect_dae
      io = @upload.tempfile
      io.rewind
      reader = Nokogiri::XML::Reader(io, nil, nil, Nokogiri::XML::ParseOptions::STRICT | Nokogiri::XML::ParseOptions::NONET)
      root = nil
      geometry = false
      parents = {}
      reader.each do |node|
        fail! "DAE não pode conter DTD ou entidades" if [ 5, 6, 10 ].include?(node.node_type)
        next unless node.node_type == 1
        root ||= node.local_name
        geometry ||= node.local_name == "geometry"
        if node.local_name == "init_from" && parents[node.depth - 1] == "image"
          fail! "DAE com texturas externas requer empacotamento ainda não suportado" unless node.inner_xml.strip.start_with?("data:image/")
        end
        parents[node.depth] = node.local_name
      end
      fail! "Raiz COLLADA inválida" unless root == "COLLADA"
      fail! "DAE deve conter geometria" unless geometry
      "dae"
    end
  end
end
