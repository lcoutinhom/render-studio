module Authorization
  extend ActiveSupport::Concern
  include Pundit::Authorization

  included do
    before_action :authenticate_user!, unless: :devise_controller?
    after_action :verify_authorized, unless: :devise_controller?
    after_action :verify_policy_scoped, if: -> { !devise_controller? && action_name == "index" }
  end
end
