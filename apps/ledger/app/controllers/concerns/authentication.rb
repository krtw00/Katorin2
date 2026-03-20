module Authentication
  extend ActiveSupport::Concern

  included do
    helper_method :current_organizer_account, :organizer_signed_in?
    before_action :resume_session
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def require_authentication
    return if organizer_signed_in?

    redirect_to new_session_path, alert: "ログインしてください。"
  end

  def resume_session
    Current.organizer_account = current_organizer_account
  end

  def current_organizer_account
    return @current_organizer_account if defined?(@current_organizer_account)

    @current_organizer_account =
      OrganizerAccount.find_by(id: session[:organizer_account_id])
  end

  def organizer_signed_in?
    current_organizer_account.present?
  end

  def start_session!(organizer_account)
    session[:organizer_account_id] = organizer_account.id
    Current.organizer_account = organizer_account
    @current_organizer_account = organizer_account
  end

  def terminate_session!
    session.delete(:organizer_account_id)
    Current.organizer_account = nil
    remove_instance_variable(:@current_organizer_account) if defined?(@current_organizer_account)
  end
end
