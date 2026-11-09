module Rendering
  module Engines
    NAMES = %w[simulation blender gemini comfyui].freeze
    LABELS = { "simulation" => "Simulação", "blender" => "Blender", "gemini" => "Gemini", "comfyui" => "IA local" }.freeze
    def self.default = ENV.fetch("DEFAULT_RENDER_ENGINE", "comfyui")
    def self.image_ai?(name) = %w[gemini comfyui].include?(name)
    def self.enabled?(name)
      case name
      when "simulation" then true
      when "blender" then ENV["BLENDER_RENDER_ENABLED"] == "true"
      when "gemini" then GeminiImage.enabled?
      when "comfyui" then ENV["LOCAL_AI_ENABLED"] == "true"
      else false
      end
    end
    def self.adapter(name)
      case name
      when "blender" then Adapters::Blender.new
      when "gemini" then Adapters::Gemini.new
      when "comfyui" then Adapters::Comfyui.new
      else raise ArgumentError, "Executor inválido"
      end
    end
    def self.label(name) = LABELS.fetch(name, name)
  end
end
