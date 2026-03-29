require Rails.root.join("lib/delivery_methods/log_delivery")

ActionMailer::Base.add_delivery_method :log, DeliveryMethods::LogDelivery
