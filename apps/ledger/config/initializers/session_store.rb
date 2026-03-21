Rails.application.config.session_store :cookie_store,
  key: "__session",
  same_site: :lax,
  secure: Rails.env.production?
