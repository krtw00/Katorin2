-- ============================================
-- Add check-in functionality to participants
-- ============================================

-- Add checked_in_at column to participants table
ALTER TABLE participants
ADD COLUMN checked_in_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX idx_participants_checked_in ON participants(tournament_id, checked_in_at);

-- Add comment for documentation
COMMENT ON COLUMN participants.checked_in_at IS 'Timestamp when the participant checked in for the tournament';

-- NOTE: RLS policies are already configured in 001_mvp_schema.sql
-- The existing "Organizers can update participants" policy covers check-in updates
-- Participants are viewable by everyone for public tournaments
