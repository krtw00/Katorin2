require "rack/test"
require "stringio"
require "test_helper"

class RegularSeasonOperationsFlowTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @original_queue_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    clear_enqueued_jobs
    clear_performed_jobs

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

  teardown do
    clear_enqueued_jobs
    clear_performed_jobs
    ActiveJob::Base.queue_adapter = @original_queue_adapter
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
    assert_equal "Owner", match.judge_name

    post member_selection_path(locale: :ja), params: {
      organizer_member_id: @judge.id
    }
    assert_redirected_to dashboard_path(locale: :ja)

    assert_enqueued_with(job: MatchExports::GenerateResultCardJob, args: [match.id]) do
      patch match_result_entry_path(locale: :ja, match_id: match), params: {
        result_entry: {
          rounds: result_payload(match)
        }
      }
    end
    assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: match)

    match.reload
    assert_equal "confirmed", match.status
    assert_equal @judge.display_name, match.judge_name
    assert_equal team_a, match.match_result.winner_team
    assert_equal [2, 1], [match.match_result.home_round_wins, match.match_result.away_round_wins]
    assert_equal 3, match.rounds.count
    assert_equal 9, match.rounds.sum { |round| round.board_results.count }

    MatchExports::GenerateResultCardJob.perform_now(match.id)
    clear_enqueued_jobs

    assert_no_enqueued_jobs only: MatchExports::GenerateResultCardJob do
      get download_match_result_card_export_path(locale: :ja, match_id: match)
    end
    assert_response :success
    assert_equal "image/png", response.media_type
    assert_includes response.headers["Content-Disposition"], "attachment"
  end

  test "organizer can reopen a completed league by changing it back to active" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Reopenable League",
      status: "completed",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )

    patch league_path(locale: :ja, id: league), params: {
      league: {
        name: league.name,
        status: "active",
        roster_min_members: league.roster_min_members,
        roster_max_members: league.roster_max_members,
        lineup_size: league.lineup_size,
        substitute_size: league.substitute_size,
        started_at: "",
        ended_at: ""
      }
    }

    assert_redirected_to league_path(locale: :ja, id: league)
    assert_equal "active", league.reload.status
  end

  test "downloading without a fresh export queues background generation" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Export Timeout League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)
    block = phase.blocks.create!(league:, name: "Block A", position: 1)
    week = phase.weeks.create!(league:, number: 1, position: 1)
    team_a = create_team_record_with_members!(league:, name: "Export Team A")
    team_b = create_team_record_with_members!(league:, name: "Export Team B")
    match = week.matches.create!(
      league: league,
      phase: phase,
      block: block,
      home_team: team_a,
      away_team: team_b,
      scheduled_on: Date.new(2026, 4, 9),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )

    assert_enqueued_with(job: MatchExports::GenerateResultCardJob, args: [match.id]) do
      get download_match_result_card_export_path(locale: :ja, match_id: match)
    end

    assert_redirected_to match_path(locale: :ja, id: match)
    follow_redirect!
    assert_response :success
    assert_includes response.body, "画像生成を開始しました。少し待ってから再度ダウンロードしてください。"

    export = match.exports.find_by!(export_type: MatchExports::ResultCardRenderer::EXPORT_TYPE)
    assert_equal "pending", export.status
  end

  test "organizer can confirm a regular season match at 1-1 when all rounds are completed" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Draw League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)
    block = phase.blocks.create!(league:, name: "Block A", position: 1)
    week = phase.weeks.create!(league:, number: 1, position: 1)
    team_a = create_team_record_with_members!(league:, name: "Draw Team A")
    team_b = create_team_record_with_members!(league:, name: "Draw Team B")
    match = week.matches.create!(
      league: league,
      phase: phase,
      block: block,
      home_team: team_a,
      away_team: team_b,
      scheduled_on: Date.new(2026, 4, 11),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )

    patch match_result_entry_path(locale: :ja, match_id: match), params: {
      result_entry: {
        rounds: draw_result_payload(match)
      }
    }

    assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: match)

    match.reload
    assert_equal "confirmed", match.status
    assert_equal [1, 1], [match.match_result.home_round_wins, match.match_result.away_round_wins]
    assert_nil match.match_result.winner_team
    assert_equal "confirmed", match.match_result.result_status
    assert_equal [true, true, true], match.rounds.order(:number).map(&:confirmed?)
    assert_equal [team_a, team_b, nil], match.rounds.order(:number).map(&:winner_team)
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

  test "organizer can create another tournament phase with an auto-suffixed default name" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Tournament Naming League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    league.phases.create!(name: "決勝ステージ", stage_asset: final_stage_asset, position: 1)

    assert_difference("Phase.count", 1) do
      post league_phases_path(locale: :ja, league_id: league), params: {
        phase: {
          name: "",
          stage_asset_id: final_stage_asset.id
        }
      }
    end

    phase = league.phases.order(:created_at).last
    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_equal "決勝ステージ 2", phase.name
  end

  test "organizer can run a tournament bracket with manual seeding and automatic advancement" do
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
    team_a = create_team_record_with_members!(league:, name: "Bracket Alpha")
    team_b = create_team_record_with_members!(league:, name: "Bracket Beta")
    team_c = create_team_record_with_members!(league:, name: "Bracket Gamma")

    patch update_bracket_league_phase_path(locale: :ja, league_id: league, id: phase), params: {
      phase: {
        bracket_participant_count: 3
      }
    }

    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    phase.reload
    assert_equal 2, phase.bracket_rounds.count
    assert_equal 3, phase.matches.where.not(bracket_round_id: nil).count

    first_round = phase.bracket_rounds.order(:position).first
    final_round = phase.bracket_rounds.order(:position).last
    semifinal_one = first_round.matches.find_by!(slot_number: 1)
    semifinal_two = first_round.matches.find_by!(slot_number: 2)
    final_match = final_round.matches.find_by!(slot_number: 1)

    patch match_path(locale: :ja, id: semifinal_one), params: {
      match: {
        home_team_id: team_a.id,
        away_team_id: team_b.id,
        status: "scheduled"
      }
    }
    assert_redirected_to match_path(locale: :ja, id: semifinal_one)

    patch match_path(locale: :ja, id: semifinal_two), params: {
      match: {
        home_team_id: team_c.id,
        away_team_id: "",
        status: "scheduled"
      }
    }
    assert_redirected_to match_path(locale: :ja, id: semifinal_two)
    semifinal_two.reload
    assert_equal "confirmed", semifinal_two.status
    assert_equal team_c, semifinal_two.match_result.winner_team
    assert_equal team_c, final_match.reload.away_team

    patch match_result_entry_path(locale: :ja, match_id: semifinal_one), params: {
      result_entry: {
        rounds: result_payload(semifinal_one.reload)
      }
    }

    assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: semifinal_one)
    semifinal_one.reload
    final_match.reload
    assert_equal team_a, semifinal_one.match_result.winner_team
    assert_equal team_a, final_match.home_team

    get bracket_league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_response :success
    assert_includes response.body, "Bracket Alpha"
    assert_includes response.body, "Bracket Gamma"
  end

  test "organizer can delete a draft tournament phase with generated bracket matches" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Tournament Delete League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "決勝ステージ", stage_asset: final_stage_asset, position: 1, bracket_participant_count: 4)
    Brackets::PhaseBuilder.new(phase).rebuild!

    assert_difference("Phase.count", -1) do
      delete league_phase_path(locale: :ja, league_id: league, id: phase)
    end

    assert_redirected_to league_path(locale: :ja, id: league)
    assert_equal 0, league.matches.count
    assert_equal 0, league.reload.phases.count
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
    assert_match(/name="phase\[bracket_lane_count\]"/, response.body)
    assert_match(/name="phase\[third_place_match_enabled\]"/, response.body)
    assert_no_match(/name="phase\[stage_asset_id\]"/, response.body)

    patch update_bracket_league_phase_path(locale: :ja, league_id: league, id: phase), params: {
      phase: {
        bracket_participant_count: 8,
        bracket_lane_count: 4,
        third_place_match_enabled: "1"
      }
    }

    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_equal 8, phase.reload.bracket_participant_count
    assert_equal 4, phase.bracket_lane_count
    assert phase.third_place_match_enabled?
  end

  test "organizer can run a four region bracket with a third place match" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "WMGP Final League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "決勝ステージ", stage_asset: final_stage_asset, position: 1)
    teams = Array.new(8) { |index| create_team_record_with_members!(league:, name: "Final Seed #{index + 1}") }

    patch update_bracket_league_phase_path(locale: :ja, league_id: league, id: phase), params: {
      phase: {
        bracket_participant_count: 8,
        bracket_lane_count: 4,
        third_place_match_enabled: "1"
      }
    }

    assert_redirected_to league_phase_path(locale: :ja, league_id: league, id: phase)
    phase.reload
    assert_equal 7, phase.bracket_rounds.count
    assert_equal 8, phase.matches.where.not(bracket_round_id: nil).count

    region_rounds = (1..4).map do |region_number|
      phase.bracket_rounds.find_by!(round_kind: "lane", lane_number: region_number, position: 1)
    end
    semifinal_round = phase.bracket_rounds.find_by!(round_kind: "championship", position: 2)
    final_round = phase.bracket_rounds.find_by!(round_kind: "championship", position: 3)
    third_place_round = phase.bracket_rounds.find_by!(round_kind: "third_place")

    region_matches = region_rounds.map { |round| round.matches.first }
    semifinal_matches = semifinal_round.matches.order(:slot_number).to_a
    final_match = final_round.matches.first
    third_place_match = third_place_round.matches.first

    [
      [region_matches[0], teams[0], teams[7]],
      [region_matches[1], teams[3], teams[4]],
      [region_matches[2], teams[1], teams[6]],
      [region_matches[3], teams[2], teams[5]],
    ].each do |match, home_team, away_team|
      patch match_path(locale: :ja, id: match), params: {
        match: {
          home_team_id: home_team.id,
          away_team_id: away_team.id,
          status: "scheduled"
        }
      }
      assert_redirected_to match_path(locale: :ja, id: match)
    end

    region_matches.each do |match|
      patch match_result_entry_path(locale: :ja, match_id: match), params: {
        result_entry: {
          rounds: result_payload(match.reload)
        }
      }
      assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: match)
    end

    semifinal_matches.each(&:reload)
    assert_equal teams[0], semifinal_matches[0].home_team
    assert_equal teams[3], semifinal_matches[0].away_team
    assert_equal teams[1], semifinal_matches[1].home_team
    assert_equal teams[2], semifinal_matches[1].away_team

    semifinal_matches.each do |match|
      patch match_result_entry_path(locale: :ja, match_id: match), params: {
        result_entry: {
          rounds: result_payload(match.reload)
        }
      }
      assert_redirected_to edit_match_result_entry_path(locale: :ja, match_id: match)
    end

    assert_equal teams[0], final_match.reload.home_team
    assert_equal teams[1], final_match.away_team
    assert_equal teams[3], third_place_match.reload.home_team
    assert_equal teams[2], third_place_match.away_team

    get bracket_league_phase_path(locale: :ja, league_id: league, id: phase)
    assert_response :success
    assert_includes response.body, "3位決定戦"
    assert_includes response.body, "区画1"
    assert_includes response.body, "区画4"
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

  test "organizer can create participants with member_id and role and see them on team details" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "Participant ID League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    team = league.teams.create!(display_name: "Team Member ID", status: "active")

    get league_team_path(locale: :ja, league_id: league, id: team)
    assert_response :success
    assert_includes response.body, "メンバーID"
    assert_includes response.body, "ロール"

    assert_difference("Participant.count", 1) do
      post league_team_participants_path(locale: :ja, league_id: league, team_id: team), params: {
        participant: {
          display_name: "ID Player",
          member_id: "MEM-001",
          participant_role: "sub_leader",
          position: 1,
          status: "active",
          notes: ""
        }
      }
    end
    assert_redirected_to league_team_path(locale: :ja, league_id: league, id: team)

    participant = team.participants.find_by!(display_name: "ID Player")
    assert_equal "MEM-001", participant.member_id
    assert_equal "sub_leader", participant.participant_role

    get league_team_path(locale: :ja, league_id: league, id: team)
    assert_response :success
    assert_includes response.body, "ID Player"
    assert_includes response.body, "サブリーダー"
    assert_includes response.body, "ID: MEM-001"
    assert_includes response.body, "番号 1"
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

    get new_league_team_import_path(locale: :ja, league_id: league)
    assert_response :success

    get template_league_team_import_path(locale: :ja, league_id: league)
    assert_response :success
    assert_equal "text/csv", response.media_type
    assert_includes response.body, "チーム名,チーム状態,チームメモ,メンバー名,メンバーID,メンバーロール,メンバー順,メンバー状態,メンバーメモ"
    assert_includes response.body, "サンプルチームA,有効,テンプレート例,山田 太郎,,リーダー,1,有効,主将"

    get template_league_team_import_path(locale: :en, league_id: league)
    assert_response :success
    assert_includes response.body, "Team name,Team status,Team notes,Member name,Member ID,Member role,Member order,Member status,Member notes"
    assert_includes response.body, "Sample Team A,active,template example,Taro Yamada,,leader,1,active,captain"

    csv = <<~CSV
      チーム名,チーム状態,チームメモ,メンバー名,メンバーID,メンバーロール,メンバー順,メンバー状態,メンバーメモ
      Team Alpha,active,Alpha memo,Alice,A-001,leader,1,active,Captain
      Team Alpha,active,Alpha memo,Bob,,member,2,active,
      Team Beta,withdrawn,Beta memo,Carol,C-009,サブリーダー,1,inactive,Reserve
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
    assert_equal "withdrawn", team_beta.status
    assert_equal "Alpha memo", team_alpha.notes
    assert_equal "Beta memo", team_beta.notes
    assert_equal [1, 2], team_alpha.participants.order(:position).pluck(:position)
    assert_equal %w[Alice Bob], team_alpha.participants.order(:position).pluck(:display_name)
    assert_equal "A-001", team_alpha.participants.find_by!(display_name: "Alice").member_id
    assert_equal "leader", team_alpha.participants.find_by!(display_name: "Alice").participant_role
    assert_nil team_alpha.participants.find_by!(display_name: "Bob").member_id
    assert_equal "member", team_alpha.participants.find_by!(display_name: "Bob").participant_role
    assert_equal "C-009", team_beta.participants.find_by!(display_name: "Carol").member_id
    assert_equal "sub_leader", team_beta.participants.find_by!(display_name: "Carol").participant_role
    assert_equal "inactive", team_beta.participants.find_by!(display_name: "Carol").status

    update_csv = <<~CSV
      チーム名,チーム状態,チームメモ,メンバー名,メンバーID,メンバーロール,メンバー順,メンバー状態,メンバーメモ
      Team Alpha,inactive,Alpha updated,Alice,A-777,sub_leader,3,inactive,Updated captain
      Team Gamma,active,Gamma memo,Dave,,member,1,active,New member
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
    assert_equal "A-777", alice.member_id
    assert_equal "sub_leader", alice.participant_role
    assert_equal "inactive", alice.status
    assert_equal "Updated captain", alice.notes
    assert_equal "Gamma memo", league.teams.find_by!(display_name: "Team Gamma").notes
    assert_equal "member", league.teams.find_by!(display_name: "Team Gamma").participants.find_by!(display_name: "Dave").participant_role
  end

  test "organizer sees validation error when csv member_role is invalid" do
    login_as!(@organizer_account, password: @password)

    league = @organizer_account.leagues.create!(
      name: "CSV Import Role Validation League",
      status: "draft",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )

    invalid_csv = <<~CSV
      チーム名,チーム状態,チームメモ,メンバー名,メンバーID,メンバーロール,メンバー順,メンバー状態,メンバーメモ
      Team Alpha,active,Alpha memo,Alice,A-001,captain,1,active,Captain
    CSV

    assert_no_difference("Team.count") do
      assert_no_difference("Participant.count") do
        post league_team_import_path(locale: :ja, league_id: league), params: {
          team_import: {
            file: uploaded_csv(invalid_csv)
          }
        }
      end
    end

    assert_response :unprocessable_entity
    assert_includes response.body, "2行目: member_role の値 `captain` は使えません。"
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

  def create_team_record_with_members!(league:, name:)
    team = league.teams.create!(display_name: name, status: "active")

    4.times do |index|
      team.participants.create!(
        league: league,
        display_name: "#{name} Player #{index + 1}",
        position: index + 1,
        status: "active"
      )
    end

    team
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

  def draw_result_payload(match)
    home = match.home_team.participants.order(:position)
    away = match.away_team.participants.order(:position)

    {
      "1" => round_payload(home:, away:, scores: [[2, 0], [2, 1], [0, 2]], suffix: "D1"),
      "2" => round_payload(home:, away:, scores: [[0, 2], [1, 2], [2, 0]], suffix: "D2"),
      "3" => round_payload(home:, away:, scores: [[2, 0], [0, 2], [1, 1]], suffix: "D3")
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
