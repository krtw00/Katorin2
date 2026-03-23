class RemoveRuleTemplatesAndRulesetsFromLeagues < ActiveRecord::Migration[8.1]
  def change
    remove_column :leagues, :rule_module_key, :string
    remove_column :leagues, :ruleset_snapshot, :json

    drop_table :rule_templates do |t|
      t.uuid :organizer_account_id, null: false
      t.string :key, null: false
      t.string :name_ja, null: false
      t.string :name_en, null: false
      t.text :description_ja
      t.text :description_en
      t.json :definition, default: {}, null: false
      t.boolean :active, default: true, null: false
      t.timestamps
    end
  end
end
