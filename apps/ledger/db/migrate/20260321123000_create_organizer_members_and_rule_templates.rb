class CreateOrganizerMembersAndRuleTemplates < ActiveRecord::Migration[8.1]
  class MigrationOrganizerAccount < ApplicationRecord
    self.table_name = "organizer_accounts"
  end

  class MigrationOrganizerMember < ApplicationRecord
    self.table_name = "organizer_members"
  end

  MEMBER_ROLES = %w[owner admin staff].freeze

  def up
    create_table :organizer_members, id: :uuid do |t|
      t.references :organizer_account, null: false, type: :uuid, foreign_key: true
      t.string :display_name, null: false
      t.string :role, null: false, default: "staff"
      t.boolean :active, null: false, default: true
      t.text :notes

      t.timestamps
    end

    add_index :organizer_members, %i[organizer_account_id display_name], unique: true
    add_inclusion_constraint :organizer_members, :role, MEMBER_ROLES

    create_table :rule_templates, id: :uuid do |t|
      t.references :organizer_account, null: false, type: :uuid, foreign_key: true
      t.string :key, null: false
      t.string :name_ja, null: false
      t.string :name_en, null: false
      t.text :description_ja
      t.text :description_en
      t.json :definition, null: false, default: {}
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :rule_templates, %i[organizer_account_id key], unique: true

    MigrationOrganizerAccount.find_each do |account|
      next if MigrationOrganizerMember.exists?(organizer_account_id: account.id)

      MigrationOrganizerMember.create!(
        organizer_account_id: account.id,
        display_name: account.display_name,
        role: "owner",
        active: true
      )
    end
  end

  def down
    drop_table :rule_templates
    remove_check_constraint :organizer_members, name: "organizer_members_role_inclusion"
    drop_table :organizer_members
  end

  private

  def add_inclusion_constraint(table_name, column_name, values, allow_null: false)
    quoted_values = values.map { |value| quote(value) }.join(", ")
    null_sql = allow_null ? " OR #{column_name} IS NULL" : ""

    add_check_constraint(
      table_name,
      "#{column_name} IN (#{quoted_values})#{null_sql}",
      name: "#{table_name}_#{column_name}_inclusion"
    )
  end
end
