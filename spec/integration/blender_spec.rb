require "rails_helper"
RSpec.describe "Blender executable integration", :blender do
  before { skip "RUN_BLENDER_SPECS=1 habilita o executável real" unless ENV["RUN_BLENDER_SPECS"] == "1" }
  it "renders image, MP4, panorama and geometry-preserving GLB through the real worker boundary" do
    configuration = processing_configuration(names: [ "Sala" ], settings: { "resolution_width" => 64, "resolution_height" => 64, "samples" => 1, "denoising" => false, "video_enabled" => true, "video_width" => 64, "video_height" => 64, "video_duration" => 1, "video_fps" => 2, "panorama_enabled" => true, "panorama_width" => 512, "panorama_height" => 256, "vr_enabled" => true })
    original = configuration.project_version.original_file.download
    batch = submit_processing(configuration, adapter: "blender")
    batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
    expect(batch.reload.status).to eq("completed")
    expect(batch.render_jobs.pluck(:status).uniq).to eq([ "completed" ])
    outputs = RenderOutput.where(render_job_id: batch.render_jobs.select(:id))
    expect(outputs.pluck(:kind)).to match_array(%w[image video panorama vr])
    expect(outputs.pluck(:content_type)).to match_array(%w[image/png video/mp4 image/png model/gltf-binary])
    outputs.each do |output|
      expect(output.checksum).to eq(Digest::SHA256.hexdigest(output.file.download))
      expect(output.metadata["executor"]).to eq("blender")
    end
    expect(configuration.project_version.original_file.download).to eq(original)
    expect(outputs.find_by!(kind: "panorama").metadata).to include("width" => 512, "height" => 256)
    expect(outputs.find_by!(kind: "vr").metadata["geometry_preserved"]).to be true
  end
  it "imports validated glTF and OBJ archives without duplicating stored originals" do
    raw = File.binread(Rails.root.join("spec/fixtures/files/triangle.glb"))
    length = raw.byteslice(12, 4).unpack1("V")
    document = JSON.parse(raw.byteslice(20, length))
    binary_offset = 20 + length
    binary_length = raw.byteslice(binary_offset, 4).unpack1("V")
    binary = raw.byteslice(binary_offset+8, binary_length)
    document["buffers"].first["uri"] = "triangle.bin"
    archives = [
      [ zip_bytes("model.GLTF" => document.to_json, "triangle.bin" => binary), "objects", "0" ],
      [ zip_bytes("model.obj" => "o Room\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n"), "model_part", "Room" ]
    ]
    archives.each do |archive, kind, reference|
      project = create(:project)
      version = inspect_file(archive, filename: "model.zip", content_type: "application/zip") { |upload| ProjectVersions::Create.call(project, upload: upload) }
      environment = create(:environment, project: project)
      create(:environment_version, project: project, project_version: version, environment: environment, source_reference: { "kind" => kind, "references" => [ reference ] })
      configuration = Rendering::CreateConfiguration.call(user: project.user, project: project, version: version, environment_ids: [ environment.id ], name: "Archive test", mode: "custom", settings: { "resolution_width" => 64, "resolution_height" => 64, "samples" => 1, "denoising" => false })
      batch = submit_processing(configuration, adapter: "blender")
      batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
      expect(batch.reload.status).to eq("completed")
      expect(batch.render_jobs.first.render_outputs.count).to eq(1)
      expect(version.original_file.download).to eq(archive)
    end
  end
  it "applies preserved PBR textures and a saved camera with studio lighting" do
    project = create(:project)
    archive = zip_bytes("model.obj" => "mtllib model.mtl\no Room\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl Wall\nf 1 2 3\n", "model.mtl" => "newmtl Wall\nKd 1 1 1\n")
    version = inspect_file(archive, filename: "model.zip", content_type: "application/zip") { |upload| ProjectVersions::Create.call(project, upload: upload) }
    environment = create(:environment, project: project)
    create(:environment_version, project: project, project_version: version, environment: environment, source_reference: { "kind" => "model_part", "references" => [ "Room" ] })
    material = create(:material, user: project.user)
    pixels = File.binread(Rails.root.join("spec/fixtures/files/pixel.png"))
    MaterialTexture::SLOTS.each do |slot|
      inspect_file(pixels, filename: "pixel.png", content_type: "image/png") { |upload| Materials::AttachTexture.call(material, slot: slot, upload: upload) }
    end
    MaterialMapping.create!(project: project, project_version: version, environment: environment, source_material_name: "Wall", material: material)
    camera = create(:render_camera, project: project, project_version: version, environment: environment, position: [ 0.5, 0.5, 2 ], rotation: [ 0, 0, 0 ])
    configuration = Rendering::CreateConfiguration.call(user: project.user, project: project, version: version, environment_ids: [ environment.id ], camera_ids: [ camera.id ], name: "PBR camera test", mode: "custom", settings: { "resolution_width" => 64, "resolution_height" => 64, "samples" => 1, "denoising" => false, "lighting" => "studio" })
    batch = submit_processing(configuration, adapter: "blender")
    job = batch.render_jobs.sole
    ProcessRenderJob.perform_now(job.id)
    expect(job.reload.status).to eq("completed")
    expect(job.snapshot.dig("camera", "id")).to eq(camera.id)
    expect(job.render_outputs.sole.metadata).to include("selected_objects" => 1, "geometry_preserved" => true, "engine" => "CYCLES")
    expect(material.material_textures.map { |texture| texture.file.download }.uniq).to eq([ pixels ])
  end
  it "renders the selected non-default scene and objects scoped to that scene" do
    raw = File.binread(Rails.root.join("spec/fixtures/files/triangle.glb"))
    length = raw.byteslice(12, 4).unpack1("V")
    document = JSON.parse(raw.byteslice(20, length))
    document["nodes"] = [ { "name" => "Sala", "mesh" => 0 }, { "name" => "Quarto", "mesh" => 0, "translation" => [ 3, 0, 0 ] } ]
    document["scenes"] = [ { "name" => "Sala", "nodes" => [ 0 ] }, { "name" => "Quarto", "nodes" => [ 1 ] } ]
    document["scene"] = 0
    json = document.to_json.b
    json << " " * ((-json.bytesize) % 4)
    body = [ json.bytesize, 0x4e4f534a ].pack("V2") + json + raw.byteslice(20 + length, raw.bytesize)
    bytes = [ 0x46546c67, 2, body.bytesize + 12 ].pack("V3") + body
    project = create(:project)
    version = inspect_file(bytes, filename: "scenes.glb", content_type: "model/gltf-binary") { |upload| ProjectVersions::Create.call(project, upload: upload) }
    environment = create(:environment, project: project)
    association = create(:environment_version, project: project, project_version: version, environment: environment)
    [ { "kind" => "scene", "references" => [ "1" ] }, { "kind" => "objects", "references" => [ "1" ], "scene_id" => "1" }, { "kind" => "objects", "references" => [ "1" ] } ].each do |reference|
      association.update!(source_reference: reference)
      configuration = Rendering::CreateConfiguration.call(user: project.user, project: project, version: version, environment_ids: [ environment.id ], name: "Non-default scene", mode: "custom", settings: { "resolution_width" => 64, "resolution_height" => 64, "samples" => 1, "denoising" => false, "vr_enabled" => true })
      batch = submit_processing(configuration, adapter: "blender")
      batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
      expect(batch.reload.status).to eq("completed")
      image = batch.render_jobs.find_by!(output_type: "image").render_outputs.sole
      expect(image.metadata).to include("selected_objects" => 1, "geometry_preserved" => true)
      expect(batch.render_jobs.find_by!(output_type: "vr").render_outputs.sole.content_type).to eq("model/gltf-binary")
    end
    expect(version.original_file.download).to eq(bytes)
  end
  it "renders project file scenes and whole OBJ uploads without manual environments" do
    project = create(:project)
    glb = real_version(project)
    archive = zip_bytes("room.obj" => "o Room\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")
    obj = inspect_file(archive, filename: "room.zip", content_type: "application/zip") { |upload| ProjectVersions::Create.call(project, upload: upload) }
    [ [ glb, "0" ], [ obj, "model" ] ].each do |version, scene|
      original = version.original_file.download
      batch = Rendering::FileRender.call(user: project.user, project_file: version.project_file, version: version,
        choices: [ { "key" => "scene:#{scene}", "name" => "Vista selecionada" } ],
        settings: { "resolution_width" => 64, "resolution_height" => 64, "samples" => 1, "denoising" => false, "vr_enabled" => true }, key: SecureRandom.uuid)
      batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
      expect(batch.reload.status).to eq("completed"), batch.render_jobs.pluck(:error_message).inspect
      expect(batch.render_jobs.flat_map { |job| job.render_outputs.pluck(:kind) }).to match_array(%w[image])
      expect(batch.render_configuration.snapshot.dig("file_request", "project_file_id")).to eq(version.project_file_id)
      expect(version.original_file.download).to eq(original)
    end
  end
  it "renders a single project VR and two connected tour points without modifying the original" do
    project = create(:project, settings: { "samples" => 1, "panorama_width" => 512, "panorama_height" => 256 })
    raw = File.binread(Rails.root.join("spec/fixtures/files/triangle.glb"))
    length = raw.byteslice(12, 4).unpack1("V")
    document = JSON.parse(raw.byteslice(20, length))
    document["nodes"] = [ { "name" => "Sala", "mesh" => 0 }, { "name" => "Quarto", "mesh" => 0, "translation" => [ 3, 0, 0 ] } ]
    document["scenes"] = [ { "name" => "Sala", "nodes" => [ 0 ] }, { "name" => "Quarto", "nodes" => [ 1 ] } ]
    json = document.to_json.b
    json << " " * ((-json.bytesize) % 4)
    body = [ json.bytesize, 0x4e4f534a ].pack("V2") + json + raw.byteslice(20 + length, raw.bytesize)
    bytes = [ 0x46546c67, 2, body.bytesize + 12 ].pack("V3") + body
    version = inspect_file(bytes, filename: "two-rooms.glb", content_type: "model/gltf-binary") { |upload| ProjectVersions::Create.call(project, upload: upload) }
    original = version.original_file.download
    points = 2.times.map do |index|
      { "key" => "manual:#{index}:realpoint#{index}", "name" => "Ponto #{index}", "camera" => {
        "position" => [ index, 1.6, 3 ], "rotation" => [ 0, 0, 0 ], "focal_length" => 35,
        "field_of_view" => 54.432223, "projection_type" => "perspective" } }
    end
    %w[vr tour].each do |kind|
      experience = ProjectExperiences::Create.call(user: project.user, project: project, kind: kind, revision_id: version.id, choices: points, key: SecureRandom.uuid)
      experience.render_batch.render_jobs.each { |job| ProcessRenderJob.perform_now(job.id) }
      expect(experience.render_batch.reload.status).to eq("completed"), experience.render_batch.render_jobs.pluck(:error_message).inspect
      outputs = experience.render_batch.render_jobs.flat_map { |job| job.render_outputs.to_a }
      expect(outputs.map(&:kind)).to eq(kind == "vr" ? [ "vr" ] : [ "panorama", "panorama" ])
      expect(outputs).to all(have_attributes(byte_size: be > 0))
      if kind == "vr"
        glb = outputs.sole.file.download
        size = glb.byteslice(12, 4).unpack1("V")
        exported = JSON.parse(glb.byteslice(20, size))
        expect(exported.fetch("nodes").count { |node| node.key?("mesh") }).to eq(2)
      end
    end
    expect(version.original_file.download).to eq(original)
  end
  it "reports completed animation frames before the MP4 is finalized" do
    configuration = processing_configuration(names: [ "Sala" ], settings: { "samples" => 1, "denoising" => false, "video_enabled" => true, "video_width" => 64, "video_height" => 64, "video_duration" => 1, "video_fps" => 2 })
    job = submit_processing(configuration, adapter: "blender").render_jobs.find_by!(output_type: "video")
    Dir.mktmpdir("video-progress-test-") do |directory|
      model = File.join(directory, "original.glb")
      File.binwrite(model, configuration.project_version.original_file.download)
      payload = job.snapshot.deep_dup.merge("model_path" => model, "output_directory" => directory)
      request = File.join(directory, "request.json")
      File.write(request, payload.to_json)
      stdout, status = Open3.capture2e(ENV.to_h.slice("PATH", "HOME", "LANG", "XDG_RUNTIME_DIR"), ENV.fetch("BLENDER_BIN", "/snap/bin/blender"), "--background", "--factory-startup", "--disable-autoexec", "--offline-mode", "--threads", "1", "--python-exit-code", "1", "--python", Rails.root.join("blender/render.py").to_s, "--", request, unsetenv_others: true)
      expect(status).to be_success, stdout[-2000..] || stdout
      values = stdout.scan(/RS_PROGRESS (\d+)/).flatten.map(&:to_i)
      expect(values).to include(57, 90, 95)
      expect(values.index(57)).to be < values.index(90)
      expect(File.size(File.join(directory, "video.mp4"))).to be > 100
    end
  end
end
