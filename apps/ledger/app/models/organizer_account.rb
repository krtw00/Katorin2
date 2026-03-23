class OrganizerAccount < ApplicationRecord
  has_secure_password

  has_many :leagues, dependent: :destroy
  has_many :organizer_members, dependent: :destroy
  has_many :stage_assets, dependent: :destroy

  after_create_commit :ensure_default_stage_assets!

  normalizes :email, with: ->(email) { email.strip.downcase }
  normalizes :login_id, with: ->(login_id) { login_id.strip.downcase }

  validates :email, presence: true, uniqueness: true
  validates :login_id, presence: true, uniqueness: true
  validates :display_name, presence: true

  def setup_required?
    organizer_members.none?
  end

  def ensure_default_stage_assets!
    return unless self.class.connection.data_source_exists?("stage_assets")

    definition = RuleSets::Registry.fetch(RuleSets::Registry.default_key)

    Array(definition["stages"]).each do |stage|
      key = "wmgp_#{stage.fetch('key')}"
      template = stage_assets.find_or_initialize_by(key:)
      next if template.persisted?

      template.name_ja = stage.dig("name", "ja").to_s
      template.name_en = stage.dig("name", "en").to_s
      template.description_ja = definition.dig("description", "ja").to_s
      template.description_en = definition.dig("description", "en").to_s
      template.format = stage.fetch("format")
      template.participant_scope = stage.fetch("participant_scope", "all_teams")
      template.group_count = stage["group_count"]
      template.round_count = stage["round_count"]
      template.bracket_size = stage["bracket_size"]
      template.advancement_rule = stage.fetch("advancement_rule", "none")
      template.advancement_value = stage["advancement_value"]
      template.ranking_rule_key = stage["ranking_rule_key"]
      template.match_rule_key = stage["match_rule_key"]
      template.active = true
      template.save!
    end
  rescue ActiveRecord::NoDatabaseError, ActiveRecord::StatementInvalid
    nil
  end

  private

end
