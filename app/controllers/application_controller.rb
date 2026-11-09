class ApplicationController < ActionController::Base
  include Authorization
  after_action { response.headers["Cache-Control"] = "private, no-store" }
  protect_from_forgery with: :exception
  before_action :configure_permitted_parameters, if: :devise_controller?

  inertia_share do
    {
      auth: { user: current_user&.as_json(only: %i[id name email unconfirmed_email confirmed_at]) },
      flash: flash.to_hash.slice("notice", "alert"),
      csrf_token: form_authenticity_token
    }
  end

  rescue_from Pundit::NotAuthorizedError do
    head :forbidden
  end

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:account_update, keys: [ :name ])
  end

  def after_sign_in_path_for(_resource)
    dashboard_path
  end

  def after_sign_out_path_for(_resource)
    new_user_session_path
  end
end
