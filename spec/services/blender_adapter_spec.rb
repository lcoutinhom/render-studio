require "rails_helper"
RSpec.describe "Blender workload lifecycle" do
  let(:configuration) { processing_configuration }
  it "uses HIP by default for new Blender workloads and retries of old CPU workloads" do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("BLENDER_DEVICE", "HIP").and_return("HIP")
    batch = submit_processing(configuration, adapter: "blender")
    expect(batch.render_jobs.map { |job| job.snapshot["cycles_device"] }.uniq).to eq([ "HIP" ])
    cpu_batch = submit_processing(configuration, adapter: "blender", device: "CPU")
    old_job = cpu_batch.render_jobs.first
    Rendering::Lifecycle.cancel(cpu_batch, job: old_job)
    next_job = Rendering::Lifecycle.retry(cpu_batch, job: old_job).sole
    expect(next_job.snapshot["cycles_device"]).to eq("HIP")
    expect(old_job.reload.snapshot["cycles_device"]).to eq("CPU")
  end
  it "freezes adapter and differentiates idempotency across executors" do
    key = SecureRandom.uuid
    batch = submit_processing(configuration, adapter: "blender", idempotency_key: key)
    expect { submit_processing(configuration, adapter: "simulation", idempotency_key: key) }.to raise_error(ArgumentError)
    expect { batch.update!(adapter: "simulation") }.to raise_error(ActiveRecord::ReadonlyAttributeError)
  end
  it "rolls back completion if artifact publication fails and ignores stale leases" do
    batch = submit_processing(configuration, adapter: "blender")
    job = batch.render_jobs.first
    token = Rendering::Lifecycle.claim(job)
    expect { Rendering::Lifecycle.finish(job, token) { raise "storage error" } }.to raise_error("storage error")
    expect(job.reload.status).to eq("processing")
    Rendering::Lifecycle.cancel(batch, job: job)
    expect { Rendering::Lifecycle.finish(job, token) { raise "must not publish" } }.not_to raise_error
    expect(job.reload.status).to eq("cancelled")
    expect(job.render_outputs.count).to eq(0)
    next_attempt = Rendering::Lifecycle.retry(batch, job: job).first
    expect(next_attempt.snapshot).to eq(job.snapshot)
    expect(next_attempt.snapshot["adapter"]).to eq("blender")
  end
  it "terminates an active subprocess when cooperative cancellation wins" do
    batch = submit_processing(configuration, adapter: "blender")
    job = batch.render_jobs.first
    token = Rendering::Lifecycle.claim(job)
    Dir.mktmpdir("blender-cancel-test-") do |directory|
      executable = File.join(directory, "fake-blender")
      File.write(executable, "#!/bin/sh\nsleep 30\n")
      File.chmod(0700, executable)
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("BLENDER_BIN", "/snap/bin/blender").and_return(executable)
      allow(Rendering::Lifecycle).to receive(:advance) do
        Rendering::Lifecycle.cancel(batch, job: job)
        false
      end
      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      expect(Rendering::Adapters::Blender.new.call(job: job, token: token)).to be false
      expect(Process.clock_gettime(Process::CLOCK_MONOTONIC)-started).to be < 10
      expect(job.reload.status).to eq("cancelled")
      expect(job.render_outputs).to be_empty
    end
  end
  it "freezes HIP and submits only the requested video without silently adding image tasks" do
    video = processing_configuration(names: [ "Sala" ], settings: { "video_enabled" => true })
    key = SecureRandom.uuid
    batch = Rendering::Submit.call(user: video.user, configuration: video, idempotency_key: key, adapter: "blender", device: "HIP", output_types: [ "video" ])
    expect(batch.render_jobs.pluck(:output_type)).to eq([ "video" ])
    expect(batch.render_jobs.sole.snapshot["cycles_device"]).to eq("HIP")
    expect { Rendering::Submit.call(user: video.user, configuration: video, idempotency_key: key, adapter: "blender", device: "CPU", output_types: [ "video" ]) }.to raise_error(ArgumentError)
    expect { Rendering::Submit.call(user: video.user, configuration: video, idempotency_key: SecureRandom.uuid, adapter: "blender", device: "AUTO") }.to raise_error(ArgumentError)
  end
end
