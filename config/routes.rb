Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :projects, only: [ :index, :show ]
      resources :render_configurations, only: [ :index, :show, :create ]
      resources :render_batches, only: [ :index, :show, :create ] do
        member do
          post :cancel
          post :retry
        end
      end
      resources :render_jobs, only: :show
    end
  end
  get "up" => "rails/health#show", as: :rails_health_check
  devise_for :users, skip: [ :unlocks, :registrations ], controllers: {
    sessions: "users/sessions", registrations: "users/registrations",
    passwords: "users/passwords", confirmations: "users/confirmations"
  }
  devise_scope :user do
    put "users", to: "users/registrations#update", as: :user_registration
    patch "users", to: "users/registrations#update"
  end
  root "dashboard#show"
  get "help", to: "help#show", as: :help
  get "dashboard", to: "dashboard#show"
  get "profile", to: "profiles#show"
  get "settings", to: "profiles#show"
  resources :clients
  get "render_defaults", to: "render_settings#show"
  put "render_defaults", to: "render_settings#update"
  get "render_defaults/export", to: "render_settings#export"
  post "settings_document/validate", to: "render_settings#validate_document"
  resources :projects do
    put "primary_file", to: "project_experiences#primary"
    resources :experiences, controller: "project_experiences", only: [ :new, :create, :show ]
    put "configuration", to: "render_settings#update"
    get "configuration/export", to: "render_settings#export"
    post "configuration/preset", to: "render_settings#preset"
    post "configuration/suggest", to: "render_settings#suggest"
    resources :files, controller: "project_files", only: [ :show, :create, :update, :destroy ] do
      member do
        post :revision
        post :render_selected
      end
    end
    member do
      post :duplicate
      patch :archive
    end
    resources :environments do
      collection { patch :reorder }
      member { post :duplicate }
      put "versions/:version_id", to: "environment_versions#update", as: :version
    end
    resources :versions, controller: "project_versions", only: [ :index, :create ] do
      member { get :download }
    end
  end
  resources :materials do
    resources :textures, controller: "material_textures", only: [ :create, :show, :destroy ]
  end
  resources :presets, controller: "render_presets", except: [ :show ]
  resources :renderings, controller: "render_configurations", only: [ :index, :new, :create, :show, :edit ] do
    collection do
      post :preview
      post :suggest
    end
    member { post :preset }
    resources :submissions, controller: "render_batches", only: :create
  end
  put "projects/:project_id/render_settings", to: "render_preferences#update"
  put "projects/:project_id/environments/:environment_id/render_settings", to: "render_preferences#update"
  put "projects/:project_id/environments/:environment_id/versions/:version_id/render_settings", to: "render_preferences#update"
  resources :projects, only: [] do
    resources :versions, only: [] do
      resources :material_mappings, only: [ :create, :update, :destroy ]
    end
    resources :environments, only: [] do
      resources :versions, only: [] do
        resources :cameras, controller: "render_cameras", only: [ :create, :update, :destroy ] do
          collection { post :bulk_create }
        end
      end
    end
  end
  resources :render_batches, only: [ :index, :show ] do
    member do
      post :cancel
      post :retry
    end
  end
  resources :outputs, controller: "render_outputs", only: [ :index, :show ] do
    member do
      get :preview
      get :download
    end
  end
  resources :render_jobs, only: :show do
    member do
      post :cancel
      post :retry
    end
  end
end
