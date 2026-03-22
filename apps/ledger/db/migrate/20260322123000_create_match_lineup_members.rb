class CreateMatchLineupMembers < ActiveRecord::Migration[8.1]
  def change
    create_table :match_lineup_members, id: :uuid do |t|
      t.references :match, null: false, foreign_key: true, type: :uuid
      t.references :team, null: false, foreign_key: true, type: :uuid
      t.references :participant, null: false, foreign_key: true, type: :uuid
      t.string :side, null: false
      t.string :role, null: false
      t.integer :slot_number, null: false
      t.timestamps
    end

    add_index :match_lineup_members, [:match_id, :side, :role, :slot_number], unique: true, name: "index_match_lineup_members_on_slot"
    add_index :match_lineup_members, [:match_id, :participant_id], unique: true, name: "index_match_lineup_members_on_match_and_participant"
  end
end
