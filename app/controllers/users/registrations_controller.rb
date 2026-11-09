module Users
  # Only the explicit authenticated account-update routes are exposed.
  class RegistrationsController < Devise::RegistrationsController
    include InertiaDeviseResponses
    before_action :authorize_update, only: :update

    protected

    def after_update_path_for(_resource) = profile_path
    def error_path = profile_path

    private

    def authorize_update
      authorize current_user, :update?
    end
  end
end
