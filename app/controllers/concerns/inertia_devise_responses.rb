module InertiaDeviseResponses
  extend ActiveSupport::Concern

  protected

  def respond_with(resource, options = {})
    if resource.respond_to?(:errors) && resource.errors.any?
      redirect_to error_path, status: :see_other,
        inertia: { errors: resource.errors.to_hash.transform_values(&:first) }
    else
      redirect_to options.fetch(:location) { new_user_session_path }, status: :see_other
    end
  end
end
