CREATE TABLE IF NOT EXISTS weather_data (
    city_id TEXT PRIMARY KEY,
    last_updated TIMESTAMP,
    current_weather JSON,
    forecast JSON
);

CREATE INDEX IF NOT EXISTS idx_last_updated ON weather_data(last_updated); 