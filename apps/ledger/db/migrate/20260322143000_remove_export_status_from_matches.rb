class RemoveExportStatusFromMatches < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :matches, name: "matches_export_status_inclusion"
    remove_column :matches, :export_status, :string
  end

  def down
    add_column :matches, :export_status, :string, null: false, default: "pending"
    add_check_constraint :matches,
      "export_status::text = ANY (ARRAY['not_required'::character varying::text, 'pending'::character varying::text, 'generated'::character varying::text, 'stale'::character varying::text])",
      name: "matches_export_status_inclusion"
  end
end
