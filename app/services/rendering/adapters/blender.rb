require "open3"
require "tmpdir"
require "fileutils"
require "digest"
require "zip"
module Rendering
  module Adapters
    class Blender
      class Failure < StandardError; end
      def call(job:, token:)
        stored = []
        Dir.mktmpdir("render-studio-blender-") do |directory|
          snapshot = job.snapshot.deep_dup
          blob = ActiveStorage::Blob.find(snapshot.fetch("model_blob_id"))
          model = File.join(directory, "original.#{snapshot.fetch('model_format') == 'glb' ? 'glb' : 'zip'}")
          File.open(model, "wb") { |io| blob.download { |chunk| io.write(chunk) } }
          raise Failure, "Model checksum mismatch" unless Digest::SHA256.file(model).hexdigest == snapshot.fetch("model_checksum")
          snapshot["model_path"] = extract_model(model, directory, snapshot.fetch("model_format"))
          snapshot["output_directory"] = directory
          snapshot.fetch("environment").fetch("materials", []).each do |mapping|
            mapping.fetch("textures", []).each do |texture|
              texture_blob = ActiveStorage::Blob.find(texture.fetch("blob_id"))
              path = File.join(directory, "texture-#{texture.fetch('id')}#{File.extname(texture.fetch('filename'))}")
              File.open(path, "wb") { |io| texture_blob.download { |chunk| io.write(chunk) } }
              raise Failure, "Texture checksum mismatch" unless Digest::SHA256.file(path).hexdigest == texture.fetch("checksum")
              texture["path"] = path
            end
          end
          payload = File.join(directory, "request.json")
          File.write(payload, JSON.generate(snapshot))
          return false unless run_process(payload, job, token)
          manifest_path = File.join(directory, "artifacts.json")
          raise Failure, "Missing manifest" unless File.file?(manifest_path) && File.size(manifest_path) <= 1.megabyte
          artifacts = JSON.parse(File.read(manifest_path))
          raise Failure, "Invalid manifest" unless artifacts.is_a?(Array) && artifacts.size.between?(1, 100)
          Rendering::Lifecycle.finish(job, token) do |completed|
            artifacts.each do |artifact|
              name = artifact.fetch("filename")
              raise Failure, "Invalid artifact path" unless name.match?(/\A[a-zA-Z0-9_-]+\.(png|jpg|exr|mp4|glb)\z/)
              path = File.join(directory, name)
              raise Failure, "Invalid artifact" unless File.file?(path) && !File.symlink?(path)
              File.open(path, "rb") do |io|
                output = Rendering::StoreOutput.call(job: completed, io: io, filename: name, content_type: artifact.fetch("content_type"), metadata: artifact.fetch("metadata", {}).merge("executor" => snapshot.fetch("adapter")))
                stored << output.file.blob
              end
            end
          end
        end
      rescue StandardError
        stored.each { |blob| blob.service.delete(blob.key) unless ActiveStorage::Blob.exists?(id: blob.id) }
        raise
      end
      private
      def extract_model(path, directory, format)
        return path if format == "glb"
        # Reuse the upload boundary before any extraction; archives never become executable scripts.
        File.open(path, "rb") do |io|
          upload = ActionDispatch::Http::UploadedFile.new(tempfile: io, filename: "model.zip", type: "application/zip")
          ProjectVersions::InspectUpload.call(upload)
        end
        root = File.join(directory, "model")
        FileUtils.mkdir_p(root)
        Zip::File.open(path) do |zip|
          zip.each do |entry|
            next if entry.directory?
            target = File.expand_path(entry.name, root)
            raise Failure, "Unsafe archive" unless target.start_with?(root + "/") && !entry.symlink?
            FileUtils.mkdir_p(File.dirname(target))
            entry.get_input_stream { |input| File.open(target, "wb") { |output| IO.copy_stream(input, output) } }
          end
        end
        extension = format == "gltf_zip" ? "gltf" : "obj"
        candidates = Dir.glob(File.join(root, "**", "*")).select { |entry| File.file?(entry) && File.extname(entry).downcase == ".#{extension}" }
        raise Failure, "Invalid model archive" unless candidates.one?
        candidates.first
      end
      def run_process(payload, job, token)
        executable = ENV.fetch("BLENDER_BIN", "/snap/bin/blender")
        command = [ executable, "--background", "--factory-startup", "--disable-autoexec", "--offline-mode", "--threads", ENV.fetch("BLENDER_THREADS", "2"), "--python-exit-code", "1", "--python", Rails.root.join("blender/render.py").to_s, "--", payload ]
        environment = ENV.to_h.slice("PATH", "HOME", "LANG", "XDG_RUNTIME_DIR", "DISPLAY")
        library_path = ENV["BLENDER_HIP_LIBRARY_PATH"]
        if library_path.present?
          raise Failure, "Invalid HIP library directory" unless File.directory?(library_path) && Pathname.new(library_path).absolute?
          environment["LD_LIBRARY_PATH"] = library_path
        end
        started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        timeout = ENV.fetch("BLENDER_TIMEOUT_SECONDS", "3600").to_i.clamp(30, 86_400)
        progress = 5
        last_heartbeat = 0
        buffer = +""
        Open3.popen2e(environment, *command, pgroup: true, unsetenv_others: true) do |stdin, output, wait|
          stdin.close
          begin
            loop do
              now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
              raise Failure, "Render timeout" if now - started > timeout
              if now - last_heartbeat >= 3
                return false unless Rendering::Lifecycle.advance(job, token, progress)
                last_heartbeat = now
              end
              if IO.select([ output ], nil, nil, 0.25)
                chunk = output.read_nonblock(16_384, exception: false)
                break if chunk.nil?
                if chunk.is_a?(String)
                  buffer << chunk
                  buffer.scan(/RS_PROGRESS (\d+)/).flatten.each { |value| progress = [ progress, value.to_i.clamp(5, 95) ].max }
                  buffer = buffer.byteslice(-65_536, 65_536) || buffer
                end
              end
              break unless wait.alive?
            end
            raise Failure, "Blender exited unsuccessfully" unless wait.value.success?
            true
          ensure
            if wait.alive?
              Process.kill("TERM", -wait.pid) rescue Errno::ESRCH
              unless wait.join(3)
                Process.kill("KILL", -wait.pid) rescue Errno::ESRCH
                wait.join
              end
            end
          end
        end
      end
    end
  end
end
