module Authentication
  extend ActiveSupport::Concern

  included do
    helper_method :current_organizer_account, :current_organizer_member, :organizer_signed_in?, :organizer_setup_required?, :member_selected?
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

    redirect_to new_session_path, alert: I18n.t("flash.auth.required")
  end

  def resume_session
    Current.organizer_account = current_organizer_account
    Current.organizer_member = current_organizer_member
  end

  def current_organizer_account
    return @current_organizer_account if defined?(@current_organizer_account)

    @current_organizer_account =
      OrganizerAccount.find_by(id: session[:organizer_account_id])
  end

  def current_organizer_member
    return @current_organizer_member if defined?(@current_organizer_member)
    return @current_organizer_member = nil if current_organizer_account.blank?

    @current_organizer_member =
      current_organizer_account.organizer_members.active.find_by(id: session[:organizer_member_id])
  end

  def organizer_signed_in?
    current_organizer_account.present?
  end

  def member_selected?
    current_organizer_member.present?
  end

  def organizer_setup_required?
    organizer_signed_in? && current_organizer_account.setup_required?
  end

  def start_session!(organizer_account)
    session[:organizer_account_id] = organizer_account.id
    Current.organizer_account = organizer_account
    @current_organizer_account = organizer_account
  end

  def select_member!(member)
    session[:organizer_member_id] = member.id
    Current.organizer_member = member
    @current_organizer_member = member
  end

  def clear_member_selection!
    session.delete(:organizer_member_id)
    Current.organizer_member = nil
    remove_instance_variable(:@current_organizer_member) if defined?(@current_organizer_member)
  end

  def terminate_session!
    clear_member_selection!
    session.delete(:organizer_account_id)
    Current.organizer_account = nil
    remove_instance_variable(:@current_organizer_account) if defined?(@current_organizer_account)
  end
end
