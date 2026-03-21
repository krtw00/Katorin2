require "json"

class CreateStageAssetsAndLinkPhases < ActiveRecord::Migration[8.1]
  class MigrationOrganizerAccount < ApplicationRecord
    self.table_name = "organizer_accounts"
  end

  class MigrationStageAsset < ApplicationRecord
    self.table_name = "stage_assets"
  end

  class MigrationPhase < ApplicationRecord
    self.table_name = "phases"
  end

  FORMATS = %w[round_robin swiss single_elimination].freeze
  PHASE_KINDS = %w[regular_season playoff].freeze
  PARTICIPANT_SCOPES = %w[all_teams qualified_teams manual_selection].freeze
  ADVANCEMENT_RULES = %w[none top_n_per_group top_n_overall manual].freeze

  def up
    create_table :stage_assets, id: :uuid do |t|
      t.references :organizer_account, null: false, type: :uuid, foreign_key: true
      t.string :key, null: false
      t.string :name_ja, null: false
      t.string :name_en, null: false
      t.text :description_ja
      t.text :description_en
      t.string :format, null: false
      t.string :phase_kind, null: false, default: "regular_season"
      t.string :participant_scope, null: false, default: "all_teams"
      t.integer :group_count
      t.integer :round_count
      t.integer :bracket_size
      t.string :advancement_rule, null: false, default: "none"
      t.integer :advancement_value
      t.string :ranking_rule_key
      t.string :match_rule_key
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :stage_assets, %i[organizer_account_id key], unique: true
    add_check_constraint :stage_assets, "format IN ('round_robin','swiss','single_elimination')", name: "stage_assets_format_inclusion"
    add_check_constraint :stage_assets, "phase_kind IN ('regular_season','playoff')", name: "stage_assets_phase_kind_inclusion"
    add_check_constraint :stage_assets, "participant_scope IN ('all_teams','qualified_teams','manual_selection')", name: "stage_assets_participant_scope_inclusion"
    add_check_constraint :stage_assets, "advancement_rule IN ('none','top_n_per_group','top_n_overall','manual')", name: "stage_assets_advancement_rule_inclusion"

    add_reference :phases, :stage_asset, type: :uuid, foreign_key: true

    backfill_stage_assets_from_wmgp!
    backfill_phase_stage_asset_links!
  end

  def down
    remove_reference :phases, :stage_asset, type: :uuid, foreign_key: true
    remove_check_constraint :stage_assets, name: "stage_assets_advancement_rule_inclusion"
    remove_check_constraint :stage_assets, name: "stage_assets_participant_scope_inclusion"
    remove_check_constraint :stage_assets, name: "stage_assets_phase_kind_inclusion"
    remove_check_constraint :stage_assets, name: "stage_assets_format_inclusion"
    drop_table :stage_assets
  end

  private

  def backfill_stage_assets_from_wmgp!
    definition = JSON.parse(File.read(Rails.root.join("config/rulesets/wmgp.json")))

    MigrationOrganizerAccount.find_each do |account|
      Array(definition["stages"]).each do |stage|
        key = "wmgp_#{stage.fetch('key')}"
        next if MigrationStageAsset.exists?(organizer_account_id: account.id, key:)

        MigrationStageAsset.create!(
          organizer_account_id: account.id,
          key:,
          name_ja: stage.dig("name", "ja").to_s,
          name_en: stage.dig("name", "en").to_s,
          description_ja: definition.dig("description", "ja").to_s,
          description_en: definition.dig("description", "en").to_s,
          format: stage.fetch("format"),
          phase_kind: stage.fetch("format") == "single_elimination" ? "playoff" : "regular_season",
          participant_scope: stage.fetch("participant_scope", "all_teams"),
          group_count: stage["group_count"],
          round_count: stage["round_count"],
          bracket_size: stage["bracket_size"],
          advancement_rule: stage.fetch("advancement_rule", "none"),
          advancement_value: stage["advancement_value"],
          ranking_rule_key: stage["ranking_rule_key"],
          match_rule_key: stage["match_rule_key"],
          active: true
        )
      end
    end
  end

  def backfill_phase_stage_asset_links!
    MigrationPhase.find_each do |phase|
      account_id = select_value("SELECT organizer_account_id FROM leagues WHERE id = #{quote(phase.league_id)}")
      next if account_id.blank?

      asset_key =
        if phase.kind == "playoff"
          "wmgp_final_stage"
        else
          "wmgp_regular_stage"
        end

      stage_asset_id = select_value("SELECT id FROM stage_assets WHERE organizer_account_id = #{quote(account_id)} AND key = #{quote(asset_key)} LIMIT 1")
      next if stage_asset_id.blank?

      phase.update_columns(stage_asset_id:)
    end
  end
end
