require "rails_helper"
RSpec.describe "Gemini rendering" do
  let(:configuration) { processing_configuration(names: ["Sala"]) }
  let(:reference) { "data:image/png;base64,#{Base64.strict_encode64("\x89PNG\r\n\x1a\nreference".b)}" }
  before do
    allow(Rendering::GeminiImage).to receive(:enabled?).and_return(true)
    allow(Rendering::GeminiImage).to receive(:model).and_return("image-test-model")
  end
  def submit_gemini(**options)
    id = configuration.snapshot.fetch("environments").first.fetch("environment_id").to_s
    submit_processing(configuration, adapter: "gemini", reference_images: { id => reference }, **options)
  end
  it "persists base, preferences, version and reference without invoking Blender" do
    batch = submit_gemini(custom_prompt: "Quero sombras mais suaves.")
    job = batch.render_jobs.sole
    expect(job.snapshot.dig("prompt", "custom_prompt")).to eq("Quero sombras mais suaves.")
    expect(job.snapshot.dig("prompt", "version")).to eq(Rendering::PromptBuilder::VERSION)
    expect(job.snapshot["reference_image"]).to eq(reference)
    expect(Rendering::Adapters::Blender).not_to receive(:new)
    allow(Rendering::GeminiImage).to receive(:call).and_return("\x89PNG\r\n\x1a\noutput".b)
    ProcessRenderJob.perform_now(job.id)
    expect(job.reload.status).to eq("completed")
    expect(job.render_outputs.sole.metadata["executor"]).to eq("gemini")
  end
  it "supports no preferences and preserves snapshots on retry" do
    batch = submit_gemini
    job = batch.render_jobs.sole
    expect(job.snapshot.dig("prompt", "final_prompt")).to eq(Rendering::PromptBuilder::BASE_PROMPT)
    snapshot = job.snapshot.deep_dup
    token = Rendering::Lifecycle.claim(job)
    Rendering::Lifecycle.finish(job, token, error_code: "test", message: "test")
    expect(Rendering::Lifecycle.retry(batch).sole.snapshot).to eq(snapshot)
  end
  it "rejects conflicting idempotent reuse" do
    key = SecureRandom.uuid
    submit_gemini(idempotency_key: key)
    expect { submit_gemini(idempotency_key: key, custom_prompt: "Sombras suaves") }.to raise_error(ArgumentError, /chave/)
  end
  it "blocks Blender when disabled" do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("BLENDER_RENDER_ENABLED").and_return("false")
    expect { submit_processing(configuration, adapter: "blender") }.to raise_error(ArgumentError, /feature flag/)
  end
  it "rejects missing references without creating a batch" do
    expect { submit_processing(configuration, adapter: "gemini") }.to raise_error(ArgumentError, /referência/)
    expect(RenderBatch.count).to eq(0)
  end
end
