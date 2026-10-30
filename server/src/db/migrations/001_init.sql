CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  terminal TEXT NOT NULL,
  dispatcher_name TEXT NOT NULL,
  dispatcher_phone TEXT NOT NULL,
  hired_at TEXT NOT NULL,
  duty_status TEXT NOT NULL DEFAULT 'off_duty'
    CHECK (duty_status IN ('driving', 'on_duty', 'sleeper', 'off_duty'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE loads (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_transit', 'delivered', 'delayed')),
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  origin_facility TEXT NOT NULL,
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  dest_facility TEXT NOT NULL,
  cargo_description TEXT NOT NULL,
  weight_lb INTEGER NOT NULL,
  equipment TEXT NOT NULL,
  pickup_at TEXT NOT NULL,
  delivery_at TEXT NOT NULL,
  delay_note TEXT,
  reference TEXT
);
CREATE INDEX loads_driver ON loads(driver_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('urgent', 'announcement')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- No rows for a notification means it was sent to every driver.
CREATE TABLE notification_targets (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  PRIMARY KEY (notification_id, driver_id)
);

-- Read state is per driver, so one driver reading never changes another's.
CREATE TABLE notification_reads (
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL,
  PRIMARY KEY (driver_id, notification_id)
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  load_id TEXT REFERENCES loads(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('review', 'approved')),
  uploaded_at TEXT NOT NULL
);
CREATE INDEX documents_driver ON documents(driver_id);

CREATE TABLE onboarding_progress (
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  detail_json TEXT,
  PRIMARY KEY (driver_id, task_id)
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  load_id TEXT REFERENCES loads(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX tickets_driver ON tickets(driver_id);
