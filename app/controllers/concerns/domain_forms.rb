module DomainForms
  extend ActiveSupport::Concern

  private

  def settings_from(raw)
    return raw.to_unsafe_h if raw.is_a?(ActionController::Parameters)
    return raw if raw.is_a?(Hash)
    return {} if raw.nil? || raw == ""
    raise ArgumentError, "Configurações devem ser um objeto JSON" unless raw.is_a?(String)
    parsed = JSON.parse(raw)
    raise ArgumentError, "Configurações devem ser um objeto JSON" unless parsed.is_a?(Hash)
    parsed
  rescue JSON::ParserError
    raise ArgumentError, "JSON de configurações inválido"
  end

  def form_error(path, error)
    errors = error.is_a?(ActiveRecord::RecordInvalid) ? error.record.errors.to_hash.transform_values(&:first) : { base: error.message }
    redirect_to path, status: :see_other, inertia: { errors: errors }
  end

  def scoped_project
    policy_scope(Project).find(params[:project_id] || params[:id])
  end
end
