# Smart Stay Finder

Aplicação para encontrar a hospedagem ideal para viagens corporativas, considerando o **custo total da estadia** (diárias + transporte até os compromissos) e a **segurança do bairro**, não apenas o preço da diária.

Projeto desenvolvido no Hackathon da Onfly.

## O problema

Reservar o hotel mais barato raramente resulta na viagem mais econômica. Um hotel com diária baixa pode ficar longe dos compromissos do viajante, gerando gastos altos com táxi/app e desperdício de tempo. Além disso, a segurança do entorno costuma ser ignorada na comparação.

## A solução

O Smart Stay Finder consolida, em uma única visualização, os fatores que realmente importam em uma viagem a trabalho:

- **Diárias reais** obtidas via API da Onfly para a cidade e datas informadas
- **Custo de deslocamento** calculado até cada compromisso cadastrado, nos modos táxi ou aplicativo (estimativa Uber/99)
- **Score de segurança** por bairro
- **Score final** combinando custo total, segurança e distância média
- **Mapa interativo** com hotéis (coloridos por segurança), compromissos e rotas

## Fluxo (3 passos)

1. **Dados da Viagem** — cidade (autocomplete via Onfly), check-in, check-out, viajantes
2. **Compromissos** — endereços e horários das reuniões/eventos do viajante
3. **Resultados** — ranking de hotéis com score, custos detalhados e mapa

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (Radix UI)
- **React Router**, **React Hook Form**, **Zod**
- **React Leaflet** para mapa
- **Framer Motion** para animações
- **TanStack Query** para data fetching
- **Vitest** + **Testing Library** + **Playwright** para testes

## Integrações

- **Onfly BFF** (`/bff/destination/cities/autocomplete`, `/bff/quote/create`) — busca de cidades e cotação de hotéis
- **Onfly Auth** (`/auth/token/internal`) — renovação de token de gateway a partir do passport token
- **Nominatim / OpenStreetMap** — geocoding de endereços dos compromissos

Os três endpoints são acessados via proxy do Vite (configurado em [vite.config.ts](vite.config.ts)) para evitar problemas de CORS em desenvolvimento.

## Configuração

Requer Node 18+ e um gerenciador de pacotes (npm, bun ou pnpm).

1. Instale as dependências:

   ```bash
   npm install
   # ou: bun install
   ```

2. Crie um arquivo `.env` na raiz com o passport token da Onfly:

   ```env
   VITE_ONFLY_PASSPORT_TOKEN=<seu_passport_token>
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   A aplicação ficará disponível em `http://localhost:8080`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo desenvolvimento |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | ESLint |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:watch` | Testes em modo watch |

## Estrutura do projeto

```
src/
├── components/
│   ├── Header.tsx
│   ├── Stepper.tsx
│   ├── StepTripData.tsx      # Passo 1: cidade, datas, viajantes
│   ├── StepAppointments.tsx  # Passo 2: compromissos
│   ├── StepResults.tsx       # Passo 3: ranking + mapa
│   └── ui/                   # componentes shadcn/ui
├── data/
│   └── mockData.ts           # tipos, tarifas, scores de segurança, cálculos
├── hooks/
├── lib/
│   ├── onfly-auth.ts         # autenticação e fetch de hotéis via Onfly
│   └── utils.ts
├── pages/
│   ├── Index.tsx             # orquestra os 3 passos
│   └── NotFound.tsx
└── main.tsx
```

## Como o score é calculado

Para cada hotel:

1. Distância até cada compromisso (haversine entre lat/lng)
2. Custo de transporte diário = soma dos trechos ida/volta × tarifa do modo escolhido
3. Custo total = (diária × noites) + (transporte diário × noites)
4. Score de segurança extraído do bairro (tabela em [mockData.ts](src/data/mockData.ts))
5. Score final pondera custo, segurança e distância média

## Licença

Projeto interno de hackathon — uso restrito à Onfly.
