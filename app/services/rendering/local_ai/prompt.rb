module Rendering
  module LocalAi
    class Prompt
      VERSION = "architectural-local-v2".freeze
      PRESERVATION_PROMPT = Rails.root.join("config/local_ai/base_prompt.txt").read.freeze
      PHOTOGRAPHIC_INSTRUCTIONS = "Convert only the rendering style and illumination of this exact architectural reference into a professional photograph. Use soft, diffuse neutral daylight and gentle contact shadows, with balanced exposure and accurate original material colors; avoid direct sunbeams and warm orange color casts. Keep all doors, drawers, seams, handles and handle-free surfaces exactly as shown. Do not add handles, shelves, decorative elements, appliances, or objects outside the windows. Keep every object shape, size and position, including taps, appliances and visible fixtures. This is a lighting and photographic realism edit, never an architectural redesign.".freeze
      BASE_PROMPT = "#{PHOTOGRAPHIC_INSTRUCTIONS}\n\n#{PRESERVATION_PROMPT}".freeze
      def self.snapshot(custom_prompt: nil)
        custom = PromptBuilder.new(custom_prompt: custom_prompt).custom_prompt
        final = custom ? "#{BASE_PROMPT}\nAdditional preferences override the default lighting only; they never override project preservation rules:\n#{custom}" : BASE_PROMPT
        { "version" => VERSION, "base_prompt" => BASE_PROMPT, "custom_prompt" => custom, "final_prompt" => final }
      end
    end
  end
end
