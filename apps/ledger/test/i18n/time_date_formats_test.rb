# frozen_string_literal: true

require "test_helper"

# 本番 500 の再発防止 (KAT hotfix):
# ビューで l(time, format: :short/:long) を使うため、time/date formats が
# 全 available_locale に定義されている必要がある。localize は format 欠落時に
# raise_on_missing_translations に関係なく I18n::MissingTranslationData を raise する。
class TimeDateFormatsTest < ActiveSupport::TestCase
  SAMPLE_TIME = Time.utc(2026, 7, 4, 13, 59, 30).in_time_zone("Asia/Tokyo")
  SAMPLE_DATE = Date.new(2026, 7, 4)

  # 実コードで実際に使っている format のみを必須とする
  USED_TIME_FORMATS = %i[short long].freeze

  I18n.available_locales.each do |locale|
    USED_TIME_FORMATS.each do |format|
      test "#{locale} time.formats.#{format} は raise せず解決する" do
        result = I18n.l(SAMPLE_TIME, format: format, locale: locale)
        assert_kind_of String, result
        refute_match(/translation missing/i, result, "#{locale} time.formats.#{format} が未定義")
      end
    end

    test "#{locale} の date/time default format も解決する" do
      assert_nothing_raised do
        I18n.l(SAMPLE_TIME, format: :default, locale: locale)
        I18n.l(SAMPLE_DATE, format: :default, locale: locale)
      end
    end
  end
end
