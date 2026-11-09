require "rails_helper"
RSpec.describe "Client and project file workflow", type: :request do
  let(:user) { create(:user) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user; get dashboard_path; fast_simulation }
  it "creates a client, inherits defaults into projects and isolates clients by account" do
    put render_defaults_path, params: { settings: { samples: 32, resolution_width: 800, resolution_height: 600 } }, as: :json
    post clients_path, params: { client: { name: "Maria", email: "maria@example.test" } }, as: :json
    client = user.clients.sole
    post projects_path, params: { project: { name: "Apartamento", client_id: client.id } }, as: :json
    project = user.projects.sole
    expect(project.client).to eq(client)
    expect(project.settings["samples"]).to eq(32)
    put render_defaults_path, params: { settings: { samples: 64 } }, as: :json
    expect(project.reload.settings["samples"]).to eq(32)
    foreign = Client.create!(user: create(:user), name: "Outro")
    [ client_path(foreign), edit_client_path(foreign) ].each { |path| get path; expect(response).to have_http_status(:not_found) }
    expect { post projects_path, params: { project: { name: "No", client_id: foreign.id } }, as: :json }.not_to change(Project, :count)
  end
  it "keeps several independent uploads and revisions only of the selected file" do
    project = create(:project, user: user)
    post project_files_path(project), params: { upload: { file: glb_upload } }
    first = project.project_files.sole
    first_version = first.project_versions.sole
    post project_files_path(project), params: { upload: { file: glb_upload } }
    expect(project.project_files.count).to eq(2)
    post revision_project_file_path(project, first), params: { upload: { file: glb_upload } }
    expect(first.project_versions.order(:file_revision).pluck(:file_revision)).to eq([ 1, 2 ])
    expect(first_version.reload.original_file).to be_attached
    get project_path(project), headers: inertia
    expect(response.parsed_body["component"]).to eq("projects/workspace")
    get project_file_path(project, first), headers: inertia
    expect(response.parsed_body.dig("props", "version", "file_revision")).to eq(2)
    foreign = create(:project)
    get project_file_path(foreign, first)
    expect(response).to have_http_status(:not_found)
  end
  it "validates the same settings JSON for import/export and applies it only to the selected project" do
    project = create(:project, user: user)
    document = { schema_version: 1, settings: { samples: 16, lighting: "sunset" } }
    post settings_document_validate_path, params: { document: document }, as: :json
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("settings", "samples")).to eq(16)
    put "/projects/#{project.id}/configuration", params: { document: document }, as: :json
    expect(project.reload.settings["lighting"]).to eq("sunset")
    get "/projects/#{project.id}/configuration/export"
    expect(JSON.parse(response.body)["schema_version"]).to eq(1)
    expect(JSON.parse(response.body)["settings"]).to eq(project.settings)
    post settings_document_validate_path, params: { document: { schema_version: 1, settings: { python: "bad" } } }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end
  it "renders checked scenes without a manual environment and preserves snapshots across file revisions" do
    project = create(:project, user: user)
    version = real_version(project); file = version.project_file
    expect(project.environments.reload).to be_empty
    choices = [ { key: "scene:0", name: "Vista geral" } ]
    key = SecureRandom.uuid
    post render_selected_project_file_path(project, file), params: { revision_id: version.id, choices: choices, settings: { samples: 16 }, submission_key: key, adapter: "simulation" }, as: :json
    expect(response).to have_http_status(:see_other)
    batch = RenderBatch.last
    expect(batch).to be_present
    expect(batch.project_id).to eq(project.id)
    expect(batch.render_jobs.count).to eq(1)
    expect(batch.render_configuration.snapshot.dig("file_request", "choices")).to eq(choices.map(&:stringify_keys))
    expect { post render_selected_project_file_path(project, file), params: { revision_id: version.id, choices: choices, settings: { samples: 16 }, submission_key: key, adapter: "simulation" }, as: :json }.not_to change(RenderBatch, :count)
    post revision_project_file_path(project, file), params: { upload: { file: glb_upload } }
    expect(batch.reload.project_version_id).to eq(version.id)
    get project_file_path(project, file, revision_id: version.id), headers: inertia
    expect(response.parsed_body.dig("props", "version", "id")).to eq(version.id)
  end
  it "rejects invalid selections atomically without leaving internal scenes or cameras" do
    project = create(:project, user: user); version = real_version(project)
    expect { Rendering::FileRender.call(user: user, project_file: version.project_file, version: version, choices: [ { "key"=>"scene:0", "name"=>"Sala" }, { "key"=>"scene:99", "name"=>"Bad" } ], settings: {}, key: SecureRandom.uuid, adapter: "simulation") }.to raise_error(ArgumentError)
    expect(project.environments.reload).to be_empty
    expect(RenderCamera.where(project: project)).to be_empty
    expect(RenderBatch.where(project: project)).to be_empty
  end
  it "keeps projects editable after archiving a client without accepting archived clients on new projects" do
    client=Client.create!(user: user, name: "Cliente")
    project=create(:project, user: user, client: client)
    delete client_path(client)
    patch project_path(project), params: { project: { name: "Projeto preservado", client_id: client.id } }, as: :json
    expect(project.reload.name).to eq("Projeto preservado")
    expect { post projects_path, params: { project: { name: "Novo", client_id: client.id } }, as: :json }.not_to change(Project, :count)
  end
end
