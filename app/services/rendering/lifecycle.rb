module Rendering
  class Lifecycle
    LEASE = 2.minutes
    def self.claim(job)
      token = nil
      batch = job.render_batch
      batch.with_lock do
        job.reload
        next unless job.status == "queued"
        token = SecureRandom.uuid
        job.update!(status: "processing", lease_token: token, lease_expires_at: Time.current + LEASE,
          started_at: Time.current, dispatched_at: job.dispatched_at || Time.current, dispatch_error: nil)
        batch.update!(started_at: batch.started_at || Time.current)
        event!(job, "started", "Processamento iniciado.")
        Aggregate.refresh!(batch)
      end
      token
    end
    def self.advance(job, token, progress)
      changed = false
      batch = job.render_batch
      batch.with_lock do
        job.reload
        next unless job.status == "processing" && job.lease_token == token
        value = Integer(progress)
        raise ArgumentError, "Progresso inválido" unless value.between?(job.progress, 99)
        previous_progress = job.progress
        job.update!(progress: value, lease_expires_at: Time.current + LEASE)
        event!(job, "progress", "Processamento em andamento: #{value}%.", { "progress" => value }) unless value == previous_progress
        Aggregate.refresh!(batch)
        changed = true
      end
      changed
    end
    def self.finish(job, token, error_code: nil, message: nil)
      changed = false
      batch = job.render_batch
      batch.with_lock do
        job.reload
        next unless job.status == "processing" && job.lease_token == token
        attributes = { status: error_code ? "failed" : "completed", completed_at: Time.current, lease_token: nil, lease_expires_at: nil,
          error_code: error_code, error_message: message }
        attributes[:progress] = 100 unless error_code
        job.update!(attributes)
        yield(job) if block_given? && !error_code
        event!(job, error_code ? "failed" : "completed", message || (job.render_batch.adapter == "simulation" ? "Simulação concluída. Nenhuma imagem, vídeo ou outro arquivo foi produzido." : "Renderização concluída; resultados disponíveis."))
        Aggregate.refresh!(batch)
        changed = true
      end
      changed
    end
    def self.cancel(batch, job: nil)
      batch.with_lock do
        candidates = job ? [ batch.render_jobs.find(job.id) ] : batch.latest_jobs
        candidates.each do |item|
          next if item.terminal?
          item.update!(status: "cancelled", completed_at: Time.current, lease_token: nil, lease_expires_at: nil)
          event!(item, "cancelled", "Processamento cancelado pelo usuário.")
        end
        Aggregate.refresh!(batch)
      end
      batch
    end
    def self.retry(batch, job: nil)
      attempts = []
      batch.with_lock do
        candidates = job ? [ batch.render_jobs.find(job.id) ] : batch.latest_jobs
        candidates.each do |item|
          next unless %w[failed cancelled].include?(item.status)
          if (existing = batch.render_jobs.find_by(previous_job_id: item.id))
            attempts << existing
            next
          end
          copy = item.dup
          if item.snapshot["adapter"] == "blender"
            copy.snapshot = item.snapshot.deep_dup.merge("cycles_device" => ENV.fetch("BLENDER_DEVICE", "HIP"))
          end
          copy.assign_attributes(previous_job: item, attempt: item.attempt + 1, status: "queued", progress: 0,
            dispatch_token: SecureRandom.uuid, dispatched_at: nil, next_dispatch_at: nil, dispatch_attempts: 0, dispatch_error: nil,
            lease_token: nil, lease_expires_at: nil, started_at: nil, completed_at: nil, error_code: nil, error_message: nil)
          copy.save!
          event!(copy, "retry", "Nova tentativa criada; a tentativa anterior permanece no histórico.", { "previous_job_id" => item.id })
          attempts << copy
        end
        Aggregate.refresh!(batch)
      end
      QueueKick.after_commit(batch.id) if attempts.any?
      attempts
    end
    def self.expire(job)
      job.render_batch.with_lock do
        job.reload
        next unless job.status == "processing" && job.lease_expires_at && job.lease_expires_at <= Time.current
        finish(job, job.lease_token, error_code: "worker_interrupted", message: "O worker deixou de atualizar esta tarefa. Inicie uma nova tentativa.")
      end
    end
    def self.recover_delivery(job)
      batch = job.render_batch
      batch.with_lock do
        job.reload
        next unless job.status == "queued" && job.dispatched_at && job.dispatched_at < 30.seconds.ago
        delivery = SolidQueue::Job.find_by(active_job_id: job.dispatch_token)
        if delivery.nil?
          job.update!(dispatched_at: nil, next_dispatch_at: nil)
          event!(job, "delivery_recovered", "Entrega ausente na fila; o envio será repetido.")
        elsif delivery.failed_execution || delivery.finished_at
          job.update!(status: "failed", error_code: "delivery_failed", error_message: "O worker não iniciou esta tarefa. Inicie uma nova tentativa.", completed_at: Time.current)
          event!(job, "failed", job.error_message)
          Aggregate.refresh!(batch)
        end
      end
    end
    def self.event!(job, kind, message, details = {})
      job.render_events.create!(render_batch: job.render_batch, kind: kind, message: message, details: details)
    end
  end
end
