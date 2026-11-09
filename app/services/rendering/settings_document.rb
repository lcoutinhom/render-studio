module Rendering
  class SettingsDocument
    def self.load(raw)
      raise ArgumentError, "JSON de configurações excede 64 KiB" if raw.to_json.bytesize > 64.kilobytes
      document = raw.is_a?(String) ? JSON.parse(raw) : raw
      unless document.is_a?(Hash) && document.keys.sort == %w[schema_version settings] && document["schema_version"] == 1
        raise ArgumentError, "Use um JSON exportado pelo sistema: schema_version 1 e settings."
      end
      Settings.validate!(document["settings"], complete: true)
    rescue JSON::ParserError
      raise ArgumentError, "Arquivo JSON inválido."
    end
    def self.dump(settings) = { "schema_version" => 1, "settings" => Settings.validate!(settings, complete: true) }
  end
end
