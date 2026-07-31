/* =============================================================================
   KONFIGURACJA ANKIETY
   -----------------------------------------------------------------------------
   >>> EDYTUJ TYLKO SEKCJĘ "PRODUCT" PONIŻEJ, ŻEBY DOPASOWAĆ DO APLIKACJI. <<<

   Wersja krótka: 16 pytań, 4 sekcje, ok. 5 minut. Kwestionariusz jest tak
   przycięty, żeby każde pytanie zmieniało jakąś decyzję - jeśli odpowiedź
   niczego nie zmienia, nie ma go tutaj.

   Zachowane metody pomiaru: Sean Ellis PMF, SEQ + task success rate,
   Gabor-Granger (krzywa popytu i przychodu).
   ========================================================================== */

const PRODUCT = {
  name: 'Trend Alert',
  demoUrl: 'https://markiq-demo.vercel.app/',

  // Opis, który zobaczy marketer PRZED wejściem do dema.
  // Trzymaj neutralnie - nie sprzedawaj, bo zaburzysz odpowiedzi o wartości.
  pitch:
    'Chcielibyśmy, aby Trend Alert pomagał marketerom uporządkować i analizować ' +
    'rosnącą liczbę danych oraz raportów. Gdy organizacja nie dysponuje dedykowanym ' +
    'zespołem analitycznym, zestawianie danych sprzedażowych, wyników kampanii ' +
    'i raportów z wielu paneli, zapisanych w różnych formatach i opisanych odmienną ' +
    'nomenklaturą, staje się dużym wyzwaniem. Narzędzie ma integrować te informacje ' +
    'w jednym miejscu, ujednolicać je i umożliwiać podejmowanie decyzji na podstawie ' +
    'pełnego obrazu dostępnych danych.',

  // MODUŁY / FUNKCJE - respondent wybiera maksymalnie 3, za które zapłaciłby.
  // ZMIEŃ NA PRAWDZIWE NAZWY Z APLIKACJI (te są przykładowe).
  // 5-7 pozycji: przy dłuższej liście ludzie przestają czytać i klikają pierwsze.
  modules: [
    { id: 'm_dashboard',  label: 'Jeden dashboard z danymi ze wszystkich paneli' },
    { id: 'm_insights',   label: 'Automatyczne insighty / rekomendacje AI' },
    { id: 'm_unify',      label: 'Ujednolicanie nazewnictwa i formatów danych' },
    { id: 'm_alerts',     label: 'Alerty o istotnych zmianach w wynikach' },
    { id: 'm_reports',    label: 'Raporty i eksport dla klienta / zarządu' },
    { id: 'm_competitor', label: 'Monitoring konkurencji' },
  ],

  // ZADANIE DO WYKONANIA W DEMIE - mierzy realną używalność, nie opinie.
  // W wersji krótkiej jest JEDNO, więc musi być najbardziej reprezentatywne
  // dla obietnicy produktu. Musi mieć jeden, weryfikowalny rezultat.
  // ZMIEŃ NA REALNĄ ŚCIEŻKĘ W APLIKACJI.
  // (Możesz dodać drugie zadanie - ankieta urośnie o ok. 1,5 minuty.)
  tasks: [
    {
      id: 't1',
      title: 'Zadanie: znajdź konkretny wniosek',
      instruction:
        'Wejdź do aplikacji i spróbuj ustalić, który obszar (kampania, kanał, produkt) '
        + 'wypada najgorzej i dlaczego. Chodzi o wniosek, który mógłbyś powiedzieć '
        + 'na spotkaniu - nie o samo klikanie.',
    },
  ],

  // Progi cenowe do krzywej popytu (Gabor-Granger), PLN netto / miesiąc / user.
  // Ustaw wokół ceny, którą realnie rozważasz.
  priceTiers: [99, 199, 399, 799, 1499],
  currency: 'PLN',
};

/* -----------------------------------------------------------------------------
   ZBIERANIE ODPOWIEDZI
   Zostaw endpoint pusty ('') = respondent pobiera plik JSON i odsyła mailem.
   Wpisz URL (Google Apps Script / Formspree / własne API) = zapis automatyczny.
   Instrukcja: patrz README.md + backend/apps-script.gs
-------------------------------------------------------------------------------- */
const SUBMIT = {
  endpoint: '',
  contactEmail: 'grzegorz.fijal@gmail.com',
  estimatedMinutes: 5,
};

/* ========================================================================== */
/*  PONIŻEJ: KWESTIONARIUSZ. Zmieniaj tylko jeśli wiesz, co robisz -           */
/*  ID pytań są używane przez metrics.js do liczenia wskaźników.               */
/*  { type: 'tasks' } w tablicy pytań rozwija się w zadania z PRODUCT.tasks.   */
/* ========================================================================== */

const SECTIONS = [
  /* ---------------------------------------------------------------- 1. PROFIL */
  {
    id: 's_profile',
    title: 'Kilka słów o Tobie',
    subtitle: 'Cztery kliknięcia. Potrzebne, żeby wiedzieć, czyja opinia to jest.',
    questions: [
      {
        id: 'role', type: 'single', required: true,
        label: 'Twoja rola',
        options: [
          'Marketing manager / head of marketing',
          'Performance / paid media specialist',
          'Content / brand / social media',
          'Marketing analyst / data',
          'Właściciel firmy / CMO / zarząd',
          'Agencja - obsługa klientów',
          'Freelancer / konsultant',
        ],
        allowOther: true,
      },
      {
        id: 'segment', type: 'single', required: true,
        label: 'Typ organizacji',
        options: ['B2B SaaS / tech', 'E-commerce', 'Agencja marketingowa', 'Usługi B2B',
          'Retail / FMCG', 'Edukacja / NGO / publiczne'],
        allowOther: true,
      },
      {
        id: 'reports_count', type: 'number', required: true, unit: 'raportów / źródeł',
        label: 'Jaka jest szacunkowa ilość stałych raportów/źródeł danych/paneli, '
          + 'w których znajdują się informacje ważne dla marek/produktów, którymi zarządzasz?',
        hint: 'Podaj przybliżoną liczbę.',
      },
      {
        id: 'analysis_capability', type: 'single', required: true,
        label: 'Jak oceniasz swoje możliwości w zakresie analizy raportów?',
        options: [
          'Regularnie i szczegółowo analizuję wszystkie ważne raporty.',
          'Analizuję wszystkie ważne raporty, ale zawsze brakuje mi na to czasu.',
          'Nie jestem w stanie analizować wszystkich ważnych raportów.',
          'Analizuję tylko część raportów ze względu na ograniczony czas.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------- 2. DEMO */
  {
    id: 's_demo',
    title: 'Wejdź do aplikacji',
    subtitle: 'Otwórz demo w nowej karcie, poklikaj chwilę i wykonaj jedno zadanie. '
      + 'To najważniejsza część - reszta to już tylko klikanie.',
    openDemo: true,
    questions: [
      {
        id: 'what_is_it', type: 'textarea', required: true,
        label: 'Własnymi słowami: co robi ta aplikacja i dla kogo jest?',
        hint: 'Nie sprawdzamy Cię - sprawdzamy, czy produkt sam się tłumaczy. '
          + 'Napisz szczerze, także jeśli nie wiesz.',
        placeholder: 'To jest narzędzie, które...',
        minLength: 15,
      },
      { type: 'tasks' },
      {
        id: 'first_impression_neg', type: 'textarea', required: true,
        label: 'Co Cię najbardziej zirytowało, zmyliło lub rozczarowało?',
        hint: 'Ta odpowiedź jest dla nas najcenniejsza. Nie oszczędzaj nas.',
        minLength: 10,
      },
    ],
  },

  /* ------------------------------------------------- 3. WARTOŚĆ I UŻYCIE */
  {
    id: 's_value',
    title: 'Wartość i użycie',
    questions: [
      {
        id: 'must_have_top3', type: 'multi', required: true, max: 3,
        label: 'Wybierz maksymalnie 3 funkcje, za które realnie zapłaciłbyś pieniędzmi',
        options: 'MODULE_LABELS',
      },
      {
        id: 'missing_features', type: 'textarea', required: true,
        label: 'Czego brakuje, żeby to narzędzie było dla Ciebie naprawdę użyteczne?',
        minLength: 15,
      },
      {
        id: 'usage_freq', type: 'single', required: true,
        label: 'Gdyby aplikacja była gotowa i podłączona do Twoich danych, '
          + 'jak często byś jej używał?',
        options: [
          'Codziennie',
          'Kilka razy w tygodniu',
          'Raz w tygodniu',
          'Kilka razy w miesiącu',
          'Raz w miesiącu lub rzadziej',
          'Nie używałbym wcale',
        ],
      },
      {
        id: 'blockers', type: 'multi', required: true,
        label: 'Co realnie zablokowałoby wdrożenie u Ciebie?',
        options: [
          'Brak integracji z moimi źródłami danych',
          'Wątpliwości co do jakości / poprawności danych',
          'Cena',
          'Brak czasu na wdrożenie i naukę',
          'Bezpieczeństwo / RODO / zgoda IT',
          'Mamy już podobne narzędzie',
          'Zbyt ogólne wnioski, nic nowego dla mnie',
          'Decyzja nie zależy ode mnie',
          'Nic - mógłbym zacząć od razu',
        ],
        allowOther: true,
      },
    ],
  },

  /* --------------------------------------------------- 4. CENA I DECYZJA */
  {
    id: 's_decision',
    title: 'Cena i decyzja',
    subtitle: 'Ostatnia sekcja. Odpowiadaj tak, jakbyś realnie miał wydać te pieniądze.',
    questions: [
      {
        id: 'gg_intent', type: 'matrix', required: true,
        label: 'Czy kupiłbyś abonament przy tej cenie miesięcznej? '
          + '(netto, za jednego użytkownika)',
        rows: 'PRICE_TIERS',
        cols: ['Nie', 'Może', 'Tak'],
      },
      {
        id: 'decision_power', type: 'single', required: true,
        label: 'Czy decydujesz o zakupie narzędzi marketingowych, aplikacji czy subskrypcji?',
        options: [
          'Tak, decyduję samodzielnie',
          'Rekomenduję, decyzję podejmuje ktoś inny',
          'Współdecyduję z zespołem',
          'Nie mam wpływu na zakupy',
        ],
      },
      {
        id: 'pmf', type: 'single', required: true,
        label: 'Jak byś się poczuł, gdybyś od dziś nie mógł już korzystać z tego narzędzia?',
        options: [
          'Bardzo rozczarowany',
          'Trochę rozczarowany',
          'Obojętnie - poradzę sobie bez niego',
          'Nie dotyczy, i tak nie zamierzam go używać',
        ],
      },
      {
        id: 'change_1', type: 'text', required: true,
        label: 'Jedna najważniejsza rzecz, którą powinniśmy zmienić',
        minLength: 5,
      },
      {
        id: 'pilot_interest', type: 'single', required: true,
        label: 'Chciałbyś wziąć udział w pilotażu na swoich danych?',
        options: [
          'Tak, chętnie - odezwijcie się',
          'Może, ale najpierw chcę zobaczyć więcej',
          'Nie, dziękuję',
        ],
      },
      {
        id: 'email', type: 'email',
        label: 'E-mail (tylko jeśli chcesz, żebyśmy wrócili do Ciebie)',
        placeholder: 'imie@firma.pl',
      },
    ],
  },
];
