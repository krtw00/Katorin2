class StageAssetsController < ApplicationController
  before_action :ensure_stage_assets_seeded
  before_action :set_stage_asset, only: %i[edit update]

  def index
    @stage_assets = current_organizer_account.stage_assets.order(:created_at)
  end

  def new
    @stage_asset = current_organizer_account.stage_assets.new(active: true, participant_scope: "all_teams", advancement_rule: "none")
  end

  def create
    @stage_asset = current_organizer_account.stage_assets.new(stage_asset_params)

    if @stage_asset.save
      redirect_to stage_assets_path, notice: t("flash.stage_assets.created")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @stage_asset.update(stage_asset_params)
      redirect_to stage_assets_path, notice: t("flash.stage_assets.updated")
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def ensure_stage_assets_seeded
    current_organizer_account.ensure_default_stage_assets!
  end

  def set_stage_asset
    @stage_asset = current_organizer_account.stage_assets.find(params[:id])
  end

  def stage_asset_params
    params.require(:stage_asset).permit(
      :key,
      :name_ja,
      :name_en,
      :description_ja,
      :description_en,
      :format,
      :phase_kind,
      :participant_scope,
      :group_count,
      :round_count,
      :bracket_size,
      :advancement_rule,
      :advancement_value,
      :ranking_rule_key,
      :match_rule_key,
      :active
    )
  end
end
