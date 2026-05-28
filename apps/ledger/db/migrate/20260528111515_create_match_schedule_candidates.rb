class CreateMatchScheduleCandidates < ActiveRecord::Migration[8.1]
  def change
    create_table :match_schedule_candidates, id: :uuid do |t|
      t.references :match, type: :uuid, null: false, foreign_key: true, index: true
      t.references :submitter_team, type: :uuid, null: false, foreign_key: { to_table: :teams }, index: true
      t.datetime :starts_at, null: false
      t.string :submitter_tz, null: false
      t.string :status, null: false, default: "proposed"
      t.text :notes

      t.timestamps
    end

    add_index :match_schedule_candidates, [:match_id, :status]
    add_check_constraint :match_schedule_candidates,
      "status IN ('proposed', 'accepted', 'withdrawn')",
      name: "match_schedule_candidates_status_inclusion"
  end
end
