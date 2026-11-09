require "rails_helper"
RSpec.describe "Rendering library", type: :request do
  let(:user) { create(:user) }
  let(:project) { create(:project, user: user) }
  let(:version) { real_version(project) }
  let(:environment) { create(:environment, project: project) }
  let!(:association) { create(:environment_version, project: project, environment: environment, project_version: version) }
  before { sign_in user; get dashboard_path }
  it "provides immutable system presets and owner-only personal preset CRUD" do
    Rendering::SeedPresets.call
    expect { Rendering::SeedPresets.call }.not_to change(RenderPreset, :count)
    system = RenderPreset.find_by!(system_key: "fast")
    patch preset_path(system), params: { preset: { name: "Hacked", settings: {} } }, as: :json
    expect(response).to have_http_status(:forbidden)
    expect(system.reload.name).to eq("Rápido")
    post presets_path, params: { preset: { name: "Meu preset", category: "custom", settings: { samples: 64 }, system: true, user_id: create(:user).id } }, as: :json
    personal = RenderPreset.order(:id).last
    expect(personal.user).to eq(user)
    expect(personal).not_to be_system
    patch preset_path(personal), params: { preset: { name: "Alterado", category: "lighting", settings: { lighting: "night" } } }, as: :json
    expect(personal.reload.settings).to eq("lighting" => "night")
    foreign = create(:render_preset)
    delete preset_path(foreign)
    expect(response).to have_http_status(:not_found)
    delete preset_path(personal)
    expect(personal.reload.deleted_at).to be_present
  end
  it "creates/updates soft-deletes materials with validated PBR properties and isolated ownership" do
    post materials_path, params: { material: { name: "Carvalho", category: "wood", base_color: "#abcdef", roughness: 0.4, metallic: 0, transmission: 0, ior: 1.45, user_id: create(:user).id } }, as: :json
    material = Material.last
    expect(material.user).to eq(user)
    patch material_path(material), params: { material: { roughness: 2 } }, as: :json
    expect(material.reload.roughness).to eq(0.4)
    foreign = create(:material)
    get material_path(foreign)
    expect(response).to have_http_status(:not_found)
    delete material_path(material)
    expect(material.reload.deleted_at).to be_present
  end
  it "uploads private texture revisions and rejects another user's access" do
    material = create(:material, user: user)
    upload = Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/pixel.png"), "image/png")
    post material_textures_path(material), params: { texture: { slot: "base_color", file: upload } }
    texture = material.material_textures.first
    expect(texture).to be_present
    get material_texture_path(material, texture)
    expect(response).to have_http_status(:ok)
    expect(response.headers["Content-Type"]).to include("image/png")
    expect(response.headers["Cache-Control"]).to include("no-store")
    other = create(:user)
    sign_out user
    sign_in other
    get dashboard_path
    get material_texture_path(material, texture)
    expect(response).to have_http_status(:not_found)
  end
  it "supports global and environment-specific mappings and forbids cross-project ownership" do
    material = create(:material, user: user)
    post project_version_material_mappings_path(project, version), params: { mapping: { source_material_name: "Piso", material_id: material.id } }
    expect(MaterialMapping.where(project: project, environment_id: nil).count).to eq(1)
    post project_version_material_mappings_path(project, version), params: { mapping: { source_material_name: "Piso", material_id: material.id, environment_id: environment.id } }
    expect(MaterialMapping.where(project: project).count).to eq(2)
    post project_version_material_mappings_path(project, version), params: { mapping: { source_material_name: "Parede", material_id: create(:material).id } }
    expect(response).to have_http_status(:not_found)
    post project_version_material_mappings_path(project, version), params: { mapping: { source_material_name: "Parede", material_id: material.id, environment_id: create(:environment).id } }
    expect(response).to have_http_status(:not_found)
  end
  it "validates cameras and never copies them automatically into a new version" do
    attributes = { name: "Sala frontal", position: [ 0, 1.6, 3 ], rotation: [ 0, 0, 0 ], focal_length: 35, field_of_view: 50, projection_type: "perspective" }
    post project_environment_version_cameras_path(project, environment, version), params: { camera: attributes }, as: :json
    camera = environment.render_cameras.first
    expect(camera).to be_present
    expect(camera).to be_available
    patch project_environment_version_camera_path(project, environment, version, camera), params: { camera: attributes.merge(source_node_id: "invalid") }, as: :json
    expect(camera.reload.metadata).to eq({})
    next_version = real_version(project)
    expect(RenderCamera.where(project_version: next_version)).to be_empty
    post project_environment_version_cameras_path(project, environment, next_version), params: { camera: attributes }, as: :json
    expect(RenderCamera.where(project_version: next_version)).to be_empty
    delete project_environment_version_camera_path(project, environment, version, camera)
    expect(camera.reload.deleted_at).to be_present
  end
end
