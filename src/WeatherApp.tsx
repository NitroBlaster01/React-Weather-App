import React, { useState, useEffect, useRef } from 'react';
import { fetchWeatherApi } from 'openmeteo';
import './WeatherApp.css';

interface WeatherData {
  current: {
    temperature2m: number;
    weatherCode: number;
  };
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
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
    if (input.length < 3) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&addressdetails=1&limit=10`);
      const data = await response.json();

      const uniqueLocations = new Map<string, Location>();

      data.forEach((item: any) => {
        const simplifiedName = simplifyLocationName(item);
        if (!uniqueLocations.has(simplifiedName) && !hasZipCode(simplifiedName)) {
          uniqueLocations.set(simplifiedName, {
            name: simplifiedName,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
          });
        }
      });

      setSuggestions(Array.from(uniqueLocations.values()).slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const simplifyLocationName = (item: any): string => {
    const parts = [];
    if (item.address.city) parts.push(item.address.city);
    if (item.address.state) parts.push(item.address.state);
    if (item.address.country) parts.push(item.address.country);
    return parts.join(', ');
  };

  const hasZipCode = (name: string): boolean => {
    return /\d{5}/.test(name);
  };

  const handleLocationSelect = (location: Location) => {
    setLocation(location.name);
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
        current: ["temperature_2m", "weather_code"],
        temperature_unit: "fahrenheit"
      };
      const url = "https://api.open-meteo.com/v1/forecast";
      const responses = await fetchWeatherApi(url, params);

      // Process first location
      const response = responses[0];
      const current = response.current()!;

      const weatherData: WeatherData = {
        current: {
          temperature2m: current.variables(0)!.value(),
          weatherCode: current.variables(1)!.value(),
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
    if (weatherCode === 96 || weatherCode === 99) return "Thunderstorm with slight and heavy hail";
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
          className="location-input"
        />
        <div ref={autocompleteRef} className="autocomplete">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="suggestion"
              onClick={() => handleLocationSelect(suggestion)}
            >
              {suggestion.name}
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
          </div>
          <p className="temperature">Temperature: {weather.current.temperature2m.toFixed(1)}°F</p>
        </div>
      )}
    </div>
  );
};

export default WeatherApp;