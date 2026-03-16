-- ============================================
-- 参加者による結果報告機能
-- matches テーブルに報告用カラム追加
-- ============================================

-- player1/player2 それぞれの報告（JSONB: {winner_id, player1_score, player2_score}）
ALTER TABLE matches
  ADD COLUMN player1_report JSONB,
  ADD COLUMN player2_report JSONB;

-- 報告ステータス
-- null: 未報告, 'pending': 片方のみ報告, 'agreed': 両者一致で確定, 'disputed': 不一致
ALTER TABLE matches
  ADD COLUMN report_status TEXT;

-- RLSポリシー: 参加者が自分の試合の結果を報告（UPDATE）できるようにする
-- 既存の "Organizers can update matches" に加えて、対戦者も更新可能にする
CREATE POLICY "Players can report match results"
  ON matches FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (player1_id = auth.uid() OR player2_id = auth.uid())
    AND status != 'completed'
  );
