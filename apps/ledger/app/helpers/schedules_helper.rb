module SchedulesHelper
  # KAT-25: 候補日時用に提供する TZ select choices。 海外チーム想定で代表的な IANA name を列挙。
  SCHEDULE_TZ_CHOICES = [
    ["JST (Asia/Tokyo)", "Asia/Tokyo"],
    ["KST (Asia/Seoul)", "Asia/Seoul"],
    ["CST (Asia/Shanghai)", "Asia/Shanghai"],
    ["IST (Asia/Kolkata)", "Asia/Kolkata"],
    ["CET (Europe/Paris)", "Europe/Paris"],
    ["GMT/BST (Europe/London)", "Europe/London"],
    ["EST/EDT (America/New_York)", "America/New_York"],
    ["PST/PDT (America/Los_Angeles)", "America/Los_Angeles"],
    ["AEST/AEDT (Australia/Sydney)", "Australia/Sydney"],
    ["UTC", "UTC"],
  ].freeze

  def schedule_tz_choices
    SCHEDULE_TZ_CHOICES
  end

  # 指定 TZ 表示で `YYYY/MM/DD HH:MM TZ` 形式に整形。 nil なら "—" を返す。
  def display_schedule(utc_time, tz_name)
    return "—" if utc_time.blank?

    tz = ActiveSupport::TimeZone[tz_name.to_s] || ActiveSupport::TimeZone["Asia/Tokyo"]
    "#{utc_time.in_time_zone(tz).strftime('%Y/%m/%d %H:%M')} #{tz_label(tz_name)}"
  end

  def tz_label(tz_name)
    SCHEDULE_TZ_CHOICES.find { |(_label, value)| value == tz_name.to_s }&.first&.split(" ")&.first || tz_name.to_s
  end
end
