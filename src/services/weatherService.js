// src/services/weatherService.js

// Comprehensive list of Indian States & Agricultural Centers
export const INDIAN_LOCATIONS = [
  { label: "Andhra Pradesh (Visakhapatnam)", query: "Visakhapatnam" },
  { label: "Andhra Pradesh (Vijayawada)", query: "Vijayawada" },
  { label: "Assam (Guwahati)", query: "Guwahati" },
  { label: "Bihar (Patna)", query: "Patna" },
  { label: "Chandigarh (Punjab/Haryana)", query: "Chandigarh" },
  { label: "Chhattisgarh (Raipur)", query: "Raipur" },
  { label: "Delhi NCR", query: "Delhi" },
  { label: "Gujarat (Ahmedabad)", query: "Ahmedabad" },
  { label: "Gujarat (Surat)", query: "Surat" },
  { label: "Haryana (Karnal)", query: "Karnal" },
  { label: "Himachal Pradesh (Shimla)", query: "Shimla" },
  { label: "Jammu & Kashmir (Srinagar)", query: "Srinagar" },
  { label: "Jharkhand (Ranchi)", query: "Ranchi" },
  { label: "Karnataka (Bengaluru)", query: "Bangalore" },
  { label: "Karnataka (Mysuru)", query: "Mysore" },
  { label: "Kerala (Kochi)", query: "Kochi" },
  { label: "Kerala (Thiruvananthapuram)", query: "Thiruvananthapuram" },
  { label: "Madhya Pradesh (Bhopal)", query: "Bhopal" },
  { label: "Madhya Pradesh (Indore)", query: "Indore" },
  { label: "Maharashtra (Mumbai)", query: "Mumbai" },
  { label: "Maharashtra (Pune)", query: "Pune" },
  { label: "Maharashtra (Nagpur)", query: "Nagpur" },
  { label: "Odisha (Bhubaneswar)", query: "Bhubaneswar" },
  { label: "Punjab (Ludhiana)", query: "Ludhiana" },
  { label: "Punjab (Amritsar)", query: "Amritsar" },
  { label: "Rajasthan (Jaipur)", query: "Jaipur" },
  { label: "Rajasthan (Jodhpur)", query: "Jodhpur" },
  { label: "Tamil Nadu (Chennai)", query: "Chennai" },
  { label: "Tamil Nadu (Coimbatore)", query: "Coimbatore" },
  { label: "Telangana (Hyderabad)", query: "Hyderabad" },
  { label: "Uttar Pradesh (Lucknow)", query: "Lucknow" },
  { label: "Uttar Pradesh (Varanasi)", query: "Varanasi" },
  { label: "Uttarakhand (Dehradun)", query: "Dehradun" },
  { label: "West Bengal (Kolkata)", query: "Kolkata" },
  { label: "West Bengal (Siliguri)", query: "Siliguri" },
  { label: "West Bengal (Darjeeling)", query: "Darjeeling" },
];

export const INDIAN_CITIES = INDIAN_LOCATIONS.map((loc) => loc.label);

// ─────────────────────────────────────────────
// Fetch Weather
// ─────────────────────────────────────────────
export async function getWeather(city) {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VITE_WEATHER_API_KEY is not defined. Please check your .env file or deployment settings.",
    );
  }

  // Extract inner city name if format is "State (City)"
  let cleanCity = city.trim();
  const match = cleanCity.match(/\((.*?)\)/);
  if (match && match[1]) {
    cleanCity = match[1].trim();
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cleanCity)},IN&appid=${apiKey}&units=metric&cnt=8`;

  const response = await fetch(url);

  if (!response.ok) {
    let msg = `Weather fetch failed: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      const err = JSON.parse(errorBody);
      if (err.message) {
        msg = `OpenWeather: ${err.message}`;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(msg);
  }

  return response.json();
}

// ─────────────────────────────────────────────
// Weather Summary
// ─────────────────────────────────────────────
export function summariseWeather(data) {
  if (!data || !data.list || data.list.length === 0) {
    return {
      city: data?.city?.name || "Unknown",
      currentTemp: 0,
      avgTemp: 0,
      maxTemp: 0,
      minTemp: 0,
      humidity: 0,
      windSpeed: 0,
      willRain: false,
      conditions: "N/A",
    };
  }

  const current = data.list[0];
  const temps = data.list.map((i) => i.main?.temp || 0);
  const conditions = data.list.map((i) => i.weather?.[0]?.description || "unknown");
  const willRain = conditions.some((c) => c.toLowerCase().includes("rain"));

  return {
    city: data.city?.name || "Unknown",
    currentTemp: Math.round(current?.main?.temp || 0),
    avgTemp: Math.round(temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0),
    maxTemp: Math.round(temps.length > 0 ? Math.max(...temps) : 0),
    minTemp: Math.round(temps.length > 0 ? Math.min(...temps) : 0),
    humidity: current?.main?.humidity || 0,
    windSpeed: Math.round((current?.wind?.speed || 0) * 10) / 10,
    willRain,
    conditions: [...new Set(conditions)].slice(0, 3).join(", "),
  };
}

// ─────────────────────────────────────────────
// Direct Agricultural Weather Advice Generator
// (Provides instant, reliable advice from live forecast metrics)
// ─────────────────────────────────────────────
export function generateLocalWeatherAdvice(weather, cropType = "") {
  if (!weather) return null;

  const crop = cropType ? cropType : "crops";
  let mainAdvice = "";
  let irrigationAdvice = "";
  let pestAlert = "";
  let bestCropForWeather = "";

  // 1. Irrigation Advice
  if (weather.willRain) {
    irrigationAdvice =
      "Rain is forecasted. Halt automated irrigation to prevent waterlogging and root rot. Ensure field drainage ditches are unblocked.";
  } else if (weather.humidity > 80) {
    irrigationAdvice =
      "High atmospheric humidity (>80%). Soil moisture evaporation is slow; irrigate lightly only if topsoil is dry to prevent root fungal pathogens.";
  } else if (weather.currentTemp > 33) {
    irrigationAdvice =
      "High temperature detected. Water crops during early morning or late evening to minimize rapid evaporation and reduce heat shock.";
  } else if (weather.currentTemp < 15) {
    irrigationAdvice =
      "Cool conditions (<15°C). Water sparingly in mid-morning so the soil warms up during the daytime.";
  } else {
    irrigationAdvice =
      "Maintain regular moderate irrigation. Check soil moisture around active root zones before watering.";
  }

  // 2. Pest & Disease Alert
  if (weather.humidity > 70 && weather.currentTemp >= 20) {
    pestAlert =
      "High humidity with warm weather creates prime conditions for fungal blights, rust, downy mildew, and leaf spots. Inspect leaf undersides regularly.";
  } else if (weather.currentTemp > 34) {
    pestAlert =
      "Hot, dry conditions accelerate pest populations like Aphids, Thrips, and Spider Mites. Monitor new leaf shoots and consider preventive neem spray.";
  } else if (weather.willRain) {
    pestAlert =
      "Prolonged leaf wetness from rain elevates risk of bacterial leaf streak. Avoid manual handling, weeding, or pruning wet crops to prevent spread.";
  } else {
    pestAlert =
      "Pest and disease risk is currently low. Continue standard field sanitation and weed management around field borders.";
  }

  // 3. Main Action Advice
  if (weather.windSpeed > 6.5) {
    mainAdvice = `High winds (${weather.windSpeed} m/s). Avoid spraying liquid chemicals or foliar fertilizers today to prevent spray drift and wastage. Support tall crops.`;
  } else if (weather.willRain) {
    mainAdvice = `Rain expected with ${weather.conditions}. Postpone fertilizer and pesticide top-dressing to prevent chemical runoff into groundwater. Protect harvested yield.`;
  } else if (weather.currentTemp > 33) {
    mainAdvice = `Heat alert (${weather.currentTemp}°C). Apply organic mulching (straw/crop residue) around ${crop} beds to conserve moisture and regulate root temperature.`;
  } else {
    mainAdvice = `Favorable weather conditions (${weather.currentTemp}°C, ${weather.conditions}). Ideal time for cultivation, weeding, nutrient application, and crop health inspection.`;
  }

  // 4. Best Crop
  if (weather.currentTemp >= 26) {
    bestCropForWeather =
      "Warm-season crops like Maize, Cotton, Rice, Tomato, Okra, and Chilli thrive in current temperatures.";
  } else {
    bestCropForWeather =
      "Cool-season crops like Wheat, Mustard, Potato, Gram, Peas, and Cabbage perform best in these conditions.";
  }

  return {
    mainAdvice,
    irrigationAdvice,
    pestAlert,
    bestCropForWeather,
  };
}
