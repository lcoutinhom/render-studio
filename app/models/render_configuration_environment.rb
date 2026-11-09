class RenderConfigurationEnvironment < ApplicationRecord
  belongs_to :render_configuration
  belongs_to :environment_version
  belongs_to :project_version
end
