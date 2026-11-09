require "stringio"
module Rendering
  module Adapters
    class Comfyui
      class Stopped < StandardError; end
      def initialize(client: LocalAi::Client.new, poll_interval: 2, clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) })
        @client = client
        @poll_interval = poll_interval
        @clock = clock
      end

      def call(job:, token:)
        @job, @token = job, token
        heartbeat(5)
        execution = execution_for(job)
        if execution.state == "prepared"
          prepare_and_submit(execution)
        elsif %w[submitting uncertain].include?(execution.state)
          if @client.history(execution.prompt_id) || @client.queued?(execution.prompt_id)
            execution.update!(state: "submitted")
          else
            raise LocalAi::Client::UncertainSubmission, "A geração local anterior ainda não foi localizada. O identificador foi preservado e não será reenviado; confira a fila e o histórico do ComfyUI."
          end
        end
        result = execution.state == "completed" ? execution.result : await_result(execution)
        heartbeat(95)
        image = @client.download(result)
        metadata = @job.snapshot.fetch("local_ai").merge(execution.runtime).merge(
          "executor" => "comfyui", "prompt_id" => execution.prompt_id,
          "prompt_version" => @job.snapshot.dig("prompt", "version"),
          "reference_checksum" => Digest::SHA256.hexdigest(reference_bytes))
        width, height = LocalAi::Client.validate_png!(image)
        metadata.merge!("width" => width, "height" => height)
        Lifecycle.finish(@job, @token) do |completed|
          StoreOutput.call(job: completed, io: StringIO.new(image), filename: "local-ai.png", content_type: "image/png", metadata: metadata)
        end
      rescue Stopped
        false
      end

      private

      def execution_for(job)
        # Reuse an in-flight or completed execution across retries of the same workload.
        previous = job
        while previous
          record = ComfyExecution.find_by(render_job_id: previous.id)
          return record if record && record.state != "failed"
          previous = previous.previous_job
        end
        ComfyExecution.create!(render_job: job, prompt_id: SecureRandom.uuid)
      end

      def reference_bytes
        @reference ||= Base64.strict_decode64(@job.snapshot.fetch("reference_image").delete_prefix("data:image/png;base64,"))
      rescue ArgumentError
        raise LocalAi::Client::Failure, "Imagem de referência local inválida."
      end

      def prepare_and_submit(execution)
        runtime = @client.gpu_runtime!
        heartbeat(10)
        reference = @client.upload(reference_bytes)
        workflow = LocalAi::Workflow.build(settings: @job.snapshot.fetch("local_ai"), prompt: @job.snapshot.fetch("prompt"), reference: reference, prefix: "render-studio/#{execution.id}")
        heartbeat(15)
        execution.with_lock do
          raise LocalAi::Client::UncertainSubmission, "O envio local já está em andamento." unless execution.state == "prepared"
          execution.update!(state: "submitting", workflow: workflow, runtime: runtime)
        end
        begin
          @client.submit(workflow: workflow, prompt_id: execution.prompt_id)
          execution.update!(state: "submitted")
        rescue LocalAi::Client::UncertainSubmission
          execution.update!(state: "uncertain")
          raise
        rescue LocalAi::Client::Rejected
          execution.update!(state: "failed")
          raise
        end
      end

      def await_result(execution)
        started = @clock.call
        timeout = ENV.fetch("COMFYUI_TIMEOUT_SECONDS", "900").to_i.clamp(30, 3600)
        loop do
          elapsed = @clock.call - started
          if elapsed > timeout
            raise LocalAi::Client::Failure, "A geração local excedeu o tempo de espera. Uma nova tentativa acompanhará o mesmo identificador, sem gerar outra imagem."
          end
          heartbeat((25 + elapsed.to_i / 15).clamp(25, 90))
          history = @client.history(execution.prompt_id)
          if history
            status = history.fetch("status", {})
            if status["status_str"] == "error"
              execution.update!(state: "failed")
              raise LocalAi::Client::Failure, "O workflow local falhou. Verifique memória da GPU, modelos e log/dev/comfyui.log antes de tentar novamente."
            end
            if status["completed"] && status["status_str"] == "success"
              images = history.dig("outputs", "11", "images")
              unless images.is_a?(Array) && images.one? && images.first.is_a?(Hash)
                execution.update!(state: "failed")
                raise LocalAi::Client::Failure, "ComfyUI concluiu sem retornar a imagem esperada."
              end
              result = images.first.slice("filename", "subfolder", "type")
              execution.update!(state: "completed", result: result)
              return result
            end
          end
          sleep @poll_interval
        end
      end

      def heartbeat(progress)
        raise Stopped unless Lifecycle.advance(@job, @token, [@job.progress, progress].max)
      end
    end
  end
end
