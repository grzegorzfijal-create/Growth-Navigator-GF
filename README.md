# Ewaluacja Trend Alert - aplikacja do zbierania feedbacku od marketerów

Dwie strony, zero zależności, zero backendu (opcjonalnie arkusz Google):

| Plik | Co robi |
|---|---|
| `index.html` | Ankieta dla marketera. To wysyłasz linkiem. |
| `results.html` | Dashboard: wrzucasz odpowiedzi, dostajesz policzone wskaźniki. Tylko dla Ciebie. |

**16 pytań, 4 sekcje, ok. 5 minut.** Ankieta nie pyta „czy Ci się podoba" - każe wykonać
**jedno konkretne zadanie w demie**, a potem mierzy cztery rzeczy, które chciałeś wiedzieć:

| Twoje pytanie | Jak jest mierzone |
|---|---|
| Czy to jest im przydatne? | Sean Ellis PMF (% „bardzo rozczarowany", próg 40%) + realny wynik zadania |
| Na ile by z tego korzystali? | Deklarowana częstotliwość + blokery wdrożenia |
| Ile zapłaciliby miesięcznie? | Gabor-Granger: 5 progów cenowych → krzywa popytu i przychodu |
| Co zmienić? | Najważniejsza zmiana + czego brakuje + co zirytowało + friction log z zadania |

Dodatkowo: SEQ i success rate dla zadania, kwalifikacja ICP (liczba raportów, czy
nadążają z analizą), segmentacja po fit score oraz flagi jakości odpowiedzi
(kto klikał na odczep się).

Kwestionariusz był kiedyś dłuższy (51 pól, ~10 min) i został przycięty, bo przy takiej
długości nikt go nie kończy. Wypadły: Van Westendorp, NPS, UMUX-Lite, macierz ważności
funkcji, 2 z 3 zadań i pytania kontekstowe. Kod tych wskaźników **został** w `metrics.js`
wraz z testami, a dashboard renderuje ich sekcje tylko wtedy, gdy w danych są odpowiedzi -
więc starsze, dłuższe odpowiedzi nadal liczą się poprawnie, a przywrócenie pytania to
dopisanie go z powrotem do `config.js`.

---

## 1. Zanim wyślesz - 5 minut konfiguracji

Otwórz `assets/config.js` i zmień **tylko sekcję `PRODUCT`**:

```js
const PRODUCT = {
  name: 'Trend Alert',
  demoUrl: 'https://markiq-demo.vercel.app/',
  pitch: '...',        // neutralny opis - nie sprzedawaj, zaburzysz wyniki
  modules: [...],      // <-- PRAWDZIWE nazwy funkcji z aplikacji (5-7 pozycji)
  tasks: [...],        // <-- JEDNA realna ścieżka do wykonania w demie
  priceTiers: [99, 199, 399, 799, 1499],
};
```

**To jest jedyna rzecz, której nie mogłem uzupełnić za Ciebie.** Nie miałem dostępu
sieciowego do `markiq-demo.vercel.app` z tego środowiska (polityka egress zwróciła 403),
więc `modules` i `tasks` są wypełnione sensownymi placeholderami dla narzędzia
marketingowego. Wejdź do dema i popraw je na to, co tam faktycznie jest.

Zasady, jeśli będziesz je przepisywał:

- **Moduły**: 5-7 pozycji, nazwane językiem marketera, nie nazwami z kodu.
- **Zadanie**: musi mieć jeden weryfikowalny rezultat („znajdź X", „wyeksportuj Y").
  Zadanie bez rezultatu daje bezwartościowe dane. Nie pisz „rozejrzyj się".
  Jest tylko jedno, więc wybierz to najbardziej reprezentatywne dla obietnicy produktu.
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

Testy wskaźników (23 przypadki, wartości policzone ręcznie):

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

### Wersja jednoplikowa

```bash
npm run build     # -> dist/ewaluacja.html (~91 kB, zero zewnętrznych zależności)
```

Ankieta + dashboard w jednym pliku HTML: działa z dysku, z załącznika w mailu
i z dowolnego hostingu. Ankieta jest widokiem domyślnym, dashboard siedzi pod
`#wyniki`, więc respondent z czystym linkiem nigdy nie trafi przypadkiem na wyniki
(ale to nie jest zabezpieczenie - link do wyników jest w pasku u góry).

`tools/build-single-file.mjs` tylko skleja pliki źródłowe, więc nie ma tu drugiej
kopii kodu, która mogłaby się rozjechać. Po każdej zmianie w `assets/` lub
w `index.html` / `results.html` uruchom `npm run build` ponownie.

**Ważne ograniczenie Artifactu na claude.ai.** Opublikowana tam strona ma zablokowane
wszystkie żądania na zewnętrzne adresy, więc zapis odpowiedzi **nie zadziała** -
niezależnie od tego, czy użyjesz Arkusza Google, Formspree czy własnego API.
Nie da się tego obejść: udostępniona stronie lista uprawnień obejmuje tylko
pobieranie pliku i konektory claude.ai zalogowanego widza, a żadne z tych dwóch
nie nadaje się do zbierania odpowiedzi od obcych ludzi.

Artifact traktuj więc jako **podgląd ankiety do pokazania komuś**. Do realnego
zbierania odpowiedzi wdróż na Vercela (albo dowolny inny hosting statyczny).

## 4. Zbieranie odpowiedzi - to musisz zrobić, zanim wyślesz link

Ankieta jest stroną statyczną, więc **sama z siebie nie wyśle nic na Twojego maila** -
potrzebuje adresu, pod który wysyła odpowiedzi. Dopóki `SUBMIT.endpoint` jest pusty,
ankieta działa w trybie podglądu: przechodzi się ją normalnie, ale na końcu mówi
wprost, że odpowiedzi nigdzie nie poleciały. To jest stan do testowania, nie do wysyłki.

**Arkusz Google + mail (polecane, 5 minut, za darmo).**
Pełna instrukcja krok po kroku jest na górze `backend/apps-script.gs`. W skrócie:

1. Nowy Arkusz Google -> Rozszerzenia -> Apps Script -> wklej `backend/apps-script.gs`.
2. Ustaw `NOTIFY_EMAIL` na swój adres.
3. Wdróż jako aplikację internetową: **Wykonaj jako: Ja**, **Kto ma dostęp: Wszyscy**.
   To drugie jest obowiązkowe - przy innym ustawieniu przeglądarka respondenta dostanie
   odmowę i zobaczy ekran „Nie udało się zapisać".
4. Skopiuj URL wdrożenia do `SUBMIT.endpoint` w `assets/config.js`.

Od tego momentu każda odpowiedź: ląduje w arkuszu, przychodzi do Ciebie mailem
z podsumowaniem (rola, PMF, wynik zadania, ceny, odpowiedzi otwarte) i ma dopięty
plik `.json` gotowy do wrzucenia w dashboard. Jeśli respondent zostawił swój adres,
mail ma ustawione `reply-to` na niego - odpisujesz jednym kliknięciem.

**Alternatywy** przyjmujące `POST` z JSON-em w body: Formspree, FormSubmit, n8n, własne API.
Wpisujesz URL w to samo pole.

### Co widzi respondent

Ostatni przycisk ankiety to **„Zapisz moje odpowiedzi"** i to jedyne, co musi kliknąć.
Wysyłka ma 15-sekundowy limit czasu. Jeśli się nie uda, dostaje ekran z przyciskiem
„Spróbuj ponownie" (odpowiedzi cały czas siedzą w `localStorage`, więc nic nie ginie),
a jako ostateczność - pobranie pliku. Nikt nie jest proszony o wysyłanie maila ręcznie.

### Skąd wziąć dane do dashboardu

- Z maili: przeciągnij załączone pliki `.json` na `results.html`.
- Z arkusza: skopiuj kolumnę `json` z zakładki `raw` i wklej w pole „Wklej JSON"
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
> Mam do Ciebie prośbę o 5 minut: klikniesz przez demo, wykonasz jedno krótkie zadanie
> i powiesz mi wprost, co jest bezużyteczne. Interesuje mnie krytyka, nie komplementy -
> na tym etapie miły feedback kosztuje mnie miesiące pracy w złym kierunku.
>
> [link z ?r=...]
>
> Jeśli zostawisz maila, wrócę do Ciebie z tym, co z Twoich uwag zrobiłem.

Ostatnie zdanie realnie podnosi liczbę wypełnień - i zobowiązuje Cię do odpowiedzi.

## 6. Jak czytać wyniki

Kolejność jest ważna. Nie zaczynaj od ceny.

**1. Czy zadanie się udało?** (sekcja „Czy to działa w praktyce")
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
- **Krzywa przychodu (Gabor-Granger)** patrzy na przychód, a nie na komfort respondenta:
  cena maksymalizująca przychód zwykle wypada wyżej, niż podpowiada intuicja.
  Nie czytaj samego „ilu powiedziało tak" - najtańszy próg zawsze wygra to porównanie.
- Deklarowana gotowość do zapłaty jest **zawsze** zawyżona (dlatego „może" liczy się
  z wagą 0,4). Traktuj to jako ranking wariantów, nie jak cennik.
- Zestaw wynik z kolumną „Wpływ na zakup": wysoka gotowość u osób bez decyzyjności
  to nie jest popyt.
- Jeśli wrzucisz do dashboardu starsze odpowiedzi z pytaniami Van Westendorpa,
  sekcja z krzywymi i punktami PMC/OPP/IPP/PME pojawi się automatycznie. Tylda (`~143`)
  przy cenie oznacza przecięcie wyliczone w przedziale, o którym nikt się nie wypowiedział -
  to sygnał dwóch segmentów cenowych, nie cena.

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
