module DeliveryMethods
  class LogDelivery
    def initialize(options = {})
      @logger = options[:logger] || Rails.logger
    end

    def deliver!(mail)
      logger.info("[ActionMailer::LogDelivery] #{mail.subject} -> #{Array(mail.to).join(', ')}")
      logger.info(mail.encoded)
    end

    private

    attr_reader :logger
  end
end
