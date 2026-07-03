-- Setup wizard tracking, per-gym favicon, and minor emergency-contact index
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS favicon_url text;

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_member
  ON emergency_contacts (member_id);
