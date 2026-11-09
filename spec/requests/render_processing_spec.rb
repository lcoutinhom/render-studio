require "rails_helper"
RSpec.describe "Render processing requests", type: :request do
  let(:user) { create(:user) }
  let(:configuration) { processing_configuration(user: user) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user; get dashboard_path; fast_simulation }
  it "submits an idempotent subset and renders batch/job history" do
    ids = [ configuration.snapshot["environments"].first["environment_id"] ]
    params = { submission: { idempotency_key: SecureRandom.uuid, environment_ids: ids, failure_environment_ids: [] } }
    post rendering_submissions_path(configuration), params: params, as: :json
    batch = RenderBatch.last
    expect(response).to redirect_to(render_batch_path(batch))
    expect(batch.render_jobs.count).to eq(1)
    expect { post rendering_submissions_path(configuration), params: params, as: :json }.not_to change(RenderBatch, :count)
    get render_batch_path(batch), headers: inertia
    expect(response.parsed_body["component"]).to eq("processing/show")
    expect(response.parsed_body.dig("props", "batch", "adapter")).to eq("simulation")
    job = batch.render_jobs.first
    get project_environment_path(configuration.project, job.environment, version_id: configuration.project_version_id), headers: inertia
    expect(response.parsed_body.dig("props", "processing_history").map { |item| item["id"] }).to eq([ job.id ])
    get project_path(configuration.project), headers: inertia
    expect(response.parsed_body.dig("props", "processing_history").map { |item| item["id"] }).to eq([ batch.id ])
    get render_job_path(job), headers: inertia
    expect(response.parsed_body.dig("props", "job", "snapshot", "project_version_id")).to eq(configuration.project_version_id)
  end
  it "cancels and retries without replacing original attempts" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    post cancel_render_job_path(job)
    expect(job.reload.status).to eq("cancelled")
    post retry_render_job_path(job)
    expect(response).to redirect_to(render_job_path(job.next_attempt))
    post retry_render_job_path(job)
    expect(batch.render_jobs.count).to eq(3)
    post cancel_render_batch_path(batch)
    expect(batch.reload.status).to eq("cancelled")
    post retry_render_batch_path(batch)
    expect(batch.reload.status).to eq("queued")
  end
  it "rejects cross-user submission, history, status, cancellation and retries" do
    foreign = processing_configuration
    foreign_batch = submit_processing(foreign)
    foreign_job = foreign_batch.render_jobs.first
    post rendering_submissions_path(foreign), params: { submission: { idempotency_key: SecureRandom.uuid } }, as: :json
    expect(response).to have_http_status(:not_found)
    [ render_batch_path(foreign_batch), render_job_path(foreign_job) ].each do |path|
      get path, headers: inertia
      expect(response).to have_http_status(:not_found)
    end
    [ cancel_render_batch_path(foreign_batch), retry_render_batch_path(foreign_batch), cancel_render_job_path(foreign_job), retry_render_job_path(foreign_job) ].each do |path|
      post path
      expect(response).to have_http_status(:not_found)
    end
    get render_batches_path, headers: inertia
    expect(response.parsed_body.dig("props", "batches")).to eq([])
  end
  it "keeps historical processing accessible to its owner after a project is soft-deleted" do
    batch = submit_processing(configuration)
    configuration.project.discard!
    get render_batch_path(batch), headers: inertia
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("props", "batch", "project_deleted")).to be true
  end
end
