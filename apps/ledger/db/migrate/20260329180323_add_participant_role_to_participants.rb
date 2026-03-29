class AddParticipantRoleToParticipants < ActiveRecord::Migration[8.1]
  def change
    add_column :participants, :participant_role, :string, default: "member", null: false
  end
end
