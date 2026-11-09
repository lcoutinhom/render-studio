FactoryBot.define do
  factory :user do
    name { "Arquiteta" }
    sequence(:email) { |n| "architect#{n}@example.test" }
    password { "secure-password-123" }
    confirmed_at { Time.current }
    trait :unconfirmed do
      confirmed_at { nil }
    end
  end
end
