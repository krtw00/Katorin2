class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  include Authentication

  before_action :set_locale
  before_action :require_authentication

  helper_method :available_locales, :locale_label

  def default_url_options
    I18n.locale == I18n.default_locale ? {} : { locale: I18n.locale }
  end

  private

  def set_locale
    locale = params[:locale].presence || session[:locale].presence || preferred_locale_from_header
    locale = locale.to_sym if locale.respond_to?(:to_sym)
    locale = I18n.default_locale unless I18n.available_locales.include?(locale)

    session[:locale] = locale
    I18n.locale = locale
  end

  def preferred_locale_from_header
    requested_locales = request.headers.fetch("Accept-Language", "").scan(/[a-z]{2}/i).map(&:downcase).uniq
    requested_locales.find { |locale| I18n.available_locales.include?(locale.to_sym) }
  end

  def available_locales
    I18n.available_locales
  end

  def locale_label(locale)
    I18n.t("locales.#{locale}", default: locale.to_s)
  end
end
