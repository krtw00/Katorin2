class League < ApplicationRecord
  belongs_to :organizer_account
  has_one_attached :header_image

  has_many :phases, -> { order(:position) }, dependent: :destroy
  has_many :blocks, dependent: :destroy
  has_many :teams, dependent: :destroy
  has_many :participants, dependent: :destroy
  has_many :weeks, dependent: :destroy
  has_many :matches, dependent: :destroy
  has_many :exports, dependent: :destroy

  before_validation :assign_serial_number, on: :create
  before_validation :assign_slug

  DISCORD_WEBHOOK_URL_FORMAT = %r{\Ahttps://discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9_-]+\z}

  validates :name, :slug, :serial_number, presence: true
  validates :roster_min_members, :roster_max_members, :lineup_size, :substitute_size, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :roster_config_consistent
  validates :slug, uniqueness: true
  validates :serial_number, numericality: { only_integer: true, greater_than: 0 }, uniqueness: { scope: :organizer_account_id }
  validates :discord_webhook_url, format: { with: DISCORD_WEBHOOK_URL_FORMAT }, allow_blank: true, length: { maximum: 500 }

  def draft_status?
    status == "draft"
  end

  def destroyable?
    draft_status?
  end

  def destroy_for_management!
    transaction do
      exports.destroy_all
      matches.destroy_all
      weeks.destroy_all
      blocks.destroy_all
      participants.destroy_all
      teams.destroy_all
      phases.destroy_all
      destroy!
    end
  end

  def display_number
    format("%03d", serial_number) if serial_number.present?
  end

  private

  def assign_serial_number
    return if serial_number.present? || organizer_account.blank?

    self.serial_number = organizer_account.leagues.maximum(:serial_number).to_i + 1
  end

  def assign_slug
    return if slug.present?
    return if organizer_account_id.blank? || serial_number.blank?

    self.slug = "league-#{organizer_account_id.delete('-').first(8)}-#{format('%03d', serial_number)}"
  end

  def roster_config_consistent
    return if roster_min_members.blank? || roster_max_members.blank? || lineup_size.blank? || substitute_size.blank?

    errors.add(:roster_max_members, :greater_than_or_equal_to, count: roster_min_members) if roster_max_members < roster_min_members
    errors.add(:lineup_size, :greater_than, count: 0) if lineup_size <= 0
    return unless lineup_size + substitute_size > roster_max_members

    errors.add(:substitute_size, :less_than_or_equal_to, count: roster_max_members - lineup_size)
  end
end
