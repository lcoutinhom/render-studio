require "net/http"
require "base64"
module Rendering
  class GeminiImage
    class Failure < StandardError; end
    def self.model = ENV.fetch("GEMINI_IMAGE_MODEL", "")
    def self.enabled?
      ENV["GEMINI_RENDER_ENABLED"] == "true" && ENV["GEMINI_API_KEY"].present? && model.match?(/\A[a-zA-Z0-9._-]{1,100}\z/)
    end
    def self.call(reference:, prompt:, model:)
      raise Failure, "Modelo Gemini inválido" unless model.match?(/\A[a-zA-Z0-9._-]{1,100}\z/)
      raise Failure, "Referência maior que 15 MiB" unless reference.bytesize.between?(1, 15.megabytes)
      uri = URI("https://generativelanguage.googleapis.com/v1beta/models/#{model}:generateContent")
      request = Net::HTTP::Post.new(uri)
      request["x-goog-api-key"] = ENV.fetch("GEMINI_API_KEY")
      request["Content-Type"] = "application/json"
      request.body = { systemInstruction: { parts: [ { text: prompt.fetch("system_instruction") } ] },
        contents: [ { role: "user", parts: [ { inlineData: { mimeType: "image/png", data: Base64.strict_encode64(reference) } },
          { text: prompt["custom_prompt"].presence || "Renderize a referência seguindo as regras de fidelidade." } ] } ],
        generationConfig: { responseModalities: %w[TEXT IMAGE] } }.to_json
      body = +""
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 90, write_timeout: 15) do |http|
        http.request(request) do |response|
          unless response.is_a?(Net::HTTPSuccess)
            message = case response.code.to_i
            when 400 then "Gemini rejeitou a solicitação (HTTP 400). Verifique o modelo de imagens e os parâmetros enviados."
            when 401, 403 then "Gemini negou acesso (HTTP #{response.code}). Verifique a chave da API e as permissões do projeto Google."
            when 404 then "Modelo Gemini não encontrado (HTTP 404). Configure um modelo de geração de imagens disponível na sua conta."
            when 429 then "Limite ou cota do Gemini atingido (HTTP 429). Verifique o faturamento e as cotas do projeto Google antes de tentar novamente."
            else "Gemini indisponível (HTTP #{response.code}). Tente novamente mais tarde."
            end
            Rails.logger.warn("Gemini image request failed status=#{response.code} model=#{model}")
            raise Failure, message
          end
          response.read_body do |chunk|
            raise Failure, "Resposta Gemini muito grande" if body.bytesize + chunk.bytesize > 30.megabytes
            body << chunk
          end
        end
      end
      data = JSON.parse(body)
      candidate = data.fetch("candidates").sole
      raise Failure, "Gemini bloqueou a solicitação" if data.dig("promptFeedback", "blockReason") || candidate["finishReason"] != "STOP"
      parts = candidate.fetch("content").fetch("parts").reject { |part| part["thought"] }
      images = parts.filter_map { |part| part["inlineData"] }
      raise Failure, "Gemini recusou ou não gerou imagem; revise o prompt e preserve o projeto original." unless images.one? && images.first["mimeType"] == "image/png"
      bytes = Base64.strict_decode64(images.first.fetch("data"))
      raise Failure, "Imagem Gemini inválida" unless bytes.start_with?("\x89PNG\r\n\x1a\n".b)
      bytes
    rescue JSON::ParserError, KeyError, ArgumentError, Enumerable::SoleItemExpectedError
      raise Failure, "Resposta Gemini inválida"
    end
  end
end
