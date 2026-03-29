module Authorization
  extend ActiveSupport::Concern

  included do
    helper_method :can_manage?, :can_admin?
  end

  private

  def authorize_role!(*allowed_roles)
    return if allowed_roles.map(&:to_s).include?(current_organizer_member&.role)

    redirect_back fallback_location: dashboard_path, alert: t("flash.authorization.denied")
  end

  def owner_only!
    authorize_role!(:owner)
  end

  def admin_or_above!
    authorize_role!(:owner, :admin)
  end

  def can_manage?
    current_organizer_member&.owner? || current_organizer_member&.admin?
  end

  def can_admin?
    current_organizer_member&.owner?
  end
end
