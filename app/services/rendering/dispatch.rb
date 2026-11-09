module Rendering
  class Dispatch
    CHUNK = 100
    def self.call(batch)
      pending = batch.render_jobs.where(status: "queued", dispatched_at: nil).where("next_dispatch_at IS NULL OR next_dispatch_at <= ?", Time.current).order(:id).limit(CHUNK).pluck(:id)
      pending.each do |id|
        batch.with_lock do
          job = batch.render_jobs.find(id)
          next unless job.status == "queued" && job.dispatched_at.nil? && (!job.next_dispatch_at || job.next_dispatch_at <= Time.current)
          begin
            # A stable Active Job ID lets a recovered dispatcher recognize an already published delivery.
            already_present = ProcessRenderJob.queue_adapter.class.name == "ActiveJob::QueueAdapters::SolidQueueAdapter" && SolidQueue::Job.exists?(active_job_id: job.dispatch_token)
            unless already_present
              delivery = ProcessRenderJob.new(job.id)
              delivery.job_id = job.dispatch_token
              delivery.enqueue
              raise ActiveJob::EnqueueError, "Queue unavailable" unless delivery.successfully_enqueued?
            end
            job.update!(dispatched_at: Time.current, dispatch_error: nil, next_dispatch_at: nil, dispatch_attempts: job.dispatch_attempts + 1)
            Lifecycle.event!(job, "dispatched", "Tarefa enviada para a fila rendering.")
          rescue StandardError => error
            job.update!(dispatch_error: "Fila indisponível; o envio será repetido automaticamente.", next_dispatch_at: 30.seconds.from_now, dispatch_attempts: job.dispatch_attempts + 1)
            Lifecycle.event!(job, "dispatch_failed", "Envio à fila adiado; a solicitação está preservada.")
            Rails.logger.error("Render dispatch deferred job=#{job.id} error=#{error.class.name}")
          end
        end
      end
      pending.size
    end
  end
end
