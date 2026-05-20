require "test_helper"

class MatchExports::ResultCardRendererTest < ActiveSupport::TestCase
  test "last_source_change is nil when no rounds, match_result, or team icons exist" do
    match = create_match_for_renderer_test!(home_name: "Alpha Team", away_name: "Beta Team")
    renderer = MatchExports::ResultCardRenderer.new(match.reload)

    assert_nil renderer.send(:last_source_change)
  end

  test "last_source_change reflects home team icon attachment time" do
    match = create_match_for_renderer_test!(home_name: "Alpha Team", away_name: "Beta Team")
    before_attach = Time.current
    match.home_team.icon.attach(
      io: StringIO.new(one_by_one_png),
      filename: "home_icon.png",
      content_type: "image/png"
    )
    attachment = match.home_team.reload.icon.attachment

    renderer = MatchExports::ResultCardRenderer.new(match.reload)
    result = renderer.send(:last_source_change)

    assert_not_nil result
    assert_operator result, :>=, before_attach
    assert_operator result, :>=, attachment.created_at
  end

  test "last_source_change reflects away team icon attachment time" do
    match = create_match_for_renderer_test!(home_name: "Alpha Team", away_name: "Beta Team")
    before_attach = Time.current
    match.away_team.icon.attach(
      io: StringIO.new(one_by_one_png),
      filename: "away_icon.png",
      content_type: "image/png"
    )
    attachment = match.away_team.reload.icon.attachment

    renderer = MatchExports::ResultCardRenderer.new(match.reload)
    result = renderer.send(:last_source_change)

    assert_not_nil result
    assert_operator result, :>=, before_attach
    assert_operator result, :>=, attachment.created_at
  end

  test "last_source_change returns most recent among rounds, match_result, and team icons" do
    match = create_match_for_renderer_test!(home_name: "Alpha Team", away_name: "Beta Team")
    match.rounds.create!(
      number: 1,
      home_team: match.home_team,
      away_team: match.away_team,
      result_status: "partial",
      winner_team: nil
    )
    match.home_team.icon.attach(
      io: StringIO.new(one_by_one_png),
      filename: "home_icon.png",
      content_type: "image/png"
    )
    icon_attached_at = match.home_team.reload.icon.attachment.created_at

    renderer = MatchExports::ResultCardRenderer.new(match.reload)
    result = renderer.send(:last_source_change)

    assert_not_nil result
    assert_operator result, :>=, match.rounds.maximum(:updated_at)
    assert_operator result, :>=, icon_attached_at
  end

  private

  def create_match_for_renderer_test!(home_name:, away_name:)
    organizer = OrganizerAccount.create!(
      display_name: "Renderer Organizer",
      login_id: "renderer-org-#{SecureRandom.hex(4)}",
      email: "renderer-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Renderer League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "予選 1", position: 1, rule_module_key: "wmgp")
    week = phase.weeks.create!(league: league, number: 1, position: 1)
    home_team = league.teams.create!(display_name: home_name)
    away_team = league.teams.create!(display_name: away_name)

    week.matches.create!(
      league: league,
      phase: phase,
      home_team: home_team,
      away_team: away_team,
      scheduled_on: Date.new(2026, 4, 11),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )
  end

  def create_confirmed_board_result!(round:, board_number:, score:, winner_side:)
    round.board_results.create!(
      board_number: board_number,
      home_game_wins: score[0],
      away_game_wins: score[1],
      result_status: "confirmed",
      winner_side: winner_side
    )
  end

  def one_by_one_png
    Base64.decode64(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
  end
end
