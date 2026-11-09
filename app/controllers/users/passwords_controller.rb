module Users
  class PasswordsController < Devise::PasswordsController
    include InertiaDeviseResponses
    rate_limit to: 5, within: 10.minutes, only: :create,
      with: -> { redirect_to new_user_password_path, alert: "Aguarde antes de tentar novamente.", status: :see_other }

    def new
      render inertia: "auth/forgot-password"
    end

    def edit
      render inertia: "auth/reset-password", props: { reset_password_token: params[:reset_password_token].to_s }
    end

    protected

    def error_path
      return new_user_password_path if action_name == "create"
      edit_user_password_path(reset_password_token: resource_params[:reset_password_token])
    end
  end
end
