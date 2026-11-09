require "rails_helper"
RSpec.describe "Projects and environments", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:foreign) { create(:project) }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user }

  it "creates, searches, filters, sorts, edits and archives projects" do
    post projects_path, params: { project: { name: "Apartamento", client_name: "João", settings: '{"quality":"high"}' } }
    created = user.projects.last
    expect(response).to redirect_to(project_path(created))
    create(:project, user: user, name: "Casa")
    foreign
    get projects_path, params: { q: "João", sort: "name" }, headers: inertia
    expect(response.parsed_body["props"]["projects"].map { |p| p["id"] }).to eq([ created.id ])
    patch project_path(created), params: { project: { name: "Novo nome", user_id: foreign.user_id } }
    expect(created.reload.user).to eq(user)
    expect(created.settings).to include("quality" => "professional", "samples" => Rendering::Settings::DEFAULTS["samples"])
    patch archive_project_path(created)
    expect(created.reload.status).to eq("archived")
    get projects_path, params: { status: "active" }, headers: inertia
    expect(response.parsed_body["props"]["projects"].map { |p| p["id"] }).not_to include(created.id)
  end

  it "returns form validation errors instead of storing invalid settings" do
    expect {
      post projects_path, params: { project: { name: "Bad", settings: "[]" } }
    }.not_to change(Project, :count)
    expect(response).to redirect_to(new_project_path)
    expect {
      post projects_path, params: { project: { name: "Bad", settings: [] } }, as: :json
    }.not_to change(Project, :count)
    expect(response).to redirect_to(new_project_path)
  end

  it "creates, edits, duplicates, reorders and soft-deletes environments" do
    post project_environments_path(project), params: { environment: { name: "Sala", environment_type: "living_room", settings: '{"exposure":1}' } }
    environment = project.environments.last
    patch project_environment_path(project, environment), params: { environment: { name: "Sala principal", project_id: foreign.id } }
    expect(environment.reload.project_id).to eq(project.id)
    expect(environment.settings).to eq("exposure" => 1)
    post duplicate_project_environment_path(project, environment)
    copy = project.environments.order(:id).last
    expect(copy.stable_id).not_to eq(environment.stable_id)
    patch reorder_project_environments_path(project), params: { ids: [ copy.id, environment.id ] }
    expect(project.environments.ordered.first).to eq(copy)
    delete project_environment_path(project, environment)
    expect(environment.reload.deleted_at).to be_present
  end

  it "uploads a model, associates multiple environments and preserves identity on a new version" do
    first_env = create(:environment, project: project)
    second_env = create(:environment, project: project)
    post project_versions_path(project), params: { version: { file: glb_upload, description: "Inicial" } }
    expect(response).to have_http_status(:see_other)
    first = project.project_versions.first
    expect(first).to be_present
    [ first_env, second_env ].each do |environment|
      put project_environment_version_path(project, environment, first), params: { association: { status: "validated", source_reference: { kind: "objects", references: [ "0" ] }.to_json } }
      expect(response).to have_http_status(:see_other)
    end
    expect(first.environment_versions.count).to eq(2)
    expect(ActiveStorage::Attachment.where(record: first).count).to eq(1)
    post project_versions_path(project), params: { version: { file: glb_upload } }
    second = project.project_versions.order(:version_number).last
    expect(second.environment_versions).to be_empty
    expect(first.reload.environment_versions.count).to eq(2)
    get project_path(project, version_id: second.id), headers: inertia
    expect(response.parsed_body["props"]["associations"]).to be_empty
    get project_environment_path(project, first_env, version_id: first.id), headers: inertia
    expect(response.parsed_body["props"].dig("environment", "stable_id")).to eq(first_env.stable_id)
  end

  it "streams only authorized original files and disables public Active Storage routes" do
    version = real_version(project)
    get download_project_version_path(project, version)
    expect(response).to have_http_status(:ok)
    expect(response.body.b).to eq(File.binread(Rails.root.join("spec/fixtures/files/triangle.glb")))
    expect(response.headers["Cache-Control"]).to include("no-store")
    expect(response.headers["Content-Disposition"]).to include("attachment")
    get "/rails/active_storage/blobs/redirect/#{version.original_file.blob.signed_id}/model.glb"
    expect(response).to have_http_status(:not_found)
    sign_out user
    get download_project_version_path(project, version)
    expect(response).to redirect_to(new_user_session_path)
  end

  it "rejects invalid files without creating versions or blob records" do
    expect {
      post project_versions_path(project), params: { version: { file: nil } }
    }.not_to change(ActiveStorage::Blob, :count)
    expect(project.project_versions).to be_empty
    expect(response).to redirect_to(project_path(project))
  end

  it "rejects uploads to archived projects and cleans unattached uploaded blobs" do
    project.archive!
    expect { post project_versions_path(project), params: { version: { file: glb_upload } } }.not_to change(ActiveStorage::Blob, :count)
    expect(project.project_versions).to be_empty
  end

  it "isolates reads, mutations, association and downloads between users and projects" do
    # Establish the cookie before a deliberately failing request unwinds the session middleware.
    get dashboard_path
    foreign_env = create(:environment, project: foreign)
    foreign_version = real_version(foreign)
    [ project_path(foreign), edit_project_path(foreign), project_environment_path(foreign, foreign_env), download_project_version_path(foreign, foreign_version), project_path(project, version_id: foreign_version.id) ].each do |path|
      get path
      expect(response).to have_http_status(:not_found), "#{path}: #{response.status} #{response.location}"
    end
    patch project_path(foreign), params: { project: { name: "Hacked" } }
    expect(response).to have_http_status(:not_found)
    post duplicate_project_path(foreign)
    expect(response).to have_http_status(:not_found)
    delete project_environment_path(project, foreign_env)
    expect(response).to have_http_status(:not_found)
    own_env = create(:environment, project: project)
    put project_environment_version_path(project, own_env, foreign_version), params: { association: { status: "pending" } }
    expect(response).to have_http_status(:not_found)
    get projects_path, headers: inertia
    expect(response.parsed_body["props"]["projects"].map { |p| p["id"] }).not_to include(foreign.id)
  end

  it "duplicates projects and soft-deletes without destroying models" do
    version = real_version(project)
    post duplicate_project_path(project)
    expect(response).to have_http_status(:see_other)
    copy = user.projects.where.not(id: project.id).last
    expect(copy.project_versions.first.original_file.blob_id).to eq(version.original_file.blob_id)
    delete project_path(project)
    expect(project.reload.deleted_at).to be_present
    expect(version.reload.original_file).to be_attached
    get project_path(project)
    expect(response).to have_http_status(:not_found)
  end
end
