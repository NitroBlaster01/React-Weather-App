import React, { useState, useEffect, useRef } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import './WeatherApp.css';

interface WeatherData {
  current: {
    temperature2m: number;
    weatherCode: number;
  };

  daily: {
    time: Date[];
    weatherCode: number[];
    temperature2mMax: number[];
    temperature2mMin: number[];
  };
}

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1: string;
}

const WeatherApp: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 2) return;
  
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input)}&count=5`);
      const data = await response.json();
  
      if (data.results) {
        const suggestions: Location[] = data.results.map((item: any) => ({
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          country: item.country,
          admin1: item.admin1,
        }));
        setSuggestions(suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    }
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleLocationSelect = (location: Location) => {
    setLocation(`${location.name}, ${location.admin1}, ${location.country}`);
    setSelectedLocation(location);
    setSuggestions([]);
  };

  const fetchWeather = async (): Promise<void> => {
    if (!selectedLocation) return;

    setLoading(true);
    setError(null);
    try {
      const params = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"],
        current: ["temperature_2m", "weather_code"],
        temperature_unit: "fahrenheit",
        forecast_days: 7,
      };
      const url = "https://api.open-meteo.com/v1/forecast";
      const responses = await fetchWeatherApi(url, params);

      // Process first location
      const response = responses[0];
      const utcOffsetSeconds = response.utcOffsetSeconds();
      const current = response.current()!;
      const daily = response.daily()!;

      const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

      const weatherData: WeatherData = {
        current: {
          temperature2m: current.variables(0)!.value(),
          weatherCode: current.variables(1)!.value(),
        },
        daily: {
          time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
            (t) => new Date((t + utcOffsetSeconds) * 1000)
          ),
          weatherCode: daily.variables(0)!.valuesArray()!,
          temperature2mMax: daily.variables(1)!.valuesArray()!,
          temperature2mMin: daily.variables(2)!.valuesArray()!,
        },
      };

      setWeather(weatherData);
    } catch (err) {
      setError('Failed to fetch weather data');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchWeather();
    }
  }, [selectedLocation]);

  const getWeatherIcon = (weatherCode: number): string => {
    return `/src/assets/weather-icons/${weatherCode}.png`;
  };

  const formatDay = (date: Date, index: number) => {
    if (index === 0) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeatherDescription = (weatherCode: number): string => {
    if (weatherCode === 0) return "Clear Skies";
    if (weatherCode === 1) return "Mainly Clear";
    if (weatherCode === 2) return "Partly Cloudy";
    if (weatherCode === 3) return "Overcast";
    if (weatherCode === 45) return "Fog";
    if (weatherCode === 48) return "Depositing Rime Fog";
    if (weatherCode === 51) return "Light Drizzle";
    if (weatherCode === 53) return "Moderate Drizzle";
    if (weatherCode === 55) return "Heavy Drizzle";
    if (weatherCode === 56) return "Freezing Light Drizzle";
    if (weatherCode === 57) return "Freezing Heavy Drizzle";
    if (weatherCode === 61) return "Slight Rain";
    if (weatherCode === 63) return "Moderate Rain";
    if (weatherCode === 65) return "Heavy Rain";
    if (weatherCode === 66) return "Light Freezing Rain";
    if (weatherCode === 67) return "Heavy Freezing Rain";
    if (weatherCode === 71) return "Slight Snow";
    if (weatherCode === 73) return "Moderate Snow";
    if (weatherCode === 75) return "Heavy Snow";
    if (weatherCode === 77) return "Snow grains";
    if (weatherCode === 80) return "Slight Rain Showers";
    if (weatherCode === 81) return "Moderate Rain Showers";
    if (weatherCode === 82) return "Violent Rain Showers";
    if (weatherCode === 85) return "Slight Snow Showers";
    if (weatherCode === 86) return "Heavy Snow Showers";
    if (weatherCode === 95) return "Thunderstorm";
    if (weatherCode === 96) return "Thunderstorm & Slight Hail";
    if (weatherCode === 99) return "Thunderstorm & Heavy Hail";

    return "Unknown weather condition";
  };

  return (
    <div className="weather-app">
      <h1 className="weather-title">Weather Forecast</h1>
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter location"
          value={location}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setLocation(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          onFocus={handleInputFocus}
          className="location-input"
        />
        <div ref={autocompleteRef} className="autocomplete">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id} 
              className="suggestion"
              onClick={() => handleLocationSelect(suggestion)}
            >
              {suggestion.name}, {suggestion.admin1}, {suggestion.country}
            </div>
          ))}
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
      {weather && (
        <div className="weather-info">
          <h2>{selectedLocation?.name}</h2>
          <div className="weather-details">
          <img 
            src={getWeatherIcon(weather.current.weatherCode)} 
            alt={`Weather icon for ${getWeatherDescription(weather.current.weatherCode)}`}
            className="weather-icon"
          />
          <p className="weather-description">{getWeatherDescription(weather.current.weatherCode)}</p>
          <p className="current-temperature">{weather.current.temperature2m.toFixed(1)}°F</p>
        </div>
        <div className="forecast">
          <h3>7-Day Forecast</h3>
          {weather.daily.time.map((day, index) => (
            <div key={day.toISOString()} className="forecast-day">
              <span className="day-name">{formatDay(day, index)}</span>
              <span className="temperature-range">
                {weather.daily.temperature2mMin[index].toFixed(1)}°F - {weather.daily.temperature2mMax[index].toFixed(1)}°F
              </span>
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  );
};

export default WeatherApp;