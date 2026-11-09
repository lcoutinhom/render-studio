module Users
  class ConfirmationsController < Devise::ConfirmationsController
    include InertiaDeviseResponses
    rate_limit to: 5, within: 10.minutes, only: :create,
      with: -> { redirect_to new_user_confirmation_path, alert: "Aguarde antes de tentar novamente.", status: :see_other }

    def new
      render inertia: "auth/confirmation"
    end

    def show
      self.resource = resource_class.confirm_by_token(params[:confirmation_token])
      if resource.errors.empty?
        redirect_to new_user_session_path, notice: "E-mail confirmado. Você já pode entrar.", status: :see_other
      else
        redirect_to new_user_confirmation_path, status: :see_other,
          inertia: { errors: resource.errors.to_hash.transform_values(&:first) }
      end
    end

    protected

    def error_path = new_user_confirmation_path
  end
end
