-- Uploaded photos, videos and documents are also kept in the database. Hosts with a temporary disk (such as a free web service) wipe local files on every
-- deploy; the database survives, so nothing a vendor uploads is ever lost. The disk is a fast cache in front of this table.
CREATE TABLE uploaded_files (
  key        text PRIMARY KEY,
  visibility text NOT NULL CHECK (visibility IN ('public','private')),
  mime       text NOT NULL,
  data       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
