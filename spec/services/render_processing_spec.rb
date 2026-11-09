require "rails_helper"
RSpec.describe "Render processing lifecycle" do
  let(:configuration) { processing_configuration }
  before { fast_simulation }
  it "creates single or multi-environment batches from immutable configuration snapshots" do
    first = configuration.snapshot.fetch("environments").first
    single = submit_processing(configuration, environment_ids: [ first.fetch("environment_id") ])
    expect(single.render_jobs.count).to eq(1)
    all = submit_processing(configuration)
    expect(all.render_jobs.count).to eq(2)
    original = all.render_jobs.first.snapshot.deep_dup
    configuration.project.update!(settings: { "samples" => 8192 })
    configuration.environment_versions.first.update!(source_reference: { "kind" => "scene", "references" => [ "0" ] })
    expect(all.render_jobs.first.reload.snapshot).to eq(original)
    expect(original["environment"]["effective_settings"]).to eq(first["effective_settings"])
  end
  it "deduplicates submission keys and rejects conflicting reuse" do
    key = SecureRandom.uuid
    first = submit_processing(configuration, idempotency_key: key)
    expect { expect(submit_processing(configuration, idempotency_key: key).id).to eq(first.id) }.not_to change(RenderJob, :count)
    expect { submit_processing(configuration, idempotency_key: key, environment_ids: [ configuration.snapshot["environments"].first["environment_id"] ]) }.to raise_error(ArgumentError, /chave/)
    configuration.project.archive!
    expect(submit_processing(configuration, idempotency_key: key).id).to eq(first.id)
    expect { submit_processing(configuration) }.to raise_error(ArgumentError, /arquivado/)
  end
  it "rejects invalid or foreign selections and unconfirmed environments atomically" do
    expect { submit_processing(configuration, environment_ids: []) }.to raise_error(ArgumentError)
    expect { submit_processing(configuration, environment_ids: [ create(:environment).id ]) }.to raise_error(ArgumentError)
    id = configuration.snapshot["environments"].first["environment_id"]
    expect { submit_processing(configuration, environment_ids: [ id, id ]) }.to raise_error(ArgumentError)
    expect { submit_processing(configuration, failure_environment_ids: [ create(:environment).id ]) }.to raise_error(ArgumentError)
    configuration.environment_versions.first.update!(status: "invalid")
    expect { submit_processing(configuration) }.to raise_error(ArgumentError)
    expect(RenderBatch.count).to eq(0)
  end
  it "expands camera/output workloads without creating one task per video frame or image" do
    config = processing_configuration(names: [ "Sala" ], cameras: true, settings: { "image_count" => 10, "video_enabled" => true, "panorama_enabled" => true, "vr_enabled" => true })
    batch = submit_processing(config)
    expect(batch.render_jobs.count).to eq(8)
    expect(batch.render_jobs.pluck(:workload_key).uniq.size).to eq(8)
    expect(batch.render_jobs.pluck(:output_type).uniq).to match_array(%w[image video panorama vr])
  end
  it "limits excessive fanout before persisting a batch" do
    stub_const("Rendering::Submit::MAX_JOBS", 1)
    expect { submit_processing(configuration) }.to raise_error(ArgumentError, /excede/)
    expect(RenderBatch.count).to eq(0)
  end
  it "deduplicates deliveries and refuses terminal transitions or progress regressions" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    token = Rendering::Lifecycle.claim(job)
    expect(Rendering::Lifecycle.claim(job)).to be_nil
    expect(Rendering::Lifecycle.advance(job, "wrong", 10)).to be false
    expect(Rendering::Lifecycle.advance(job, token, 45)).to be true
    expect { Rendering::Lifecycle.advance(job, token, 10) }.to raise_error(ArgumentError)
    expect(Rendering::Lifecycle.finish(job, token)).to be true
    expect(Rendering::Lifecycle.finish(job, token)).to be false
    expect { job.reload.update!(status: "processing", lease_token: SecureRandom.uuid, lease_expires_at: 1.minute.from_now) }.to raise_error(ActiveRecord::RecordInvalid)
  end
  it "runs the adapter to completion and records events without output files" do
    batch = submit_processing(configuration)
    blobs = ActiveStorage::Blob.count
    batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
    expect(batch.reload.status).to eq("completed")
    expect(batch.progress).to eq(100)
    expect(batch.render_jobs.pluck(:status).uniq).to eq([ "completed" ])
    expect(ActiveStorage::Blob.count).to eq(blobs)
    expect(batch.render_events.where(kind: "progress").count).to eq(12)
    expect(batch.render_events.where(kind: "completed").first.message).to include("Nenhuma")
  end
  it "isolates partial failures and retries with new attempts, preserving historical rows" do
    failed_id = configuration.snapshot["environments"].first["environment_id"]
    batch = submit_processing(configuration, failure_environment_ids: [ failed_id ])
    batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
    expect(batch.reload.status).to eq("partially_completed")
    failed = batch.render_jobs.find_by!(status: "failed")
    original = failed.snapshot.deep_dup
    retries = Rendering::Lifecycle.retry(batch, job: failed)
    expect(retries.first.attempt).to eq(2)
    expect(Rendering::Lifecycle.retry(batch, job: failed).first.id).to eq(retries.first.id)
    expect(batch.render_jobs.count).to eq(3)
    ProcessRenderJob.perform_now(retries.first.id)
    expect(batch.reload.status).to eq("completed")
    expect(failed.reload.status).to eq("failed")
    expect(failed.snapshot).to eq(original)
    expect(retries.first.snapshot).to eq(original)
  end
  it "cancels queued and processing tasks while completed tasks remain unchanged" do
    batch = submit_processing(configuration)
    first, second = batch.render_jobs.order(:id).to_a
    ProcessRenderJob.perform_now(first.id)
    token = Rendering::Lifecycle.claim(second)
    Rendering::Lifecycle.cancel(batch)
    expect(first.reload.status).to eq("completed")
    expect(second.reload.status).to eq("cancelled")
    expect(Rendering::Lifecycle.advance(second, token, 50)).to be false
    expect(Rendering::Lifecycle.finish(second, token)).to be false
    expect(batch.reload.status).to eq("partially_completed")
    retry_job = Rendering::Lifecycle.retry(batch, job: second).first
    ProcessRenderJob.perform_now(retry_job.id)
    expect(batch.reload.status).to eq("completed")
  end
  it "cancels an individual task cooperatively during adapter progress" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    adapter = Rendering::Adapters::Simulation.new(step_seconds: 0)
    allow(Rendering::Adapters::Simulation).to receive(:new).and_return(adapter)
    allow(adapter).to receive(:call).and_wrap_original do |method, **args, &callback|
      method.call(**args) do |progress|
        Rendering::Lifecycle.cancel(batch, job: job) if progress == 25
        callback.call(progress)
      end
    end
    ProcessRenderJob.perform_now(job.id)
    expect(job.reload.status).to eq("cancelled")
    expect(batch.render_jobs.where(status: "queued").count).to eq(1)
  end
  it "recovers abandoned leases without letting an old worker overwrite the terminal attempt" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    token = Rendering::Lifecycle.claim(job)
    job.update!(lease_expires_at: 1.second.ago)
    Rendering::Lifecycle.expire(job)
    expect(job.reload.status).to eq("failed")
    expect(job.error_code).to eq("worker_interrupted")
    expect(Rendering::Lifecycle.finish(job, token)).to be false
  end
  it "stores safe error messages without leaking worker exception contents" do
    batch = submit_processing(configuration)
    allow(Rendering::Adapters::Simulation).to receive(:new).and_raise(StandardError, "private-token-secret")
    job = batch.render_jobs.first
    ProcessRenderJob.perform_now(job.id)
    expect(job.reload.status).to eq("failed")
    expect(job.error_message).not_to include("private-token-secret")
    expect(job.render_events.pluck(:message).join).not_to include("private-token-secret")
  end
  it "enforces user/version/environment consistency at the database boundary" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    foreign = create(:environment_version)
    expect {
      RenderJob.transaction(requires_new: true) do
        RenderJob.where(id: job.id).update_all(environment_id: foreign.environment_id, environment_version_id: foreign.id)
      end
    }.to raise_error(ActiveRecord::InvalidForeignKey)
    expect {
      RenderBatch.transaction(requires_new: true) { RenderBatch.where(id: batch.id).update_all(user_id: create(:user).id) }
    }.to raise_error(ActiveRecord::InvalidForeignKey)
  end
end
