class RenderingPresenter
  def self.schema = { definitions: Rendering::Settings::DEFINITIONS, defaults: Rendering::Settings::DEFAULTS }
  def self.preset(preset)
    preset.as_json(only: %i[id name description category system settings])
  end

  def self.material(material)
    material.as_json(only: %i[id name category description base_color roughness metallic transmission ior])
  end

  def self.camera(camera)
    camera.as_json(only: %i[id project_id environment_id project_version_id name position rotation focal_length field_of_view projection_type metadata]).merge("available" => camera.available?)
  end

  def self.mapping(mapping)
    mapping.as_json(only: %i[id project_version_id environment_id source_material_name material_id]).merge("material_name" => mapping.material.name, "available" => mapping.material.deleted_at.nil?)
  end
end
