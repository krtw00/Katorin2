class Block < ApplicationRecord
  belongs_to :league
  belongs_to :phase

  has_many :teams, dependent: :nullify
  has_many :matches, dependent: :nullify

  validates :name, :position, presence: true
  validates :name, uniqueness: { scope: :phase_id }
  validates :position, uniqueness: { scope: :phase_id }

  def destroyable?
    league.draft_status? || (teams.none? && matches.none?)
  end

  def destroy_for_management!
    transaction do
      teams.update_all(block_id: nil) if league.draft_status?
      matches.update_all(block_id: nil) if league.draft_status?
      destroy!
    end
  end
end
