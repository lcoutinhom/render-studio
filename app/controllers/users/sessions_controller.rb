module Users
  class SessionsController < Devise::SessionsController
    include InertiaDeviseResponses
    rate_limit to: 10, within: 3.minutes, only: :create,
      with: -> { redirect_to new_user_session_path, alert: "Muitas tentativas. Aguarde alguns minutos.", status: :see_other }

    def new
      render inertia: "auth/login"
    end

    protected

    def auth_options
      { scope: resource_name }
    end
  end
end
