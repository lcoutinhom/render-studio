module Rendering
  class Aggregate
    def self.summarize(jobs)
      return { status: "queued", progress: 0 } if jobs.empty?
      states = jobs.map(&:status)
      status = if states.all? { |state| state == "completed" }
        "completed"
      elsif states.any? { |state| %w[draft queued processing].include?(state) }
        states.all? { |state| %w[draft queued].include?(state) } ? "queued" : "processing"
      elsif states.all? { |state| state == "cancelled" }
        "cancelled"
      elsif states.include?("completed")
        "partially_completed"
      else
        "failed"
      end
      { status: status, progress: (jobs.sum { |job| job.terminal? ? 100 : job.progress }.to_f / jobs.size).round }
    end

    # Caller holds the batch lock. Historical attempts do not affect current aggregate state.
    def self.refresh!(batch)
      summary = summarize(batch.latest_jobs)
      attributes = summary.merge(completed_at: RenderBatch::TERMINAL.include?(summary[:status]) ? (batch.completed_at || Time.current) : nil)
      batch.update!(attributes)
    end
  end
end
