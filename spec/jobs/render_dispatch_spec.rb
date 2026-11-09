require "rails_helper"
RSpec.describe "Render dispatch outbox" do
  let(:configuration) { processing_configuration }
  it "dispatches once per domain job and preserves delivery IDs" do
    batch = submit_processing(configuration)
    before = ActiveJob::Base.queue_adapter.enqueued_jobs.size
    Rendering::Dispatch.call(batch)
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.size - before).to eq(2)
    expect(batch.render_jobs.where(dispatched_at: nil)).to be_empty
    expect { Rendering::Dispatch.call(batch) }.not_to change { ActiveJob::Base.queue_adapter.enqueued_jobs.size }
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.last[:job]).to eq(ProcessRenderJob)
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.last[:queue]).to eq("rendering")
  end
  it "retains queued requests and retries publication when the queue is unavailable" do
    batch = submit_processing(configuration)
    allow_any_instance_of(ProcessRenderJob).to receive(:enqueue).and_raise(ActiveJob::EnqueueError, "down")
    Rendering::Dispatch.call(batch)
    expect(batch.render_jobs.where.not(dispatch_error: nil).count).to eq(2)
    expect(batch.render_jobs.pluck(:status).uniq).to eq([ "queued" ])
    expect(batch.render_jobs.where.not(dispatched_at: nil)).to be_empty
    allow_any_instance_of(ProcessRenderJob).to receive(:enqueue).and_call_original
    batch.render_jobs.update_all(next_dispatch_at: 1.second.ago)
    Rendering::Dispatch.call(batch)
    expect(batch.render_jobs.where(dispatched_at: nil)).to be_empty
  end
  it "publishes to actual Solid Queue tables and deduplicates an already recorded delivery" do
    batch = submit_processing(configuration)
    original = ProcessRenderJob.queue_adapter
    ProcessRenderJob.queue_adapter = :solid_queue
    Rendering::Dispatch.call(batch)
    tokens = batch.render_jobs.pluck(:dispatch_token)
    expect(SolidQueue::Job.where(active_job_id: tokens).count).to eq(2)
    batch.render_jobs.update_all(dispatched_at: nil)
    Rendering::Dispatch.call(batch)
    expect(SolidQueue::Job.where(active_job_id: tokens).count).to eq(2)
  ensure
    ProcessRenderJob.queue_adapter = original if original
    SolidQueue::Job.where(active_job_id: tokens).destroy_all if tokens
  end
  it "turns an unsuccessful queue execution into a failed domain attempt that can be retried" do
    batch = submit_processing(configuration)
    original = ProcessRenderJob.queue_adapter
    ProcessRenderJob.queue_adapter = :solid_queue
    Rendering::Dispatch.call(batch)
    tokens = batch.render_jobs.pluck(:dispatch_token)
    job = batch.render_jobs.first
    job.update!(dispatched_at: 1.minute.ago)
    SolidQueue::Job.find_by!(active_job_id: job.dispatch_token).update!(finished_at: Time.current)
    Rendering::Lifecycle.recover_delivery(job)
    expect(job.reload.status).to eq("failed")
    expect(job.error_code).to eq("delivery_failed")
    expect(Rendering::Lifecycle.retry(batch, job: job).first.previous_job_id).to eq(job.id)
  ensure
    ProcessRenderJob.queue_adapter = original if original
    SolidQueue::Job.where(active_job_id: tokens).destroy_all if tokens
  end

  it "runs periodic maintenance for stalled workers and unpublished requests" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    Rendering::Lifecycle.claim(job)
    job.update!(lease_expires_at: 1.second.ago)
    expect(Rendering::QueueKick).to receive(:call).with(batch.id)
    ReconcileRenderingJob.perform_now
    expect(job.reload.status).to eq("failed")
  end

  it "marks disappeared or failed queue deliveries for safe recovery" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    job.update!(dispatched_at: 1.minute.ago)
    Rendering::Lifecycle.recover_delivery(job)
    expect(job.reload.dispatched_at).to be_nil
  end
end
