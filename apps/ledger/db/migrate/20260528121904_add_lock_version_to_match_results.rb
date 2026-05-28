class AddLockVersionToMatchResults < ActiveRecord::Migration[8.1]
  def change
    add_column :match_results, :lock_version, :integer, default: 0, null: false
  end
end
