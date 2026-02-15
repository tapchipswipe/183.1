CREATE TABLE IF NOT EXISTS recommendation_feedback (feedback_id UUID PRIMARY KEY, recommendation_id UUID, action_taken TEXT, outcome TEXT);
