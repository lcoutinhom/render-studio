Rails.application.config.filter_parameters += [
  :password, :password_confirmation, :current_password, :email,
  :token, :confirmation_token, :reset_password_token, :authorization
]

Rails.application.config.filter_parameters += [ :idempotency_key ]

Rails.application.config.filter_parameters += [ :description, :gemini_api_key, :"x-goog-api-key" ]

Rails.application.config.filter_parameters += [ :custom_prompt ]

Rails.application.config.filter_parameters += [ :reference_images, :reference_image ]

Rails.application.config.filter_parameters += [ :snapshot, :workflow, :prompt ]
