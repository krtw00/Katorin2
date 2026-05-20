# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_21_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "blocks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "league_id", null: false
    t.string "name", null: false
    t.uuid "phase_id", null: false
    t.integer "position", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_blocks_on_league_id"
    t.index ["phase_id", "name"], name: "index_blocks_on_phase_id_and_name", unique: true
    t.index ["phase_id", "position"], name: "index_blocks_on_phase_id_and_position", unique: true
    t.index ["phase_id"], name: "index_blocks_on_phase_id"
  end

  create_table "board_results", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "away_deck_name"
    t.integer "away_game_wins"
    t.uuid "away_participant_id"
    t.integer "board_number", null: false
    t.datetime "created_at", null: false
    t.string "home_deck_name"
    t.integer "home_game_wins"
    t.uuid "home_participant_id"
    t.text "notes"
    t.string "result_status", default: "partial", null: false
    t.uuid "round_id", null: false
    t.datetime "updated_at", null: false
    t.string "winner_side"
    t.index ["away_participant_id"], name: "index_board_results_on_away_participant_id"
    t.index ["home_participant_id"], name: "index_board_results_on_home_participant_id"
    t.index ["round_id", "board_number"], name: "index_board_results_on_round_id_and_board_number", unique: true
    t.index ["round_id"], name: "index_board_results_on_round_id"
    t.check_constraint "result_status::text = ANY (ARRAY['partial'::character varying::text, 'confirmed'::character varying::text, 'void'::character varying::text])", name: "board_results_result_status_inclusion"
    t.check_constraint "winner_side IS NULL OR (winner_side::text = ANY (ARRAY['home'::character varying::text, 'away'::character varying::text]))", name: "board_results_winner_side_inclusion"
  end

  create_table "bracket_rounds", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "lane_number"
    t.uuid "phase_id", null: false
    t.integer "position", null: false
    t.string "round_kind", default: "championship", null: false
    t.datetime "updated_at", null: false
    t.index ["phase_id", "round_kind", "lane_number", "position"], name: "index_bracket_rounds_on_phase_kind_lane_position", unique: true
    t.index ["phase_id"], name: "index_bracket_rounds_on_phase_id"
  end

  create_table "exports", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "export_type", null: false
    t.string "file_path"
    t.datetime "generated_at"
    t.uuid "league_id", null: false
    t.uuid "match_id"
    t.string "renderer_key", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_exports_on_league_id"
    t.index ["match_id", "export_type"], name: "index_exports_on_match_id_and_export_type"
    t.index ["match_id"], name: "index_exports_on_match_id"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying::text, 'generated'::character varying::text, 'stale'::character varying::text])", name: "exports_status_inclusion"
  end

  create_table "leagues", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "ended_at"
    t.integer "lineup_size", default: 3, null: false
    t.string "name", null: false
    t.uuid "organizer_account_id", null: false
    t.integer "roster_max_members", default: 15, null: false
    t.integer "roster_min_members", default: 6, null: false
    t.integer "serial_number", null: false
    t.string "slug", null: false
    t.date "started_at"
    t.string "status", default: "draft", null: false
    t.integer "substitute_size", default: 1, null: false
    t.datetime "updated_at", null: false
    t.index ["organizer_account_id", "serial_number"], name: "index_leagues_on_organizer_account_id_and_serial_number", unique: true
    t.index ["organizer_account_id"], name: "index_leagues_on_organizer_account_id"
    t.index ["slug"], name: "index_leagues_on_slug", unique: true
  end

  create_table "match_lineup_members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "match_id", null: false
    t.uuid "participant_id", null: false
    t.string "role", null: false
    t.string "side", null: false
    t.integer "slot_number", null: false
    t.uuid "team_id", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "participant_id"], name: "index_match_lineup_members_on_match_and_participant", unique: true
    t.index ["match_id", "side", "role", "slot_number"], name: "index_match_lineup_members_on_slot", unique: true
    t.index ["match_id"], name: "index_match_lineup_members_on_match_id"
    t.index ["participant_id"], name: "index_match_lineup_members_on_participant_id"
    t.index ["team_id"], name: "index_match_lineup_members_on_team_id"
  end

  create_table "match_results", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "away_round_wins", default: 0, null: false
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.string "decision_type", default: "normal", null: false
    t.integer "home_round_wins", default: 0, null: false
    t.uuid "match_id", null: false
    t.text "notes"
    t.string "result_status", default: "partial", null: false
    t.datetime "updated_at", null: false
    t.uuid "winner_team_id"
    t.index ["match_id"], name: "index_match_results_on_match_id", unique: true
    t.index ["winner_team_id"], name: "index_match_results_on_winner_team_id"
    t.check_constraint "result_status::text = ANY (ARRAY['partial'::character varying::text, 'confirmed'::character varying::text, 'void'::character varying::text])", name: "match_results_result_status_inclusion"
  end

  create_table "matches", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "away_loser_source_match_id"
    t.uuid "away_source_match_id"
    t.uuid "away_team_id"
    t.uuid "block_id"
    t.uuid "bracket_round_id"
    t.string "bracket_slot"
    t.datetime "created_at", null: false
    t.uuid "home_loser_source_match_id"
    t.uuid "home_source_match_id"
    t.uuid "home_team_id"
    t.string "judge_name"
    t.uuid "league_id", null: false
    t.text "notes"
    t.uuid "phase_id", null: false
    t.string "room_id"
    t.date "scheduled_on"
    t.time "scheduled_time"
    t.integer "slot_number"
    t.string "spectator_room_id"
    t.string "stage_key"
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.uuid "week_id"
    t.index ["away_loser_source_match_id"], name: "index_matches_on_away_loser_source_match_id"
    t.index ["away_source_match_id"], name: "index_matches_on_away_source_match_id"
    t.index ["away_team_id"], name: "index_matches_on_away_team_id"
    t.index ["block_id"], name: "index_matches_on_block_id"
    t.index ["bracket_round_id", "slot_number"], name: "index_matches_on_bracket_round_id_and_slot_number", unique: true
    t.index ["bracket_round_id"], name: "index_matches_on_bracket_round_id"
    t.index ["home_loser_source_match_id"], name: "index_matches_on_home_loser_source_match_id"
    t.index ["home_source_match_id"], name: "index_matches_on_home_source_match_id"
    t.index ["home_team_id"], name: "index_matches_on_home_team_id"
    t.index ["league_id"], name: "index_matches_on_league_id"
    t.index ["phase_id", "stage_key"], name: "index_matches_on_phase_id_and_stage_key"
    t.index ["phase_id"], name: "index_matches_on_phase_id"
    t.index ["week_id", "status"], name: "index_matches_on_week_id_and_status"
    t.index ["week_id"], name: "index_matches_on_week_id"
    t.check_constraint "home_team_id <> away_team_id", name: "matches_distinct_teams"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying::text, 'scheduled'::character varying::text, 'in_progress'::character varying::text, 'result_pending'::character varying::text, 'confirmed'::character varying::text, 'cancelled'::character varying::text])", name: "matches_status_inclusion"
  end

  create_table "organizer_accounts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.string "email", null: false
    t.string "login_id", null: false
    t.string "password_digest", null: false
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_organizer_accounts_on_email", unique: true
    t.index ["login_id"], name: "index_organizer_accounts_on_login_id", unique: true
    t.index ["reset_password_token"], name: "index_organizer_accounts_on_reset_password_token", unique: true
  end

  create_table "organizer_members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "admin_password_digest"
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.text "notes"
    t.uuid "organizer_account_id", null: false
    t.string "role", default: "staff", null: false
    t.datetime "updated_at", null: false
    t.index ["organizer_account_id", "display_name"], name: "idx_on_organizer_account_id_display_name_ae93f913dc", unique: true
    t.index ["organizer_account_id"], name: "index_organizer_members_on_organizer_account_id"
    t.check_constraint "role::text = ANY (ARRAY['owner'::character varying::text, 'admin'::character varying::text, 'staff'::character varying::text])", name: "organizer_members_role_inclusion"
  end

  create_table "participants", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.uuid "league_id", null: false
    t.string "member_id"
    t.string "member_ids", default: [], null: false, array: true
    t.string "name", null: false
    t.text "notes"
    t.string "participant_role", default: "member", null: false
    t.integer "position"
    t.string "status", default: "active", null: false
    t.uuid "team_id", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_participants_on_league_id"
    t.index ["team_id", "position"], name: "index_participants_on_team_id_and_position"
    t.index ["team_id"], name: "index_participants_on_team_id"
  end

  create_table "phases", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "bracket_enabled", default: false, null: false
    t.integer "bracket_lane_count", default: 1, null: false
    t.integer "bracket_participant_count"
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.uuid "league_id", null: false
    t.string "name", null: false
    t.integer "position", null: false
    t.string "ranking_rule_key"
    t.string "rule_module_key", default: "wmgp", null: false
    t.uuid "stage_asset_id"
    t.boolean "third_place_match_enabled", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["league_id", "name"], name: "index_phases_on_league_id_and_name", unique: true
    t.index ["league_id", "position"], name: "index_phases_on_league_id_and_position", unique: true
    t.index ["league_id"], name: "index_phases_on_league_id"
    t.index ["stage_asset_id"], name: "index_phases_on_stage_asset_id"
  end

  create_table "rounds", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "away_team_id"
    t.datetime "created_at", null: false
    t.string "ended_by", default: "normal", null: false
    t.uuid "home_team_id"
    t.uuid "match_id", null: false
    t.text "notes"
    t.integer "number", null: false
    t.string "result_status", default: "partial", null: false
    t.datetime "updated_at", null: false
    t.uuid "winner_team_id"
    t.index ["away_team_id"], name: "index_rounds_on_away_team_id"
    t.index ["home_team_id"], name: "index_rounds_on_home_team_id"
    t.index ["match_id", "number"], name: "index_rounds_on_match_id_and_number", unique: true
    t.index ["match_id"], name: "index_rounds_on_match_id"
    t.index ["winner_team_id"], name: "index_rounds_on_winner_team_id"
    t.check_constraint "result_status::text = ANY (ARRAY['partial'::character varying::text, 'confirmed'::character varying::text, 'void'::character varying::text])", name: "rounds_result_status_inclusion"
  end

  create_table "stage_assets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "advancement_rule", default: "none", null: false
    t.datetime "created_at", null: false
    t.text "description_en"
    t.text "description_ja"
    t.string "format", null: false
    t.string "key", null: false
    t.string "match_rule_key"
    t.string "name_en", null: false
    t.string "name_ja", null: false
    t.uuid "organizer_account_id", null: false
    t.string "participant_scope", default: "all_teams", null: false
    t.string "phase_kind", default: "regular_season", null: false
    t.string "ranking_rule_key"
    t.datetime "updated_at", null: false
    t.index ["organizer_account_id", "key"], name: "index_stage_assets_on_organizer_account_id_and_key", unique: true
    t.index ["organizer_account_id"], name: "index_stage_assets_on_organizer_account_id"
    t.check_constraint "advancement_rule::text = ANY (ARRAY['none'::character varying::text, 'top_n_per_group'::character varying::text, 'top_n_overall'::character varying::text, 'manual'::character varying::text])", name: "stage_assets_advancement_rule_inclusion"
    t.check_constraint "format::text = ANY (ARRAY['round_robin'::character varying::text, 'swiss'::character varying::text, 'single_elimination'::character varying::text])", name: "stage_assets_format_inclusion"
    t.check_constraint "participant_scope::text = ANY (ARRAY['all_teams'::character varying::text, 'qualified_teams'::character varying::text, 'manual_selection'::character varying::text])", name: "stage_assets_participant_scope_inclusion"
    t.check_constraint "phase_kind::text = ANY (ARRAY['regular_season'::character varying::text, 'playoff'::character varying::text])", name: "stage_assets_phase_kind_inclusion"
  end

  create_table "teams", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "block_id"
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.uuid "league_id", null: false
    t.string "name", null: false
    t.text "notes"
    t.string "short_name"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["block_id"], name: "index_teams_on_block_id"
    t.index ["league_id", "name"], name: "index_teams_on_league_id_and_name", unique: true
    t.index ["league_id"], name: "index_teams_on_league_id"
  end

  create_table "weeks", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "kind", default: "regular", null: false
    t.uuid "league_id", null: false
    t.datetime "locked_at"
    t.string "name", null: false
    t.integer "number", null: false
    t.uuid "phase_id", null: false
    t.integer "position", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id"], name: "index_weeks_on_league_id"
    t.index ["phase_id", "number"], name: "index_weeks_on_phase_id_and_number", unique: true
    t.index ["phase_id", "position"], name: "index_weeks_on_phase_id_and_position", unique: true
    t.index ["phase_id"], name: "index_weeks_on_phase_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "blocks", "leagues"
  add_foreign_key "blocks", "phases"
  add_foreign_key "board_results", "participants", column: "away_participant_id"
  add_foreign_key "board_results", "participants", column: "home_participant_id"
  add_foreign_key "board_results", "rounds"
  add_foreign_key "bracket_rounds", "phases"
  add_foreign_key "exports", "leagues"
  add_foreign_key "exports", "matches"
  add_foreign_key "leagues", "organizer_accounts"
  add_foreign_key "match_lineup_members", "matches"
  add_foreign_key "match_lineup_members", "participants"
  add_foreign_key "match_lineup_members", "teams"
  add_foreign_key "match_results", "matches"
  add_foreign_key "match_results", "teams", column: "winner_team_id"
  add_foreign_key "matches", "blocks"
  add_foreign_key "matches", "bracket_rounds"
  add_foreign_key "matches", "leagues"
  add_foreign_key "matches", "matches", column: "away_loser_source_match_id"
  add_foreign_key "matches", "matches", column: "away_source_match_id"
  add_foreign_key "matches", "matches", column: "home_loser_source_match_id"
  add_foreign_key "matches", "matches", column: "home_source_match_id"
  add_foreign_key "matches", "phases"
  add_foreign_key "matches", "teams", column: "away_team_id"
  add_foreign_key "matches", "teams", column: "home_team_id"
  add_foreign_key "matches", "weeks"
  add_foreign_key "organizer_members", "organizer_accounts"
  add_foreign_key "participants", "leagues"
  add_foreign_key "participants", "teams"
  add_foreign_key "phases", "leagues"
  add_foreign_key "phases", "stage_assets"
  add_foreign_key "rounds", "matches"
  add_foreign_key "rounds", "teams", column: "away_team_id"
  add_foreign_key "rounds", "teams", column: "home_team_id"
  add_foreign_key "rounds", "teams", column: "winner_team_id"
  add_foreign_key "stage_assets", "organizer_accounts"
  add_foreign_key "teams", "blocks"
  add_foreign_key "teams", "leagues"
  add_foreign_key "weeks", "leagues"
  add_foreign_key "weeks", "phases"
end
