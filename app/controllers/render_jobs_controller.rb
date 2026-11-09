class RenderJobsController < ApplicationController
  include DomainForms
  def show
    job = policy_scope(RenderJob).find(params[:id])
    authorize job
    render inertia: "processing/job", props: { job: ProcessingPresenter.job(job, include_snapshot: true),
      batch: job.render_batch.as_json(only: %i[id status progress]), events: ProcessingPresenter.events(job.render_events), schema: RenderingPresenter.schema }
  end
  def cancel
    job = policy_scope(RenderJob).find(params[:id])
    authorize job
    Rendering::Lifecycle.cancel(job.render_batch, job: job)
    redirect_to render_job_path(job), notice: "Cancelamento registrado.", status: :see_other
  end
  def retry
    job = policy_scope(RenderJob).find(params[:id])
    authorize job
    attempts = Rendering::Lifecycle.retry(job.render_batch, job: job)
    redirect_to render_job_path(attempts.first || job), notice: attempts.any? ? "Nova tentativa solicitada; tentativa anterior preservada." : "Esta tarefa não precisa de uma nova tentativa.", status: :see_other
  end
end
