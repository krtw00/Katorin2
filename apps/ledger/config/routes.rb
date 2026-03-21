Rails.application.routes.draw do
  localized_root_redirect = redirect do |_params, request|
    locale = request.path_parameters[:locale].presence
    locale.present? ? "/#{locale}" : "/"
  end

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  get "favicon.ico", to: redirect("/icon.png")

  scope "(:locale)", locale: /ja|en/ do
    get "tournaments", to: localized_root_redirect
    get "tournaments/*path", to: localized_root_redirect
    get "series", to: localized_root_redirect
    get "series/*path", to: localized_root_redirect
    get "teams", to: localized_root_redirect
    get "teams/*path", to: localized_root_redirect
    get "my", to: localized_root_redirect
    get "my/*path", to: localized_root_redirect

    resource :session, only: %i[new create destroy]
    root "sessions#new"
    resource :dashboard, only: :show, controller: "dashboard"

    resources :leagues, only: %i[index show new create edit update] do
      resources :phases, only: %i[show new create edit update]
    end

    resources :phases, only: [] do
      resources :weeks, only: %i[show new create edit update]
    end

    resources :weeks, only: [] do
      resources :matches, only: %i[new create]
    end

    resources :matches, only: %i[show edit update]
  end
end
