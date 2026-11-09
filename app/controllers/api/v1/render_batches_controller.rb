module Api
  module V1
    class RenderBatchesController < BaseController
      rate_limit to: 20, within: 1.minute, only: :create, by: -> { current_user.id }, with: -> { render json: { error: "Limite de solicitações; aguarde um minuto" }, status: :too_many_requests }
      def index
        authorize RenderBatch
        scope = policy_scope(RenderBatch).order(id: :desc)
        scope = scope.where(project_id: params[:project_id]) if params[:project_id].present?
        scope = scope.where(project_version_id: params[:version_id]) if params[:version_id].present?
        scope = scope.where(status: params[:status]) if params[:status].present?
        page = [ params[:page].to_i, 1 ].max
        render json: { total: scope.count, page: page, batches: scope.offset((page - 1) * 20).limit(20).as_json(only: %i[id project_id project_version_id adapter status progress created_at]) }
      end
      def show
        batch = policy_scope(RenderBatch).find(params[:id])
        authorize batch
        render json: { batch: ProcessingPresenter.batch(batch), events: ProcessingPresenter.events(batch.render_events) }
      end
      def create
        authorize RenderBatch
        raw = params.require(:submission)
        configuration = policy_scope(RenderConfiguration).find(raw[:configuration_id])
        batch = Rendering::Submit.call(user: current_user, configuration: configuration, idempotency_key: raw[:idempotency_key], custom_prompt: raw[:custom_prompt], reference_images: raw[:reference_images].is_a?(ActionController::Parameters) ? raw[:reference_images].to_unsafe_h : {},
          adapter: raw[:adapter].presence || "simulation", environment_ids: raw[:environment_ids], failure_environment_ids: raw[:failure_environment_ids] || [])
        render json: { id: batch.id, status: batch.status, adapter: batch.adapter }, status: :accepted
      end
      def cancel
        batch = policy_scope(RenderBatch).find(params[:id])
        authorize batch
        Rendering::Lifecycle.cancel(batch)
        render json: { id: batch.id, status: batch.reload.status }
      end
      def retry
        batch = policy_scope(RenderBatch).find(params[:id])
        authorize batch
        jobs = Rendering::Lifecycle.retry(batch)
        render json: { id: batch.id, attempt_ids: jobs.map(&:id) }, status: :accepted
      end
    end
  end
end
