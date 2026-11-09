require "rails_helper"
RSpec.describe "Guided rendering", type: :request do
  let(:user) { create(:user) }
  let(:reference) { processing_configuration(user: user) }
  let(:headers) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user }
  def payload
    { configuration: { project_id: reference.project_id, project_version_id: reference.project_version_id,
      environment_ids: reference.environment_versions.pluck(:environment_id), name: "Meu primeiro render", mode: "simple",
      settings: Rendering::GuidedProfiles.all.first.fetch(:settings), camera_ids: [], submission_key: SecureRandom.uuid,
      start_rendering: true, adapter: "simulation" } }
  end
  it "offers validated profiles with a small preview instead of an expensive default" do
    get new_rendering_path(project_id: reference.project_id), headers: headers
    expect(response).to have_http_status(:ok)
    profiles = response.parsed_body.dig("props", "guided_profiles")
    expect(profiles.map { |item| item["id"] }).to eq(%w[preview balanced presentation])
    profiles.each { |item| expect { Rendering::Settings.validate!(item.fetch("settings")) }.not_to raise_error }
    expect(profiles.first.dig("settings", "resolution_width")).to be < profiles.last.dig("settings", "resolution_width")
  end
  it "saves and submits once for a repeated intent, preserving the original reference" do
    values = payload
    previous_settings = reference.settings.deep_dup
    expect { post renderings_path, params: values, as: :json }.to change(RenderBatch, :count).by(1).and change(RenderConfiguration, :count).by(1)
    batch = RenderBatch.last
    expect(response).to redirect_to(render_batch_path(batch))
    expect(batch.render_jobs.count).to eq(2)
    expect { post renderings_path, params: values, as: :json }.not_to change(RenderConfiguration, :count)
    expect(response).to redirect_to(render_batch_path(batch))
    expect(reference.reload.settings).to eq(previous_settings)
    values[:configuration][:settings] = { samples: 8 }
    expect { post renderings_path, params: values, as: :json }.not_to change(RenderBatch, :count)
    expect(response).not_to redirect_to(render_batch_path(batch))
  end
  it "keeps save-for-later separate and rolls back invalid submissions" do
    values = payload
    values[:configuration][:start_rendering] = false
    expect { post renderings_path, params: values, as: :json }.not_to change(RenderBatch, :count)
    values[:configuration][:start_rendering] = true
    values[:configuration][:adapter] = "invalid"
    expect { post renderings_path, params: values, as: :json }.not_to change(RenderConfiguration, :count)
  end
  it "denies other owners and environments not ready for this version" do
    values = payload
    foreign = processing_configuration
    values[:configuration][:project_id] = foreign.project_id
    post renderings_path, params: values, as: :json
    expect(response).to have_http_status(:not_found)
    values = payload
    reference.environment_versions.first.update!(status: "pending")
    expect { post renderings_path, params: values, as: :json }.not_to change(RenderBatch, :count)
  end
end
