require "rails_helper"
RSpec.describe "Render configuration requests", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:version) { real_version(project) }
  let(:environment) { create(:environment, project: project) }
  let!(:association) { create(:environment_version, environment: environment, project: project, project_version: version) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user; get dashboard_path }
  def data
    { project_id: project.id, project_version_id: version.id, environment_ids: [ environment.id ], name: "Sala de dia", mode: "simple", settings: { "samples" => 256 }, camera_ids: [] }
  end
  it "previews typed effective settings and saves configuration snapshots without jobs" do
    post preview_renderings_path, params: { configuration: data }, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("snapshot", "project_version_id")).to eq(version.id)
    before_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.size
    expect { post renderings_path, params: { configuration: data }, as: :json }.to change(RenderConfiguration, :count).by(1)
    expect(ActiveJob::Base.queue_adapter.enqueued_jobs.size).to eq(before_jobs)
    configuration = RenderConfiguration.last
    expect(response).to redirect_to(rendering_path(configuration))
    get rendering_path(configuration), headers: inertia
    expect(response.parsed_body["component"]).to eq("renderings/show")
    get edit_rendering_path(configuration), headers: inertia
    expect(response.parsed_body.dig("props", "initial", "id")).to eq(configuration.id)
  end
  it "shows only owned resources in the form and rejects cross-user preview/create/read" do
    foreign = create(:project)
    foreign_version = real_version(foreign)
    get new_rendering_path(project_id: project.id, version_id: version.id), headers: inertia
    props = response.parsed_body["props"]
    expect(props["projects"].map { |item| item["id"] }).not_to include(foreign.id)
    post preview_renderings_path, params: { configuration: data.merge(project_version_id: foreign_version.id) }, as: :json
    expect(response).to have_http_status(:not_found)
    post renderings_path, params: { configuration: data.merge(project_id: foreign.id, project_version_id: foreign_version.id) }, as: :json
    expect(response).to have_http_status(:not_found)
    own = Rendering::CreateConfiguration.call(user: user, project: project, version: version, environment_ids: [ environment.id ], settings: {}, name: "Own", mode: "custom")
    sign_out user
    sign_in foreign.user
    get dashboard_path
    get rendering_path(own)
    expect(response).to have_http_status(:not_found)
  end
  it "flags invalid references and does not carry old camera IDs into another version" do
    camera = create(:render_camera, project: project, environment: environment, project_version: version)
    configuration = Rendering::CreateConfiguration.call(user: user, project: project, version: version, environment_ids: [ environment.id ], settings: {}, camera_ids: [ camera.id ], name: "First", mode: "custom")
    next_version = real_version(project)
    get edit_rendering_path(configuration, version_id: next_version.id), headers: inertia
    expect(response.parsed_body.dig("props", "initial", "camera_ids")).to eq([])
    expect(response.parsed_body.dig("props", "initial_warning")).to be_present
    expect(configuration.reload.camera_ids).to eq([ camera.id ])
  end

  it "returns meaningful preview validation errors for invalid selectors/settings" do
    association.update!(status: "invalid")
    post preview_renderings_path, params: { configuration: data }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["error"]).to include("confirmada")
    association.update!(status: "validated")
    post preview_renderings_path, params: { configuration: data.merge(settings: { samples: -1 }) }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
  it "restores inheritance and stores per-version overrides via typed preferences" do
    put "/projects/#{project.id}/render_settings", params: { settings: { samples: 400 } }, as: :json
    expect(project.reload.settings).to eq("samples" => 400)
    put "/projects/#{project.id}/environments/#{environment.id}/render_settings", params: { settings: { samples: 200 } }, as: :json
    expect(environment.reload.settings).to eq("samples" => 200)
    put "/projects/#{project.id}/environments/#{environment.id}/render_settings", params: { settings: {} }, as: :json
    expect(environment.reload.settings).to eq({})
    put "/projects/#{project.id}/environments/#{environment.id}/versions/#{version.id}/render_settings", params: { settings: { temperature: 5000 } }, as: :json
    expect(association.reload.settings).to eq("temperature" => 5000)
    put "/projects/#{project.id}/render_settings", params: { settings: { samples: -10 } }, as: :json
    expect(project.reload.settings).to eq("samples" => 400)
  end
  it "saves the effective configuration of one environment as a personal preset" do
    post renderings_path, params: { configuration: data }, as: :json
    configuration = RenderConfiguration.last
    expect { post preset_rendering_path(configuration), params: { environment_id: environment.id, name: "Meu padrão" } }.to change(RenderPreset, :count).by(1)
    preset = RenderPreset.last
    expect(preset.user).to eq(user)
    expect(preset).not_to be_system
    expect(preset.settings["samples"]).to eq(256)
  end
end
