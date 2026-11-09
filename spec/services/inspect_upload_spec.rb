require "rails_helper"
RSpec.describe ProjectVersions::InspectUpload do
  def inspect_bytes(bytes, name, mime)
    inspect_file(bytes, filename: name, content_type: mime) { |upload| described_class.call(upload) }
  end
  let(:glb) { File.binread(Rails.root.join("spec/fixtures/files/triangle.glb")) }

  it "accepts an intact self-contained GLB and records references and sha256" do
    result = inspect_bytes(glb, "apartment.glb", "model/gltf-binary")
    expect(result[:format]).to eq("glb")
    expect(result[:checksum]).to eq(Digest::SHA256.hexdigest(glb))
    expect(result[:metadata]["nodes"].first["name"]).to eq("Sala")
  end

  it "rejects missing files, forged extensions, MIME mismatches and truncated GLB" do
    expect { described_class.call(nil) }.to raise_error(described_class::Invalid)
    expect { inspect_bytes(glb, "model.skp", "application/octet-stream") }.to raise_error(described_class::Invalid)
    expect { inspect_bytes(glb, "model.glb", "image/png") }.to raise_error(described_class::Invalid)
    expect { inspect_bytes(glb[0...-4], "model.glb", "model/gltf-binary") }.to raise_error(described_class::Invalid)
    expect { inspect_bytes("not a model", "model.glb", "application/octet-stream") }.to raise_error(described_class::Invalid)
  end

  it "accepts packaged glTF with dependencies and OBJ with MTL" do
    zip = zip_bytes("model.gltf" => { asset: { version: "2.0" }, buffers: [ { uri: "model.bin", byteLength: 3 } ] }.to_json, "model.bin" => "abc")
    expect(inspect_bytes(zip, "model.zip", "application/zip")[:format]).to eq("gltf_zip")
    obj = zip_bytes("model.obj" => "mtllib model.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n".gsub('\n', "
"), "model.mtl" => "newmtl wood")
    expect(inspect_bytes(obj, "model.zip", "application/zip")[:format]).to eq("obj_zip")
  end

  it "accepts safe relative package paths but rejects truncated glTF buffers" do
    valid = zip_bytes("models/scene.gltf" => { asset: { version: "2.0" }, buffers: [ { uri: "../data/model.bin", byteLength: 3 } ] }.to_json, "data/model.bin" => "abc")
    expect(inspect_bytes(valid, "model.zip", "application/zip")[:format]).to eq("gltf_zip")
    truncated = zip_bytes("scene.gltf" => { asset: { version: "2.0" }, buffers: [ { uri: "model.bin", byteLength: 100 } ] }.to_json, "model.bin" => "abc")
    expect { inspect_bytes(truncated, "model.zip", "application/zip") }.to raise_error(described_class::Invalid)
  end

  it "rejects traversal, external links, missing dependencies and executable payloads" do
    [
      zip_bytes("../model.gltf" => '{"asset":{"version":"2.0"}}'),
      zip_bytes("model.gltf" => '{"asset":{"version":"2.0"},"buffers":[{"uri":"https://evil.example/a.bin"}]}'),
      zip_bytes("model.gltf" => '{"asset":{"version":"2.0"},"buffers":[{"uri":"missing.bin"}]}'),
      zip_bytes("model.gltf" => '{"asset":{"version":"2.0"}}', "run.exe" => "payload")
    ].each do |bytes|
      expect { inspect_bytes(bytes, "model.zip", "application/zip") }.to raise_error(described_class::Invalid)
    end
  end

  it "rejects empty, overpopulated and highly compressed packages" do
    expect { inspect_bytes(zip_bytes({}), "model.zip", "application/zip") }.to raise_error(described_class::Invalid)
    entries = (0..512).to_h { |i| [ "file#{i}.bin", "a" ] }
    expect { inspect_bytes(zip_bytes(entries), "model.zip", "application/zip") }.to raise_error(described_class::Invalid)
    bomb = Zip::OutputStream.write_buffer do |zip|
      zip.put_next_entry("model.gltf", nil, nil, Zip::Entry::DEFLATED)
      zip.write('{"asset":{"version":"2.0"},"padding":"' + 'x' * 2.megabytes + '"}')
    end.string
    expect { inspect_bytes(bomb, "model.zip", "application/zip") }.to raise_error(described_class::Invalid)
  end

  it "accepts DAE geometry but rejects XML entities and missing geometry" do
    dae = '<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema"><library_geometries><geometry id="g"/></library_geometries></COLLADA>'
    expect(inspect_bytes(dae, "model.dae", "model/vnd.collada+xml")[:format]).to eq("dae")
    expect { inspect_bytes('<!DOCTYPE COLLADA [<!ENTITY file SYSTEM "file:///etc/passwd">]><COLLADA>&file;</COLLADA>', "model.dae", "application/xml") }.to raise_error(described_class::Invalid)
    expect { inspect_bytes('<COLLADA/>', "model.dae", "application/xml") }.to raise_error(described_class::Invalid)
  end

  it "accepts a GLB larger than 100 MiB without reading its binary chunk into memory" do
    size = 101.megabytes
    json = { asset: { version: "2.0" }, buffers: [ { byteLength: size } ] }.to_json
    json += " " * ((-json.bytesize) % 4)
    file = Tempfile.new([ "large-model", ".glb" ], binmode: true)
    length = 12 + 8 + json.bytesize + 8 + size
    file.write("glTF" + [ 2, length ].pack("V2") + [ json.bytesize, 0x4e4f534a ].pack("V2") + json + [ size, 0x004e4942 ].pack("V2"))
    file.truncate(length)
    file.rewind
    upload = ActionDispatch::Http::UploadedFile.new(tempfile: file, filename: "large.glb", type: "model/gltf-binary")
    expect(upload).not_to receive(:read)
    result = described_class.call(upload)
    expect(result[:format]).to eq("glb")
    expect(result[:metadata]["byte_size"]).to eq(length)
  ensure
    file&.close!
  end

  it "rejects uploads over 1 GiB before reading" do
    inspect_file(glb, filename: "model.glb", content_type: "model/gltf-binary") do |upload|
      allow(upload).to receive(:size).and_return(1.gigabyte + 1)
      expect(upload).not_to receive(:read)
      expect { described_class.call(upload) }.to raise_error(described_class::Invalid)
    end
  end
end
