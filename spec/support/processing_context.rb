module ProcessingContext
  def processing_configuration(user: create(:user), names: [ "Sala", "Cozinha" ], settings: {}, cameras: false)
    project = create(:project, user: user)
    version = real_version(project)
    environments = names.map do |name|
      environment = create(:environment, project: project, name: name)
      create(:environment_version, project: project, project_version: version, environment: environment)
      environment
    end
    camera_ids = if cameras
      environments.flat_map { |environment| 2.times.map { create(:render_camera, project: project, project_version: version, environment: environment).id } }
    else
      []
    end
    Rendering::CreateConfiguration.call(user: user, project: project, version: version, environment_ids: environments.map(&:id), settings: settings,
      camera_ids: camera_ids, name: "Simulação de teste", mode: "custom")
  end
  def submit_processing(configuration, **options)
    Rendering::Submit.call(**{ user: configuration.user, configuration: configuration, idempotency_key: SecureRandom.uuid }.merge(options))
  end
  def fast_simulation
    allow(Rendering::Adapters::Simulation).to receive(:new).and_wrap_original { |method, **arguments| method.call(**arguments.merge(step_seconds: 0)) }
  end
end
