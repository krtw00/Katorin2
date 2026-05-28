module MatchSchedules
  # KAT-25: 候補日時を accept して match の scheduled_on / scheduled_time に writeback する。
  #
  # - accepted candidate を status=accepted に
  # - 他の同 match candidate を status=withdrawn に
  # - match.accepted_schedule_candidate_id を set
  # - match.scheduled_on / scheduled_time を JST 換算で書き戻す
  #   (= 既存の一覧 / 画像生成 / 順位計算は scheduled_on/time を引き続き参照するため)
  class Acceptor
    class NotEligibleError < StandardError; end

    def initialize(match, candidate)
      @match = match
      @candidate = candidate
    end

    def accept!
      raise NotEligibleError, "candidate does not belong to match" unless candidate.match_id == match.id
      raise NotEligibleError, "candidate is not proposed" unless candidate.proposed?

      Match.transaction do
        match.schedule_candidates.where.not(id: candidate.id).update_all(status: "withdrawn", updated_at: Time.current)
        candidate.update!(status: "accepted")
        local_time = candidate.starts_at.in_time_zone("Asia/Tokyo")
        match.update!(
          accepted_schedule_candidate: candidate,
          scheduled_on: local_time.to_date,
          scheduled_time: local_time.strftime("%H:%M")
        )
      end
    end

    private

    attr_reader :match, :candidate
  end
end
