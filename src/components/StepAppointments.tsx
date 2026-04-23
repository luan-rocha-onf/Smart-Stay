import { useState, useRef, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Trash2, Plus, Search, ArrowLeft, Clock, Tag, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cities, type Appointment } from "@/data/mockData";

// Fix leaflet default icon
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface AddressSuggestion {
  display_name: string;
  lat: number;
  lng: number;
}

async function searchAddress(query: string, cityLat: number, cityLng: number): Promise<AddressSuggestion[]> {
  const bbox = `${cityLng - 0.5},${cityLat - 0.5},${cityLng + 0.5},${cityLat + 0.5}`;
  const url = `/nominatim/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=br&viewbox=${bbox}&bounded=0`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: any) => ({
    display_name: String(item.display_name ?? ""),
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], 12);
  return null;
}

interface Props {
  cityName: string;
  appointments: Appointment[];
  onChange: (appointments: Appointment[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAppointments({ cityName, appointments, onChange, onNext, onBack }: Props) {
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const city = cities.find((c) => c.name === cityName) || cities[0];

  const doSearchAddress = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setLoadingAddress(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddress(query, city.lat, city.lng);
        setAddressSuggestions(results);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setLoadingAddress(false);
      }
    }, 400);
  }, [city.lat, city.lng]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const addAppointment = () => {
    if (!selectedAddress || !time || !label) return;
    const appt: Appointment = {
      id: Date.now().toString(),
      address: selectedAddress.display_name,
      time,
      label,
      lat: selectedAddress.lat,
      lng: selectedAddress.lng,
    };
    onChange([...appointments, appt]);
    setAddressQuery("");
    setSelectedAddress(null);
    setTime("");
    setLabel("");
  };

  const removeAppointment = (id: string) => {
    onChange(appointments.filter((a) => a.id !== id));
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="flex w-full flex-col border-r bg-card lg:w-96">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold text-foreground">Meus Compromissos</h2>
          <p className="text-xs text-muted-foreground">
            Adicione os locais das suas reuniões em {cityName}
          </p>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs">
              <Search className="h-3 w-3" /> Endereço
            </Label>
            <div className="relative">
              <Input
                value={addressQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddressQuery(val);
                  setSelectedAddress(null);
                  setShowAddressSuggestions(true);
                  doSearchAddress(val);
                }}
                onFocus={() => { if (addressSuggestions.length > 0) setShowAddressSuggestions(true); }}
                placeholder="Av. Paulista, 1000"
                className="text-sm"
              />
              {showAddressSuggestions && addressQuery.length >= 3 && (
                <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
                  {loadingAddress && (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando endereços...
                    </div>
                  )}
                  {!loadingAddress && addressSuggestions.length === 0 && (
                    <div className="px-3 py-2.5 text-xs text-muted-foreground">
                      Nenhum endereço encontrado
                    </div>
                  )}
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                      onClick={() => {
                        setAddressQuery(s.display_name);
                        setSelectedAddress(s);
                        setShowAddressSuggestions(false);
                      }}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> Horário
              </Label>
              <Input
                type="text"
                value={time}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  const masked = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
                  setTime(masked);
                }}
                placeholder="09:00"
                maxLength={5}
                inputMode="numeric"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs">
                <Tag className="h-3 w-3" /> Label
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Reunião"
                className="text-sm"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={addAppointment}
            disabled={!selectedAddress || !time || !label}
          >
            <Plus className="h-4 w-4" /> Adicionar no mapa
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum compromisso adicionado
            </p>
          ) : (
            <div className="space-y-2">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between rounded-lg border bg-accent/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.address}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                  <button
                    onClick={() => removeAppointment(a.id)}
                    className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t p-4">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={appointments.length === 0}
            onClick={onNext}
          >
            🔍 Encontrar Melhor Hotel
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={[city.lat, city.lng]} zoom={12} className="h-full w-full">
          <RecenterMap lat={city.lat} lng={city.lng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {appointments.map((a) => (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={blueIcon}>
              <Popup>
                <strong>{a.label}</strong>
                <br />
                {a.address} — {a.time}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
