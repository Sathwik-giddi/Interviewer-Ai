-- /backend/migrations/001_candidate_audit.sql
-- Reference SQL schema for teams deploying this feature on a relational database.
-- The running application currently persists equivalent documents in Firestore.

CREATE TABLE IF NOT EXISTS candidates (
  candidate_id VARCHAR(64) PRIMARY KEY,
  email_hash VARCHAR(64),
  phone_hash VARCHAR(64),
  custom_id_hash VARCHAR(64),
  display_name VARCHAR(255),
  job_title VARCHAR(255),
  job_description TEXT,
  assessment_key VARCHAR(255) NOT NULL,
  last_session_id VARCHAR(128),
  last_seen_at TIMESTAMP NULL,
  last_submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_submissions (
  session_id VARCHAR(128) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL,
  assessment_key VARCHAR(255) NOT NULL,
  room_id VARCHAR(255),
  campaign_id VARCHAR(255),
  link_id VARCHAR(255),
  observer_room_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  fields_json JSON NOT NULL,
  questions_json JSON NOT NULL,
  answers_json JSON NOT NULL,
  question_durations_json JSON NOT NULL,
  pages_visited_json JSON NOT NULL,
  parsed_resume_json JSON NULL,
  violations_json JSON NOT NULL,
  question_evals_json JSON NOT NULL,
  evaluation_json JSON NULL,
  current_index INT NOT NULL DEFAULT 0,
  match_score INT NULL,
  overall_score INT NULL,
  recommendation VARCHAR(32) NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidate_submissions_candidate
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
);

CREATE TABLE IF NOT EXISTS candidate_actions (
  id VARCHAR(128) PRIMARY KEY,
  candidate_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  field_name VARCHAR(255),
  old_value TEXT NULL,
  new_value TEXT NULL,
  old_value_hash VARCHAR(64) NULL,
  new_value_hash VARCHAR(64) NULL,
  message TEXT NULL,
  metadata_json JSON NULL,
  page_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_candidate_actions_candidate
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
  CONSTRAINT fk_candidate_actions_submission
    FOREIGN KEY (session_id) REFERENCES candidate_submissions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_submissions_candidate_assessment
  ON candidate_submissions(candidate_id, assessment_key, last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_actions_candidate_session_created
  ON candidate_actions(candidate_id, session_id, created_at ASC);
