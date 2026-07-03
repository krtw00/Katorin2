class CreateRosterChangeRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :roster_change_requests, id: :uuid do |t|
      t.references :team, type: :uuid, null: false, foreign_key: true, index: true
      t.string :kind, null: false
      t.string :status, null: false, default: "pending"
      t.string :submitter_display_name
      t.references :target_participant, type: :uuid, foreign_key: { to_table: :participants }, index: true
      t.string :proposed_display_name
      t.string :proposed_member_ids, array: true, default: []
      t.text :note
      t.string :organizer_note
      t.references :reviewed_by, type: :uuid, foreign_key: { to_table: :organizer_members }, index: true
      t.datetime :reviewed_at

      t.timestamps
    end

    add_index :roster_change_requests, [:team_id, :status]
    add_check_constraint :roster_change_requests,
      "kind IN ('add', 'remove', 'update_md_id')",
      name: "roster_change_requests_kind_inclusion"
    add_check_constraint :roster_change_requests,
      "status IN ('pending', 'approved', 'rejected')",
      name: "roster_change_requests_status_inclusion"
  end
end
