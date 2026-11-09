require "rails_helper"
RSpec.describe "Local AI file rendering", type: :request do
  let(:user) { create(:user) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  let(:png) { Base64.strict_decode64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4p8AAAAASUVORK5CYII=") }
  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("COMFYUI_PIPELINE", anything).and_return("flux2_klein")
    sign_in user
    get dashboard_path
    allow(Rendering::Engines).to receive(:default).and_return("comfyui")
    allow(Rendering::Engines).to receive(:enabled?).and_call_original
    allow(Rendering::Engines).to receive(:enabled?).with("comfyui").and_return(true)
  end
  it "defaults the file UI and submissions to local AI, ignoring obsolete Blender output switches" do
    project = create(:project, user: user, settings: { "video_enabled" => true })
    version = real_version(project)
    file = version.project_file
    get project_file_path(project, file), headers: inertia
    expect(response.parsed_body.dig("props", "default_render_engine")).to eq("comfyui")
    expect(response.parsed_body.dig("props", "local_ai_enabled")).to be(true)
    key = SecureRandom.uuid
    payload = { revision_id: version.id, choices: [{ key: "scene:0", name: "Sala" }], settings: {},
      submission_key: key, custom_prompt: "Quero sombras mais suaves", reference_images: { "scene:0" => "data:image/png;base64,#{Base64.strict_encode64(png)}" } }
    post render_selected_project_file_path(project, file), params: payload, as: :json
    expect(response).to have_http_status(:see_other)
    batch = RenderBatch.sole
    expect(batch.adapter).to eq("comfyui")
    expect(batch.render_jobs.pluck(:output_type)).to eq(["image"])
    expect(batch.render_jobs.sole.snapshot.dig("prompt", "custom_prompt")).to eq("Quero sombras mais suaves")
    expect { post render_selected_project_file_path(project, file), params: payload, as: :json }.not_to change(RenderJob, :count)
  end
  it "does not expose or submit another user's file" do
    version = real_version(create(:project))
    get project_file_path(version.project, version.project_file), headers: inertia
    expect(response).to have_http_status(:not_found)
    expect {
      post render_selected_project_file_path(version.project, version.project_file), params: { revision_id: version.id, submission_key: SecureRandom.uuid }, as: :json
    }.not_to change(RenderBatch, :count)
    expect(response).to have_http_status(:not_found)
  end
end
