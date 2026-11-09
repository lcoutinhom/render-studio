class ProcessRenderJob < ApplicationJob
  queue_as :rendering
  self.enqueue_after_transaction_commit = false
  def perform(render_job_id)
    job = RenderJob.find_by(id: render_job_id)
    return unless job
    token = Rendering::Lifecycle.claim(job)
    return unless token
    engine = job.snapshot.fetch("adapter")
    unless engine == "simulation"
      if engine == "blender" && !Rendering::Engines.enabled?(engine)
        raise Rendering::Adapters::Blender::Failure
      end
      if engine == "comfyui" && !Rendering::Engines.enabled?(engine)
        raise Rendering::LocalAi::Client::Failure, "Renderização local desativada."
      end
      Rendering::Engines.adapter(engine).call(job: job, token: token)
      return
    end
    completed = Rendering::Adapters::Simulation.new.call(snapshot: job.snapshot.deep_dup, fail_first_attempt: job.simulate_failure, attempt: job.attempt) do |progress|
      Rendering::Lifecycle.advance(job, token, progress)
    end
    Rendering::Lifecycle.finish(job, token) if completed
  rescue Rendering::LocalAi::Client::Failure => error
    Rendering::Lifecycle.finish(job, token, error_code: "local_ai_failed", message: error.message) if job && token
  rescue Rendering::GeminiImage::Failure => error
    Rendering::Lifecycle.finish(job, token, error_code: "gemini_failed", message: error.message) if job && token
  rescue Rendering::Adapters::Blender::Failure
    Rendering::Lifecycle.finish(job, token, error_code: "blender_failed", message: "O Blender não concluiu os arquivos. Revise a associação do ambiente, a câmera e o tamanho da cena antes de tentar novamente.") if job && token
    Rails.logger.error("Blender execution failed job=#{render_job_id}")
  rescue Rendering::Adapters::Simulation::Failure
    Rendering::Lifecycle.finish(job, token, error_code: "simulated_failure", message: "Falha controlada da simulação. Uma nova tentativa poderá concluir normalmente.") if job && token
  rescue StandardError => error
    Rendering::Lifecycle.finish(job, token, error_code: "worker_error", message: "O executor não concluiu a tarefa. Confira o formato do modelo e tente novamente.") if job && token
    raise unless token
    Rails.logger.error("Render worker error job=#{render_job_id} error=#{error.class.name}")
  end
end
