module Environments
  class Duplicate
    def self.call(environment, copy_associations: false)
      environment.project.with_lock do
        copy = environment.dup
        copy.assign_attributes(name: "#{environment.name.first(150)} (cópia)", stable_id: SecureRandom.uuid,
          position: environment.project.environments.maximum(:position).to_i + 1)
        copy.save!
        if copy_associations
          environment.environment_versions.each do |association|
            cloned = association.dup
            cloned.environment = copy
            cloned.save!
          end
          environment.render_cameras.kept.each do |camera|
            cloned = camera.dup
            cloned.environment = copy
            cloned.save!
          end
          MaterialMapping.where(environment: environment).each do |mapping|
            cloned = mapping.dup
            cloned.environment = copy
            cloned.save!
          end
        end
        copy
      end
    end
  end
end
