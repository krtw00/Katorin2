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
    resource :registration, only: %i[new create], controller: "registrations"
    resource :organizer_setup, only: %i[new create]
    resource :member_selection, only: %i[new create]
    resources :password_resets, only: %i[new create edit update], param: :token
    root "sessions#new"
    resource :dashboard, only: :show, controller: "dashboard"
    resources :organizer_members, only: %i[index new create edit update destroy]
    resources :stage_assets, only: %i[index new create edit update destroy]

    # KAT-25: 公開 (認証不要) の team schedule portal。 token-based access
    get "schedule/:token", to: "team_schedule_portal#show", as: :team_schedule_portal
    post "schedule/:token/matches/:match_id/candidates",
      to: "team_schedule_portal#create_candidate", as: :team_schedule_portal_create_candidate
    delete "schedule/:token/matches/:match_id/candidates/:id",
      to: "team_schedule_portal#withdraw_candidate", as: :team_schedule_portal_withdraw_candidate

    resources :leagues, only: %i[index show new create edit update destroy] do
      resource :team_import, only: %i[new create], controller: "team_imports" do
        get :template
      end
      resources :teams, only: %i[index show new create edit update destroy] do
        resources :participants, only: %i[new create edit update destroy]
        resource :schedule_token, only: %i[create destroy], controller: "team_schedule_tokens"
      end
      resources :phases, only: %i[show new create edit update destroy] do
        member do
          get :bracket
          get :edit_bracket
          patch :update_bracket
          get :seed_assignment
          patch :apply_seeds
        end
        resource :standings, only: :show, controller: 'standings' do
          get :download, on: :member
        end
      end
    end

    resources :phases, only: [] do
      resources :blocks, only: %i[show new create edit update destroy] do
        member do
          post :assign_team
          delete :unassign_team
        end
      end
      resources :weeks, only: %i[show new create edit update destroy] do
        member do
          get :deck_usage_csv
        end
      end
    end

    resources :weeks, only: [] do
      resources :matches, only: %i[new create]
    end

    resources :matches, only: %i[show edit update destroy] do
      resource :lineup, only: %i[edit update], controller: "match_lineups"
      resource :result_entry, only: %i[edit update], controller: "match_result_entries"
      resource :result_card_export, only: [], controller: "match_exports" do
        get :download, on: :member
      end
      resources :schedule_candidates, only: [], controller: "match_schedule_candidates" do
        post :accept, on: :member
      end
    end
  end
end
