class OrganizerMember < ApplicationRecord
  ROLES = {
    owner: "owner",
    admin: "admin",
    staff: "staff",
  }.freeze

  belongs_to :organizer_account
  has_secure_password :admin_password, validations: false

  enum :role, ROLES, validate: true
  scope :active, -> { where(active: true) }

  normalizes :display_name, with: ->(value) { value.strip }

  validates :display_name, presence: true, uniqueness: { scope: :organizer_account_id }
  validates :admin_password, length: { minimum: 4 }, allow_nil: true
  validate :admin_password_required_for_privileged_roles

  def destroyable?
    return true unless owner? || admin?

    organizer_account.organizer_members.where(role: %w[owner admin], active: true).where.not(id: id).exists?
  end

  def destroy_for_management!
    destroy!
  end

  def admin_password_configured?
    admin_password_digest.present?
  end

  private

  def admin_password_required_for_privileged_roles
    return unless owner? || admin?
    return if admin_password_digest.present? || admin_password.present?

    errors.add(:admin_password, :blank)
  end
end
