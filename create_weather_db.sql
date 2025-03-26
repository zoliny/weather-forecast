-- Create the weather database table
CREATE TABLE IF NOT EXISTS city_weather (
    city_id VARCHAR(50) PRIMARY KEY,
    city_name VARCHAR(100),
    temperature FLOAT,
    humidity FLOAT,
    wind_speed FLOAT,
    weather_code INTEGER,
    weather_description VARCHAR(100),
    last_updated TIMESTAMP,
    forecast_data JSON
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_last_updated ON city_weather(last_updated); 