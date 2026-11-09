CI.run do
  step "Setup", "bin/setup --skip-server"
  step "Style: Ruby", "bin/rubocop"
  step "Security: Brakeman", "bin/brakeman --quiet --no-pager"
  step "Tests: RSpec", "bundle exec rspec"
end
