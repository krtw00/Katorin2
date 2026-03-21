class OrganizerAccount < ApplicationRecord
  has_secure_password
  attr_accessor :initial_admin_password, :initial_admin_password_confirmation

  has_many :leagues, dependent: :destroy
  has_many :organizer_members, dependent: :destroy
  has_many :rule_templates, dependent: :destroy

  after_create_commit :ensure_default_owner_member!

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :login_id, with: ->(login_id) { login_id.strip.downcase }

  validates :email, presence: true, uniqueness: true
  validates :login_id, presence: true, uniqueness: true
  validates :display_name, presence: true
  validates :initial_admin_password, presence: true, length: { minimum: 4 }, on: :create
  validates :initial_admin_password, confirmation: true, on: :create, if: -> { initial_admin_password.present? }

  private

  def ensure_default_owner_member!
    return unless self.class.connection.data_source_exists?("organizer_members")
    return if organizer_members.exists?

    member_attributes = {
      display_name:,
      role: "owner",
      active: true,
    }

    if initial_admin_password.present?
      member_attributes[:admin_password] = initial_admin_password
      member_attributes[:admin_password_confirmation] = initial_admin_password_confirmation
    else
      member_attributes[:admin_password_digest] = password_digest
    end

    organizer_members.create!(member_attributes)
  rescue ActiveRecord::NoDatabaseError, ActiveRecord::StatementInvalid
    nil
  end
end
