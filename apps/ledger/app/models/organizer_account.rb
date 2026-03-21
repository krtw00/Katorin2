class OrganizerAccount < ApplicationRecord
  has_secure_password

  has_many :leagues, dependent: :destroy
  has_many :organizer_members, dependent: :destroy
  has_many :rule_templates, dependent: :destroy

  after_create_commit :ensure_default_owner_member!

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :login_id, with: ->(login_id) { login_id.strip.downcase }

  validates :email, presence: true, uniqueness: true
  validates :login_id, presence: true, uniqueness: true
  validates :display_name, presence: true

  private

  def ensure_default_owner_member!
    return unless self.class.connection.data_source_exists?("organizer_members")
    return if organizer_members.exists?

    organizer_members.create!(display_name:, role: "owner", active: true)
  rescue ActiveRecord::NoDatabaseError, ActiveRecord::StatementInvalid
    nil
  end
end
