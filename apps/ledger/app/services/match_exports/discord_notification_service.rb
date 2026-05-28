require "net/http"
require "securerandom"
require "uri"

module MatchExports
  # KAT-29: 試合結果カード PNG を Discord webhook へ自動投稿する。
  #
  # 投稿は match ごとに 1 回だけ (= 初回の result confirmed タイミング)。
  # 再生成・修正時に重複投稿しないよう Match#discord_notified_at で idempotency を確保する。
  #
  # エラー方針:
  #   - TransientError (5xx / Timeout / 429) → job 側で retry
  #   - 4xx (URL 不正等) → log + 諦め (= 永続失敗、 retry しない)
  class DiscordNotificationService
    class Error < StandardError; end
    class TransientError < Error; end

    READ_TIMEOUT = 10
    OPEN_TIMEOUT = 5

    def initialize(match)
      @match = match
    end

    def notify
      return :skipped unless match.notify_discord_eligible?

      image_path = resolve_image_path
      return :skipped if image_path.blank?

      response = post_multipart(image_path)
      handle_response(response)
    end

    private

    attr_reader :match

    def resolve_image_path
      export = match.exports.find_by(export_type: ResultCardRenderer::EXPORT_TYPE)
      file_path = export&.file_path.presence
      return nil unless file_path

      absolute = Rails.root.join("public", file_path.delete_prefix("/"))
      return nil unless absolute.exist?

      absolute
    end

    def post_multipart(image_path)
      uri = URI.parse(match.league.discord_webhook_url)
      boundary = "----katorin2-#{SecureRandom.hex(16)}"
      body = build_multipart_body(boundary, image_path)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == "https")
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT

      request = Net::HTTP::Post.new(uri.request_uri)
      request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"
      request.body = body

      http.request(request)
    rescue Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNRESET, Errno::ECONNREFUSED, SocketError => error
      raise TransientError, "Discord webhook network error: #{error.class}: #{error.message}"
    end

    def build_multipart_body(boundary, image_path)
      filename = "match-#{match.id}.png"
      payload_json = "{}"

      parts = []
      parts << "--#{boundary}\r\n"
      parts << %(Content-Disposition: form-data; name="payload_json"\r\n)
      parts << "Content-Type: application/json\r\n\r\n"
      parts << "#{payload_json}\r\n"
      parts << "--#{boundary}\r\n"
      parts << %(Content-Disposition: form-data; name="files[0]"; filename="#{filename}"\r\n)
      parts << "Content-Type: image/png\r\n\r\n"
      parts << File.binread(image_path)
      parts << "\r\n--#{boundary}--\r\n"

      parts.join.force_encoding(Encoding::ASCII_8BIT)
    end

    def handle_response(response)
      case response.code.to_i
      when 200..299
        match.update_column(:discord_notified_at, Time.current)
        :success
      when 429, 500..599
        raise TransientError, "Discord webhook returned #{response.code}: #{response.body.to_s.first(200)}"
      else
        Rails.logger.warn(
          "Discord webhook failed permanently for match=#{match.id} status=#{response.code} body=#{response.body.to_s.first(200)}"
        )
        :failed_permanent
      end
    end
  end
end
