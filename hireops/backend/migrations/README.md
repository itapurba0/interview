# Database Migrations

This folder contains SQL migration scripts for upgrading the HireOps database schema.

## How to Apply Migrations

### Option 1: Using Neon Console (Easiest)

1. **Log in to Neon Console:**
   - Go to https://console.neon.tech
   - Select your HireOps project

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Or navigate to the database and click "Query"

3. **Execute Migration:**
   - Open the migration SQL file: `001_add_assessment_scores_and_social_links.sql`
   - Copy the entire content (or sections)
   - Paste into the Neon SQL Editor
   - Click "Execute" or press `Ctrl+Enter`

4. **Verify:**
   - Look for success messages (no errors)
   - Run the verification queries at the bottom of the migration file
   - You should see the new columns listed

### Option 2: Using psql (Command Line)

```bash
# Connect to your Neon database
psql "postgresql://neondb_owner:npg_gHweDYKol4X5@ep-cold-dawn-ami6lqrc-pooler.c-5.us-east-1.aws.neon.tech/HireOps"

# Execute the migration
\i migrations/001_add_assessment_scores_and_social_links.sql

# Verify
\d candidates
\d applications
```

### Option 3: Using Docker

```bash
cd hireops
docker-compose exec api psql "$DATABASE_URL" -f backend/migrations/001_add_assessment_scores_and_social_links.sql
```

## Migration Details

### Migration: 001_add_assessment_scores_and_social_links.sql

**Purpose:** Add assessment tracking columns and candidate social profile fields

**Changes:**

#### Candidates Table
- `github` (VARCHAR 255) - GitHub profile URL
- `linkedin` (VARCHAR 255) - LinkedIn profile URL

#### Applications Table
- `match_score` (INTEGER) - AI resume matching score (0-100)
- `mcq_score` (FLOAT) - Multiple choice quiz score
- `coding_score` (FLOAT) - Coding assessment score
- `voice_score` (FLOAT) - Voice interview score
- `ai_feedback` (TEXT) - Interview summary and feedback

**Data Migration:**
- If your applications table has data in `ai_match_score`, it will be copied to `match_score`
- Old column (`ai_match_score`) is kept for backward compatibility

## Verification

After running a migration, verify it succeeded:

```sql
-- Check candidates columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'candidates' 
ORDER BY column_name;

-- Check applications columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'applications' 
ORDER BY column_name;
```

## Troubleshooting

### Error: "column X already exists"
- Migrations use `ADD COLUMN IF NOT EXISTS` to prevent re-running errors
- This is safe to run multiple times

### Error: "relation X does not exist"
- Table hasn't been created yet
- Run the schema creation scripts first
- Check table names match your database

### Error: "permission denied"
- Your Neon user doesn't have ALTER TABLE permissions
- Use the project owner credentials or ask your admin

## API Restart

After applying migrations, restart the API:

```bash
cd hireops

# Option 1: Restart just the API
docker-compose restart api

# Option 2: Full restart
docker-compose down
docker-compose up --build
```

Monitor the logs:
```bash
docker-compose logs -f api
```

Expected success:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Rollback

If you need to rollback (remove new columns):

```sql
-- Remove new assessment columns from applications
ALTER TABLE applications DROP COLUMN IF EXISTS match_score;
ALTER TABLE applications DROP COLUMN IF EXISTS mcq_score;
ALTER TABLE applications DROP COLUMN IF EXISTS coding_score;
ALTER TABLE applications DROP COLUMN IF EXISTS voice_score;
ALTER TABLE applications DROP COLUMN IF EXISTS ai_feedback;

-- Remove new social columns from candidates
ALTER TABLE candidates DROP COLUMN IF EXISTS github;
ALTER TABLE candidates DROP COLUMN IF EXISTS linkedin;
```

⚠️ **Warning:** This is destructive and will lose any data in those columns!
