module Rendering
  class QueueKick
    def self.after_commit(batch_id)
      ActiveRecord.after_all_transactions_commit { call(batch_id) }
    end
    def self.call(batch_id)
      DispatchRenderBatchJob.perform_later(batch_id)
    rescue StandardError => error
      # RenderJob rows are the durable outbox. The periodic maintenance job recovers them.
      Rails.logger.error("Render dispatch pending batch=#{batch_id} error=#{error.class.name}")
      false
    end
  end
end
