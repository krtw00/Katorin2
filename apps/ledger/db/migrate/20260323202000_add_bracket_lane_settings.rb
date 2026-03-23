class AddBracketLaneSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :phases, :bracket_lane_count, :integer, default: 1, null: false
    add_column :phases, :third_place_match_enabled, :boolean, default: false, null: false

    add_column :bracket_rounds, :lane_number, :integer
    add_column :bracket_rounds, :round_kind, :string, default: "championship", null: false

    remove_index :bracket_rounds, column: %i[phase_id position]
    add_index :bracket_rounds, %i[phase_id round_kind lane_number position], unique: true, name: "index_bracket_rounds_on_phase_kind_lane_position"

    add_reference :matches, :home_loser_source_match, foreign_key: { to_table: :matches }, type: :uuid
    add_reference :matches, :away_loser_source_match, foreign_key: { to_table: :matches }, type: :uuid
  end
end
