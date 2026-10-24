-- Direct messaging between a vendor and EAZyfoods staff (onboarding questions, catalogue help, payout queries).
CREATE TABLE vendor_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by uuid REFERENCES users(id),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendor_threads_vendor ON vendor_threads(vendor_id, last_message_at DESC);

CREATE TABLE vendor_messages (
  id bigserial PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES vendor_threads(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES users(id),
  from_staff boolean NOT NULL,
  body text NOT NULL,
  read_by_other_at timestamptz,          -- when the other side (staff for vendor messages, vendor for staff messages) opened it
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendor_messages_thread ON vendor_messages(thread_id, id);

INSERT INTO notification_templates(key, subject, body) VALUES
 ('vendor_message', 'New message from EAZyfoods: {{subject}}', E'The EAZyfoods team replied to "{{subject}}".\n\nRead and reply in your vendor portal:\n{{web_url}}/vendor/messages');
