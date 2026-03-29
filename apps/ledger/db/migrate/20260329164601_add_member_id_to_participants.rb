class AddMemberIdToParticipants < ActiveRecord::Migration[8.1]
  def change
    add_column :participants, :member_id, :string
  end
end
