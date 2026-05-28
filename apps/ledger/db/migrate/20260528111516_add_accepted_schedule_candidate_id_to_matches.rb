class AddAcceptedScheduleCandidateIdToMatches < ActiveRecord::Migration[8.1]
  def change
    add_reference :matches,
      :accepted_schedule_candidate,
      type: :uuid,
      foreign_key: { to_table: :match_schedule_candidates },
      index: true
  end
end
