// Tomorrow.io API configuration
const API_KEY = 'SCfiV64NqIuRQ0YobyMCgrnhOOEnOacF';
const BASE_URL = 'https://api.tomorrow.io/v4/weather';

// DOM elements
const locationStatus = document.getElementById('location-status');
const weatherSection = document.getElementById('weather-section');
const cityName = document.getElementById('city-name');
const weatherIcon = document.getElementById('weather-icon');
const currentTemp = document.getElementById('current-temp');
const weatherDescription = document.getElementById('weather-description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const forecastContainer = document.getElementById('forecast-container');
const weatherAdvice = document.getElementById('weather-advice');

// Add new DOM elements for manual input
locationStatus.insertAdjacentHTML('afterend', `
    <div id="manual-location" style="display: none;" class="manual-input">
        <p>Would you like to enter your location manually?</p>
        <input type="text" id="location-input" placeholder="Enter city name or coordinates">
        <button onclick="searchLocation()">Search</button>
    </div>
`);

const manualLocationDiv = document.getElementById('manual-location');
const locationInput = document.getElementById('location-input');

// City coordinates database
const cities = {
    'london': { lat: 51.5074, lon: -0.1278 },
    'paris': { lat: 48.8566, lon: 2.3522 },
    'berlin': { lat: 52.5200, lon: 13.4050 },
    'moscow': { lat: 55.7558, lon: 37.6173 },
    'dubai': { lat: 25.2048, lon: 55.2708 },
    'mumbai': { lat: 19.0760, lon: 72.8777 },
    'singapore': { lat: 1.3521, lon: 103.8198 },
    'tokyo': { lat: 35.6762, lon: 139.6503 },
    'sydney': { lat: -33.8688, lon: 151.2093 },
    'los_angeles': { lat: 34.0522, lon: -118.2437 },
    'new_york': { lat: 40.7128, lon: -74.0060 }
};

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'weather_db'
};

// Function to save weather data to database
async function saveWeatherData(cityId, weatherData) {
    const query = `
        INSERT INTO city_weather 
        (city_id, city_name, temperature, humidity, wind_speed, 
         weather_code, weather_description, last_updated, forecast_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
        temperature = VALUES(temperature),
        humidity = VALUES(humidity),
        wind_speed = VALUES(wind_speed),
        weather_code = VALUES(weather_code),
        weather_description = VALUES(weather_description),
        last_updated = NOW(),
        forecast_data = VALUES(forecast_data)
    `;

    const values = [
        cityId,
        weatherData.cityName,
        weatherData.temperature,
        weatherData.humidity,
        weatherData.windSpeed,
        weatherData.weatherCode,
        weatherData.weatherDescription,
        JSON.stringify(weatherData.forecast),
        weatherData.weatherCode
    ];

    try {
        await db.query(query, values);
        console.log(`Weather data saved for ${cityId}`);
    } catch (error) {
        console.error('Error saving weather data:', error);
        throw error;
    }
}

// Function to get stored weather data
async function getStoredWeatherData(cityId) {
    const query = `
        SELECT * FROM city_weather 
        WHERE city_id = ?
        AND last_updated >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    try {
        const [rows] = await db.query(query, [cityId]);
        if (rows.length > 0) {
            return {
                cityName: rows[0].city_name,
                temperature: rows[0].temperature,
                humidity: rows[0].humidity,
                windSpeed: rows[0].wind_speed,
                weatherCode: rows[0].weather_code,
                weatherDescription: rows[0].weather_description,
                forecast: JSON.parse(rows[0].forecast_data),
                lastUpdated: rows[0].last_updated
            };
        }
        return null;
    } catch (error) {
        console.error('Error retrieving weather data:', error);
        throw error;
    }
}

// Fetch weather data
async function getWeatherData(lat, lon) {
    try {
        const url = `${BASE_URL}/forecast?location=${lat},${lon}&apikey=${API_KEY}&units=metric`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.timelines) {
            // Get current weather from the first minutely timeline
            const currentWeather = data.timelines.minutely[0].values;
            updateCurrentWeather(currentWeather);
            
            // Update forecast if available
            if (data.timelines.daily) {
                updateForecast(data.timelines.daily);
            }
            
            // Show weather section
            weatherSection.style.display = 'block';
            locationStatus.style.display = 'none';
        } else {
            throw new Error('Invalid data structure from API');
        }
    } catch (error) {
        console.error('Error:', error);
        locationStatus.textContent = 'Could not get weather data. Please try again later.';
    }
}

// Update forecast display
function updateForecast(forecastData) {
    const container = document.getElementById('forecast-container');
    container.innerHTML = ''; // Clear existing forecast

    // Take 7 days of forecast data
    const sevenDayForecast = forecastData.slice(0, 7);

    sevenDayForecast.forEach(day => {
        const date = new Date(day.time);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="day">${dayName}</div>
            <img src="https://openweathermap.org/img/wn/${getWeatherIconCode(day.values.weatherCode)}@2x.png" 
                 alt="${getWeatherDescription(day.values.weatherCode)}">
            <div class="temp">${Math.round(day.values.temperatureMax)}°C</div>
        `;
        
        container.appendChild(forecastItem);
    });
}

// Update current weather display
function updateCurrentWeather(data) {
    if (!data) return;
    
    currentTemp.textContent = Math.round(data.temperature || 0);
    humidity.textContent = Math.round(data.humidity || 0);
    windSpeed.textContent = Math.round(data.windSpeed || 0);
    
    const description = getWeatherDescription(data.weatherCode);
    weatherDescription.textContent = description;
    
    const iconCode = getWeatherIconCode(data.weatherCode);
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIcon.alt = description;

    // Add weather advice
    const advice = getWeatherAdvice(data.weatherCode, data.temperature);
    if (weatherAdvice) {
        weatherAdvice.textContent = advice;
    }
}

// Update the handleCitySelect function
function handleCitySelect() {
    const select = document.getElementById('city-select');
    const selectedCity = select.value;
    
    if (!selectedCity) return;
    
    const city = cities[selectedCity];
    if (city) {
        locationStatus.textContent = `Loading weather for ${select.options[select.selectedIndex].text}...`;
        getWeatherData(city.lat, city.lon, selectedCity);
    }
}

// Update the geolocation handler
function handleGeolocation(position) {
    const { latitude, longitude } = position.coords;
    getWeatherData(latitude, longitude);
}

// Get user's location
function getLocation() {
    if (!navigator.geolocation) {
        locationStatus.textContent = 'Geolocation is not supported by your browser';
        return;
    }

    locationStatus.textContent = 'Getting your location...';
    
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            getWeatherData(latitude, longitude);
        },
        error => {
            console.error('Geolocation error:', error);
            locationStatus.textContent = 'Could not get your location. Please select a city from the list.';
        }
    );
}

// Show manual input form
function showManualInput(message) {
    locationStatus.textContent = message;
    manualLocationDiv.style.display = 'block';
}

// Handle manual location search
async function searchLocation() {
    const input = locationInput.value.trim();
    if (!input) {
        locationStatus.textContent = 'Please enter a location';
        return;
    }

    locationStatus.textContent = 'Searching location...';
    
    // Check if input is coordinates (latitude,longitude)
    const coordsMatch = input.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    
    if (coordsMatch) {
        // Input is coordinates
        const [_, lat, lon] = coordsMatch;
        getWeatherData(parseFloat(lat), parseFloat(lon));
    } else {
        // Input is a location name - use geocoding
        try {
            // Using OpenStreetMap Nominatim API for geocoding (free and no API key required)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}`
            );
            const data = await response.json();
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                getWeatherData(lat, lon);
            } else {
                locationStatus.textContent = 'Location not found. Please try a different search.';
            }
        } catch (error) {
            console.error('Error searching location:', error);
            locationStatus.textContent = 'Error searching location. Please try again.';
        }
    }
}

// Weather code to description mapping
function getWeatherDescription(code) {
    const weatherCodes = {
        1000: 'Clear',
        1100: 'Mostly Clear',
        1101: 'Partly Cloudy',
        1102: 'Mostly Cloudy',
        1001: 'Cloudy',
        2000: 'Fog',
        4000: 'Drizzle',
        4001: 'Rain',
        4200: 'Light Rain',
        4201: 'Heavy Rain',
        5000: 'Snow',
        5001: 'Flurries',
        5100: 'Light Snow',
        8000: 'Thunderstorm'
    };
    return weatherCodes[code] || 'Unknown';
}

// Weather code to icon mapping
function getWeatherIconCode(weatherCode) {
    const iconMap = {
        1000: '01d',
        1100: '02d',
        1101: '02d',
        1102: '03d',
        1001: '04d',
        2000: '50d',
        4000: '09d',
        4001: '10d',
        4200: '09d',
        4201: '10d',
        5000: '13d',
        5001: '13d',
        5100: '13d',
        8000: '11d'
    };
    return iconMap[weatherCode] || '01d';
}

// Get weather advice
function getWeatherAdvice(weatherCode, temperature) {
    const advice = {
        1000: {
            cold: "Bundle up and don't forget your shades! ❄️",
            mild: "Perfect day! Don't forget your sunscreen! 😎",
            hot: "Stay cool and hydrated! 🌞"
        },
        1100: {
            cold: "Layer up like a sandwich! 🥶",
            mild: "Bring a light jacket just in case. 🌤️",
            hot: "Don't skip the sunscreen! 🌥️"
        },
        4001: {
            cold: "Time for your warmest raincoat! 🌧️",
            mild: "Grab your umbrella! ☔",
            hot: "A light raincoat should do! 🌂"
        },
        5000: {
            cold: "Time to dress like a marshmallow! ⛄",
            mild: "Warm clothes needed! 🌨️",
            hot: "Unusual weather we're having! 😅"
        }
    };

    let tempRange;
    if (temperature < 10) tempRange = 'cold';
    else if (temperature < 25) tempRange = 'mild';
    else tempRange = 'hot';

    return (advice[weatherCode]?.[tempRange]) || 
           "Dress appropriately for the temperature! 😊";
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    getLocation();
}); 