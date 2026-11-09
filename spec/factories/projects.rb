FactoryBot.define do
  factory :project do
    user
    name { "Apartamento João e Maria" }
  end

  factory :environment do
    project
    name { "Sala de estar" }
    environment_type { "living_room" }
  end

  factory :project_version do
    project
    sequence(:version_number)
    format { "glb" }
    checksum { "test-checksum" }
    metadata { { "nodes" => [ { "id" => "0", "name" => "Sala" } ], "scenes" => [ { "id" => "0", "name" => "Cena" } ] } }
  end

  factory :environment_version do
    environment
    project { environment.project }
    project_version { association(:project_version, project: project) }
    source_reference { { "kind" => "objects", "references" => [ "0" ] } }
    status { "validated" }
  end
end
