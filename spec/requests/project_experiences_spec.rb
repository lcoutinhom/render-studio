require "rails_helper"
RSpec.describe "Project VR and tours", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let!(:version) { real_version(project) }
  let(:file) { version.project_file }
  let(:inertia) { { "X-Inertia" => "true", "Accept" => "text/html" } }
  before { sign_in user; get dashboard_path }
  def choices
    2.times.map do |index|
      { "key" => "manual:0:point000#{index}", "name" => "Ponto #{index}", "camera" => {
        "position" => [ index, 1.6, 3 ], "rotation" => [ 0, 0, 0 ], "focal_length" => 35,
        "field_of_view" => 54.432223, "projection_type" => "perspective" } }
    end
  end
  def generate(kind, key: SecureRandom.uuid, points: choices)
    ProjectExperiences::Create.call(user: user, project: project, kind: kind, revision_id: version.id, choices: points, key: key)
  end
  it "generates one full-model VR workload and keeps all entry cameras" do
    experience = generate("vr")
    expect(experience.render_batch.render_jobs.pluck(:output_type)).to eq([ "vr" ])
    expect(experience.render_batch.render_configuration.snapshot.fetch("environments").flat_map { |e| e.fetch("cameras") }.size).to eq(2)
    get project_experience_path(project, experience), headers: inertia
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("props", "cameras").size).to eq(2)
  end
  it "generates one panorama per point and no extra images, videos or VR" do
    experience = generate("tour")
    expect(experience.render_batch.render_jobs.pluck(:output_type)).to eq([ "panorama", "panorama" ])
  end
  it "preserves old experiences and rejects stale revisions or a changed primary file" do
    experience = generate("vr")
    next_version = nil
    inspect_file(File.binread(Rails.root.join("spec/fixtures/files/triangle.glb")), filename: "updated.glb", content_type: "model/gltf-binary") do |upload|
      next_version = ProjectVersions::Create.call(project, project_file: file, upload: upload)
    end
    expect(ProjectExperiencePresenter.call(experience)[:update_available]).to eq(true)
    expect(experience.reload.project_version_id).to eq(version.id)
    expect { generate("tour") }.to raise_error(ArgumentError, /atualizado/)
    current = ProjectExperiences::Create.call(user: user, project: project, kind: "tour", revision_id: next_version.id, choices: choices, key: SecureRandom.uuid)
    expect(current.project_version_id).to eq(next_version.id)
    expect(ProjectExperiencePresenter.call(current)[:update_available]).to eq(false)
    other = real_version(project).project_file
    put project_primary_file_path(project), params: { file_id: other.id }, as: :json
    expect(project.project_files.kept.where(primary: true).pluck(:id)).to eq([ other.id ])
    expect(ProjectExperiencePresenter.call(current)[:update_available]).to eq(true)
  end
  it "is idempotent and rejects reusing a submission key with different camera data" do
    key = SecureRandom.uuid
    first = generate("vr", key: key)
    expect(generate("vr", key: key)).to eq(first)
    changed = choices; changed.first["camera"]["position"] = [ 10, 2, 3 ]
    expect { generate("vr", key: key, points: changed) }.to raise_error(ArgumentError, /outros pontos/)
    expect(project.project_experiences.count).to eq(1)
  end
  it "isolates projects and primary files by account" do
    experience = generate("tour")
    foreign = create(:project)
    get project_experience_path(foreign, experience)
    expect(response).to have_http_status(:not_found)
    put project_primary_file_path(foreign), params: { file_id: file.id }, as: :json
    expect(response).to have_http_status(:not_found)
    put project_primary_file_path(project), params: { file_id: real_version(foreign).project_file_id }, as: :json
    expect(response).to have_http_status(:not_found)
    expect(file.reload.primary).to eq(true)
  end
end
