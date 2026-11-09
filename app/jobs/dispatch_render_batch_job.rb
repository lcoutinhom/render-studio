class DispatchRenderBatchJob < ApplicationJob
  queue_as :maintenance
  def perform(batch_id)
    batch = RenderBatch.find_by(id: batch_id)
    return unless batch
    count = Rendering::Dispatch.call(batch)
    self.class.perform_later(batch_id) if count == Rendering::Dispatch::CHUNK
  end
end
