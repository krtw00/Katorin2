class CreateLedgerCoreSchema < ActiveRecord::Migration[8.1]
  MATCH_STATUSES = %w[
    draft
    scheduled
    in_progress
    result_pending
    confirmed
    cancelled
  ].freeze

  EXPORT_STATUSES = %w[
    not_required
    pending
    generated
    stale
  ].freeze

  RESULT_STATUSES = %w[
    partial
    confirmed
    void
  ].freeze

  WINNER_SIDES = %w[
    home
    away
  ].freeze

  def change
    create_table :organizer_accounts, id: :uuid do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :display_name, null: false

      t.timestamps
    end

    add_index :organizer_accounts, :email, unique: true

    create_table :leagues, id: :uuid do |t|
      t.references :organizer_account, null: false, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.string :slug, null: false
      t.string :rule_module_key, null: false, default: "wmgp"
      t.string :status, null: false, default: "draft"
      t.date :started_at
      t.date :ended_at

      t.timestamps
    end

    add_index :leagues, :slug, unique: true

    create_table :phases, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.string :kind, null: false
      t.integer :position, null: false
      t.string :rule_module_key, null: false, default: "wmgp"
      t.string :ranking_rule_key
      t.boolean :bracket_enabled, null: false, default: false

      t.timestamps
    end

    add_index :phases, %i[league_id position], unique: true
    add_index :phases, %i[league_id name], unique: true

    create_table :blocks, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :phase, null: false, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.integer :position, null: false

      t.timestamps
    end

    add_index :blocks, %i[phase_id position], unique: true
    add_index :blocks, %i[phase_id name], unique: true

    create_table :teams, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :block, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.string :short_name
      t.string :display_name, null: false
      t.string :status, null: false, default: "active"
      t.text :notes

      t.timestamps
    end

    add_index :teams, %i[league_id name], unique: true

    create_table :participants, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :team, null: false, type: :uuid, foreign_key: true
      t.string :name, null: false
      t.string :display_name, null: false
      t.integer :position
      t.string :status, null: false, default: "active"
      t.text :notes

      t.timestamps
    end

    add_index :participants, %i[team_id position]

    create_table :weeks, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :phase, null: false, type: :uuid, foreign_key: true
      t.integer :number, null: false
      t.string :name, null: false
      t.string :kind, null: false, default: "regular"
      t.integer :position, null: false
      t.datetime :locked_at

      t.timestamps
    end

    add_index :weeks, %i[phase_id position], unique: true
    add_index :weeks, %i[phase_id number], unique: true

    create_table :matches, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :phase, null: false, type: :uuid, foreign_key: true
      t.references :week, null: false, type: :uuid, foreign_key: true
      t.references :block, type: :uuid, foreign_key: true
      t.references :home_team, null: false, type: :uuid, foreign_key: { to_table: :teams }
      t.references :away_team, null: false, type: :uuid, foreign_key: { to_table: :teams }
      t.date :scheduled_on
      t.time :scheduled_time
      t.string :judge_name
      t.string :room_id
      t.string :spectator_room_id
      t.string :stage_key
      t.string :bracket_slot
      t.string :status, null: false, default: "draft"
      t.string :export_status, null: false, default: "pending"
      t.text :notes

      t.timestamps
    end

    add_index :matches, %i[week_id status]
    add_index :matches, %i[phase_id stage_key]
    add_check_constraint :matches, "home_team_id <> away_team_id", name: "matches_distinct_teams"
    add_inclusion_constraint :matches, :status, MATCH_STATUSES
    add_inclusion_constraint :matches, :export_status, EXPORT_STATUSES

    create_table :match_results, id: :uuid do |t|
      t.references :match, null: false, type: :uuid, foreign_key: true, index: { unique: true }
      t.integer :home_round_wins, null: false, default: 0
      t.integer :away_round_wins, null: false, default: 0
      t.references :winner_team, type: :uuid, foreign_key: { to_table: :teams }
      t.string :result_status, null: false, default: "partial"
      t.string :decision_type, null: false, default: "normal"
      t.text :notes
      t.datetime :confirmed_at

      t.timestamps
    end

    add_inclusion_constraint :match_results, :result_status, RESULT_STATUSES

    create_table :rounds, id: :uuid do |t|
      t.references :match, null: false, type: :uuid, foreign_key: true
      t.integer :number, null: false
      t.references :home_team, type: :uuid, foreign_key: { to_table: :teams }
      t.references :away_team, type: :uuid, foreign_key: { to_table: :teams }
      t.references :winner_team, type: :uuid, foreign_key: { to_table: :teams }
      t.string :result_status, null: false, default: "partial"
      t.string :ended_by, null: false, default: "normal"
      t.text :order_change_note
      t.text :notes

      t.timestamps
    end

    add_index :rounds, %i[match_id number], unique: true
    add_inclusion_constraint :rounds, :result_status, RESULT_STATUSES

    create_table :board_results, id: :uuid do |t|
      t.references :round, null: false, type: :uuid, foreign_key: true
      t.integer :board_number, null: false
      t.references :home_participant, type: :uuid, foreign_key: { to_table: :participants }
      t.references :away_participant, type: :uuid, foreign_key: { to_table: :participants }
      t.string :home_deck_name
      t.string :away_deck_name
      t.string :winner_side
      t.string :result_status, null: false, default: "partial"
      t.text :notes

      t.timestamps
    end

    add_index :board_results, %i[round_id board_number], unique: true
    add_inclusion_constraint :board_results, :result_status, RESULT_STATUSES
    add_inclusion_constraint :board_results, :winner_side, WINNER_SIDES, allow_null: true

    create_table :exports, id: :uuid do |t|
      t.references :league, null: false, type: :uuid, foreign_key: true
      t.references :match, type: :uuid, foreign_key: true
      t.string :export_type, null: false
      t.string :renderer_key, null: false
      t.string :status, null: false, default: "pending"
      t.string :file_path
      t.datetime :generated_at

      t.timestamps
    end

    add_index :exports, %i[match_id export_type]
    add_inclusion_constraint :exports, :status, EXPORT_STATUSES.drop(1)
  end

  private

  def add_inclusion_constraint(table_name, column_name, values, allow_null: false)
    quoted_values = values.map { |value| quote(value) }.join(", ")
    expression =
      if allow_null
        "#{column_name} IS NULL OR #{column_name} IN (#{quoted_values})"
      else
        "#{column_name} IN (#{quoted_values})"
      end

    add_check_constraint table_name, expression, name: "#{table_name}_#{column_name}_inclusion"
  end
end
