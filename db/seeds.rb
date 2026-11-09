# Internal accounts are provisioned here, never through public registration.
email = ENV.fetch("SEED_USER_EMAIL", "admin@renderstudio.local").strip.downcase
user = User.find_or_initialize_by(email: email)
if user.new_record?
  password = if Rails.env.production?
    ENV.fetch("SEED_USER_PASSWORD")
  else
    ENV.fetch("SEED_USER_PASSWORD", "RenderStudio@2026!")
  end
  user.assign_attributes(name: ENV.fetch("SEED_USER_NAME", "Administrador"), password: password)
  user.skip_confirmation!
  user.save!
  puts "Conta interna criada: #{user.email}"
else
  puts "Conta interna já existe; nome, senha e confirmação foram preservados."
end

Rendering::SeedPresets.call
