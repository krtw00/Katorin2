class AddMemberIdsToParticipants < ActiveRecord::Migration[8.1]
  class MigrationParticipant < ApplicationRecord
    self.table_name = "participants"
  end

  def up
    add_column :participants, :member_ids, :string, array: true, default: [], null: false

    MigrationParticipant.where.not(member_id: nil).where.not(member_id: "").find_each do |participant|
      participant.update_columns(member_ids: [participant.member_id])
    end
  end

  def down
    remove_column :participants, :member_ids
  end
end
