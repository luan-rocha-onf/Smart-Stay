import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPin, Users, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { onlyFetch } from "@/lib/onfly-auth";
import type { TripData } from "@/data/mockData";

interface CityOption {
  id: string;
  name: string;
  stateCode: string;
}

async function fetchCities(search: string): Promise<CityOption[]> {
  const res = await onlyFetch(
    `/onfly-api/bff/destination/cities/autocomplete?lang=pt-br&search=${encodeURIComponent(search)}`
  );
  if (!res.ok) throw new Error(`Cities API error: ${res.status}`);
  const data = await res.json();
  const cities = data?.data?.cities ?? data?.cities ?? data ?? [];
  return cities.map((c: any) => ({
    id: c.id ?? "",
    name: c.name ?? "",
    stateCode: c.stateCode ?? "",
  }));
}

interface Props {
  data: TripData;
  onChange: (data: TripData) => void;
  onNext: () => void;
}

export function StepTripData({ data, onChange, onNext }: Props) {
  const [cityQuery, setCityQuery] = useState(data.city);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchCities = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingCities(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchCities(query);
        setSuggestions(results);
      } catch (err) {
        console.error("Erro ao buscar cidades:", err);
        setSuggestions([]);
      } finally {
        setLoadingCities(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const isValid = data.city && data.checkIn && data.checkOut;

  return (
    <div className="mx-auto w-full max-w-lg animate-slide-up space-y-6 px-4 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Dados da Viagem</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe os detalhes da sua viagem corporativa
        </p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        {/* City */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" /> Cidade destino
          </Label>
          <div className="relative">
            <Input
              ref={inputRef}
              value={cityQuery}
              placeholder="Digite a cidade..."
              onChange={(e) => {
                const val = e.target.value;
                setCityQuery(val);
                setShowSuggestions(true);
                onChange({ ...data, city: "", cityId: "" });
                searchCities(val);
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            />
            {showSuggestions && cityQuery.length >= 2 && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-card shadow-lg">
                {loadingCities && (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Buscando cidades...
                  </div>
                )}
                {!loadingCities && suggestions.length === 0 && (
                  <div className="px-3 py-2.5 text-sm text-muted-foreground">
                    Nenhuma cidade encontrada
                  </div>
                )}
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setCityQuery(c.name);
                      onChange({ ...data, city: c.name, cityId: c.id });
                      setShowSuggestions(false);
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {c.name}{c.stateCode ? ` - ${c.stateCode}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" /> Check-in
            </Label>
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !data.checkIn && "text-muted-foreground"
                  )}
                >
                  {data.checkIn ? format(data.checkIn, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.checkIn}
                  onSelect={(d) => {
                    const nextCheckOut = data.checkOut && d && data.checkOut <= d ? undefined : data.checkOut;
                    onChange({ ...data, checkIn: d, checkOut: nextCheckOut });
                    if (d) {
                      setCheckInOpen(false);
                      setCheckOutOpen(true);
                    }
                  }}
                  locale={ptBR}
                  disabled={(d) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return d < today;
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" /> Check-out
            </Label>
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !data.checkOut && "text-muted-foreground"
                  )}
                >
                  {data.checkOut ? format(data.checkOut, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.checkOut}
                  onSelect={(d) => {
                    onChange({ ...data, checkOut: d });
                    if (d) setCheckOutOpen(false);
                  }}
                  locale={ptBR}
                  disabled={(d) => (data.checkIn ? d <= data.checkIn : false)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Travelers */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" /> Número de viajantes
          </Label>
          <Input
            type="number"
            min={1}
            value={data.travelers}
            onChange={(e) => onChange({ ...data, travelers: Number(e.target.value) || 1 })}
          />
        </div>
      </div>

      <Button
        className="w-full gap-2"
        size="lg"
        disabled={!isValid}
        onClick={onNext}
      >
        Próximo <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
