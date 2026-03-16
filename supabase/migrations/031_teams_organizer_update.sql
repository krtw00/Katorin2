-- シリーズ主催者がチームを更新できるようにする
-- (エントリー申請承認時にチームのseries_idを設定するため)
-- 条件: ユーザーがいずれかのシリーズの主催者であること
CREATE POLICY "Series organizers can update teams"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.organizer_id = auth.uid()
    )
  );
