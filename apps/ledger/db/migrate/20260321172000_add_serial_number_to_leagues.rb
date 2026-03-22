class AddSerialNumberToLeagues < ActiveRecord::Migration[8.1]
  def up
    add_column :leagues, :serial_number, :integer

    execute <<~SQL
      WITH numbered AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY organizer_account_id
            ORDER BY created_at ASC, id ASC
          ) AS serial_number
        FROM leagues
      )
      UPDATE leagues
      SET serial_number = numbered.serial_number
      FROM numbered
      WHERE leagues.id = numbered.id
    SQL

    change_column_null :leagues, :serial_number, false
    add_index :leagues, [:organizer_account_id, :serial_number], unique: true
  end

  def down
    remove_index :leagues, [:organizer_account_id, :serial_number]
    remove_column :leagues, :serial_number
  end
end
