module Rendering
  class SeedPresets
    def self.call
      [
        [ "fast", "Rápido", { quality: "fast", samples: 32, resolution_width: 1280, resolution_height: 720 } ],
        [ "standard", "Padrão", { quality: "standard", samples: 128, resolution_width: 1920, resolution_height: 1080 } ],
        [ "professional", "Profissional", { quality: "professional", samples: 512, resolution_width: 3840, resolution_height: 2160 } ]
      ].each do |key, name, settings|
        RenderPreset.find_or_create_by!(system_key: key) do |preset|
          preset.assign_attributes(name: name, system: true, category: "quality", settings: settings)
        end
      end
    end
  end
end
