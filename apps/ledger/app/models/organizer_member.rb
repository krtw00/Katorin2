class OrganizerMember < ApplicationRecord
  ROLES = {
    owner: "owner",
    admin: "admin",
    staff: "staff",
  }.freeze

  belongs_to :organizer_account

  enum :role, ROLES, validate: true

  normalizes :display_name, with: ->(value) { value.strip }

  validates :display_name, presence: true, uniqueness: { scope: :organizer_account_id }
end
