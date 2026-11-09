module ModelUploads
  def glb_upload
    Rack::Test::UploadedFile.new(Rails.root.join("spec/fixtures/files/triangle.glb"), "model/gltf-binary")
  end

  def inspect_file(bytes, filename:, content_type:)
    file = Tempfile.new([ "model", File.extname(filename) ], binmode: true)
    file.write(bytes)
    file.rewind
    upload = ActionDispatch::Http::UploadedFile.new(tempfile: file, filename: filename, type: content_type)
    yield upload
  ensure
    file&.close!
  end

  def zip_bytes(entries)
    Zip::OutputStream.write_buffer do |zip|
      entries.each { |name, content| zip.put_next_entry(name); zip.write(content) }
    end.string
  end

  def real_version(project)
    inspect_file(File.binread(Rails.root.join("spec/fixtures/files/triangle.glb")), filename: "apartment.glb", content_type: "model/gltf-binary") do |upload|
      ProjectVersions::Create.call(project, upload: upload)
    end
  end
end
