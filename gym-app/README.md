# 93 Trening - aplikacja treningowa

Aplikacja do prowadzenia treningu siłowego z telefonu: plan, logowanie serii z RPE/RIR,
progresja, kalendarz, dieta i suplementacja. Zbudowana pod jedno konkretne zastosowanie -
**telefon w dłoni, między seriami, na siłowni**.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma + PostgreSQL, wykresy na Recharts,
walidacja Zod, formularze React Hook Form, PWA z service workerem.

---

## 1. Uruchomienie

```bash
# 1. baza danych (Docker)
docker compose up -d

# 2. konfiguracja
cp .env.example .env        # DATABASE_URL wskazuje na bazę z docker-compose

# 3. zależności, schemat, dane przykładowe
npm install
npx prisma migrate deploy   # albo: npm run db:migrate (tryb developerski)
npm run seed

# 4. start
npm run dev                 # http://localhost:3000
```

Produkcyjnie: `npm run build && npm start`.

**Konto demo:** `demo@gym.app` / `trening123`
(na ekranie logowania jest przycisk „Wejdź na konto demo").

Seed tworzy: 40 ćwiczeń systemowych, 25 produktów spożywczych, plan Push/Pull/Legs,
25 zakończonych treningów z ostatnich 8 tygodni, pomiary masy ciała z 60 dni,
7 dni posiłków, 2 tygodnie suplementacji i plan treningów na najbliższe 2 tygodnie.
Dzięki temu wykresy, progresja i rekordy działają od pierwszego wejścia.

### Skrypty

| Polecenie | Co robi |
|---|---|
| `npm run dev` | serwer developerski |
| `npm run build` / `npm start` | build produkcyjny i jego uruchomienie |
| `npm test` | testy jednostkowe logiki (node:test, 41 testów) |
| `npm run seed` | czyści konto demo i wypełnia bazę danymi przykładowymi |
| `npm run seed:system` | tylko dane wspólne: ćwiczenia i produkty (wersja produkcyjna) |
| `npm run db:migrate` | migracja developerska |
| `npm run db:studio` | Prisma Studio |
| `node scripts/e2e.mjs` | 18 scenariuszy przeklikanych w Chromium (wymaga `npm start`) |
| `node scripts/offline-check.mjs` | sprawdza service workera i kolejkę zapisu bez sieci |
| `node scripts/health-sync-check.mjs` | sprawdza synchronizację masy ciała z aplikacji Zdrowie (wymaga `npm start`) |

Wymagany Node 22 lub nowszy - skrypty seedujące uruchamiają TypeScript natywnie.

---

## 2. Wdrożenie (żeby otworzyć aplikację z telefonu)

Aplikacja ma backend i bazę, więc potrzebuje hostingu. Najkrótsza droga to **Vercel + Neon**
(oba mają darmowy próg wystarczający na jedno konto).

**1. Baza w Neon.** Załóż projekt na [neon.tech](https://neon.tech) i skopiuj dwa adresy połączenia:
z pulą (`...-pooler...`) i bezpośredni (bez `-pooler`).

**2. Projekt na Vercel.** Zaimportuj repozytorium, jako *Root Directory* ustaw `gym-app`.
W *Settings → Environment Variables* dodaj:

| Zmienna | Wartość |
|---|---|
| `DATABASE_URL` | adres **z pulą** (`-pooler`), z `?sslmode=require` |
| `DIRECT_URL` | adres **bezpośredni**, z `?sslmode=require` |

Pula połączeń jest po stronie serverless konieczna - każde wywołanie funkcji otwiera własne
połączenie i bez niej baza szybko odmawia. Migracje idą osobnym, bezpośrednim adresem, bo
Prisma potrzebuje do nich pełnej sesji.

**3. Deploy.** Vercel sam użyje skryptu `vercel-build`, który przed budowaniem uruchamia
`prisma migrate deploy` - schemat bazy zakłada się przy pierwszym wdrożeniu.

**4. Dane wspólne.** Raz, lokalnie, wskazując na produkcyjną bazę:

```bash
DATABASE_URL="<adres z pulą>" DIRECT_URL="<adres bezpośredni>" npm run seed:system
```

To wgrywa 40 ćwiczeń i 25 produktów. Bez tego kroku nowe konto dostanie plan bez ćwiczeń,
a wyszukiwarka produktów w diecie będzie pusta. **Nie uruchamiaj na produkcji `npm run seed`** -
ta wersja kasuje i odtwarza konto demo.

**5. Konto.** Wejdź na adres z Vercela i załóż własne konto przez „Załóż konto". Dostaniesz
plan Push/Pull/Legs i zestaw suplementów na start. Konto demo nie istnieje na produkcji.

**6. Instalacja na telefonie.** Otwórz stronę w przeglądarce → *Dodaj do ekranu głównego*.
Aplikacja startuje wtedy pełnoekranowo, bez paska adresu, i działa przy słabym zasięgu.

### Waga elektroniczna i aplikacja Zdrowie (iPhone)

Apple nie daje serwerom dostępu do danych Zdrowia - most musi postawić sam telefon.
Dlatego aplikacja wystawia własne wejście, a pomiar wysyła **Skrót** z iPhone'a:

```
waga elektroniczna → jej aplikacja → Zdrowie → Skrót (automatyzacja) → POST /api/health/weight
```

Działa z każdą wagą, której aplikacja umie pisać do Zdrowia (Withings, Garmin, Renpho,
Eufy, Xiaomi/Zepp i podobne), bo aplikacja nie rozmawia z konkretnym producentem.

**Konfiguracja:** Ustawienia → *Waga i aplikacja Zdrowie* → wygeneruj token (widać go raz)
→ przycisk *Jak ustawić skrót na iPhonie* prowadzi przez cztery kroki: akcja
„Znajdź próbki zdrowotne" (Masa ciała, sortuj malejąco, limit 1), akcja „Pobierz zawartość URL"
(POST, nagłówek `Authorization: Bearer <token>`, treść JSON z `weight` i `date`),
automatyzacja codziennie rano.

**Wejście HTTP:**

```http
POST /api/health/weight
Authorization: Bearer <token>
Content-Type: application/json

{ "weight": 84.2, "date": "2026-09-09" }              # jeden pomiar
{ "weight": "185", "unit": "lb" }                      # funty, data dzisiejsza
{ "samples": [ { "weight": 83.4, "date": "..." } ] }   # import historii (do 400 pozycji)
```

GET pod tym samym adresem sprawdza token i zwraca ostatni zapisany pomiar - przydaje się
przy pierwszym uruchomieniu skrótu.

Zasady, które pilnuje serwer: token trzymany wyłącznie jako hash sha256 (i unieważnialny
z ustawień), wartości spoza 20-400 kg odrzucane, daty z przyszłości odrzucane (typowy objaw
złej strefy czasowej w skrócie), ten sam dzień nadpisuje wpis zamiast tworzyć duplikat,
a data brana jest z napisu ISO, więc poranne ważenie nie ucieka na poprzedni dzień.

Cała droga - od wygenerowania tokenu, przez wysyłkę, po widok w aplikacji i unieważnienie
tokenu - jest pokryta testem `scripts/health-sync-check.mjs`.

### Inny hosting

Na własnym serwerze: `docker compose up -d` na bazę, potem `npm ci`, `npx prisma migrate deploy`,
`npm run seed:system`, `npm run build`, `npm start` (domyślnie port 3000) za nginx z certyfikatem.
`DATABASE_URL` i `DIRECT_URL` mogą wtedy wskazywać ten sam adres - pula nie jest potrzebna,
bo proces jest jeden i długo żyjący.

---

## 3. Co jest zaimplementowane

### Tryb treningowy (najważniejszy ekran)

- start jednym kliknięciem z dashboardu, kalendarza lub planu,
- przy każdym ćwiczeniu **wynik z poprzedniego razu** (ciężar × powtórzenia @RPE),
- **podpowiedź ciężaru** z podwójnej progresji - nigdy nie podbija ciężaru,
  gdy poprzednie serie szły na RPE 9+; jedno dotknięcie wpisuje ją we wszystkie serie,
- duże pola na ciężar i powtórzenia, RPE/RIR z dużych przycisków (6-10 / 0-4+),
- po odhaczeniu serii kursor **sam przechodzi do kolejnej** i startuje stoper przerwy,
- stoper w formie świateł startowych (5 świateł gaśnie = koniec przerwy) z sygnałem
  dźwiękowym, wibracją i powiadomieniem systemowym,
- **autozapis** - nie ma przycisku „zapisz"; stan zapisu widać w nagłówku,
- serie rozgrzewkowe, notatki do serii, do ćwiczenia i do całego treningu,
- dodawanie ćwiczeń w trakcie treningu, superserie (A1/A2).

### Reszta aplikacji

- **Dashboard** - dzisiejszy trening albo podsumowanie wykonanego, szybkie statystyki,
  wykres progresji najczęściej trenowanego boju, dieta, suplementy, rekordy, ostatnia aktywność.
- **Plany** - plan → treningi (Push/Pull/Legs/Upper/Lower) → ćwiczenia z konfiguracją:
  serie, zakres powtórzeń, docelowy ciężar, RPE, RIR, przerwa, tempo, superseria, notatka.
- **Waga i Zdrowie** - synchronizacja masy ciała z aplikacji Zdrowie przez Skrót na iPhonie
  (osobiste tokeny, import historii jedną paczką) - szczegóły w sekcji o wdrożeniu.
- **Ćwiczenia** - 40 ćwiczeń systemowych + własne; kategoria, partia główna i pomocnicze,
  typ, jednostka (kg/lb/masa ciała/czas/dystans), instrukcje techniczne.
- **Progresja** - dla każdego ćwiczenia wykres z przełącznikiem: ciężar, powtórzenia,
  objętość, szacowane 1RM, RPE; rekordy i lista ostatnich wykonań.
- **Kalendarz** - widok miesięczny z oznaczeniem: wykonany / zaplanowany / odpoczynek,
  szczegóły dnia, planowanie treningów i dni wolnych.
- **Historia** - lista treningów z filtrami (zakres dat, trening, ćwiczenie) i pełne
  podsumowanie pojedynczej sesji (tabela serii, objętość, szacowane 1RM, ocena, notatki).
- **Statystyki** - liczba treningów, średni czas, objętość, serie, średnie RPE, regularność,
  objętość tygodniowa, podział na partie, masa ciała, rekordy osobiste, obserwacje.
- **Dieta** - cele dzienne (własne albo policzone z profilu wzorem Mifflina-St Jeora),
  posiłki z godziną, pozycje z bazy produktów lub wpisane ręcznie, sumy kalorii i makro.
- **Suplementacja** - suplementy z dawką, jednostką, porami dnia i dniami tygodnia,
  odhaczanie dawek jednym dotknięciem, widok ostatnich 7 dni.
- **Ustawienia** - profil (płeć, rok urodzenia, wzrost, cel, aktywność), jednostki,
  preferowana skala wysiłku (RPE / RIR / oba), skok ciężaru, masa ciała z wykresem, motyw.

### Jak liczone są liczby

| Wskaźnik | Metoda |
|---|---|
| Objętość | ciężar × powtórzenia, tylko serie robocze oznaczone jako wykonane |
| Szacowane 1RM | tabela RPE/RIR (RTS) - uwzględnia zapas powtórzeń; bez RPE wzór Epleya |
| RPE ↔ RIR | RPE 8 = RIR 2, przeliczane w obie strony |
| Podpowiedź ciężaru | podwójna progresja: najpierw powtórzenia w zakresie, potem ciężar |
| Zapotrzebowanie | Mifflin-St Jeor × współczynnik aktywności ± korekta na cel |
| Seria treningowa | liczba kolejnych tygodni z co najmniej jednym treningiem |

Cała ta logika siedzi w `src/lib/training.ts` i `src/lib/nutrition.ts` - są to czyste funkcje
bez zależności od bazy i Reacta, pokryte testami (`npm test`).

---

## 4. Architektura

```
prisma/schema.prisma     model relacyjny (plan ≠ wykonany trening)
prisma/seed.ts           dane przykładowe

src/app/(auth)/          logowanie i rejestracja
src/app/(app)/           aplikacja: dashboard, trening, kalendarz, ćwiczenia,
                         plany, dieta, suplementacja, statystyki, historia, ustawienia
src/components/ui/       elementy interfejsu (przyciski, karty, panele, pola)
src/components/training/ tryb treningowy: wiersz serii, blok ćwiczenia, stoper, wybór RPE
src/components/...       komponenty pozostałych sekcji
src/lib/                 czysta logika: trening, żywienie, daty, wnioski, dane startowe
src/schemas/             schematy Zod - te same po stronie klienta i serwera
src/server/actions/      akcje serwerowe (mutacje)
src/server/queries/      odczyty złożone
src/server/auth.ts       sesje, hasła, brama dostępu do danych
src/hooks/               autozapis serii z kolejką offline
```

**Rozdzielenie planu od wykonania.** `WorkoutPlan → Workout → WorkoutExercise` opisuje zamiar
(„Bench Press 4 × 8-10, RPE 8"). `WorkoutSession → SessionExercise → WorkoutSet` przechowuje fakt
(„2026-09-08: 80 × 10 @8, 82.5 × 9 @9"). Sesja kopiuje założenia z planu, więc późniejsza edycja
planu nie zmienia historii.

**Bezpieczeństwo.** Hasła w bcrypt (12 rund), sesja w bazie z tokenem trzymanym jako hash sha256,
ciasteczko `httpOnly`+`sameSite=lax`. Każda akcja serwerowa zaczyna od `requireUser()`, a każde
zapytanie filtruje po `userId` - również przy zapisie serii sprawdzane jest, czy dana seria należy
do sesji użytkownika. Walidacja Zod działa po obu stronach; makro produktów z bazy liczy serwer,
żeby klient nie mógł podać własnych wartości.

**Autozapis i offline.** Zmiany serii trafiają do kolejki, ta leci na serwer po krótkiej ciszy
i równolegle ląduje w `localStorage`. Odświeżenie strony, zabicie aplikacji albo utrata zasięgu
nie kasują wpisanych wyników - wysyłka ponawia się po powrocie sieci. Service worker trzyma
powłokę aplikacji w cache, więc ekran treningu otwiera się bez internetu.

---

## 5. Przygotowane pod dalszą rozbudowę

- **AI Coach** - `src/lib/coach.ts` przyjmuje gotowy opis sytuacji zawodnika (`CoachInput`:
  progresja bojów, objętość na partie, regularność, dieta, masa ciała, zmęczenie) i zwraca wnioski.
  Dziś generuje je zestaw reguł, jutro może je generować model językowy - reszta aplikacji się nie zmienia.
  Wnioski widać na ekranie Statystyki, model `CoachInsight` czeka na ich historię.
- **Powiadomienia** - model `Reminder` (typ, godzina, dni tygodnia) i obsługa kliknięcia
  w powiadomienie w service workerze. Brakuje samej wysyłki (push albo zadanie cykliczne).
- **Baza produktów** - model `Food` i pozycje posiłku wskazujące na produkt (`foodId`);
  25 produktów startowych można wymienić na pełną bazę bez migracji danych.
- **Superserie** - grupowanie jest w modelu i w interfejsie (A1/A2); brakuje trybu prowadzenia
  po kolei A1 → A2 → przerwa.
- **Synchronizacja wielourządzeniowa** - kolejka zapisu jest gotowa; brakuje rozstrzygania
  konfliktów, gdy ten sam trening jest edytowany na dwóch urządzeniach.
- **Więcej danych ze Zdrowia** - wejście `/api/health/weight` przyjmuje masę ciała i procent
  tkanki tłuszczowej. Model `ApiToken` ma pole `scope`, więc kolejne wejścia (sen, tętno spoczynkowe,
  kroki) to nowa trasa i ten sam mechanizm tokenów, bez zmian w skrócie na telefonie.

## 6. Znane ograniczenia

- Ćwiczenia z masą ciała (podciąganie, dipy) liczą objętość tylko z ciężaru dodatkowego -
  bez wagi ciała, więc seria bez obciążenia daje objętość 0.
- Jednostka `lb` jest w profilu i w modelu, ale liczby nie są przeliczane - aplikacja
  konsekwentnie operuje na kilogramach (wyjątkiem jest wejście HTTP, które przelicza funty na kilogramy).
- Synchronizacja ze Zdrowiem wymaga wdrożonej aplikacji pod publicznym adresem - na `localhost`
  telefon nie ma jak wysłać pomiaru. Kierunek jest jednostronny: telefon wysyła, aplikacja nie
  zapisuje nic z powrotem do Zdrowia.
- Kalendarz planuje pojedyncze dni; nie ma jeszcze rozpisywania cyklu na kilka tygodni naprzód.
- Offline działa dla trwającego treningu i powłoki aplikacji; pozostałe ekrany bez sieci
  pokażą ostatnią wersję z cache albo stronę „Brak połączenia".
- Testy end-to-end (`scripts/e2e.mjs`) wymagają uruchomionego `npm start` i Chromium.
