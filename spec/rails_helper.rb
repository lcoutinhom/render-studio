require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
abort "Specs require the test environment" unless Rails.env.test?
require "rspec/rails"
require "zip"
require_relative "support/model_uploads"
require_relative "support/processing_context"
ActiveRecord::Migration.maintain_test_schema!
RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
  config.include ProcessingContext
  config.include ModelUploads
  config.include FactoryBot::Syntax::Methods
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.before do
    Rails.cache.clear
    ActionMailer::Base.deliveries.clear
  end
end
