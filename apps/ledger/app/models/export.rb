class Export < ApplicationRecord
  STATUSES = {
    pending: "pending",
    generated: "generated",
    stale: "stale",
  }.freeze

  belongs_to :league
  belongs_to :match, optional: true

  enum :status, STATUSES, validate: true

  validates :export_type, :renderer_key, presence: true
end
