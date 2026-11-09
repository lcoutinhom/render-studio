module ProjectVersions
  class ReferenceCatalog
    def self.call(version)
      return {} unless version.format == "glb" && version.original_file.attached?
      blob = version.original_file.blob
      Rails.cache.fetch([ "glb-reference-types-v1", blob.id, version.checksum ], expires_in: 7.days) do
        classify(document(version))
      end
    rescue JSON::ParserError, ArgumentError, ActiveStorage::FileNotFoundError
      {}
    end
    def self.document(version)
      blob = version.original_file.blob
      header = blob.download_chunk(0...20)
      raise ArgumentError, "GLB inválido" unless header.bytesize == 20 && header.start_with?("glTF")
      length, type = header.byteslice(12, 8).unpack("V2")
      raise ArgumentError, "Manifesto GLB inválido" unless type == 0x4e4f534a && length.between?(1, InspectUpload::MAX_MANIFEST) && length + 20 <= blob.byte_size
      JSON.parse(blob.download_chunk(20...(20 + length)))
    end
    def self.classify(document)
      nodes = document.fetch("nodes", [])
      parents = Array.new(nodes.size) { [] }
      nodes.each_with_index do |node, index|
        Array(node["children"]).each { |child| parents[child] << index if child.is_a?(Integer) && child.between?(0, nodes.size - 1) }
      end
      geometry = {}
      pending = nodes.each_index.select { |index| nodes[index]["mesh"].is_a?(Integer) }
      until pending.empty?
        index = pending.pop
        next if geometry[index]
        geometry[index] = true
        pending.concat(parents[index])
      end
      markers = nodes.each_with_index.filter_map do |node, index|
        next if geometry[index] || node.key?("camera") || node["name"].blank? || Array(node["children"]).any?
        next unless %w[matrix translation rotation].any? { |key| node.key?(key) }
        { "id" => index.to_s, "name" => node["name"].to_s.first(160) }
      end
      { "nodes" => nodes.first(2000).each_with_index.map { |node, index| { "id" => index.to_s, "name" => node.fetch("name", "nodes #{index}").to_s.first(160), "has_geometry" => !!geometry[index], "is_camera" => node.key?("camera") } },
        "reference_types_available" => true, "camera_count" => Array(document["cameras"]).size, "scene_count" => Array(document["scenes"]).size,
        "view_markers" => markers.first(2000), "view_marker_count" => markers.size }
    end
  end
end
