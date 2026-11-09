require "rails_helper"
RSpec.describe "Solid infrastructure" do
  it "persists cache entries in the dedicated PostgreSQL database" do
    store = ActiveSupport::Cache.lookup_store(:solid_cache_store)
    key = "foundation-#{SecureRandom.uuid}"
    store.write(key, "ready")
    expect(store.read(key)).to eq("ready")
    expect(SolidCache::Entry.connection_db_config.name).to eq("cache")
  ensure
    store&.delete(key) if key
  end

  it "persists jobs in Solid Queue rather than an in-process queue" do
    job = Class.new(ApplicationJob) { def perform; end }
    stub_const("FoundationProbeJob", job)
    job.queue_adapter = :solid_queue
    submitted = job.perform_later
    expect(SolidQueue::Job.find_by(active_job_id: submitted.job_id)).to be_present
    expect(SolidQueue::Record.connection_db_config.name).to eq("queue")
  ensure
    SolidQueue::Job.find_by(active_job_id: submitted&.job_id)&.destroy!
  end
end
