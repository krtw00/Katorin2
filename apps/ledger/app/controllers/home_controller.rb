class HomeController < ApplicationController
  allow_unauthenticated_access only: :index

  def index
    return redirect_to dashboard_path if organizer_signed_in?
  end
end
