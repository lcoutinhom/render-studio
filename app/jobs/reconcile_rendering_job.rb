class ReconcileRenderingJob < ApplicationJob
  queue_as :maintenance
  def perform
    if ProcessRenderJob.queue_adapter.class.name == "ActiveJob::QueueAdapters::SolidQueueAdapter"
      RenderJob.where(status: "queued").where("dispatched_at < ?", 30.seconds.ago).limit(200).each { |job| Rendering::Lifecycle.recover_delivery(job) }
    end
    RenderJob.where(status: "processing").where("lease_expires_at <= ?", Time.current).limit(200).find_each do |job|
      Rendering::Lifecycle.expire(job)
    end
    RenderJob.where(status: "queued", dispatched_at: nil).where("next_dispatch_at IS NULL OR next_dispatch_at <= ?", Time.current).distinct.limit(100).pluck(:render_batch_id).each do |batch_id|
      Rendering::QueueKick.call(batch_id)
    end
  end
end
