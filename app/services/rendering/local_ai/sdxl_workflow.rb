require "digest"
module Rendering
  module LocalAi
    class SdxlWorkflow
      VERSION = "sdxl-canny-img2img-v1".freeze
      def self.configuration
        checkpoint = ENV.fetch("COMFYUI_CHECKPOINT", "sd_xl_base_1.0.safetensors")
        controlnet = ENV.fetch("COMFYUI_CONTROLNET", "sdxl-canny-fp16.safetensors")
        unless [checkpoint, controlnet].all? { |name| name.match?(/\A[a-zA-Z0-9_.-]+\.safetensors\z/) }
          raise ArgumentError, "Configure nomes válidos dos modelos locais em safetensors."
        end
        manifest_path = File.join(ENV.fetch("COMFYUI_DATA", "/home/lcoutinho/ai/render-studio-local"), "models-manifest.json")
        manifest = File.file?(manifest_path) ? JSON.parse(File.read(manifest_path)) : []
        checksums = Array(manifest).filter_map do |item|
          next unless item.is_a?(Hash) && [checkpoint, controlnet].include?(File.basename(item["path"].to_s))
          [File.basename(item["path"]), item.slice("repo", "revision", "sha256")]
        end.to_h
        { "workflow_version" => VERSION, "checkpoint" => checkpoint, "controlnet" => controlnet,
          "model_checksums" => checksums, "seed" => SecureRandom.random_number(2**31), "steps" => 12,
          "denoise" => 0.25, "cfg" => 5.0, "strength" => 0.85, "sampler" => "euler", "scheduler" => "normal" }
      rescue JSON::ParserError
        raise ArgumentError, "Manifesto dos modelos ComfyUI inválido."
      end

      def self.build(settings:, prompt:, reference:, prefix:)
        raise ArgumentError, "Versão do workflow local indisponível" unless settings.fetch("workflow_version") == VERSION
        {
          "1" => { "class_type" => "CheckpointLoaderSimple", "inputs" => { "ckpt_name" => settings.fetch("checkpoint") } },
          "2" => { "class_type" => "CLIPTextEncode", "inputs" => { "text" => prompt.fetch("final_prompt"), "clip" => ["1", 1] } },
          "3" => { "class_type" => "CLIPTextEncode", "inputs" => { "text" => "redesign, changed geometry, added furniture, missing objects, altered materials, cartoon, clay render, distorted perspective", "clip" => ["1", 1] } },
          "4" => { "class_type" => "LoadImage", "inputs" => { "image" => reference } },
          "5" => { "class_type" => "VAEEncode", "inputs" => { "pixels" => ["4", 0], "vae" => ["1", 2] } },
          "6" => { "class_type" => "Canny", "inputs" => { "image" => ["4", 0], "low_threshold" => 0.3, "high_threshold" => 0.6 } },
          "7" => { "class_type" => "ControlNetLoader", "inputs" => { "control_net_name" => settings.fetch("controlnet") } },
          "8" => { "class_type" => "ControlNetApplyAdvanced", "inputs" => { "positive" => ["2", 0], "negative" => ["3", 0], "control_net" => ["7", 0], "image" => ["6", 0], "strength" => settings.fetch("strength"), "start_percent" => 0.0, "end_percent" => 1.0 } },
          "9" => { "class_type" => "KSampler", "inputs" => { "model" => ["1", 0], "positive" => ["8", 0], "negative" => ["8", 1], "latent_image" => ["5", 0], "seed" => settings.fetch("seed"), "steps" => settings.fetch("steps"), "cfg" => settings.fetch("cfg"), "sampler_name" => settings.fetch("sampler"), "scheduler" => settings.fetch("scheduler"), "denoise" => settings.fetch("denoise") } },
          "10" => { "class_type" => "VAEDecode", "inputs" => { "samples" => ["9", 0], "vae" => ["1", 2] } },
          "11" => { "class_type" => "SaveImage", "inputs" => { "images" => ["10", 0], "filename_prefix" => prefix } }
        }
      end
    end
  end
end
