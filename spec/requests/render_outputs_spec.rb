require "rails_helper"
require "digest"
RSpec.describe "Results and dashboard", type: :request do
  let(:user) { create(:user) }
  let(:configuration) { processing_configuration(user: user) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user; get dashboard_path; fast_simulation }
  def stored_output(configuration)
    # Only test database fixtures: the simulation adapter never attaches files.
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    ProcessRenderJob.perform_now(job.id)
    bytes = File.binread(Rails.root.join("spec/fixtures/files/pixel.png"))
    Rendering::StoreOutput.call(job: job.reload, io: StringIO.new(bytes), filename: "result.png", content_type: "image/png")
  end
  it "keeps simulations empty and counts real account records without counting retry attempts as batches" do
    batch = submit_processing(configuration)
    batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
    foreign = submit_processing(processing_configuration)
    get outputs_path, headers: inertia
    expect(response.parsed_body.dig("props", "total")).to eq(0)
    expect(response.parsed_body.dig("props", "outputs")).to eq([])
    get dashboard_path, headers: inertia
    totals = response.parsed_body.dig("props", "totals")
    expect(totals).to include("projects" => 1, "environments" => 2, "completed_batches" => 1, "active_batches" => 0, "outputs" => 0)
    expect(response.parsed_body.dig("props", "batches").map { |item| item["id"] }).not_to include(foreign.id)
  end
  it "serves immutable private files, byte ranges, and exact snapshot links" do
    output = stored_output(configuration)
    get output_path(output), headers: inertia
    data = response.parsed_body.dig("props", "output")
    expect(data).to include("job_id" => output.render_job_id, "version_id" => configuration.project_version_id, "attempt" => 1)
    get download_output_path(output)
    expect(response).to have_http_status(:ok)
    expect(response.body.b).to eq(output.file.download)
    expect(response.headers).to include("cache-control" => "private, no-store", "x-content-type-options" => "nosniff")
    expect(response.headers["content-disposition"]).to start_with("attachment;")
    get preview_output_path(output), headers: { "Range" => "bytes=0-7" }
    expect(response).to have_http_status(:partial_content)
    expect(response.body.b).to eq("\x89PNG\r\n\x1a\n".b)
    expect(response.headers["content-range"]).to eq("bytes 0-7/#{output.byte_size}")
    get preview_output_path(output), headers: { "Range" => "bytes=999999-" }
    expect(response).to have_http_status(:range_not_satisfiable)
    expect { output.update!(filename: "replacement.png") }.to raise_error(ActiveRecord::ReadonlyAttributeError)
    replacement = ActiveStorage::Blob.create_and_upload!(io: StringIO.new("replacement"), filename: "result.png", content_type: "image/png", identify: false)
    output.file = replacement
    expect(output).not_to be_valid
  end
  it "filters by every identity, preserves results through version updates and deletion, and omits other accounts" do
    output = stored_output(configuration)
    foreign = stored_output(processing_configuration)
    job = output.render_job
    get outputs_path, params: { project_id: job.project_id, environment_id: job.environment_id, version_id: job.project_version_id, job_id: job.id, batch_id: job.render_batch_id, kind: "image", status: "completed" }, headers: inertia
    expect(response.parsed_body.dig("props", "outputs").map { |item| item["id"] }).to eq([ output.id ])
    get outputs_path, params: { version_id: foreign.render_job.project_version_id }, headers: inertia
    expect(response.parsed_body.dig("props", "total")).to eq(0)
    new_version = real_version(configuration.project)
    get outputs_path, params: { version_id: new_version.id }, headers: inertia
    expect(response.parsed_body.dig("props", "total")).to eq(0)
    job.environment.discard!
    configuration.project.discard!
    get download_output_path(output)
    expect(response).to have_http_status(:ok)
    get outputs_path, params: { project_id: job.project_id }, headers: inertia
    expect(response.parsed_body.dig("props", "total")).to eq(1)
    expect(response.parsed_body.dig("props", "projects").map { |item| item["id"] }).to include(job.project_id)
    [ output_path(foreign), preview_output_path(foreign), download_output_path(foreign) ].each do |path|
      get path
      expect(response).to have_http_status(:not_found)
    end
  end
  it "filters individual-environment and batch history without duplicate batches" do
    batch = submit_processing(configuration)
    job = batch.render_jobs.first
    Rendering::Lifecycle.cancel(batch, job: job)
    Rendering::Lifecycle.retry(batch, job: job)
    get render_batches_path, params: { project_id: batch.project_id, environment_id: job.environment_id, version_id: batch.project_version_id }, headers: inertia
    expect(response.parsed_body.dig("props", "total")).to eq(1)
    expect(response.parsed_body.dig("props", "batches").map { |item| item["id"] }).to eq([ batch.id ])
  end
  it "denies anonymous access and rejects incompatible artifacts" do
    output = stored_output(configuration)
    invalid = output.dup
    invalid.file.attach(output.file.blob)
    invalid.kind = "video"
    expect(invalid).not_to be_valid
    sign_out user
    get download_output_path(output)
    expect(response).to redirect_to(new_user_session_path)
  end
end
