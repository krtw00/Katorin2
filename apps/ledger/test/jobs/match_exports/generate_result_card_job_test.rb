require "test_helper"

class MatchExports::GenerateResultCardJobTest < ActiveJob::TestCase
  test "job discards missing records" do
    assert_nothing_raised do
      MatchExports::GenerateResultCardJob.perform_now(SecureRandom.uuid)
    end
  end
end
