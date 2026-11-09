require "net/http"
require "base64"
require "digest"
module Rendering
  module LocalAi
    class Client
      class Failure < StandardError; end
      class Rejected < Failure; end
      class UncertainSubmission < Failure; end
      class Unavailable < Failure; end
      UUID = /\A[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/
      NETWORK_ERRORS = [IOError, SystemCallError, SocketError, Timeout::Error, Net::HTTPBadResponse, Net::HTTPHeaderSyntaxError, EOFError].freeze

      def initialize(url: ENV.fetch("COMFYUI_URL", "http://127.0.0.1:8188"))
        @base = URI.parse(url)
        unless @base.is_a?(URI::HTTP) && @base.scheme == "http" && %w[127.0.0.1 localhost ::1].include?(@base.hostname) && @base.userinfo.nil? && @base.query.nil? && @base.fragment.nil? && ["", "/"].include?(@base.path)
          raise ArgumentError, "ComfyUI deve usar HTTP em localhost, sem credenciais ou caminho adicional."
        end
      rescue URI::InvalidURIError
        raise ArgumentError, "Endereço ComfyUI inválido."
      end

      def gpu_runtime!
        stats = json_request(Net::HTTP::Get, "/system_stats")
        version = stats.dig("system", "comfyui_version").to_s
        device = Array(stats["devices"]).find { |item| item.is_a?(Hash) && item["name"].to_s.include?("AMD Radeon") && %w[cuda hip].include?(item["type"]) }
        unless device && stats.dig("system", "pytorch_version").to_s.include?("+rocm")
          raise Failure, "ComfyUI não reconheceu a GPU AMD com ROCm. A geração por CPU não será utilizada."
        end
        unless version.match?(/\A\d+\.\d+\.\d+\z/) && Gem::Version.new(version) >= Gem::Version.new("0.42.5")
          raise Failure, "Use o ComfyUI 0.42.5 ou mais recente, com suporte a identificadores de execução enviados pelo cliente."
        end
        { "gpu" => device.fetch("name"), "pytorch_version" => stats.dig("system", "pytorch_version"), "comfyui_version" => version }
      end

      def upload(reference)
        self.class.validate_png!(reference)
        name = "reference-#{Digest::SHA256.hexdigest(reference)}.png"
        boundary = "render-studio-#{SecureRandom.hex(16)}"
        body = +"--#{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"#{name}\"\r\nContent-Type: image/png\r\n\r\n".b
        body << reference << "\r\n--#{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--#{boundary}--\r\n"
        result = json_request(Net::HTTP::Post, "/upload/image", body: body, content_type: "multipart/form-data; boundary=#{boundary}")
        raise Failure, "ComfyUI não confirmou a imagem de referência." unless result["name"] == name && result["subfolder"].to_s.empty?
        name
      end

      def submit(workflow:, prompt_id:)
        validate_id!(prompt_id)
        result = json_request(Net::HTTP::Post, "/prompt", body: { prompt: workflow, prompt_id: prompt_id, client_id: prompt_id }.to_json, uncertain: true)
        unless result["prompt_id"] == prompt_id && result["node_errors"].is_a?(Hash) && result["node_errors"].empty?
          raise UncertainSubmission, "ComfyUI não confirmou o identificador da geração. O envio foi preservado e não será repetido automaticamente."
        end
        prompt_id
      end

      def history(prompt_id)
        validate_id!(prompt_id)
        result = json_request(Net::HTTP::Get, "/history/#{prompt_id}")[prompt_id]
        raise Failure, "Histórico ComfyUI inválido." if result && !result.is_a?(Hash)
        result
      end

      def queued?(prompt_id)
        validate_id!(prompt_id)
        queue = json_request(Net::HTTP::Get, "/queue")
        %w[queue_running queue_pending].any? { |key| Array(queue[key]).any? { |item| item.is_a?(Array) && item[1] == prompt_id } }
      end

      def download(image)
        filename, subfolder = image.values_at("filename", "subfolder")
        unless filename.is_a?(String) && filename.match?(/\A[a-zA-Z0-9_-]+\.png\z/) && subfolder.is_a?(String) && subfolder.match?(/\A[a-zA-Z0-9_\/-]*\z/) && image["type"] == "output"
          raise Failure, "Caminho da imagem ComfyUI inválido."
        end
        query = URI.encode_www_form(filename: filename, subfolder: subfolder, type: "output")
        bytes = request(Net::HTTP::Get, "/view?#{query}", limit: 20.megabytes)
        self.class.validate_png!(bytes)
        bytes
      end

      def self.validate_png!(bytes)
        unless bytes.is_a?(String) && bytes.bytesize.between?(33, 20.megabytes) && bytes.start_with?("\x89PNG\r\n\x1a\n".b) && bytes.byteslice(12, 4) == "IHDR"
          raise Failure, "A referência ou resultado local não é uma imagem PNG válida."
        end
        width, height = bytes.byteslice(16, 8).unpack("N2")
        unless width.between?(1, 2048) && height.between?(1, 2048) && width * height <= 4_194_304
          raise Failure, "A imagem local deve ter até 2048 pixels por dimensão."
        end
        [width, height]
      end

      private

      def validate_id!(id)
        raise Failure, "Identificador ComfyUI inválido." unless id.is_a?(String) && id.match?(UUID)
      end

      def json_request(method, path, body: nil, content_type: "application/json", uncertain: false)
        data = JSON.parse(request(method, path, body: body, content_type: content_type, limit: 4.megabytes, uncertain: uncertain))
        raise JSON::ParserError unless data.is_a?(Hash)
        data
      rescue JSON::ParserError
        klass = uncertain ? UncertainSubmission : Failure
        raise klass, "Resposta ComfyUI inválida. O workflow não será reenviado automaticamente."
      end

      def request(method, path, body: nil, content_type: nil, limit:, uncertain: false)
        uri = @base.dup
        uri.path, uri.query = path.split("?", 2)
        attempts = 0
        begin
          attempts += 1
          req = method.new(uri)
          req["Content-Type"] = content_type if content_type
          req.body = body if body
          # Explicit nil proxy prevents loopback traffic from using an HTTP proxy.
          http = Net::HTTP.new(uri.hostname, uri.port, nil)
          http.open_timeout = 3
          http.read_timeout = 20
          http.write_timeout = 20
          bytes = +"".b
          http.start do |connection|
            connection.request(req) do |response|
              unless response.is_a?(Net::HTTPSuccess)
                Rails.logger.warn("ComfyUI request failed path=#{uri.path} status=#{response.code}")
                klass = uncertain && response.code.to_i >= 500 ? UncertainSubmission : Rejected
                raise klass, "ComfyUI recusou a solicitação (HTTP #{response.code}). Verifique os modelos instalados e o log local."
              end
              response.read_body do |chunk|
                if bytes.bytesize + chunk.bytesize > limit
                  raise(uncertain ? UncertainSubmission : Failure, "Resposta ComfyUI maior que o limite permitido.")
                end
                bytes << chunk
              end
            end
          end
          bytes
        rescue *NETWORK_ERRORS
          if method == Net::HTTP::Get && attempts < 3
            sleep(0.2 * attempts)
            retry
          end
          if uncertain
            raise UncertainSubmission, "A confirmação do envio ao ComfyUI foi interrompida. A geração pode estar na fila; uma nova tentativa consultará o mesmo identificador."
          end
          raise Unavailable, "ComfyUI local indisponível. Inicie bin/dev e verifique http://127.0.0.1:8188."
        end
      end
    end
  end
end
