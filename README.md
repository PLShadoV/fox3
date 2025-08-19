# FoxESS × RCE Dashboard (minimal)

## Szybki start
1) `npm i`
2) `npm run dev`

## Env (opcjonalnie)
- `FOXESS_DAY_PROXY` – jeśli masz już działające endpointy FoxESS (np. ze starego projektu), podaj URL do `/api/foxess/day` aby przekierować zapytania.
- `FOXESS_REALTIME_PROXY` – analogicznie dla realtime.

Bez tych zmiennych aplikacja użyje danych przykładowych – UI będzie działać, ale wyniki będą demonstracyjne.

## Uwaga
- RCEm używa wbudowanej tabeli miesięcznych cen.
- RCE godzinowe domyślnie zwracane jako zera (endpoint `/api/rce/day`) – jeśli posiadasz swój scraper/API, podmień implementację.
