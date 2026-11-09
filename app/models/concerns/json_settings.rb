module JsonSettings
  extend ActiveSupport::Concern

  private

  def validate_json_object(attribute)
    value = public_send(attribute)
    unless value.is_a?(Hash) && value.to_json.bytesize <= 16.kilobytes
      errors.add(attribute, "deve ser um objeto JSON de até 16 KiB")
    end
  end
end
