FactoryBot.define do
  factory :material do
    user
    name { "Madeira carvalho" }
    category { "wood" }
    base_color { "#c3a27d" }
  end
  factory :render_preset do
    user
    name { "Minha iluminação" }
    settings { { "lighting" => "sunset", "intensity" => 2 } }
  end
  factory :render_camera do
    environment
    project { environment.project }
    project_version { association(:project_version, project: project) }
    name { "Câmera principal" }
    before(:create) do |camera|
      unless camera.environment.environment_versions.exists?(project_version: camera.project_version)
        create(:environment_version, project: camera.project, environment: camera.environment, project_version: camera.project_version)
      end
    end
  end
end
