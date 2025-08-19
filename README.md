# FoxESS × RCE Dashboard (glass UI)

**Co to jest?**  
Gotowy projekt Next.js z:
- Glass UI + dark/light theme (ciemny domyślnie)
- Wykres godzinowej generacji (nie skumulowany)
- Tabela godzinowa (kWh, RCE, przychód)
- Kalkulator sumy dla zakresu dat (RCE/RCEm, z fallbackiem)
- Serwerowe adaptery:
  - `/api/foxess/realtime` i `/api/foxess/day` – proxy do FoxESS
  - `/api/rce/day` – opcjonalny provider godzinowego RCE (jeśli masz źródło)
  - `/api/rcem/monthly` – RCEm z `public/rcem.json`
  - `/api/range/compute` – liczenie sum

## ENV (Vercel)

Uzupełnij w **Project Settings → Environment Variables**:
- `FOXESS_TOKEN` – token API z FoxESS Cloud
- `FOXESS_DEVICE_SN` – numer seryjny inwertera
- (opcjonalnie) `FOXESS_DOMAIN` – domyślnie `https://www.foxesscloud.com`
- (opcjonalnie) `RCE_PROVIDER_URL` – jeśli masz własny endpoint godzinowych cen RCE
- (opcjonalnie) `NEXT_PUBLIC_BASE_URL` – np. origin Twojej aplikacji (dla /api w compute)

> Endpointy FoxESS podpisujemy automatycznie (MD5) i próbujemy 3 warianty separatora
> oraz dwa ścieżki API (`/op/v1/...` i `/c/v0/...`).

## Uruchomienie lokalnie
```
npm i
npm run dev
```

## Uwagi
- Jeśli FoxESS zwraca serię skumulowaną 24 wartości, UI robi różnicę (diff) i wyświetla kWh/h.
- Jeśli `/api/rce/day` nie zwróci cen, UI liczy przychód wg `RCEm` z `public/rcem.json`.
