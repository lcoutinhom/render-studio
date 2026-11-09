module Rendering
  module LocalAi
    class Workflow
      VERSION = FluxWorkflow::VERSION
      DEFAULT_PIPELINE = "flux2_klein".freeze
      def self.configuration
        case ENV.fetch("COMFYUI_PIPELINE", DEFAULT_PIPELINE)
        when "flux2_klein" then FluxWorkflow.configuration
        when "sdxl" then SdxlWorkflow.configuration
        else raise ArgumentError, "Pipeline de IA local inválido. Use flux2_klein ou sdxl."
        end
      end

      def self.build(settings:, prompt:, reference:, prefix:)
        builder = case settings.fetch("workflow_version")
        when FluxWorkflow::VERSION then FluxWorkflow
        when SdxlWorkflow::VERSION then SdxlWorkflow
        else raise ArgumentError, "Versão do workflow local indisponível"
        end
        builder.build(settings: settings, prompt: prompt, reference: reference, prefix: prefix)
      end
    end
  end
end
