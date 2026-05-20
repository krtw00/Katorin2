require "test_helper"

class MatchLineupMemberIdsWarningTest < ActiveSupport::TestCase
  test "extracts lineup participants with empty member_ids" do
    match, home_team, away_team = create_match!
    registered = create_participant!(match.league, home_team, "Registered", member_ids: ["111111111"])
    unregistered = create_participant!(match.league, away_team, "Unregistered", member_ids: [])

    add_lineup_member!(match, home_team, registered, "home")
    add_lineup_member!(match, away_team, unregistered, "away")

    missing = match.lineup_participants_missing_member_ids

    assert_equal [unregistered.id], missing.map(&:id)
  end

  test "returns empty when all lineup participants have member_ids" do
    match, home_team, away_team = create_match!
    home_participant = create_participant!(match.league, home_team, "Home", member_ids: ["222222222"])
    away_participant = create_participant!(match.league, away_team, "Away", member_ids: ["333333333"])

    add_lineup_member!(match, home_team, home_participant, "home")
    add_lineup_member!(match, away_team, away_participant, "away")

    assert_empty match.lineup_participants_missing_member_ids
  end

  private

  def create_match!
    organizer = OrganizerAccount.create!(
      display_name: "MD Warning Organizer",
      login_id: "md-warning-org-#{SecureRandom.hex(4)}",
      email: "md-warning-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "MD Warning League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    phase = league.phases.create!(name: "Regular Stage", position: 1, rule_module_key: "wmgp")
    block = phase.blocks.create!(league: league, name: "A", position: 1)
    home_team = league.teams.create!(display_name: "Home", block: block)
    away_team = league.teams.create!(display_name: "Away", block: block)

    match = phase.matches.create!(
      league: league,
      block: block,
      home_team: home_team,
      away_team: away_team,
      status: "scheduled"
    )

    [match, home_team, away_team]
  end

  def create_participant!(league, team, display_name, member_ids:)
    team.participants.create!(
      league: league,
      display_name: display_name,
      status: "active",
      member_ids: member_ids
    )
  end

  def add_lineup_member!(match, team, participant, side)
    match.match_lineup_members.create!(
      team: team,
      participant: participant,
      side: side,
      role: "main",
      slot_number: 1
    )
  end
end
