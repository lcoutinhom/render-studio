module Rendering
  module LocalAi
    # Native image-reference editing; the reference is conditioning, not text-only generation.
    class FluxWorkflow
      VERSION = "flux2-klein-reference-edit-v1".freeze
      def self.configuration
        models = {
          "diffusion_model" => ENV.fetch("COMFYUI_DIFFUSION_MODEL", "flux-2-klein-4b-fp8.safetensors"),
          "text_encoder" => ENV.fetch("COMFYUI_TEXT_ENCODER", "qwen_3_4b.safetensors"),
          "vae" => ENV.fetch("COMFYUI_VAE", "flux2-vae.safetensors")
        }
        unless models.values.all? { |name| name.match?(/\A[a-zA-Z0-9_.-]+\.safetensors\z/) }
          raise ArgumentError, "Configure nomes válidos dos modelos de edição local em safetensors."
        end
        path = File.join(ENV.fetch("COMFYUI_DATA", "/home/lcoutinho/ai/render-studio-local"), "models-manifest.json")
        manifest = File.file?(path) ? JSON.parse(File.read(path)) : []
        checksums = Array(manifest).filter_map do |item|
          next unless item.is_a?(Hash) && models.value?(File.basename(item["path"].to_s))
          [File.basename(item["path"]), item.slice("repo", "revision", "sha256")]
        end.to_h
        models.merge("workflow_version" => VERSION, "model_checksums" => checksums,
          "seed" => 626, "steps" => 4, "cfg" => 1.0, "sampler" => "euler", "conditioning" => "reference_latent")
      rescue JSON::ParserError
        raise ArgumentError, "Manifesto dos modelos ComfyUI inválido."
      end

      def self.build(settings:, prompt:, reference:, prefix:)
        {
          "1" => { "class_type" => "UNETLoader", "inputs" => { "unet_name" => settings.fetch("diffusion_model"), "weight_dtype" => "default" } },
          "2" => { "class_type" => "CLIPLoader", "inputs" => { "clip_name" => settings.fetch("text_encoder"), "type" => "flux2", "device" => "default" } },
          "3" => { "class_type" => "VAELoader", "inputs" => { "vae_name" => settings.fetch("vae") } },
          "4" => { "class_type" => "LoadImage", "inputs" => { "image" => reference } },
          "5" => { "class_type" => "CLIPTextEncode", "inputs" => { "clip" => ["2", 0], "text" => prompt.fetch("final_prompt") } },
          "6" => { "class_type" => "VAEEncode", "inputs" => { "pixels" => ["4", 0], "vae" => ["3", 0] } },
          "7" => { "class_type" => "ConditioningZeroOut", "inputs" => { "conditioning" => ["5", 0] } },
          "8" => { "class_type" => "ReferenceLatent", "inputs" => { "conditioning" => ["5", 0], "latent" => ["6", 0] } },
          "9" => { "class_type" => "ReferenceLatent", "inputs" => { "conditioning" => ["7", 0], "latent" => ["6", 0] } },
          "10" => { "class_type" => "CFGGuider", "inputs" => { "model" => ["1", 0], "positive" => ["8", 0], "negative" => ["9", 0], "cfg" => settings.fetch("cfg") } },
          "11" => { "class_type" => "SaveImage", "inputs" => { "images" => ["17", 0], "filename_prefix" => prefix } },
          "12" => { "class_type" => "EmptyFlux2LatentImage", "inputs" => { "width" => ["18", 0], "height" => ["18", 1], "batch_size" => 1 } },
          "13" => { "class_type" => "KSamplerSelect", "inputs" => { "sampler_name" => settings.fetch("sampler") } },
          "14" => { "class_type" => "Flux2Scheduler", "inputs" => { "steps" => settings.fetch("steps"), "width" => ["18", 0], "height" => ["18", 1] } },
          "15" => { "class_type" => "RandomNoise", "inputs" => { "noise_seed" => settings.fetch("seed") } },
          "16" => { "class_type" => "SamplerCustomAdvanced", "inputs" => { "noise" => ["15", 0], "guider" => ["10", 0], "sampler" => ["13", 0], "sigmas" => ["14", 0], "latent_image" => ["12", 0] } },
          "17" => { "class_type" => "VAEDecode", "inputs" => { "samples" => ["16", 0], "vae" => ["3", 0] } },
          "18" => { "class_type" => "GetImageSize", "inputs" => { "image" => ["4", 0] } }
        }
      end
    end
  end
end
