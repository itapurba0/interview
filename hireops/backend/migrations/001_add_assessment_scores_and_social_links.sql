-- Migration: Add Assessment Scores and Social Links
-- Date: 2026-03-27
-- Purpose: Upgrade database schema to support assessment tracking and candidate social profiles

-- ============================================================================
-- 1. ADD SOCIAL LINKS TO CANDIDATES TABLE
-- ============================================================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS github VARCHAR(255);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255);

-- ============================================================================
-- 2. ADD ASSESSMENT SCORING COLUMNS TO APPLICATIONS TABLE
-- ============================================================================

-- Replace old ai_match_score with match_score (for consistency)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS match_score INTEGER;

-- Add assessment scores for different test types
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mcq_score FLOAT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS coding_score FLOAT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS voice_score FLOAT;

-- Add AI feedback/interview summary
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- ============================================================================
-- 3. MIGRATE DATA FROM OLD COLUMN TO NEW (if data exists)
-- ============================================================================

UPDATE applications 
SET match_score = ai_match_score 
WHERE ai_match_score IS NOT NULL 
  AND match_score IS NULL;

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify candidates table has new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
  AND column_name IN ('github', 'linkedin')
ORDER BY column_name;

-- Verify applications table has new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN ('match_score', 'mcq_score', 'coding_score', 'voice_score', 'ai_feedback')
ORDER BY column_name;

-- Count applications with migrated data
SELECT 
  COUNT(*) as total_applications,
  COUNT(match_score) as applications_with_match_score,
  COUNT(mcq_score) as applications_with_mcq_score,
  COUNT(coding_score) as applications_with_coding_score,
  COUNT(voice_score) as applications_with_voice_score
FROM applications;
