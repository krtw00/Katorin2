require "rack/test"
require "stringio"
require "test_helper"

class RegularSeasonOperationsFlowTest < ActionDispatch::IntegrationTest
  setup do
    @password = "password"
    @organizer_account = OrganizerAccount.create!(
      display_name: "E2E Organizer",
      login_id: "e2e-admin",
      email: "e2e-admin@example.com",
      password: @password
    )
    @organizer_account.organizer_members.create!(
      display_name: "Owner",
      role: "owner",
      active: true,
      admin_password: "1234"
    )
    @judge = @organizer_account.organizer_members.create!(
      display_name: "Judge One",
      role: "staff",
      active: true
    )
    @organizer_account.ensure_default_stage_assets!
  end

  test "organizer can run the regular season flow end to end" do
    login_as!(@organizer_account, password: @password)

    post leagues_path(locale: :ja), params: {
      league: {
        name: "E2E League",
        status: "draft",
        roster_min_members: 4,
        roster_max_members: 8,
        lineup_size: 3,
        substitute_size: 1
      }
    }
    league = @organizer_account.leagues.order(:created_at).last
    assert_redirected_to league_path(locale: :ja, id: league)

    post league_phases_path(locale: :ja, league_id: league), params: {
      phase: {
        name: "予選 1",
        stage_asset_id: regular_stage_asset.id,
        bracket_participant_count: ""
      }
    }
    phase = league.phases.order(:created_at).last
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)

    post phase_blocks_path(locale: :ja, phase_id: phase), params: {
      block: {
        name: "Block A",
        position: 1
      }
    }
    block = phase.blocks.order(:created_at).last
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)

    team_a = create_team_with_members!(league:, block:, name: "Team Alpha")
    team_b = create_team_with_members!(league:, block:, name: "Team Beta")

    post phase_weeks_path(locale: :ja, phase_id: phase), params: {
      week: {
        number: 1,
        position: 1,
        locked_at: ""
      }
    }
    week = phase.weeks.order(:created_at).last
    assert_redirected_to phase_week_path(locale: :ja, phase_id: phase, id: week)

    post week_matches_path(locale: :ja, week_id: week, block_id: block.id), params: {
      match: {
        home_team_id: team_a.id,
        away_team_id: team_b.id,
        scheduled_on: Date.new(2026, 3, 22),
        scheduled_time: "20:00",
        judge_name: @judge.display_name,
        room_id: "room-1",
        spectator_room_id: "spec-1",
        status: "scheduled",
        notes: "regular season e2e"
      }
    }
    match = week.matches.order(:created_at).last
    assert_redirected_to match_path(locale: :ja, id: match)

    patch match_lineup_path(locale: :ja, match_id: match), params: {
      lineup: {
        home: {
          slots: lineup_slots_payload(team_a.participants.order(:position))
        },
        away: {
          slots: lineup_slots_payload(team_b.participants.order(:position))
        }
      }
    }
    assert_redirected_to edit_match_lineup_path(locale: :ja, match_id: match)
    match.reload
    assert_equal 8, match.match_lineup_members.count

    patch match_result_entry_path(locale: :ja, match_id: match), params: {
      result_entry: {
        rounds: result_payload(match)
      }
    }
    assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: match)

    match.reload
    assert_equal "confirmed", match.status
    assert_equal team_a, match.match_result.winner_team
    assert_equal [2, 1], [match.match_result.home_round_wins, match.match_result.away_round_wins]
    assert_equal 3, match.rounds.count
    assert_equal 9, match.rounds.sum { |round| round.board_results.count }

    get download_match_result_card_export_path(locale: :ja, match_id: match)
    assert_response :success
    assert_equal "image/png", response.media_type
    assert_includes response.headers["Content-Disposition"], "attachment"
  end

  test "organizer can create a tournament phase before setting participant count" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Tournament League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )

    assert_difference("Phase.count", 1) do
      post league_phases_path(locale: :ja, league_id: league), params: {
        phase: {
          name: "決勝ステージ",
          stage_asset_id: final_stage_asset.id,
          bracket_participant_count: 0
        }
      }
    end
    phase = league.phases.order(:created_at).last
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_nil phase.bracket_participant_count
    assert phase.bracket_enabled?
  end

  test "organizer can open new match form for a tournament week without blocks" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Bracket League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "決勝ステージ", stage_asset: final_stage_asset, position: 1)
    week = phase.weeks.create!(league:, number: 1, position: 1)

    team_a = league.teams.create!(display_name: "Bracket Alpha", status: "active")
    team_b = league.teams.create!(display_name: "Bracket Beta", status: "active")

    4.times do |index|
      team_a.participants.create!(league:, display_name: "Alpha Player #{index + 1}", position: index + 1, status: "active")
      team_b.participants.create!(league:, display_name: "Beta Player #{index + 1}", position: index + 1, status: "active")
    end

    get new_week_match_path(locale: :ja, week_id: week)

    assert_response :success
    assert_includes response.body, "Bracket Alpha"
    assert_includes response.body, "Bracket Beta"
  end

  test "organizer edits tournament size from dedicated bracket settings" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Bracket Settings League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "決勝ステージ", stage_asset: final_stage_asset, position: 1)

    get edit_league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_response :success
    assert_no_match(/name="phase\[bracket_participant_count\]"/, response.body)

    get edit_bracket_league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_response :success
    assert_match(/name="phase\[bracket_participant_count\]"/, response.body)
    assert_no_match(/name="phase\[stage_asset_id\]"/, response.body)

    patch update_bracket_league_phase_path(locale: :ja, league_id: league, id: phase), params: {
      phase: {
        bracket_participant_count: 8
      }
    }

    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_equal 8, phase.reload.bracket_participant_count
  end

  test "organizer can delete draft management data but cannot delete the last privileged member" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Delete Flow League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)
    block = phase.blocks.create!(league:, name: "Block A", position: 1)
    team = league.teams.create!(display_name: "Delete Team", block:, status: "active")
    participant = team.participants.create!(league:, display_name: "Delete Member", status: "active")
    week = phase.weeks.create!(league:, number: 1, position: 1)
    match = week.matches.create!(
      league:,
      phase:,
      block:,
      home_team: team,
      away_team: league.teams.create!(display_name: "Delete Team 2", block:, status: "active"),
      status: "draft"
    )
    staff = @organizer_account.organizer_members.create!(display_name: "Delete Staff", role: "staff", active: true)

    assert_difference("Match.count", -1) do
      delete match_path(locale: :ja, id: match)
    end
    assert_redirected_to phase_week_path(locale: :ja, phase_id: phase, id: week)

    assert_difference("Participant.count", -1) do
      delete league_team_participant_path(locale: :ja, league_id: league, team_id: team, id: participant)
    end
    assert_redirected_to league_team_path(locale: :ja, league_id: league, id: team)

    assert_difference("Team.count", -1) do
      delete league_team_path(locale: :ja, league_id: league, id: team)
    end
    assert_redirected_to league_teams_path(locale: :ja, league_id: league)

    assert_difference("Week.count", -1) do
      delete phase_week_path(locale: :ja, phase_id: phase, id: week)
    end
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)

    assert_difference("Block.count", -1) do
      delete phase_block_path(locale: :ja, phase_id: phase, id: block)
    end
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)

    assert_difference("OrganizerMember.count", -1) do
      delete organizer_member_path(locale: :ja, id: staff)
    end
    assert_redirected_to organizer_members_path(locale: :ja)

    owner = @organizer_account.organizer_members.find_by!(role: "owner")
    assert_no_difference("OrganizerMember.count") do
      delete organizer_member_path(locale: :ja, id: owner)
    end
    assert_redirected_to organizer_members_path(locale: :ja)

    assert_difference("Phase.count", -1) do
      delete league_phase_path(locale: :ja, league_id: league, id: phase)
    end
    assert_redirected_to league_path(locale: :ja, id: league)

    assert_difference("League.count", -1) do
      delete league_path(locale: :ja, id: league)
    end
    assert_redirected_to leagues_path(locale: :ja)
  end

  test "organizer can import teams and members from csv and download the template" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "CSV Import League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)
    block = phase.blocks.create!(league:, name: "Block A", position: 1)

    get new_league_team_import_path(locale: :ja, league_id: league)
    assert_response :success

    get template_league_team_import_path(locale: :ja, league_id: league)
    assert_response :success
    assert_equal "text/csv", response.media_type
    assert_includes response.body, "チーム名,チーム状態,ブロック名,チームメモ,メンバー名,メンバー順,メンバー状態,メンバーメモ"
    assert_includes response.body, "サンプルチームA,有効,Block A,テンプレート例,山田 太郎,1,有効,リーダー"

    get template_league_team_import_path(locale: :en, league_id: league)
    assert_response :success
    assert_includes response.body, "Team name,Team status,Block name,Team notes,Member name,Member order,Member status,Member notes"
    assert_includes response.body, "Sample Team A,active,Block A,template example,Taro Yamada,1,active,captain"

    csv = <<~CSV
      チーム名,チーム状態,ブロック名,チームメモ,メンバー名,メンバー順,メンバー状態,メンバーメモ
      Team Alpha,active,Block A,Alpha memo,Alice,1,active,Captain
      Team Alpha,active,Block A,Alpha memo,Bob,2,active,
      Team Beta,withdrawn,,Beta memo,Carol,1,inactive,Reserve
    CSV

    assert_difference("Team.count", 2) do
      assert_difference("Participant.count", 3) do
        post league_team_import_path(locale: :ja, league_id: league), params: {
          team_import: {
            file: uploaded_csv(csv)
          }
        }
      end
    end
    assert_redirected_to league_teams_path(locale: :ja, league_id: league)

    team_alpha = league.teams.find_by!(display_name: "Team Alpha")
    team_beta = league.teams.find_by!(display_name: "Team Beta")
    assert_equal block, team_alpha.block
    assert_equal "withdrawn", team_beta.status
    assert_equal "Alpha memo", team_alpha.notes
    assert_equal "Beta memo", team_beta.notes
    assert_equal [1, 2], team_alpha.participants.order(:position).pluck(:position)
    assert_equal %w[Alice Bob], team_alpha.participants.order(:position).pluck(:display_name)
    assert_equal "inactive", team_beta.participants.find_by!(display_name: "Carol").status

    update_csv = <<~CSV
      チーム名,チーム状態,ブロック名,チームメモ,メンバー名,メンバー順,メンバー状態,メンバーメモ
      Team Alpha,inactive,Block A,Alpha updated,Alice,3,inactive,Updated captain
      Team Gamma,active,,Gamma memo,Dave,1,active,New member
    CSV

    assert_difference("Team.count", 1) do
      assert_difference("Participant.count", 1) do
        post league_team_import_path(locale: :ja, league_id: league), params: {
          team_import: {
            file: uploaded_csv(update_csv)
          }
        }
      end
    end
    assert_redirected_to league_teams_path(locale: :ja, league_id: league)

    team_alpha.reload
    alice = team_alpha.participants.find_by!(display_name: "Alice")
    assert_equal "inactive", team_alpha.status
    assert_equal "Alpha updated", team_alpha.notes
    assert_equal 3, alice.position
    assert_equal "inactive", alice.status
    assert_equal "Updated captain", alice.notes
    assert_equal "Gamma memo", league.teams.find_by!(display_name: "Team Gamma").notes
  end

  test "organizer can open shared template management screens" do
    login_as!(@organizer_account, password: @password)

    get stage_assets_path(locale: :ja)
    assert_response :success
  end

  test "organizer can delete phase templates even after a phase is created from them" do
    login_as!(@organizer_account, password: @password)

    custom_stage_asset = @organizer_account.stage_assets.create!(
      key: "custom_stage",
      name_ja: "カスタムフェーズ",
      name_en: "Custom Phase",
      format: "round_robin",
      participant_scope: "all_teams",
      advancement_rule: "none",
      active: true
    )

    assert_difference("StageAsset.count", -1) do
      delete stage_asset_path(locale: :ja, id: custom_stage_asset)
    end
    assert_redirected_to stage_assets_path(locale: :ja)

    league = @organizer_account.leagues.create!(
      name: "In Use League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)

    assert_difference("StageAsset.count", -1) do
      delete stage_asset_path(locale: :ja, id: phase.stage_asset)
    end
    assert_redirected_to stage_assets_path(locale: :ja)
    phase.reload
    assert_nil phase.stage_asset
  end

  test "registration redirects to initial organizer setup and creates first owner" do
    post registration_path(locale: :ja), params: {
      organizer_account: {
        display_name: "New Organizer",
        login_id: "new-organizer",
        email: "new-organizer@example.com",
        password: "password"
      }
    }

    organizer_account = OrganizerAccount.find_by!(login_id: "new-organizer")
    assert_redirected_to new_organizer_setup_path(locale: :ja)
    assert_equal 0, organizer_account.organizer_members.count

    follow_redirect!
    assert_response :success

    post organizer_setup_path(locale: :ja), params: {
      organizer_member: {
        display_name: "root",
        admin_password: "1234"
      }
    }

    assert_redirected_to dashboard_path(locale: :ja)
    organizer_account.reload
    assert_equal 1, organizer_account.organizer_members.count
    assert_equal "owner", organizer_account.organizer_members.first.role
  end

  private

  def create_team_with_members!(league:, block:, name:)
    post league_teams_path(locale: :ja, league_id: league), params: {
      team: {
        display_name: name,
        block_id: block.id,
        status: "active",
        notes: ""
      }
    }
    team = league.teams.order(:created_at).last
    assert_redirected_to league_team_path(locale: :ja, league_id: league, id: team)

    4.times do |index|
      post league_team_participants_path(locale: :ja, league_id: league, team_id: team), params: {
        participant: {
          display_name: "#{name} Player #{index + 1}",
          position: index + 1,
          status: "active",
          notes: ""
        }
      }
      assert_redirected_to league_team_path(locale: :ja, league_id: league, id: team)
    end

    team.reload
  end

  def lineup_slots_payload(participants)
    {
      "0" => { role: "main", slot_number: 1, participant_id: participants[0].id },
      "1" => { role: "main", slot_number: 2, participant_id: participants[1].id },
      "2" => { role: "main", slot_number: 3, participant_id: participants[2].id },
      "3" => { role: "substitute", slot_number: 1, participant_id: participants[3].id }
    }
  end

  def result_payload(match)
    home = match.home_team.participants.order(:position)
    away = match.away_team.participants.order(:position)

    {
      "1" => round_payload(home:, away:, scores: [[2, 0], [2, 1], [0, 2]], suffix: "R1"),
      "2" => round_payload(home:, away:, scores: [[2, 0], [2, 1], [0, 2]], suffix: "R2"),
      "3" => round_payload(home:, away:, scores: [[0, 2], [1, 2], [2, 0]], suffix: "R3")
    }
  end

  def round_payload(home:, away:, scores:, suffix:)
    {
      "boards" => {
        "1" => board_payload(home[0], away[0], scores[0], "#{suffix} Deck A1", "#{suffix} Deck B1"),
        "2" => board_payload(home[1], away[1], scores[1], "#{suffix} Deck A2", "#{suffix} Deck B2"),
        "3" => board_payload(home[2], away[2], scores[2], "#{suffix} Deck A3", "#{suffix} Deck B3")
      }
    }
  end

  def board_payload(home_participant, away_participant, score, home_deck, away_deck)
    {
      "home_participant_id" => home_participant.id,
      "away_participant_id" => away_participant.id,
      "home_deck_name" => home_deck,
      "away_deck_name" => away_deck,
      "home_game_wins" => score[0],
      "away_game_wins" => score[1]
    }
  end

  def uploaded_csv(content, filename: "team-import.csv")
    Rack::Test::UploadedFile.new(
      StringIO.new(content),
      "text/csv",
      false,
      original_filename: filename
    )
  end

  def regular_stage_asset
    @organizer_account.stage_assets.find_by!(format: "round_robin")
  end

  def final_stage_asset
    @organizer_account.stage_assets.find_by!(format: "single_elimination")
  end
end
