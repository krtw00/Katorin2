class AddBracketRoundsForSingleElimination < ActiveRecord::Migration[8.1]
  def change
    create_table :bracket_rounds, id: :uuid do |t|
      t.references :phase, null: false, foreign_key: true, type: :uuid
      t.integer :position, null: false

      t.timestamps
    end

    add_index :bracket_rounds, %i[phase_id position], unique: true

    change_column_null :matches, :week_id, true
    change_column_null :matches, :home_team_id, true
    change_column_null :matches, :away_team_id, true

    add_reference :matches, :bracket_round, foreign_key: true, type: :uuid
    add_reference :matches, :home_source_match, foreign_key: { to_table: :matches }, type: :uuid
    add_reference :matches, :away_source_match, foreign_key: { to_table: :matches }, type: :uuid
    add_column :matches, :slot_number, :integer

    add_index :matches, %i[bracket_round_id slot_number], unique: true
  end
end
