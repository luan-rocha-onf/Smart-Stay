let gatewayToken: string | null = null;

async function refreshGatewayToken(): Promise<string> {
  const passportToken = import.meta.env.VITE_ONFLY_PASSPORT_TOKEN;
  if (!passportToken) throw new Error("VITE_ONFLY_PASSPORT_TOKEN não configurado no .env");

  const res = await fetch("/onfly-auth/auth/token/internal", {
    headers: { Authorization: `Bearer ${passportToken}` },
  });

  if (!res.ok) throw new Error(`Erro ao renovar token: ${res.status}`);

  const data = await res.json();
  gatewayToken = data.token;
  return gatewayToken!;
}

export async function getGatewayToken(): Promise<string> {
  if (!gatewayToken) {
    return refreshGatewayToken();
  }
  return gatewayToken;
}

export async function onlyFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getGatewayToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    // Token expirou, renova e tenta novamente
    const newToken = await refreshGatewayToken();
    return fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${newToken}` },
    });
  }

  return res;
}

export interface OnflyHotelRaw {
  id: string;
  name: string;
  stars: number;
  daily_rate: number;
  address: string;
  lat: number;
  lng: number;
  neighborhood: string;
  amenities: string[];
  image?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchHotels(
  cityId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<OnflyHotelRaw[]> {
  const res = await onlyFetch("/onfly-api/bff/quote/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owners: [null],
      hotels: [
        {
          checkIn: formatDate(checkIn),
          checkOut: formatDate(checkOut),
          destination: { type: "cityId", value: cityId },
          travelers: [
            {
              birthday: "1987-04-06",
              roomIndex: 0,
              travelerEntityId: "986ef16b-3e9b-473a-bbb5-531ec0f2881b",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Hotels API error: ${res.status}`);
  const data = await res.json();

  // Resposta: array com 1 item, hotéis em [0].response.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quote = Array.isArray(data) ? data[0] : data;
  const hotels = (quote?.response?.data ?? []) as any[];

  return hotels.map((h: any): OnflyHotelRaw => {
    const coords = h.coordinates ?? {};
    const addr = h.address ?? {};
    return {
      id: String(h.id ?? ""),
      name: String(h.name ?? "Hotel"),
      stars: Number(h.stars ?? 3),
      daily_rate: Math.round(Number(h.cheapestDailyPrice ?? 0) / 100),
      address: String(addr.addressLine ?? ""),
      lat: Number(coords.lat ?? 0),
      lng: Number(coords.lng ?? 0),
      neighborhood: String(addr.district ?? ""),
      amenities: Array.isArray(h.amenities)
        ? h.amenities.map((a: any) => String(a.label ?? a))
        : [],
      image: h.thumb ?? undefined,
    };
  });
}
