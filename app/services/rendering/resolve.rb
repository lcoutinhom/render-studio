module Rendering
  class Resolve
    def self.call(project:, version:, environment_ids:, settings: {}, preset: nil, camera_ids: [])
      raise ArgumentError, "Escolha um projeto ativo e uma versão do mesmo projeto" unless project.deleted_at.nil? && project.status == "active" && version.project_id == project.id
      raise ArgumentError, "A versão não possui arquivo original" unless version.original_file.attached?
      if preset && (!preset.deleted_at.nil? || (!preset.system? && preset.user_id != project.user_id))
        raise ArgumentError, "Preset indisponível"
      end
      ids = Array(environment_ids).map { |id| Integer(id.to_s, 10) }
      raise ArgumentError, "Selecione de 1 a 500 ambientes, sem duplicatas" unless ids.size.between?(1, 500) && ids.uniq == ids
      environments = project.environments.kept.where(id: ids).ordered.to_a
      raise ArgumentError, "Há ambientes fora deste projeto" unless environments.size == ids.size
      associations = version.environment_versions.where(environment_id: ids).index_by(&:environment_id)
      environments.each do |environment|
        unless environment.status == "active" && associations[environment.id]&.status == "validated"
          raise ArgumentError, "#{environment.name}: ambiente arquivado, ausente ou com associação não confirmada nesta versão"
        end
      end
      overrides = Settings.validate!(settings)
      selected_camera_ids = Array(camera_ids).map { |id| Integer(id.to_s, 10) }
      raise ArgumentError, "Seleção de câmeras inválida" unless selected_camera_ids.size <= 500 && selected_camera_ids.uniq == selected_camera_ids
      cameras = RenderCamera.kept.where(project: project, project_version: version, environment_id: ids, id: selected_camera_ids).includes(:environment, :project_version).to_a
      unless cameras.size == selected_camera_ids.size && cameras.all?(&:available?)
        raise ArgumentError, "Câmera indisponível ou pertencente a outro ambiente/versão"
      end
      mappings = MaterialMapping.where(project_version: version, environment_id: [ nil, *ids ]).includes(material: { material_textures: { file_attachment: :blob } }).to_a
      resolved = environments.map do |environment|
        association = associations.fetch(environment.id)
        effective = Settings::DEFAULTS.deep_dup
        origins = effective.keys.index_with { "Sistema" }
        [ [ preset&.settings || {}, "Preset" ], [ project.settings, "Projeto" ], [ environment.settings, "Ambiente" ], [ association.settings, "Versão do ambiente" ], [ overrides, "Solicitação" ] ].each do |layer, origin|
          normalized = Settings.validate!(layer)
          effective.merge!(normalized)
          normalized.each_key { |key| origins[key] = origin }
        end
        effective = Settings.validate!(effective, complete: true)
        materials = mappings.select { |mapping| mapping.environment_id.nil? }.index_by(&:source_material_name)
        materials.merge!(mappings.select { |mapping| mapping.environment_id == environment.id }.index_by(&:source_material_name))
        {
          "environment_id" => environment.id, "stable_id" => environment.stable_id, "name" => environment.name,
          "environment_version_id" => association.id,
          "source_reference" => association.source_reference.deep_dup, "bounding_box" => association.bounding_box&.deep_dup,
          "association_revision" => association.updated_at.iso8601(6),
          "effective_settings" => effective, "origins" => origins,
          "cameras" => cameras.select { |camera| camera.environment_id == environment.id }.map { |camera| camera.as_json(only: %i[id name position rotation focal_length field_of_view projection_type metadata updated_at]) },
          "materials" => materials.values.map do |mapping|
            material = mapping.material
            raise ArgumentError, "Material #{material.name} foi excluído; revise o mapeamento" if material.deleted_at || material.user_id != project.user_id
            { "source_material_name" => mapping.source_material_name, "mapping_id" => mapping.id,
              "material" => material.as_json(only: %i[id name category base_color roughness metallic transmission ior metadata updated_at]),
              "textures" => material.material_textures.select { |texture| !texture.deleted_at && !texture.superseded_at && texture.file.attached? }.map do |texture|
                { "id" => texture.id, "slot" => texture.slot, "checksum" => texture.checksum, "blob_id" => texture.file.blob_id, "filename" => texture.file.filename.to_s, "metadata" => texture.metadata }
              end }
          end
        }
      end
      { "schema_version" => 1, "project_id" => project.id, "project_version_id" => version.id,
        "version_number" => version.version_number, "model_checksum" => version.checksum,
        "model_blob_id" => version.original_file.blob_id, "resolved_at" => Time.current.iso8601(6),
        "preset" => preset&.as_json(only: %i[id name settings updated_at]), "environments" => resolved }
    end
  end
end
