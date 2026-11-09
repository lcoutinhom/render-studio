require "devise/failure_app"

class InertiaFailureApp < Devise::FailureApp
  def redirect
    super
    self.status = 303 unless request.get?
  end
end

Devise.setup do |config|
  config.mailer_sender = ENV.fetch("MAIL_FROM", "Render Studio <noreply@localhost>")
  require "devise/orm/active_record"
  config.case_insensitive_keys = [ :email ]
  config.strip_whitespace_keys = [ :email ]
  config.skip_session_storage = [ :http_auth ]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = true
  config.paranoid = true
  config.password_length = 12..128
  config.reset_password_within = 6.hours
  config.sign_in_after_reset_password = false
  config.expire_all_remember_me_on_sign_out = true
  config.navigational_formats = [ "*/*", :html ]
  config.responder.error_status = :unprocessable_content
  config.responder.redirect_status = :see_other
  config.sign_out_via = :delete
  config.warden { |manager| manager.failure_app = InertiaFailureApp }
end
