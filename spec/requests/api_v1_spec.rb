require "rails_helper"
RSpec.describe "Versioned internal API", type: :request do
  let(:user) { create(:user) }
  let(:configuration) { processing_configuration(user: user) }
  let(:headers) { { "Accept" => "application/json" } }
  before { sign_in user }
  it "lists only owned projects, version associations and immutable processing" do
    project = configuration.project
    foreign = processing_configuration
    get api_v1_projects_path, headers: headers
    expect(response.parsed_body.fetch("projects").map { |item| item["id"] }).to eq([ project.id ])
    get api_v1_project_path(project), headers: headers
    expect(response.parsed_body.fetch("versions").first.fetch("environments").size).to eq(2)
    get api_v1_project_path(foreign.project), headers: headers
    expect(response).to have_http_status(:not_found)
  end
  it "submits idempotent Blender requests, isolates snapshots and supports cancellation/retry" do
    payload = { submission: { configuration_id: configuration.id, idempotency_key: SecureRandom.uuid, adapter: "blender" } }
    post api_v1_render_batches_path, params: payload, as: :json
    expect(response).to have_http_status(:accepted)
    batch = RenderBatch.find(response.parsed_body.fetch("id"))
    expect(batch.adapter).to eq("blender")
    expect(batch.render_jobs.pluck(:snapshot).map { |snapshot| snapshot.fetch("adapter") }.uniq).to eq([ "blender" ])
    expect { post api_v1_render_batches_path, params: payload, as: :json }.not_to change(RenderBatch, :count)
    job = batch.render_jobs.first
    get api_v1_render_job_path(job), headers: headers
    expect(response.parsed_body.dig("job", "snapshot", "model_checksum")).to eq(configuration.project_version.checksum)
    post cancel_api_v1_render_batch_path(batch), as: :json
    expect(batch.reload.status).to eq("cancelled")
    post retry_api_v1_render_batch_path(batch), as: :json
    expect(response).to have_http_status(:accepted)
    expect(batch.render_jobs.count).to eq(4)
    foreign = submit_processing(processing_configuration)
    [ api_v1_render_batch_path(foreign), api_v1_render_job_path(foreign.render_jobs.first) ].each do |path|
      get path, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
  it "rejects incompatible simulation controls and unknown adapters" do
    [ { adapter: "unknown" }, { adapter: "blender", failure_environment_ids: configuration.environment_versions.pluck(:environment_id) } ].each do |options|
      post api_v1_render_batches_path, params: { submission: { configuration_id: configuration.id, idempotency_key: SecureRandom.uuid }.merge(options) }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
  it "creates a versioned configuration through the API without enqueuing and validates settings" do
    project = configuration.project
    payload = { configuration: { project_id: project.id, project_version_id: configuration.project_version_id, environment_ids: configuration.environment_versions.pluck(:environment_id), name: "API configuration", settings: { samples: 8 } } }
    expect { post api_v1_render_configurations_path, params: payload, as: :json }.not_to change(RenderBatch, :count)
    expect(response).to have_http_status(:created)
    id = response.parsed_body.fetch("id")
    get api_v1_render_configuration_path(id), headers: headers
    expect(response.parsed_body.dig("configuration", "snapshot", "project_version_id")).to eq(configuration.project_version_id)
    payload[:configuration][:settings] = { unknown: true }
    post api_v1_render_configurations_path, params: payload, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
  it "requires a session instead of accepting arbitrary bearer credentials" do
    sign_out user
    get api_v1_projects_path, headers: headers.merge("Authorization" => "Bearer arbitrary")
    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body).to have_key("error")
  end
  it "limits repeated submissions without creating duplicate work" do
    payload = { submission: { configuration_id: configuration.id, idempotency_key: SecureRandom.uuid } }
    20.times { post api_v1_render_batches_path, params: payload, as: :json }
    expect(response).to have_http_status(:accepted)
    post api_v1_render_batches_path, params: payload, as: :json
    expect(response).to have_http_status(:too_many_requests)
    expect(RenderBatch.where(user: user).count).to eq(1)
  end
  it "requires CSRF on authenticated JSON mutations" do
    configuration
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    post api_v1_render_batches_path, params: { submission: { configuration_id: configuration.id, idempotency_key: SecureRandom.uuid } }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.fetch("error")).to include("CSRF")
    get dashboard_path, headers: { "X-Inertia" => "true", "Accept" => "text/html" }
    token = response.parsed_body.dig("props", "csrf_token")
    post api_v1_render_batches_path, params: { submission: { configuration_id: configuration.id, idempotency_key: SecureRandom.uuid } }, headers: { "X-CSRF-Token" => token }, as: :json
    expect(response).to have_http_status(:accepted)
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end
end
