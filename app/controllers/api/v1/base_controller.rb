module Api
  module V1
    class BaseController < ApplicationController
      rescue_from Pundit::NotAuthorizedError do
        render json: { error: "Acesso negado" }, status: :forbidden
      end
      rescue_from ActiveRecord::RecordNotFound do
        render json: { error: "Registro não encontrado" }, status: :not_found
      end
      rescue_from ArgumentError, ActiveRecord::RecordInvalid, ActionController::ParameterMissing do |error|
        render json: { error: error.message }, status: :unprocessable_content
      end
      rescue_from ActionController::InvalidAuthenticityToken do
        render json: { error: "Token CSRF inválido" }, status: :unprocessable_content
      end
      private
      def authenticate_user!
        return super if current_user
        render json: { error: "Autenticação por sessão necessária" }, status: :unauthorized
      end
    end
  end
end
