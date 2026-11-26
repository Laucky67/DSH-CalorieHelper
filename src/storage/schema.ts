export const createTables = `
  CREATE TABLE foods (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    plain_name TEXT NOT NULL,
    natural_name TEXT NOT NULL,
    nutrition TEXT NOT NULL CHECK (json_valid(nutrition)),
    portions TEXT CHECK (portions IS NULL OR json_valid(portions))
  ) STRICT;
  CREATE TABLE diet_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL CHECK (length(date) = 10),
    meal TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
    food_id TEXT NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (length(trim(unit)) > 0)
  ) STRICT;
  CREATE INDEX diet_entries_by_date_meal ON diet_entries(date, meal);
  CREATE INDEX diet_entries_by_food ON diet_entries(food_id);
  CREATE TABLE profile_versions (
    version INTEGER PRIMARY KEY,
    effective_date TEXT NOT NULL CHECK (length(effective_date) = 10),
    profile TEXT NOT NULL CHECK (json_valid(profile))
  ) STRICT;
  CREATE INDEX profiles_by_date ON profile_versions(effective_date DESC, version DESC);
  CREATE TABLE operation_receipts (
    action TEXT NOT NULL,
    id TEXT NOT NULL,
    input TEXT NOT NULL,
    result TEXT NOT NULL CHECK (json_valid(result)),
    pending INTEGER NOT NULL CHECK (pending IN (0,1)),
    confirmation_id TEXT,
    PRIMARY KEY(action, id)
  ) STRICT;
  CREATE UNIQUE INDEX receipts_pending_confirmation ON operation_receipts(action, input) WHERE pending=1;
  CREATE TABLE storage_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT;
`;
