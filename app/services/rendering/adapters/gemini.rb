require "stringio"
module Rendering
  module Adapters
    class Gemini
      def call(job:, token:)
        snapshot = job.snapshot
        reference = Base64.strict_decode64(snapshot.fetch("reference_image").delete_prefix("data:image/png;base64,"))
        return unless Lifecycle.advance(job, token, 10)
        image = GeminiImage.call(reference: reference, prompt: snapshot.fetch("prompt"), model: snapshot.fetch("gemini_model"))
        Lifecycle.finish(job, token) do |completed|
          StoreOutput.call(job: completed, io: StringIO.new(image), filename: "gemini.png", content_type: "image/png", metadata: { "executor" => "gemini", "model" => snapshot.fetch("gemini_model"), "prompt_version" => snapshot.dig("prompt", "version") })
        end
      end
    end
  end
end
