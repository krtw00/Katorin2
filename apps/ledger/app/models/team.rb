class Team < ApplicationRecord
  belongs_to :league
  belongs_to :block, optional: true

  has_many :participants, dependent: :destroy
  has_many :home_matches, class_name: "Match", foreign_key: :home_team_id, dependent: :restrict_with_exception
  has_many :away_matches, class_name: "Match", foreign_key: :away_team_id, dependent: :restrict_with_exception

  before_validation :assign_name
  before_validation :assign_short_name

  validates :name, :display_name, presence: true
  validates :name, uniqueness: { scope: :league_id }

  def destroyable?
    league.draft_status? || (home_matches.none? && away_matches.none?)
  end

  def destroy_for_management!
    if league.draft_status?
      Match.where(home_team_id: id).or(Match.where(away_team_id: id)).find_each(&:destroy!)
      association(:home_matches).reset
      association(:away_matches).reset
    end

    destroy!
  end

  private

  def assign_name
    return if name.present? || display_name.blank?

    base_name = display_name.strip
    candidate = base_name
    suffix = 2

    while league&.teams&.where.not(id: id)&.exists?(name: candidate)
      candidate = "#{base_name} #{suffix}"
      suffix += 1
    end

    self.name = candidate
  end

  def assign_short_name
    return if short_name.present? || display_name.blank?

    normalized_name = display_name.to_s.gsub(/\s+/, " ").strip
    self.short_name = normalized_name.scan(/\X/).first(12).join
  end
end
