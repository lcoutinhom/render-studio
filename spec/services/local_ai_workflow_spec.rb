require "rails_helper"
RSpec.describe Rendering::LocalAi::Workflow do
  let(:prompt) { Rendering::LocalAi::Prompt.snapshot }
  it "conditions edits on both the encoded reference and fidelity instructions" do
    settings = Rendering::LocalAi::FluxWorkflow.configuration
    graph = described_class.build(settings: settings, prompt: prompt, reference: "original.png", prefix: "render-studio/1")
    expect(settings).to include("steps" => 4, "cfg" => 1.0, "seed" => 626)
    expect(graph.dig("1", "inputs", "unet_name")).to eq(settings["diffusion_model"])
    expect(graph.dig("6", "inputs", "pixels")).to eq(["4", 0])
    expect(graph.dig("8", "inputs", "latent")).to eq(["6", 0])
    expect(graph.dig("9", "inputs", "latent")).to eq(["6", 0])
    expect(graph.dig("10", "inputs", "positive")).to eq(["8", 0])
    expect(graph.dig("12", "inputs", "width")).to eq(["18", 0])
    expect(graph.dig("18", "inputs", "image")).to eq(["4", 0])
    expect(graph.dig("5", "inputs", "text")).to include(Rendering::LocalAi::Prompt::PRESERVATION_PROMPT)
  end
  it "keeps old SDXL snapshots replayable with their original parameters and prompt" do
    settings = Rendering::LocalAi::SdxlWorkflow.configuration.merge("seed" => 123, "denoise" => 0.25, "steps" => 12)
    old_prompt = { "final_prompt" => "Original preserved prompt", "version" => "architectural-local-v1" }
    graph = described_class.build(settings: settings, prompt: old_prompt, reference: "original.png", prefix: "render-studio/1")
    expect(graph.dig("6", "class_type")).to eq("Canny")
    expect(graph.dig("9", "inputs")).to include("denoise" => 0.25, "steps" => 12, "seed" => 123)
    expect(graph.dig("2", "inputs", "text")).to eq("Original preserved prompt")
    expect(graph.dig("11", "inputs", "images")).to eq(["10", 0])
  end
  it "rejects unknown workflow versions rather than silently using another pipeline" do
    expect { described_class.build(settings: { "workflow_version" => "unknown" }, prompt: prompt, reference: "original.png", prefix: "result") }.to raise_error(ArgumentError, /Versão/)
  end
end
