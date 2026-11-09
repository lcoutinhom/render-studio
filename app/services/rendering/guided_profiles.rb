module Rendering
  class GuidedProfiles
    def self.all
      [
        { id: "preview", name: "Teste rápido", description: "Confira a câmera e os materiais antes de investir no render final.", effort: "Menor esforço de processamento", settings: { "quality" => "fast", "resolution_width" => 800, "resolution_height" => 600, "samples" => 16, "denoising" => true } },
        { id: "balanced", name: "Boa qualidade", description: "Uma imagem maior para revisar detalhes e compartilhar com a equipe.", effort: "Processamento intermediário", settings: { "quality" => "standard", "resolution_width" => 1600, "resolution_height" => 1200, "samples" => 64, "denoising" => true } },
        { id: "presentation", name: "Apresentação", description: "Mais definição e refinamento para a imagem final do projeto.", effort: "Pode levar vários minutos em CPU", settings: { "quality" => "professional", "resolution_width" => 2048, "resolution_height" => 1536, "samples" => 128, "denoising" => true } }
      ]
    end
  end
end
