require "rails_helper"
RSpec.describe "Private VR model results", type: :request do
  let(:user) { create(:user) }
  before { sign_in user; get dashboard_path; fast_simulation }
  def vr_output(owner)
    config = processing_configuration(user: owner, names: [ "Sala" ], settings: { "vr_enabled" => true })
    batch = submit_processing(config)
    job = batch.render_jobs.find_by!(output_type: "vr")
    ProcessRenderJob.perform_now(job.id)
    bytes = File.binread(Rails.root.join("spec/fixtures/files/triangle.glb"))
    Rendering::StoreOutput.call(job: job.reload, io: StringIO.new(bytes), filename: "project-vr.glb", content_type: "model/gltf-binary", metadata: { navigation: "teleport", geometry_preserved: true })
  end
  it "exposes a project-scoped downloadable GLB to its owner with private ranges and snapshot" do
    output = vr_output(user)
    get output_path(output), headers: { "X-Inertia" => "true", "Accept" => "text/html" }
    expect(response.parsed_body.dig("props", "output")).to include("kind" => "vr", "content_type" => "model/gltf-binary", "project_id" => output.render_job.project_id)
    expect(response.parsed_body.dig("props", "snapshot", "project_version_id")).to eq(output.render_job.project_version_id)
    get download_output_path(output), headers: { "Range" => "bytes=0-11" }
    expect(response).to have_http_status(:partial_content)
    expect(response.body.byteslice(0, 4)).to eq("glTF")
    expect(response.headers["cache-control"]).to eq("private, no-store")
    get preview_output_path(output)
    expect(response).to have_http_status(:not_found)
  end
  it "denies another account and anonymous access to both viewer data and model bytes" do
    output = vr_output(create(:user))
    [ output_path(output), download_output_path(output) ].each { |path| get path; expect(response).to have_http_status(:not_found) }
    sign_out user
    get download_output_path(output)
    expect(response).to redirect_to(new_user_session_path)
  end
end
