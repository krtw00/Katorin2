require "test_helper"

class Decks::UsageSummaryTest < ActiveSupport::TestCase
  setup do
    @organizer = OrganizerAccount.create!(
      display_name: "Deck Usage Org",
      login_id: "deck-usage-org",
      email: "deck-usage@example.com",
      password: "password"
    )
    @organizer.ensure_default_stage_assets!
    @league = @organizer.leagues.create!(
      name: "Deck Usage League",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    regular_stage_asset = @organizer.stage_assets.find_by!(format: "round_robin")
    @phase = @league.phases.create!(name: "予選 1", stage_asset: regular_stage_asset, position: 1)
    @block = @phase.blocks.create!(league: @league, name: "Block A", position: 1)
    @week = @phase.weeks.create!(league: @league, number: 1, position: 1)
  end

  test "returns empty entries when the week has no recorded boards" do
    summary = Decks::UsageSummary.new(@week)

    assert summary.empty?
    assert_equal [], summary.entries
  end

  test "aggregates wins, losses, and unique users per deck across the week" do
    home_team = create_team!("Home")
    away_team = create_team!("Away")
    home_alice = home_team.participants.first
    home_bob = home_team.participants.second
    away_carol = away_team.participants.first

    match = create_match!(home_team: home_team, away_team: away_team)
    round = match.rounds.create!(number: 1, result_status: "confirmed", home_team: home_team, away_team: away_team)
    round.board_results.create!(board_number: 1, home_participant: home_alice, away_participant: away_carol,
      home_deck_name: "Deck X", away_deck_name: "Deck Y",
      home_game_wins: 2, away_game_wins: 0, winner_side: "home", result_status: "confirmed")
    round.board_results.create!(board_number: 2, home_participant: home_bob, away_participant: away_carol,
      home_deck_name: "Deck X", away_deck_name: "Deck Y",
      home_game_wins: 0, away_game_wins: 2, winner_side: "away", result_status: "confirmed")

    entries = Decks::UsageSummary.new(@week).entries
    deck_x = entries.find { |entry| entry.deck_name == "Deck X" }
    deck_y = entries.find { |entry| entry.deck_name == "Deck Y" }

    assert_equal 2, deck_x.user_count, "Deck X was played by both home_alice and home_bob"
    assert_equal 1, deck_x.wins
    assert_equal 1, deck_x.losses
    assert_in_delta 0.5, deck_x.win_rate, 0.001

    assert_equal 1, deck_y.user_count, "Deck Y was only played by away_carol"
    assert_equal 1, deck_y.wins
    assert_equal 1, deck_y.losses
  end

  test "sorts entries by user_count desc then wins desc then deck_name asc" do
    home_team = create_team!("Sort Home")
    away_team = create_team!("Sort Away")
    match = create_match!(home_team: home_team, away_team: away_team)
    round = match.rounds.create!(number: 1, result_status: "confirmed", home_team: home_team, away_team: away_team)
    round.board_results.create!(board_number: 1, home_participant: home_team.participants.first, away_participant: away_team.participants.first,
      home_deck_name: "Beta Deck", away_deck_name: "Alpha Deck",
      home_game_wins: 2, away_game_wins: 0, winner_side: "home", result_status: "confirmed")
    round.board_results.create!(board_number: 2, home_participant: home_team.participants.second, away_participant: away_team.participants.second,
      home_deck_name: "Beta Deck", away_deck_name: "Gamma Deck",
      home_game_wins: 0, away_game_wins: 2, winner_side: "away", result_status: "confirmed")
    round.board_results.create!(board_number: 3, home_participant: home_team.participants.third, away_participant: away_team.participants.third,
      home_deck_name: "Alpha Deck", away_deck_name: "Gamma Deck",
      home_game_wins: 2, away_game_wins: 1, winner_side: "home", result_status: "confirmed")

    entries = Decks::UsageSummary.new(@week).entries
    assert_equal %w[Alpha\ Deck Beta\ Deck Gamma\ Deck], entries.map(&:deck_name),
      "Alpha and Beta both have 2 users; Alpha wins more so it sorts first, then Beta, then Gamma with 2 users"
  end

  test "counts users for draw boards but contributes 0 wins and 0 losses" do
    home_team = create_team!("Draw Home")
    away_team = create_team!("Draw Away")
    match = create_match!(home_team: home_team, away_team: away_team)
    round = match.rounds.create!(number: 1, result_status: "partial", home_team: home_team, away_team: away_team)
    round.board_results.create!(board_number: 1, home_participant: home_team.participants.first, away_participant: away_team.participants.first,
      home_deck_name: "Draw Deck", away_deck_name: "Draw Deck",
      home_game_wins: 1, away_game_wins: 1, winner_side: nil, result_status: "confirmed")

    entries = Decks::UsageSummary.new(@week).entries
    draw_deck = entries.find { |entry| entry.deck_name == "Draw Deck" }

    assert_equal 2, draw_deck.user_count
    assert_equal 0, draw_deck.wins
    assert_equal 0, draw_deck.losses
    assert_nil draw_deck.win_rate
  end

  test "only aggregates boards belonging to the given week" do
    home_team = create_team!("Scope Home")
    away_team = create_team!("Scope Away")
    other_week = @phase.weeks.create!(league: @league, number: 2, position: 2)

    in_week_match = create_match!(home_team: home_team, away_team: away_team)
    in_week_round = in_week_match.rounds.create!(number: 1, result_status: "confirmed", home_team: home_team, away_team: away_team)
    in_week_round.board_results.create!(board_number: 1, home_participant: home_team.participants.first, away_participant: away_team.participants.first,
      home_deck_name: "InWeek Deck", away_deck_name: "Opponent Deck",
      home_game_wins: 2, away_game_wins: 0, winner_side: "home", result_status: "confirmed")

    other_match = create_match!(home_team: home_team, away_team: away_team, week: other_week)
    other_round = other_match.rounds.create!(number: 1, result_status: "confirmed", home_team: home_team, away_team: away_team)
    other_round.board_results.create!(board_number: 1, home_participant: home_team.participants.first, away_participant: away_team.participants.first,
      home_deck_name: "Other Week Deck", away_deck_name: "Opponent Deck",
      home_game_wins: 2, away_game_wins: 0, winner_side: "home", result_status: "confirmed")

    entries = Decks::UsageSummary.new(@week).entries
    deck_names = entries.map(&:deck_name)

    assert_includes deck_names, "InWeek Deck"
    refute_includes deck_names, "Other Week Deck", "boards from other weeks must not leak in"
  end

  test "to_csv emits localized header and one row per entry sorted by user_count desc" do
    home_team = create_team!("CSV Home")
    away_team = create_team!("CSV Away")
    match = create_match!(home_team: home_team, away_team: away_team)
    round = match.rounds.create!(number: 1, result_status: "confirmed", home_team: home_team, away_team: away_team)
    round.board_results.create!(board_number: 1, home_participant: home_team.participants.first, away_participant: away_team.participants.first,
      home_deck_name: "CSV Deck", away_deck_name: "CSV Deck",
      home_game_wins: 2, away_game_wins: 0, winner_side: "home", result_status: "confirmed")

    I18n.with_locale(:ja) do
      csv = Decks::UsageSummary.new(@week).to_csv
      lines = csv.lines.map(&:strip)

      assert_equal "デッキ名,使用者数,勝ち,負け,勝率", lines.first
      assert_equal "CSV Deck,2,1,1,0.500", lines[1]
    end
  end

  private

  def create_team!(name)
    team = @league.teams.create!(display_name: name, block: @block, status: "active")
    3.times do |index|
      team.participants.create!(league: @league, display_name: "#{name} P#{index + 1}", position: index + 1, status: "active")
    end
    team
  end

  def create_match!(home_team:, away_team:, week: @week)
    week.matches.create!(
      league: @league,
      phase: @phase,
      block: @block,
      home_team: home_team,
      away_team: away_team,
      scheduled_on: Date.new(2026, 4, 20),
      scheduled_time: Time.zone.parse("20:00"),
      status: "scheduled"
    )
  end
end
