require "rails_helper"
RSpec.describe "Render suggestions", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:version) { real_version(project) }
  let(:environment) { create(:environment, project: project) }
  let!(:association) { create(:environment_version, project: project, environment: environment, project_version: version) }
  let(:selection) { { project_id: project.id, project_version_id: version.id, environment_ids: [ environment.id ], settings: {} } }
  before { sign_in user }
  it "returns a suggestion without saving settings, cameras, models or jobs" do
    allow(Rendering::GeminiSuggestion).to receive(:call).and_return({ summary: "Luz quente", settings: { lighting: "sunset" }, limitations: [] })
    expect { post suggest_renderings_path, params: { description: "Luz quente", configuration: selection }, as: :json }.not_to change(RenderConfiguration, :count)
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["settings"]).to eq("lighting" => "sunset")
    expect(project.reload.settings).to eq({})
  end
  it "does not send another user's project to the provider" do
    expect(Rendering::GeminiSuggestion).not_to receive(:call)
    post suggest_renderings_path, params: { description: "Luz quente", configuration: selection.merge(project_id: create(:project).id) }, as: :json
    expect(response).to have_http_status(:not_found)
  end
  it "requires a renderable association and presents provider failures safely" do
    association.update!(status: "pending")
    expect(Rendering::GeminiSuggestion).not_to receive(:call)
    post suggest_renderings_path, params: { description: "Luz quente", configuration: selection }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
  it "reports missing configuration without exposing secrets" do
    allow(Rendering::GeminiSuggestion).to receive(:call).and_raise(Rendering::GeminiSuggestion::Error, "Gemini não configurado neste servidor.")
    post suggest_renderings_path, params: { description: "Luz quente", configuration: selection }, as: :json
    expect(response).to have_http_status(:service_unavailable)
    expect(response.parsed_body["error"]).to include("não configurado")
  end
end
