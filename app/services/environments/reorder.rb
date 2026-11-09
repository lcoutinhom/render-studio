module Environments
  class Reorder
    def self.call(project, ids)
      project.with_lock do
        ordered_ids = Array(ids).map(&:to_s)
        existing = project.environments.kept.pluck(:id).map(&:to_s)
        unless ordered_ids.uniq.length == ordered_ids.length && ordered_ids.sort == existing.sort
          raise ArgumentError, "Envie todos os ambientes do projeto, sem duplicatas"
        end
        ordered_ids.each_with_index do |id, position|
          project.environments.find(id).update!(position: position)
        end
      end
    end
  end
end
