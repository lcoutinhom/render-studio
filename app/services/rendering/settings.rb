module Rendering
  class Settings
    DEFINITIONS = [
      [ "quality", "Qualidade", "general", "select", "standard", { "fast" => "Rápido", "standard" => "Padrão", "professional" => "Profissional" } ],
      [ "resolution_width", "Largura da imagem (px)", "general", "integer", 1920, 64, 16384 ],
      [ "resolution_height", "Altura da imagem (px)", "general", "integer", 1080, 64, 16384 ],
      [ "samples", "Samples", "general", "integer", 128, 1, 8192 ],
      [ "denoising", "Redução de ruído", "general", "boolean", true ],
      [ "exposure", "Exposição", "general", "number", 0, -10, 10 ],
      [ "lighting", "Iluminação", "lighting", "select", "day", { "day" => "Luz do dia", "sunset" => "Pôr do sol", "night" => "Noturna", "studio" => "Estúdio" } ],
      [ "temperature", "Temperatura (K)", "lighting", "integer", 6500, 1000, 15000 ],
      [ "intensity", "Intensidade da luz", "lighting", "number", 1, 0, 100 ],
      [ "interior_fill", "Luz de preenchimento interno", "lighting", "number", 0, 0, 5 ],
      [ "interior_fill_side", "Direção do preenchimento (−1 esquerda, 0 frontal, 1 direita)", "lighting", "number", 0, -1, 1 ],
      [ "neutral_daylight", "Luz ambiente diurna neutra", "lighting", "boolean", false ],
      [ "material_profile", "Tratamento dos materiais importados", "general", "select", "original", { "original" => "Preservar arquivo", "conservative_nonmetal" => "Corrigir não metálicos identificados (experimental)" } ],
      [ "sun_elevation", "Elevação do sol (graus)", "lighting", "number", 35, -90, 90 ],
      [ "sun_rotation", "Direção do sol (graus)", "lighting", "number", 0, -360, 360 ],
      [ "image_count", "Quantidade de imagens", "images", "integer", 1, 1, 100 ],
      [ "image_format", "Formato de imagem", "images", "select", "png", { "png" => "PNG", "jpeg" => "JPEG", "exr" => "EXR" } ],
      [ "video_enabled", "Preparar vídeo", "video", "boolean", false ],
      [ "video_duration", "Duração (segundos)", "video", "number", 10, 1, 600 ],
      [ "video_fps", "Quadros por segundo", "video", "integer", 30, 1, 120 ],
      [ "video_width", "Largura do vídeo (px)", "video", "integer", 1920, 64, 7680 ],
      [ "video_height", "Altura do vídeo (px)", "video", "integer", 1080, 64, 7680 ],
      [ "panorama_enabled", "Preparar panorama 360°", "panorama", "boolean", false ],
      [ "panorama_width", "Largura do panorama (px)", "panorama", "integer", 4096, 512, 16384 ],
      [ "panorama_height", "Altura do panorama (px)", "panorama", "integer", 2048, 256, 8192 ],
      [ "panorama_projection", "Projeção", "panorama", "select", "equirectangular", { "equirectangular" => "Equiretangular (2:1)" } ],
      [ "vr_enabled", "Preparar modelo para VR", "vr", "boolean", false ],
      [ "vr_texture_size", "Qualidade de texturas VR (px)", "vr", "integer", 2048, 256, 8192 ],
      [ "vr_navigation", "Navegação VR", "vr", "select", "teleport", { "teleport" => "Teletransporte", "walk" => "Caminhada" } ],
      [ "vr_optimization", "Otimização VR", "vr", "select", "balanced", { "light" => "Leve", "balanced" => "Equilibrada", "quality" => "Priorizar qualidade" } ]
    ].map do |key, label, section, type, default, options, maximum|
      { key: key, label: label, section: section, type: type, default: default }.merge(type == "select" ? { options: options } : { min: options, max: maximum }).compact
    end.freeze
    DEFAULTS = DEFINITIONS.to_h { |field| [ field[:key], field[:default] ] }.merge("video_path" => []).freeze

    def self.validate!(raw, complete: false)
      raise ArgumentError, "Configurações devem ser um objeto" unless raw.is_a?(Hash) && raw.to_json.bytesize <= 32.kilobytes
      values = raw.deep_stringify_keys.deep_dup
      values["quality"] = "professional" if values["quality"] == "high"
      unknown = values.keys - DEFAULTS.keys
      raise ArgumentError, "Configurações desconhecidas: #{unknown.join(', ')}" if unknown.any?
      DEFINITIONS.each do |field|
        key = field[:key]
        next unless values.key?(key)
        value = values[key]
        case field[:type]
        when "integer", "number"
          if value.is_a?(String) && value.match?(/\A-?\d+(?:\.\d+)?\z/)
            value = field[:type] == "integer" && !value.include?(".") ? value.to_i : value.to_f
          end
          valid = value.is_a?(Numeric) && value.finite? && value.between?(field[:min], field[:max])
          valid &&= value.is_a?(Integer) if field[:type] == "integer"
        when "boolean"
          value = { "true" => true, "false" => false }.fetch(value, value)
          valid = value == true || value == false
        when "select"
          valid = field[:options].key?(value)
        end
        raise ArgumentError, "#{field[:label]} possui valor inválido" unless valid
        values[key] = value
      end
      if values.key?("video_path")
        path = values["video_path"]
        unless path.is_a?(Array) && path.size <= 200 && path.all? { |point| point.is_a?(Hash) && point.keys.sort == %w[position rotation] && point.values.all? { |vector| vector.is_a?(Array) && vector.size == 3 && vector.all? { |v| v.is_a?(Numeric) && v.finite? && v.abs <= 1_000_000 } } }
          raise ArgumentError, "Trajetória deve conter até 200 pontos com posição e rotação numéricas"
        end
      end
      if complete
        values = DEFAULTS.deep_dup.merge(values)
        if values["panorama_enabled"] && values["panorama_width"] != values["panorama_height"] * 2
          raise ArgumentError, "Panorama equiretangular deve ter proporção 2:1"
        end
        if values["video_enabled"] && values.fetch("video_path").size == 1
          raise ArgumentError, "Trajetória de vídeo deve estar vazia (automática) ou conter pelo menos dois pontos"
        end
      end
      values
    end
  end
end
