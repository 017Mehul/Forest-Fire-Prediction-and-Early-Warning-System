/**
 * Shared USA wildfire zone dataset.
 * Used by: App.jsx (metrics/alerts), FireHeatMap.jsx (markers), AlertSystem.jsx (static cards)
 */
export const USA_ZONES = [
  {
    id: 1,
    name: "Yosemite Valley",
    state: "California",
    lat: 37.85, lng: -119.55,
    temperature: 42, humidity: 8,  wind: 38, vegetation: 90,
    risk: 94, risk_score: 94,
    center: { lat: 37.85, lng: -119.55 },
  },
  {
    id: 2,
    name: "San Jose Foothills",
    state: "California",
    lat: 37.30, lng: -121.90,
    temperature: 38, humidity: 12, wind: 28, vegetation: 80,
    risk: 82, risk_score: 82,
    center: { lat: 37.30, lng: -121.90 },
  },
  {
    id: 3,
    name: "Sequoia Region",
    state: "California",
    lat: 36.60, lng: -118.80,
    temperature: 35, humidity: 18, wind: 22, vegetation: 70,
    risk: 75, risk_score: 75,
    center: { lat: 36.60, lng: -118.80 },
  },
  {
    id: 4,
    name: "Napa Valley",
    state: "California",
    lat: 38.50, lng: -122.80,
    temperature: 30, humidity: 30, wind: 15, vegetation: 55,
    risk: 60, risk_score: 60,
    center: { lat: 38.50, lng: -122.80 },
  },
  {
    id: 5,
    name: "Fresno Highlands",
    state: "California",
    lat: 36.20, lng: -120.10,
    temperature: 44, humidity: 6,  wind: 42, vegetation: 95,
    risk: 97, risk_score: 97,
    center: { lat: 36.20, lng: -120.10 },
  },
  {
    id: 6,
    name: "Big Bend Region",
    state: "Texas",
    lat: 29.25, lng: -103.25,
    temperature: 41, humidity: 10, wind: 32, vegetation: 60,
    risk: 85, risk_score: 85,
    center: { lat: 29.25, lng: -103.25 },
  },
  {
    id: 7,
    name: "Piney Woods",
    state: "Texas",
    lat: 31.50, lng: -94.70,
    temperature: 36, humidity: 22, wind: 18, vegetation: 75,
    risk: 68, risk_score: 68,
    center: { lat: 31.50, lng: -94.70 },
  },
  {
    id: 8,
    name: "Sonoran Desert Edge",
    state: "Arizona",
    lat: 32.20, lng: -111.00,
    temperature: 45, humidity: 5,  wind: 35, vegetation: 50,
    risk: 91, risk_score: 91,
    center: { lat: 32.20, lng: -111.00 },
  },
  {
    id: 9,
    name: "Flagstaff Ponderosa",
    state: "Arizona",
    lat: 35.20, lng: -111.65,
    temperature: 33, humidity: 20, wind: 25, vegetation: 80,
    risk: 72, risk_score: 72,
    center: { lat: 35.20, lng: -111.65 },
  },
  {
    id: 10,
    name: "Prescott National Forest",
    state: "Arizona",
    lat: 34.54, lng: -112.47,
    temperature: 31, humidity: 28, wind: 14, vegetation: 65,
    risk: 55, risk_score: 55,
    center: { lat: 34.54, lng: -112.47 },
  },
];

// Convenience: top 5 California zones (used as ML_SAMPLE_INPUTS fallback)
export const CA_ZONES = USA_ZONES.filter(z => z.state === "California");

// Highest-risk zone
export const TOP_ZONE = USA_ZONES.reduce((a, b) => a.risk > b.risk ? a : b);
