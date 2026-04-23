import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Star, Shield, ArrowLeft, Sparkles, TrendingDown, Car, CarTaxiFront } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cities, calculateResults, type Appointment, type Hotel, type HotelResult, type TransportMode } from "@/data/mockData";
import { fetchHotels } from "@/lib/onfly-auth";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const createColoredIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const blueIcon = createColoredIcon("blue");
const greenIcon = createColoredIcon("green");
const yellowIcon = createColoredIcon("gold");
const redIcon = createColoredIcon("red");

function getHotelIcon(score: number) {
  if (score > 7) return greenIcon;
  if (score >= 5) return yellowIcon;
  return redIcon;
}

function SafetyBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score > 7 ? "bg-success" : score >= 5 ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold">{score}/10</span>
    </div>
  );
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

interface Props {
  cityName: string;
  cityId: string;
  checkIn: Date;
  checkOut: Date;
  appointments: Appointment[];
  nights: number;
  onBack: () => void;
}

export function StepResults({ cityName, cityId, checkIn, checkOut, appointments, nights, onBack }: Props) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [results, setResults] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>("app");
  const [expandedAmenities, setExpandedAmenities] = useState<Set<string>>(new Set());

  const toggleAmenities = (name: string) => {
    setExpandedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const AMENITIES_PREVIEW = 3;

  const city = cities.find((c) => c.name === cityName) || cities[0];

  // Fetch hotels from Onfly API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHotels(cityId, checkIn, checkOut)
      .then((raw) => {
        if (cancelled) return;
        const mapped: Hotel[] = raw.map((h) => ({
          name: h.name,
          stars: h.stars,
          daily_rate: h.daily_rate,
          lat: h.lat,
          lng: h.lng,
          neighborhood: h.neighborhood,
          amenities: h.amenities,
          image: h.image,
        }));
        setHotels(mapped);
        const r = calculateResults(mapped, appointments, nights, cityName, transportMode);
        setResults(r);
        setSelectedHotel(r[0] || null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erro ao buscar hotéis:", err);
        setError("Erro ao buscar hotéis. Tente novamente.");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cityId, checkIn, checkOut]);

  // Instant recalc on transport mode toggle
  useEffect(() => {
    if (loading || hotels.length === 0) return;
    const r = calculateResults(hotels, appointments, nights, cityName, transportMode);
    setResults(r);
    const currentName = selectedHotel?.name;
    setSelectedHotel(r.find((h) => h.name === currentName) || r[0] || null);
  }, [transportMode]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-lg font-medium text-foreground">Buscando hotéis em {cityName}...</p>
        <p className="text-sm text-muted-foreground">Consultando disponibilidade e calculando rotas</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-destructive">{error}</p>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    );
  }

  const recommended = results[0];
  const cheapestByRate = [...results].sort((a, b) => a.daily_rate - b.daily_rate)[0];
  const savings = cheapestByRate && recommended ? cheapestByRate.totalCost - recommended.totalCost : 0;

  const allPositions: [number, number][] = [
    ...appointments.map((a) => [a.lat, a.lng] as [number, number]),
    ...results.map((h) => [h.lat, h.lng] as [number, number]),
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col lg:flex-row">
      {/* Panel */}
      <div className="flex w-full flex-col overflow-y-auto bg-card lg:w-[440px]">
        <div className="border-b p-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground">Hotéis Recomendados</h2>
          <p className="text-xs text-muted-foreground">{nights} noite(s) · {appointments.length} compromisso(s)</p>
        </div>

        {/* Transport mode toggle */}
        <div className="border-b px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Calcular transporte com
          </p>
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setTransportMode("app")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                transportMode === "app"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Car className="h-3.5 w-3.5" />
              Uber/99
            </button>
            <button
              onClick={() => setTransportMode("taxi")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                transportMode === "taxi"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CarTaxiFront className="h-3.5 w-3.5" />
              Táxi
            </button>
          </div>
        </div>

        {/* Comparison */}
        {recommended && cheapestByRate && recommended.name !== cheapestByRate.name && (
          <div className="border-b p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-muted bg-muted/30 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mais barato (diária)
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">{cheapestByRate.name}</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {cheapestByRate.totalCost.toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] text-muted-foreground">custo real total</p>
              </div>
              <div className="rounded-lg border-2 border-primary bg-info p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-info-foreground">
                  Recomendado (custo real)
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">{recommended.name}</p>
                <p className="text-lg font-bold text-primary">
                  R$ {recommended.totalCost.toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] text-muted-foreground">custo real total</p>
              </div>
            </div>
            {savings > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-success/10 py-2 text-sm font-semibold text-success">
                <TrendingDown className="h-4 w-4" />
                Você economiza R$ {savings.toLocaleString("pt-BR")} na viagem!
              </div>
            )}
          </div>
        )}

        {/* Hotel cards */}
        <div className="flex-1 space-y-3 p-4">
          {results.map((hotel, i) => (
            <motion.div
              key={hotel.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedHotel(hotel)}
              className={`cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md ${
                selectedHotel?.name === hotel.name ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              {hotel.image && (
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{hotel.name}</h3>
                    {i === 0 && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Melhor Escolha</Badge>
                    )}
                    {hotel.name === cheapestByRate?.name && i !== 0 && (
                      <Badge variant="outline" className="text-[10px]">Mais Barato (aparente)</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-3 w-3 ${
                          j < hotel.stars
                            ? "fill-warning text-warning"
                            : "fill-muted text-muted-foreground/40"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{hotel.neighborhood}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-muted-foreground">Diária:</div>
                <div className="font-medium text-foreground">R$ {hotel.daily_rate}</div>
                <div className="text-muted-foreground">Distância média:</div>
                <div className="font-medium text-foreground">{hotel.avgDistanceKm} km</div>
              </div>

              {/* Transport comparison: App Car vs Taxi */}
              <div className="mt-3 rounded-lg border border-muted bg-muted/20 p-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transporte/dia
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTransportMode("app"); }}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-left transition-all cursor-pointer ${
                      transportMode === "app"
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <Car className="h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Uber/99</span>
                      <p className={`font-bold ${
                        transportMode === "app" ? "text-primary" : "text-foreground"
                      }`}>R$ {hotel.appCarCostPerDay}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTransportMode("taxi"); }}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-left transition-all cursor-pointer ${
                      transportMode === "taxi"
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <CarTaxiFront className="h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground">Táxi</span>
                      <p className={`font-bold ${
                        transportMode === "taxi" ? "text-primary" : "text-foreground"
                      }`}>R$ {hotel.taxiCostPerDay}</p>
                    </div>
                  </button>
                </div>
                {hotel.taxiCostPerDay !== hotel.appCarCostPerDay && (
                  <p className="mt-1.5 text-center text-[10px] font-medium text-success">
                    {hotel.appCarCostPerDay <= hotel.taxiCostPerDay
                      ? `Uber/99 economiza R$ ${hotel.taxiCostPerDay - hotel.appCarCostPerDay}/dia`
                      : `Táxi economiza R$ ${hotel.appCarCostPerDay - hotel.taxiCostPerDay}/dia`}
                  </p>
                )}
              </div>

              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" /> Segurança
                </div>
                <SafetyBar score={hotel.safetyScore} />
              </div>

              <div className="mt-3 rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Custo Real Total</p>
                <p className="text-xl font-bold text-primary">
                  R$ {hotel.totalCost.toLocaleString("pt-BR")}
                </p>
              </div>

              {hotel.amenities.length > 0 && (() => {
                const isExpanded = expandedAmenities.has(hotel.name);
                const visible = isExpanded
                  ? hotel.amenities
                  : hotel.amenities.slice(0, AMENITIES_PREVIEW);
                const hidden = hotel.amenities.length - AMENITIES_PREVIEW;
                return (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {visible.map((a) => (
                      <span key={a} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        {a}
                      </span>
                    ))}
                    {hidden > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAmenities(hotel.name);
                        }}
                        className="rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        {isExpanded ? "mostrar menos" : `+${hidden} mais`}
                      </button>
                    )}
                  </div>
                );
              })()}

              {i === 0 && recommended && cheapestByRate && (
                <div className="mt-3 rounded-lg border-l-4 border-primary bg-info p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-info-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Por que recomendamos
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                    {recommended.name === cheapestByRate.name
                      ? `Melhor opção em diária e em custo real. Em ${recommended.neighborhood}, com segurança ${recommended.safetyScore}/10 — melhor custo-benefício da lista.`
                      : `Apesar de custar R$${Math.max(0, recommended.daily_rate - cheapestByRate.daily_rate)} a mais na diária, economiza R$${Math.max(0, cheapestByRate.transportCostPerDay - recommended.transportCostPerDay)}/dia em transporte. Fica em ${recommended.neighborhood} (segurança ${recommended.safetyScore}/10) e o custo real total sai R$${Math.max(0, savings).toLocaleString("pt-BR")} menor que o hotel aparentemente mais barato.`}
                  </p>
                </div>
              )}
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={[city.lat, city.lng]} zoom={12} className="h-full w-full">
          <FitBounds positions={allPositions} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Appointments */}
          {appointments.map((a) => (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={blueIcon}>
              <Popup>
                <strong>{a.label}</strong><br />{a.address}
              </Popup>
            </Marker>
          ))}
          {/* Hotels */}
          {results.map((h) => (
            <Marker
              key={h.name}
              position={[h.lat, h.lng]}
              icon={getHotelIcon(h.safetyScore)}
            >
              <Popup>
                <strong>{h.name}</strong><br />
                Diária: R${h.daily_rate}<br />
                Custo Real: R${h.totalCost}<br />
                Segurança: {h.safetyScore}/10
              </Popup>
            </Marker>
          ))}
          {/* Lines from selected hotel to appointments */}
          {selectedHotel &&
            appointments.map((a) => (
              <Polyline
                key={`line-${a.id}`}
                positions={[
                  [selectedHotel.lat, selectedHotel.lng],
                  [a.lat, a.lng],
                ]}
                pathOptions={{ color: "#1A56DB", weight: 2, dashArray: "8 4" }}
              />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
