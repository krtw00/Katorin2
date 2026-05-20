require "test_helper"

class Wmgp::Renderers::StandingsTableTest < ActiveSupport::TestCase
  setup do
    organizer = OrganizerAccount.create!(
      display_name: "Standings Organizer",
      login_id: "standings-org-#{SecureRandom.hex(4)}",
      email: "standings-#{SecureRandom.hex(4)}@example.com",
      password: "password"
    )
    league = organizer.leagues.create!(
      name: "Standings League #{SecureRandom.hex(4)}",
      status: "active",
      roster_min_members: 4,
      roster_max_members: 8,
      lineup_size: 3,
      substitute_size: 1
    )
    @phase = league.phases.create!(name: "Regular Stage", position: 1, rule_module_key: "wmgp")
    @block = @phase.blocks.create!(league: league, name: "A", position: 1)
    @team = league.teams.create!(display_name: "Alpha", block: @block)
  end

  test "html_document renders the WMGP standings table" do
    standings_by_block = {
      @block.id => [
        {
          rank: 1, team: @team, wins: 2, points: 6, round_wins: 4, round_losses: 1,
          goal_diff: 3, round_board_diff: 2, match_game_diff: 5, board_wins_total: 7
        }
      ]
    }
    blocks = @phase.blocks.index_by(&:id)

    html = Wmgp::Renderers::StandingsTable.new(standings_by_block, blocks).send(:html_document)

    assert_includes html, "WMGP STANDINGS"
    assert_includes html, "勝点"
    assert_includes html, @team.display_name
    assert_includes html, %(<td class="pts">6</td>)
    assert_includes html, %(<div class="group-title">A</div>)
  end
end
