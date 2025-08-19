FOXESS × RCE UI (glass tiles)

Pliki do podmiany 1:1. Wymagane endpointy po stronie serwera (pozostają bez zmian):
  - GET /api/foxess/day?date=YYYY-MM-DD  -> powinno zwracać generację dobową (series/values: number[24])
  - GET /api/foxess/realtime              -> powinno zwracać pvNowW (liczba W)
  - GET /api/rce/day?date=YYYY-MM-DD     -> powinno zwracać tablicę godzinowych cen { timeISO, rce_pln_mwh }

Jeśli nie masz tych endpointów, UI pokaże komunikaty / brak danych, ale nie przerwie działania.

Motyw: domyślnie DARK (klasa 'dark' na <html>, LocalStorage: theme).

