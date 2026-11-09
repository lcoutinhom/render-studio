require "rails_helper"
RSpec.describe EnvironmentVersion do
  it "validates optional scene scope without changing legacy node associations" do
    environment = create(:environment)
    version = create(:project_version, project: environment.project)
    association = build(:environment_version, project: environment.project, environment: environment, project_version: version)
    expect(association).to be_valid
    association.source_reference = { "kind" => "objects", "references" => [ "0" ], "scene_id" => "0" }
    expect(association).to be_valid
    association.source_reference["scene_id"] = "99"
    expect(association).not_to be_valid
    association.source_reference = { "kind" => "scene", "references" => [ "0" ], "scene_id" => "0" }
    expect(association).not_to be_valid
  end
end
