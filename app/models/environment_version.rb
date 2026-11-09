class EnvironmentVersion < ApplicationRecord
  include JsonSettings
  KINDS = %w[model objects scene region tag group component model_part].freeze
  belongs_to :project
  belongs_to :environment
  belongs_to :project_version
  validates :environment_id, uniqueness: { scope: :project_version_id }
  validates :status, inclusion: { in: %w[pending validated invalid] }
  validate :same_project
  validate :valid_reference
  validate -> { validate_json_object(:metadata) }

  private

  def same_project
    if project_id != environment&.project_id || project_id != project_version&.project_id
      errors.add(:base, "Ambiente e versão devem pertencer ao mesmo projeto")
    end
  end

  def valid_reference
    validate_json_object(:source_reference)
    return unless source_reference.is_a?(Hash)
    kind = source_reference["kind"]
    return if status == "pending" && source_reference.empty? && bounding_box.nil?
    unless KINDS.include?(kind)
      errors.add(:source_reference, "possui tipo de seletor inválido")
      return
    end
    if kind == "model"
      errors.add(:source_reference, "modelo completo requer somente kind") unless source_reference.keys == [ "kind" ] && bounding_box.nil?
      return
    end
    if source_reference.key?("scene_id")
      scope = source_reference["scene_id"]
      known_scenes = project_version&.metadata&.fetch("scenes", []) || []
      valid_scope = kind == "objects" && scope.is_a?(String) && scope.match?(/\A\d+\z/) && (project_version&.metadata&.fetch("reference_catalog_truncated", false) || known_scenes.any? { |scene| scene["id"] == scope })
      errors.add(:source_reference, "cena de origem inválida para a seleção de objetos") unless valid_scope
    end
    if kind == "region"
      valid = bounding_box.is_a?(Hash) && %w[min max].all? do |key|
        bounding_box[key].is_a?(Array) && bounding_box[key].length == 3 && bounding_box[key].all? { |n| n.is_a?(Numeric) && n.finite? }
      end
      valid &&= (0..2).all? { |i| bounding_box["min"][i] < bounding_box["max"][i] }
      valid &&= source_reference["coordinate_system"].is_a?(String) && source_reference["coordinate_system"].present?
      errors.add(:bounding_box, "requer min/max de três coordenadas e sistema de coordenadas") unless valid
    else
      refs = source_reference["references"]
      unless refs.is_a?(Array) && refs.length.between?(1, 500) && refs.all? { |id| id.is_a?(String) && id.length.between?(1, 200) }
        errors.add(:source_reference, "requer de 1 a 500 identificadores de origem")
      end
      if status == "validated" && project_version&.format == "glb" && %w[objects scene].include?(kind) && refs.is_a?(Array)
        key = kind == "objects" ? "nodes" : "scenes"
        known = project_version.metadata.fetch(key, []).map { |item| item["id"] }
        if !project_version.metadata["reference_catalog_truncated"] && (refs - known).any?
          errors.add(:source_reference, "contém identificadores que não existem no GLB desta versão")
        end
      end
    end
  end
end
