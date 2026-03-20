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

ActiveRecord::Schema[8.1].define(version: 2026_03_19_000200) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

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
    t.uuid "away_participant_id"
    t.integer "board_number", null: false
    t.datetime "created_at", null: false
    t.string "home_deck_name"
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
    t.string "name", null: false
    t.uuid "organizer_account_id", null: false
    t.string "rule_module_key", default: "wmgp", null: false
    t.string "slug", null: false
    t.date "started_at"
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.index ["organizer_account_id"], name: "index_leagues_on_organizer_account_id"
    t.index ["slug"], name: "index_leagues_on_slug", unique: true
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
    t.uuid "away_team_id", null: false
    t.uuid "block_id"
    t.string "bracket_slot"
    t.datetime "created_at", null: false
    t.string "export_status", default: "pending", null: false
    t.uuid "home_team_id", null: false
    t.string "judge_name"
    t.uuid "league_id", null: false
    t.text "notes"
    t.uuid "phase_id", null: false
    t.string "room_id"
    t.date "scheduled_on"
    t.time "scheduled_time"
    t.string "spectator_room_id"
    t.string "stage_key"
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.uuid "week_id", null: false
    t.index ["away_team_id"], name: "index_matches_on_away_team_id"
    t.index ["block_id"], name: "index_matches_on_block_id"
    t.index ["home_team_id"], name: "index_matches_on_home_team_id"
    t.index ["league_id"], name: "index_matches_on_league_id"
    t.index ["phase_id", "stage_key"], name: "index_matches_on_phase_id_and_stage_key"
    t.index ["phase_id"], name: "index_matches_on_phase_id"
    t.index ["week_id", "status"], name: "index_matches_on_week_id_and_status"
    t.index ["week_id"], name: "index_matches_on_week_id"
    t.check_constraint "export_status::text = ANY (ARRAY['not_required'::character varying::text, 'pending'::character varying::text, 'generated'::character varying::text, 'stale'::character varying::text])", name: "matches_export_status_inclusion"
    t.check_constraint "home_team_id <> away_team_id", name: "matches_distinct_teams"
    t.check_constraint "status::text = ANY (ARRAY['draft'::character varying::text, 'scheduled'::character varying::text, 'in_progress'::character varying::text, 'result_pending'::character varying::text, 'confirmed'::character varying::text, 'cancelled'::character varying::text])", name: "matches_status_inclusion"
  end

  create_table "organizer_accounts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_organizer_accounts_on_email", unique: true
  end

  create_table "participants", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.uuid "league_id", null: false
    t.string "name", null: false
    t.text "notes"
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
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.uuid "league_id", null: false
    t.string "name", null: false
    t.integer "position", null: false
    t.string "ranking_rule_key"
    t.string "rule_module_key", default: "wmgp", null: false
    t.datetime "updated_at", null: false
    t.index ["league_id", "name"], name: "index_phases_on_league_id_and_name", unique: true
    t.index ["league_id", "position"], name: "index_phases_on_league_id_and_position", unique: true
    t.index ["league_id"], name: "index_phases_on_league_id"
  end

  create_table "rounds", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "away_team_id"
    t.datetime "created_at", null: false
    t.string "ended_by", default: "normal", null: false
    t.uuid "home_team_id"
    t.uuid "match_id", null: false
    t.text "notes"
    t.integer "number", null: false
    t.text "order_change_note"
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

  add_foreign_key "blocks", "leagues"
  add_foreign_key "blocks", "phases"
  add_foreign_key "board_results", "participants", column: "away_participant_id"
  add_foreign_key "board_results", "participants", column: "home_participant_id"
  add_foreign_key "board_results", "rounds"
  add_foreign_key "exports", "leagues"
  add_foreign_key "exports", "matches"
  add_foreign_key "leagues", "organizer_accounts"
  add_foreign_key "match_results", "matches"
  add_foreign_key "match_results", "teams", column: "winner_team_id"
  add_foreign_key "matches", "blocks"
  add_foreign_key "matches", "leagues"
  add_foreign_key "matches", "phases"
  add_foreign_key "matches", "teams", column: "away_team_id"
  add_foreign_key "matches", "teams", column: "home_team_id"
  add_foreign_key "matches", "weeks"
  add_foreign_key "participants", "leagues"
  add_foreign_key "participants", "teams"
  add_foreign_key "phases", "leagues"
  add_foreign_key "rounds", "matches"
  add_foreign_key "rounds", "teams", column: "away_team_id"
  add_foreign_key "rounds", "teams", column: "home_team_id"
  add_foreign_key "rounds", "teams", column: "winner_team_id"
  add_foreign_key "teams", "blocks"
  add_foreign_key "teams", "leagues"
  add_foreign_key "weeks", "leagues"
  add_foreign_key "weeks", "phases"
end
