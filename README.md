# Ewaluacja MarkIQ - aplikacja do zbierania feedbacku od marketerów

Dwie strony, zero zależności, zero backendu (opcjonalnie arkusz Google):

| Plik | Co robi |
|---|---|
| `index.html` | Ankieta dla marketera. To wysyłasz linkiem. |
| `results.html` | Dashboard: wrzucasz odpowiedzi, dostajesz policzone wskaźniki. Tylko dla Ciebie. |

Ankieta nie pyta „czy Ci się podoba". Prowadzi marketera przez **3 zadania w demie**,
a potem mierzy cztery rzeczy, które chciałeś wiedzieć:

| Twoje pytanie | Jak jest mierzone |
|---|---|
| Czy to jest im przydatne? | Sean Ellis PMF (% „bardzo rozczarowany", próg 40%) + realny wynik zadań |
| Na ile by z tego korzystali? | Deklarowana częstotliwość + moment w procesie + co by zastąpili + oszczędzony czas |
| Ile zapłaciliby miesięcznie? | Van Westendorp (4 pytania → zakres cen) **i** Gabor-Granger (progi → krzywa przychodu) |
| Co zmienić? | 3 uszeregowane zmiany + blokery wdrożenia + braki + friction log z zadań |

Dodatkowo: NPS, UMUX-Lite (używalność w skali SUS), SEQ dla każdego zadania,
segmentacja po roli/wielkości firmy oraz flagi jakości odpowiedzi (kto klikał na odczep się).

---

## 1. Zanim wyślesz - 5 minut konfiguracji

Otwórz `assets/config.js` i zmień **tylko sekcję `PRODUCT`**:

```js
const PRODUCT = {
  name: 'MarkIQ',
  demoUrl: 'https://markiq-demo.vercel.app/',
  pitch: '...',        // jedno neutralne zdanie - nie sprzedawaj, zaburzysz wyniki
  modules: [...],      // <-- PRAWDZIWE nazwy funkcji z aplikacji
  tasks: [...],        // <-- 3 realne ścieżki do wykonania w demie
  priceTiers: [99, 199, 399, 799, 1499],
};
```

**To jest jedyna rzecz, której nie mogłem uzupełnić za Ciebie.** Nie miałem dostępu
sieciowego do `markiq-demo.vercel.app` z tego środowiska (polityka egress zwróciła 403),
więc `modules` i `tasks` są wypełnione sensownymi placeholderami dla narzędzia
marketingowego. Wejdź do dema i popraw je na to, co tam faktycznie jest.

Zasady, jeśli będziesz je przepisywał:

- **Moduły**: 4-8 pozycji, nazwane językiem marketera, nie nazwami z kodu.
- **Zadania**: każde musi mieć jeden weryfikowalny rezultat („znajdź X", „wyeksportuj Y").
  Zadanie bez rezultatu daje bezwartościowe dane. Nie pisz „rozejrzyj się".
- **Progi cenowe**: rozstaw je wokół ceny, którą realnie rozważasz - to one wyznaczają
  krzywą przychodu.

Reszta pliku to gotowy kwestionariusz. ID pytań są używane przez `assets/metrics.js`,
więc jeśli zmieniasz `id` albo treść opcji w `pmf` / `usage_freq` / `gg_intent` -
zmień też odpowiednie mapowania w `metrics.js` i uruchom testy.

## 2. Uruchomienie lokalnie

```bash
python3 -m http.server 8000     # albo: npx http-server -p 8000
# ankieta:   http://localhost:8000/index.html
# dashboard: http://localhost:8000/results.html  → „Pokaż na danych przykładowych"
```

Testy wskaźników (21 przypadków, wartości policzone ręcznie):

```bash
npm test        # albo: node test/metrics.test.mjs
```

## 3. Publikacja

Zwykłe pliki statyczne - nie ma builda:

```bash
npx vercel --prod          # albo netlify deploy --prod, albo GitHub Pages
```

`results.html` też się opublikuje. Ma `noindex`, ale to nie jest zabezpieczenie -
jeśli respondenci nie mają widzieć wyników, wdróż ankietę i dashboard osobno albo
trzymaj `results.html` tylko lokalnie.

## 4. Zbieranie odpowiedzi - wybierz jedną drogę

**A. Bez konfiguracji (domyślnie).** `SUBMIT.endpoint = ''`. Respondent na koniec pobiera
plik JSON i odsyła mailem. Działa od razu, ale tracisz część osób na ostatnim kroku.
Dobre dla 5-10 osób, które znasz osobiście.

**B. Arkusz Google (polecane).** Zajmuje 5 minut, instrukcja krok po kroku jest
w `backend/apps-script.gs`. Wklejasz URL wdrożenia do `SUBMIT.endpoint` i odpowiedzi
lecą prosto do arkusza. Zakładka `raw` trzyma pełny JSON - to jest źródło dla dashboardu.
Jeśli zapis się nie uda (brak sieci, zły URL), ankieta **sama** przełącza się na tryb A,
więc odpowiedzi nie giną.

**C. Cokolwiek innego** przyjmujące `POST` z JSON-em w body (Formspree, n8n, własne API).
Wpisz URL w `SUBMIT.endpoint`.

Ankieta autosave'uje się w `localStorage`, więc marketer może przerwać i wrócić.

### Skąd wziąć dane do dashboardu

- Tryb A: przeciągnij pliki `.json` z maili na `results.html`.
- Tryb B: skopiuj kolumnę `json` z zakładki `raw` w arkuszu i wklej w pole „Wklej JSON"
  (przyjmuje też JSON-per-linia).

Wszystko liczy się w przeglądarce, dane nigdzie nie wychodzą.

## 5. Rekrutacja - inaczej cały ten aparat pomiarowy nie ma czego mierzyć

**Ilu:** 12-20 odpowiedzi to minimum, żeby wskaźniki nie skakały na jednej osobie.
Do 8 odpowiedzi czytaj tylko odpowiedzi opisowe i wyniki zadań, ignoruj procenty.
PMF i ceny mają sens od ok. 15 osób w jednym segmencie.

**Kogo:** celowo mieszaj - agencje, in-house, e-commerce, różne wielkości firm.
Dashboard rozbija wyniki po segmentach, więc dopiero mieszana próba pokaże Ci,
**kto** tego chce, a nie tylko „czy ktoś chce".

**Czego nie robić:** nie pytaj znajomych, którzy chcą Ci pomóc - dadzą Ci wysokie
oceny i zero informacji. Nie tłumacz aplikacji przed wypełnieniem, bo zabijesz
najcenniejszy sygnał (sekcja „Jak sami opisują, czym to jest").

Wiadomość, która działa lepiej niż „daj feedback" - link z tagiem źródła
(`?r=linkedin` trafia do danych, więc zobaczysz, który kanał daje lepszych respondentów):

> Cześć [imię], buduję narzędzie do analizy wyników kampanii i zanim pójdę dalej,
> chcę wiedzieć, czy to w ogóle ma sens dla kogoś, kto robi to zawodowo.
>
> Mam do Ciebie prośbę o 10 minut: klikniesz przez demo, wykonasz 3 krótkie zadania
> i powiesz mi wprost, co jest bezużyteczne. Interesuje mnie krytyka, nie komplementy -
> na tym etapie miły feedback kosztuje mnie miesiące pracy w złym kierunku.
>
> [link z ?r=...]
>
> Jeśli zostawisz maila, wrócę do Ciebie z tym, co z Twoich uwag zrobiłem.

Ostatnie zdanie realnie podnosi liczbę wypełnień - i zobowiązuje Cię do odpowiedzi.

## 6. Jak czytać wyniki

Kolejność jest ważna. Nie zaczynaj od ceny.

**1. Czy zadania się udały?** (sekcja „Czy to działa w praktyce")
Jeśli success rate < 70% albo SEQ < 5, wszystkie liczby o wartości i cenie są o produkcie,
którego respondenci nie umieli obsłużyć. Napraw UX i powtórz badanie. To najczęstszy
błąd w interpretacji takich badań.

**2. Czy jest fit?** PMF ≥ 40% „bardzo rozczarowanych" = masz produkt.
25-39% = jesteś blisko, popraw to, co wskazuje segment z najwyższym fit score.
< 25% = zmień grupę docelową albo zakres produktu, nie cenę.

**3. Dla kogo?** (sekcja „Kto tego chce najbardziej")
Segment z najwyższym fit score to Twój pierwszy target. Bardzo często PMF na całej
próbie wychodzi słabo, a w jednym segmencie jest doskonały - to jest najcenniejszy
wynik, jaki może dać to badanie.

**4. Za co zapłacą?** Kolumna „zapłaciłbym" w tabeli funkcji. Wysoka ocena ważności
przy zerowym „zapłaciłbym" znaczy „fajne, ale nie moimi pieniędzmi". Buduj to,
co ma jedno i drugie.

**5. Ile?** Dopiero teraz.
- **PMC-PME** = zakres, w którym cena nie zabija sprzedaży.
- **IPP** = punkt, w którym „drogo" zaczyna wygrywać z „okazja"; zwykle blisko ceny rynkowej.
- **OPP** = najmniej odrzuceń z powodu ceny.
- **Krzywa przychodu (Gabor-Granger)** = jedyny wskaźnik, który patrzy na przychód,
  a nie na komfort respondenta. Zwykle wypada wyżej niż intuicja. Zacznij od niego.
- Tyldy (`~143`) i żółty panel oznaczają, że odpowiedzi cenowe rozjechały się na osobne
  grupy i przecięcie wypadło w przedziale, o którym nikt się nie wypowiedział. To nie
  jest cena - to sygnał, że masz dwa segmenty cenowe. Przefiltruj po segmencie.
- Deklarowana gotowość do zapłaty jest **zawsze** zawyżona (dlatego „może" liczy się
  z wagą 0,4). Traktuj to jako ranking wariantów, nie jak cennik.

**6. Co robić.** Sekcja „Co zmienić" jest posortowana od osób najlepiej dopasowanych.
Uwaga kogoś z fit score 85 jest warta dziesięć razy więcej niż uwaga kogoś z 15 -
ten drugi nigdy nie będzie Twoim klientem i optymalizowanie pod niego to strata czasu.
Friction log z zadań pokazuje konkretne miejsca w UI do naprawy.

**Flagi jakości** (tabela respondentów): „szybkie wypełnienie", „krótkie odpowiedzi",
„jednakowe oceny" = ktoś klikał bez czytania. Nie usuwam takich odpowiedzi automatycznie,
ale przy ostatecznych decyzjach policz wskaźniki jeszcze raz bez nich.

## 7. Struktura

```
index.html              ankieta
results.html            dashboard
assets/
  config.js             KONFIGURACJA + treść kwestionariusza  <-- edytujesz tutaj
  survey.js             silnik ankiety (render, walidacja, autosave, wysyłka)
  metrics.js            wskaźniki - czyste funkcje, bez DOM-u
  results.js            dashboard: wykresy SVG, tabele, eksport CSV
  styles.css            styl (jasny + ciemny motyw)
backend/apps-script.gs  zapis do Arkusza Google
test/metrics.test.mjs   testy wskaźników
```

`metrics.js` nie dotyka DOM-u, więc te same funkcje liczą wyniki w przeglądarce
i w testach - jeśli chcesz dodać wskaźnik, dopisz go tam i dopisz test.
