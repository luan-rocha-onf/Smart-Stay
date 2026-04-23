export interface Hotel {
  name: string;
  stars: number;
  daily_rate: number;
  lat: number;
  lng: number;
  neighborhood: string;
  amenities: string[];
  image?: string;
}

export interface Appointment {
  id: string;
  address: string;
  time: string;
  label: string;
  lat: number;
  lng: number;
}

export interface TripData {
  city: string;
  cityId: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  travelers: number;
}

export interface HotelResult extends Hotel {
  transportCostPerDay: number;
  taxiCostPerDay: number;
  appCarCostPerDay: number;
  totalCost: number;
  safetyScore: number;
  finalScore: number;
  avgDistanceKm: number;
}

export const safetyScores: Record<string, number> = {
  // São Paulo
  "Itaim Bibi": 9,
  "Vila Olímpia": 8.5,
  Morumbi: 8,
  "Bela Vista": 7,
  Liberdade: 6.5,
  República: 4,
  Brás: 3.5,
  Guarulhos: 5,
  // Belo Horizonte
  Belvedere: 9,
  Lourdes: 9,
  Savassi: 8.5,
  Funcionários: 8.5,
  "Santo Agostinho": 8.5,
  Sion: 8.5,
  Mangabeiras: 8.5,
  Anchieta: 8.5,
  Luxemburgo: 8,
  Buritis: 8,
  "São Pedro": 8,
  Cruzeiro: 8,
  Carmo: 8,
  Gutierrez: 7.5,
  "Santa Lúcia": 7.5,
  Pampulha: 7,
  "Santa Tereza": 7,
  Prado: 6.5,
  Serra: 6.5,
  "Cidade Nova": 6.5,
  "Barro Preto": 6,
  Centro: 5,
  Barreiro: 5,
  "Venda Nova": 4.5,
};

export const taxiRates: Record<string, { flag_rate: number; per_km: number }> =
  {
    "São Paulo": { flag_rate: 6.55, per_km: 4.8 },
    "Rio de Janeiro": { flag_rate: 4.5, per_km: 3.85 },
    "Belo Horizonte": { flag_rate: 5.7, per_km: 4.11 },
  };

export const appCarRates: Record<string, { per_km: number }> = {
  "São Paulo": { per_km: 3.5 },
  "Rio de Janeiro": { per_km: 4.2 },
  "Belo Horizonte": { per_km: 4.0 },
};

export const cities = [
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
  { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345 },
  { name: "Brasília", lat: -15.7939, lng: -47.8828 },
  { name: "Curitiba", lat: -25.4284, lng: -49.2733 },
  { name: "Porto Alegre", lat: -30.0346, lng: -51.2177 },
  { name: "Salvador", lat: -12.9714, lng: -38.5124 },
  { name: "Recife", lat: -8.0476, lng: -34.877 },
  { name: "Campinas", lat: -22.9099, lng: -47.0626 },
  { name: "Florianópolis", lat: -27.5954, lng: -48.548 },
];

// Haversine distance in km
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type TransportMode = "app" | "taxi";

export function calculateResults(
  hotels: Hotel[],
  appointments: Appointment[],
  nights: number,
  cityName: string,
  transportMode: TransportMode = "app",
): HotelResult[] {
  const taxi = taxiRates[cityName] || taxiRates["São Paulo"];
  const appCar = appCarRates[cityName] || appCarRates["São Paulo"];

  return hotels
    .map((hotel) => {
      const distances = appointments.map((a) =>
        haversine(hotel.lat, hotel.lng, a.lat, a.lng),
      );
      const avgDist =
        distances.length > 0
          ? distances.reduce((s, d) => s + d, 0) / distances.length
          : 0;
      const tripsPerDay = appointments.length * 2;

      const taxiPerTrip = taxi.flag_rate + avgDist * taxi.per_km;
      const taxiPerDay = taxiPerTrip * tripsPerDay;

      const appCarPerTrip = avgDist * appCar.per_km;
      const appCarPerDay = appCarPerTrip * tripsPerDay;

      const transportPerDay =
        transportMode === "taxi" ? taxiPerDay : appCarPerDay;
      const totalTransport = transportPerDay * nights;
      const totalCost = hotel.daily_rate * nights + totalTransport;
      const safety = safetyScores[hotel.neighborhood] || 5;
      // Lower finalScore = better. Penalize low safety.
      const safetyPenalty = (10 - safety) * 50 * nights;
      const finalScore = totalCost + safetyPenalty;

      return {
        ...hotel,
        transportCostPerDay: Math.round(transportPerDay),
        taxiCostPerDay: Math.round(taxiPerDay),
        appCarCostPerDay: Math.round(appCarPerDay),
        totalCost: Math.round(totalCost),
        safetyScore: safety,
        finalScore: Math.round(finalScore),
        avgDistanceKm: Math.round(avgDist * 10) / 10,
      };
    })
    .sort((a, b) => a.finalScore - b.finalScore);
}
