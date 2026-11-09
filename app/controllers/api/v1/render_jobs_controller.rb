module Api
  module V1
    class RenderJobsController < BaseController
      def show
        job = policy_scope(RenderJob).find(params[:id])
        authorize job
        render json: { job: ProcessingPresenter.job(job, include_snapshot: true), outputs: job.render_outputs.includes(:file_attachment).map { |output| OutputPresenter.call(output) } }
      end
    end
  end
end
