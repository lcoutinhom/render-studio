require "rails_helper"
RSpec.describe "ComfyUI rendering" do
  let(:configuration) { processing_configuration(names: ["Sala"]) }
  let(:png) { Base64.strict_decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4p8AAAAASUVORK5CYII=") }
  let(:runtime) { { "gpu" => "cuda:0 AMD Radeon RX 9060 XT", "pytorch_version" => "2.12.0+rocm7.14.0", "comfyui_version" => "0.42.5" } }
  let(:image) { { "filename" => "local_00001_.png", "subfolder" => "render-studio/1", "type" => "output" } }
  let(:history) { { "status" => { "completed" => true, "status_str" => "success" }, "outputs" => { "11" => { "images" => [image] } } } }
  let(:client) { instance_double(Rendering::LocalAi::Client, gpu_runtime!: runtime, upload: "reference.png", submit: SecureRandom.uuid, history: history, download: png) }
  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("COMFYUI_PIPELINE", anything).and_return("flux2_klein")
    allow(Rendering::Engines).to receive(:enabled?).and_call_original
    allow(Rendering::Engines).to receive(:enabled?).with("comfyui").and_return(true)
    allow(Rendering::LocalAi::Client).to receive(:new).and_return(client)
  end
  def submit_local(**options)
    id = configuration.snapshot.fetch("environments").first.fetch("environment_id").to_s
    submit_processing(configuration, adapter: "comfyui", reference_images: { id => "data:image/png;base64,#{Base64.strict_encode64(png)}" }, **options)
  end
  def process(job)
    ProcessRenderJob.perform_now(job.id)
    job.reload
  end
  it "uses a preserved GLB reference, mandatory prompt and native reference conditioning and stores the local result" do
    batch = submit_local(custom_prompt: "Iluminação natural suave")
    job = batch.render_jobs.sole
    original = job.snapshot.deep_dup
    expect(original.dig("prompt", "base_prompt")).to eq(Rendering::LocalAi::Prompt::BASE_PROMPT)
    expect(original.dig("prompt", "custom_prompt")).to eq("Iluminação natural suave")
    expect(original.dig("local_ai", "workflow_version")).to eq(Rendering::LocalAi::Workflow::VERSION)
    expect(Rendering::Adapters::Gemini).not_to receive(:new)
    expect(Rendering::Adapters::Blender).not_to receive(:new)
    expect(client).to receive(:submit) do |workflow:, prompt_id:|
      execution = ComfyExecution.find_by!(prompt_id: prompt_id)
      expect(execution.state).to eq("submitting")
      expect(workflow.dig("6", "inputs", "pixels")).to eq(["4", 0])
      expect(workflow.dig("8", "class_type")).to eq("ReferenceLatent")
      expect(workflow.dig("10", "inputs", "positive")).to eq(["8", 0])
      expect(workflow.dig("5", "inputs", "text")).to include(Rendering::LocalAi::Prompt::BASE_PROMPT)
    end
    expect(process(job).status).to eq("completed")
    expect(job.snapshot).to eq(original)
    output = job.render_outputs.sole
    expect(output.file.download).to eq(png)
    expect(output.metadata).to include("executor" => "comfyui", "gpu" => runtime["gpu"], "prompt_version" => "architectural-local-v2")
    expect(batch.reload.status).to eq("completed")
  end
  it "allows an empty preference and deduplicates submissions" do
    key = SecureRandom.uuid
    batch = submit_local(idempotency_key: key, custom_prompt: "  ")
    expect(batch.render_jobs.sole.snapshot.dig("prompt", "final_prompt")).to eq(Rendering::LocalAi::Prompt::BASE_PROMPT)
    expect { expect(submit_local(idempotency_key: key).id).to eq(batch.id) }.not_to change(RenderJob, :count)
    expect { submit_local(idempotency_key: key, custom_prompt: "Sombras suaves") }.to raise_error(ArgumentError, /chave/)
  end
  it "resumes a submitted execution after a polling outage without generating twice" do
    job = submit_local.render_jobs.sole
    expect(client).to receive(:submit).once
    allow(client).to receive(:history).and_raise(Rendering::LocalAi::Client::Unavailable, "Serviço indisponível")
    expect(process(job).status).to eq("failed")
    external = ComfyExecution.sole
    expect(external.state).to eq("submitted")
    retry_job = Rendering::Lifecycle.retry(job.render_batch, job: job).sole
    allow(client).to receive(:history).and_return(history)
    expect(process(retry_job).status).to eq("completed")
    expect(ComfyExecution.count).to eq(1)
    expect(retry_job.render_outputs.sole.metadata["prompt_id"]).to eq(external.prompt_id)
    expect(retry_job.snapshot).to eq(job.snapshot)
  end
  it "times out while preserving the submitted UUID, then resumes it on retry" do
    job = submit_local.render_jobs.sole
    values = [0.0, 901.0]
    adapter = Rendering::Adapters::Comfyui.new(client: client, poll_interval: 0, clock: -> { values.shift || 901.0 })
    allow(Rendering::Engines).to receive(:adapter).with("comfyui").and_return(adapter)
    expect(client).to receive(:submit).once
    expect(process(job).status).to eq("failed")
    expect(job.error_message).to include("tempo de espera")
    expect(ComfyExecution.sole.state).to eq("submitted")
    retried = Rendering::Lifecycle.retry(job.render_batch, job: job).sole
    expect(process(retried).status).to eq("completed")
    expect(ComfyExecution.count).to eq(1)
  end
  it "keeps an uncertain POST and only reconciles the same UUID on retry" do
    job = submit_local.render_jobs.sole
    expect(client).to receive(:submit).once.and_raise(Rendering::LocalAi::Client::UncertainSubmission, "Confirmação interrompida")
    expect(process(job).status).to eq("failed")
    external = ComfyExecution.sole
    expect(external.state).to eq("uncertain")
    allow(client).to receive(:history).and_return(nil)
    allow(client).to receive(:queued?).and_return(false)
    retry_job = Rendering::Lifecycle.retry(job.render_batch, job: job).sole
    expect(process(retry_job).status).to eq("failed")
    allow(client).to receive(:history).and_return(history)
    again = Rendering::Lifecycle.retry(job.render_batch, job: retry_job).sole
    expect(process(again).status).to eq("completed")
    expect(ComfyExecution.count).to eq(1)
  end
  it "reuses a completed remote result when downloading failed" do
    job = submit_local.render_jobs.sole
    expect(client).to receive(:submit).once
    allow(client).to receive(:download).and_raise(Rendering::LocalAi::Client::Unavailable, "Falha no download")
    expect(process(job).status).to eq("failed")
    expect(ComfyExecution.sole.state).to eq("completed")
    allow(client).to receive(:download).and_return(png)
    retried = Rendering::Lifecycle.retry(job.render_batch, job: job).sole
    expect(process(retried).status).to eq("completed")
  end
  it "does not publish an output after cancellation while waiting" do
    job = submit_local.render_jobs.sole
    allow(client).to receive(:history) do
      Rendering::Lifecycle.cancel(job.render_batch, job: job)
      history
    end
    expect(client).not_to receive(:download)
    expect(process(job).status).to eq("cancelled")
    expect(job.render_outputs).to be_empty
  end
  it "rejects a CPU service rather than falling back to another executor" do
    job = submit_local.render_jobs.sole
    allow(client).to receive(:gpu_runtime!).and_raise(Rendering::LocalAi::Client::Failure, "GPU AMD indisponível")
    expect(client).not_to receive(:submit)
    expect(process(job).error_message).to include("GPU AMD")
  end
  it "rejects disabled local rendering and conflicting or missing input before queueing" do
    expect { submit_local(custom_prompt: "Remova a parede") }.to raise_error(ArgumentError, /fidelidade/)
    expect { submit_processing(configuration, adapter: "comfyui") }.to raise_error(ArgumentError, /referência/)
    allow(Rendering::Engines).to receive(:enabled?).with("comfyui").and_return(false)
    expect { submit_local }.to raise_error(ArgumentError, /desativada/)
    expect(RenderBatch.count).to eq(0)
  end
end
