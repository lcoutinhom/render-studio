require "rails_helper"
RSpec.describe "Cameras from selected recovered scenes", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:environment) { create(:environment, project: project) }
  let(:version) do
    raw = File.binread(Rails.root.join("spec/fixtures/files/triangle.glb"))
    length = raw.byteslice(12, 4).unpack1("V")
    document = JSON.parse(raw.byteslice(20, length))
    document["nodes"] += [ { "name" => "COZINHA 1", "translation" => [ 1, 2, 3 ] }, { "name" => "JANTAR 1", "translation" => [ 4, 5, 6 ] } ]
    document["scenes"][0]["nodes"] += [ 1, 2 ]
    json = document.to_json.b
    json << " " * ((-json.bytesize) % 4)
    body = [ json.bytesize, 0x4e4f534a ].pack("V2") + json + raw.byteslice(20 + length, raw.bytesize)
    bytes = [ 0x46546c67, 2, body.bytesize + 12 ].pack("V3") + body
    inspect_file(bytes, filename: "views.glb", content_type: "model/gltf-binary") { |upload| ProjectVersions::Create.call(project, upload: upload) }
  end
  let!(:association) { create(:environment_version, project: project, environment: environment, project_version: version) }
  let(:cameras) do
    [ 1, 2 ].map { |id| { name: "Vista #{id}", position: [ id, 1.6, 3 ], rotation: [ 0, 0, 0 ], focal_length: 35, field_of_view: 54.43, projection_type: "perspective", recovered_view_key: "0:#{id}" } }
  end
  let(:path) { bulk_create_project_environment_version_cameras_path(project, environment, version) }
  before { sign_in user }
  it "creates only selected cameras for the scoped environment/version and ignores repeat submissions" do
    expect { post path, params: { cameras: cameras }, as: :json }.to change(RenderCamera, :count).by(2)
    expect(response).to redirect_to(project_environment_path(project, environment, version_id: version.id, tab: "cameras"))
    expect(environment.render_cameras.pluck(:project_version_id).uniq).to eq([ version.id ])
    expect(environment.render_cameras.map { |camera| camera.metadata["recovered_view_key"] }).to match_array(%w[0:1 0:2])
    expect { post path, params: { cameras: cameras }, as: :json }.not_to change(RenderCamera, :count)
  end
  it "rolls back the entire selection if one camera is invalid" do
    expect { post path, params: { cameras: [ cameras.first, cameras.last.merge(position: [ 1 ]) ] }, as: :json }.not_to change(RenderCamera, :count)
    expect(response).to have_http_status(:see_other)
  end
  it "rejects geometry nodes, unknown scenes and duplicate references" do
    [ "0:0", "8:1", "0:99" ].each do |key|
      expect { post path, params: { cameras: [ cameras.first.merge(recovered_view_key: key) ] }, as: :json }.not_to change(RenderCamera, :count)
    end
    expect { post path, params: { cameras: [ cameras.first, cameras.first ] }, as: :json }.not_to change(RenderCamera, :count)
  end
  it "keeps source identity after editing and permits replacing a soft-deleted camera" do
    post path, params: { cameras: [ cameras.first ] }, as: :json
    camera = environment.render_cameras.sole
    patch project_environment_version_camera_path(project, environment, version, camera), params: { camera: cameras.first.merge(name: "Editada") }, as: :json
    expect(camera.reload.metadata["recovered_view_key"]).to eq("0:1")
    expect { post path, params: { cameras: [ cameras.first ] }, as: :json }.not_to change(RenderCamera, :count)
    camera.update!(deleted_at: Time.current)
    expect { post path, params: { cameras: [ cameras.first ] }, as: :json }.to change(RenderCamera, :count).by(1)
  end
  it "rejects another account and a version without an association" do
    other_project = create(:project)
    post bulk_create_project_environment_version_cameras_path(other_project, environment, version), params: { cameras: cameras }, as: :json
    expect(response).to have_http_status(:not_found)
    another_version = real_version(project)
    expect { post bulk_create_project_environment_version_cameras_path(project, environment, another_version), params: { cameras: cameras }, as: :json }.not_to change(RenderCamera, :count)
  end
  it "rejects empty, oversized and malformed selections" do
    [ [], [ cameras.first ] * 101, [ "invalid" ], [ cameras.first.merge(position: [ {}, 0, 0 ]) ] ].each do |selection|
      expect { post path, params: { cameras: selection }, as: :json }.not_to change(RenderCamera, :count)
      expect(response).to have_http_status(:see_other)
    end
  end
end
