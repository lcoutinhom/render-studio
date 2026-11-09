class ProcessingPresenter
  def self.job(job, include_snapshot: false)
    data = job.as_json(only: %i[id render_batch_id environment_id attempt previous_job_id workload_key output_type camera_id status progress started_at completed_at error_code error_message dispatched_at dispatch_error created_at])
    data["adapter"] = job.snapshot["adapter"]
    data["cycles_device"] = job.snapshot.fetch("cycles_device", "CPU")
    data["environment_name"] = job.snapshot.dig("environment", "name")
    data["camera_name"] = job.snapshot.dig("camera", "name") || "Automática"
    if job.status == "processing"
      data["worker_responding"] = job.lease_expires_at.present? && job.lease_expires_at > Time.current
      data["last_signal_at"] = job.updated_at.iso8601
      if job.output_type == "video"
        settings = job.snapshot.dig("environment", "effective_settings") || {}
        frames = (settings.fetch("video_duration", 0).to_f * settings.fetch("video_fps", 0).to_i).round
        data["render_workload"] = "#{frames} quadros · #{settings['video_width']}×#{settings['video_height']} · #{settings['samples']} samples. O progresso é por etapas/quadros, não uma previsão de tempo."
      end
    end
    data["next_attempt_id"] = job.next_attempt&.id
    data["snapshot"] = job.snapshot if include_snapshot
    data
  end
  def self.batch(batch)
    latest = batch.latest_jobs
    data = batch.as_json(only: %i[id render_configuration_id project_id project_version_id adapter status progress started_at completed_at created_at])
    data["name"] = batch.render_configuration.name
    data["project_name"] = batch.project.name
    data["project_deleted"] = batch.project.deleted_at.present?
    data["project_file_id"] = batch.project_version.project_file_id
    data["file_revision"] = batch.project_version.file_revision
    data["version_number"] = batch.project_version.version_number
    data["counts"] = latest.group_by(&:status).transform_values(&:size)
    data["total_jobs"] = latest.size
    data["environments"] = latest.group_by(&:environment_id).map do |id, jobs|
      summary = Rendering::Aggregate.summarize(jobs)
      { id: id, name: jobs.first.snapshot.dig("environment", "name"), status: summary[:status], progress: summary[:progress],
        jobs: jobs.map { |job| self.job(job) } }
    end
    data
  end
  def self.events(scope)
    scope.order(id: :desc).limit(100).map { |event| event.as_json(only: %i[id render_job_id kind message details created_at]) }
  end
end
