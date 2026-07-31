/* =============================================================================
   KONFIGURACJA ANKIETY
   -----------------------------------------------------------------------------
   >>> EDYTUJ TYLKO SEKCJĘ "PRODUCT" PONIŻEJ, ŻEBY DOPASOWAĆ DO APLIKACJI. <<<
   Reszta pliku to gotowy kwestionariusz oparty na sprawdzonych metodach
   (Sean Ellis PMF, NPS, UMUX-Lite, SEQ, Van Westendorp, Gabor-Granger).
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

  // MODUŁY / FUNKCJE do oceny wartości.
  // ZMIEŃ NA PRAWDZIWE NAZWY Z APLIKACJI (te są przykładowe).
  // 4-8 pozycji działa najlepiej.
  modules: [
    { id: 'm_dashboard',  label: 'Dashboard z wynikami kampanii' },
    { id: 'm_insights',   label: 'Automatyczne insighty / rekomendacje AI' },
    { id: 'm_audience',   label: 'Analiza grup docelowych i segmentów' },
    { id: 'm_content',    label: 'Ocena i generowanie treści reklamowych' },
    { id: 'm_budget',     label: 'Rekomendacje alokacji budżetu' },
    { id: 'm_competitor', label: 'Monitoring konkurencji' },
    { id: 'm_reports',    label: 'Raporty i eksport dla klienta / zarządu' },
  ],

  // ZADANIA DO WYKONANIA W DEMIE (mierzą realną używalność, nie opinie).
  // Każde zadanie musi mieć jeden, weryfikowalny rezultat.
  // ZMIEŃ NA REALNE ŚCIEŻKI W APLIKACJI.
  tasks: [
    {
      id: 't1',
      title: 'Zadanie 1: Znajdź główny wynik',
      instruction:
        'Wejdź do aplikacji i znajdź kampanię (lub kanał) z najgorszym wynikiem. ' +
        'Zapisz sobie jej nazwę.',
    },
    {
      id: 't2',
      title: 'Zadanie 2: Wyciągnij wniosek',
      instruction:
        'Znajdź w aplikacji jedną rekomendację lub insight i oceń, czy zastosowałbyś ' +
        'ją w swojej realnej pracy.',
    },
    {
      id: 't3',
      title: 'Zadanie 3: Zabierz coś na zewnątrz',
      instruction:
        'Spróbuj przygotować / wyeksportować podsumowanie, które mógłbyś pokazać ' +
        'klientowi lub przełożonemu.',
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
  estimatedMinutes: 10,
};

/* ========================================================================== */
/*  PONIŻEJ: KWESTIONARIUSZ. Zmieniaj tylko jeśli wiesz, co robisz -           */
/*  ID pytań są używane przez metrics.js do liczenia wskaźników.               */
/* ========================================================================== */

const SECTIONS = [
  /* ---------------------------------------------------------------- 1. PROFIL */
  {
    id: 's_profile',
    title: 'Kim jesteś',
    subtitle: 'Potrzebne, żeby porównać opinie między typami marketerów. Zajmie 1 minutę.',
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
        id: 'company_size', type: 'single', required: true,
        label: 'Wielkość firmy',
        options: ['1 osoba', '2-10', '11-50', '51-200', '201-1000', '1000+'],
      },
      {
        id: 'segment', type: 'single', required: true,
        label: 'Typ organizacji',
        options: ['B2B SaaS / tech', 'E-commerce', 'Agencja marketingowa', 'Usługi B2B', 'Retail / FMCG', 'Edukacja / NGO / publiczne'],
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
      {
        id: 'channels', type: 'multi', required: true,
        label: 'Kanały, którymi realnie zarządzasz',
        options: ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'TikTok / YouTube', 'SEO / content', 'E-mail / marketing automation', 'Offline / PR', 'Marketplace (Allegro, Amazon)'],
        allowOther: true,
      },
      {
        id: 'monthly_adspend', type: 'single', required: true,
        label: 'Miesięczny budżet mediowy, którym zarządzasz',
        options: ['Brak / poniżej 5 tys. PLN', '5-20 tys. PLN', '20-100 tys. PLN', '100-500 tys. PLN', 'Powyżej 500 tys. PLN', 'Nie wiem / nie dotyczy'],
      },
      {
        id: 'tools_current', type: 'multi',
        label: 'Czego używasz dziś do analizy wyników marketingu?',
        options: ['Excel / Google Sheets', 'Looker Studio / Power BI', 'GA4', 'Panele reklamowe (Ads Manager)', 'Supermetrics / Funnel.io', 'Narzędzie AI (ChatGPT, Claude itp.)', 'Dedykowany system BI', 'Nic systematycznego'],
        allowOther: true,
      },
      {
        id: 'monthly_martech_spend', type: 'single',
        label: 'Ile Twoja firma płaci dziś miesięcznie za narzędzia marketingowe (SaaS)?',
        options: ['0 PLN', 'do 200 PLN', '200-1000 PLN', '1-5 tys. PLN', '5-20 tys. PLN', 'Powyżej 20 tys. PLN', 'Nie wiem'],
      },
      {
        id: 'pain_today', type: 'textarea', required: true,
        label: 'Co dziś zajmuje Ci najwięcej czasu przy raportowaniu i analizie wyników?',
        placeholder: 'Konkretnie - np. "składanie danych z 4 paneli do jednego arkusza, 3h co poniedziałek"',
        minLength: 20,
      },
    ],
  },

  /* ------------------------------------------------------- 2. PIERWSZE WRAŻENIE */
  {
    id: 's_first',
    title: 'Pierwsze wrażenie',
    subtitle: 'Otwórz aplikację w nowej karcie i poklikaj przez ok. 2 minuty. Potem wróć tutaj.',
    openDemo: true,
    questions: [
      {
        id: 'what_is_it', type: 'textarea', required: true,
        label: 'Własnymi słowami: co robi ta aplikacja i dla kogo jest?',
        hint: 'Nie sprawdzamy Cię - sprawdzamy, czy produkt sam się tłumaczy. Napisz szczerze, także jeśli nie wiesz.',
        placeholder: 'To jest narzędzie, które...',
        minLength: 15,
      },
      {
        id: 'value_clarity', type: 'scale', required: true,
        label: 'Jak szybko zrozumiałeś, po co jest ta aplikacja?',
        min: 1, max: 5,
        labels: ['Nadal nie wiem', 'Po długim szukaniu', 'Średnio', 'Dość szybko', 'Od razu, w kilka sekund'],
      },
      {
        id: 'first_impression_pos', type: 'textarea', required: true,
        label: 'Co Ci się najbardziej spodobało?',
        minLength: 10,
      },
      {
        id: 'first_impression_neg', type: 'textarea', required: true,
        label: 'Co Cię najbardziej zirytowało, zmyliło lub rozczarowało?',
        hint: 'Ta odpowiedź jest dla nas najcenniejsza. Nie oszczędzaj nas.',
        minLength: 10,
      },
      {
        id: 'trust_data', type: 'scale', required: true,
        label: 'Na ile ufasz liczbom i wnioskom, które pokazuje aplikacja?',
        min: 1, max: 5,
        labels: ['Wcale', 'Raczej nie', 'Trudno ocenić', 'Raczej tak', 'Całkowicie'],
      },
    ],
  },

  /* ------------------------------------------------------------- 3. ZADANIA */
  {
    id: 's_tasks',
    title: 'Konkretne zadania',
    subtitle: 'Teraz najważniejsza część. Wykonaj 3 zadania w aplikacji i powiedz, jak poszło. Nie poddawaj się zbyt szybko - ale jeśli się nie da, to też jest wynik.',
    openDemo: true,
    questions: 'GENERATED_TASKS',
  },

  /* ----------------------------------------------------- 4. WARTOŚĆ FUNKCJI */
  {
    id: 's_value',
    title: 'Wartość poszczególnych funkcji',
    questions: [
      {
        id: 'module_importance', type: 'matrix', required: true,
        label: 'Jak wartościowa byłaby dla Ciebie każda z tych funkcji w codziennej pracy?',
        rows: 'MODULES',
        cols: ['Bezwartościowa', 'Mało ważna', 'Przydatna', 'Bardzo ważna', 'Krytyczna'],
      },
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
        id: 'umux_capability', type: 'scale', required: true,
        label: 'Funkcje aplikacji odpowiadają moim potrzebom.',
        min: 1, max: 7, labels: ['Zdecydowanie nie', '', '', 'Neutralnie', '', '', 'Zdecydowanie tak'],
      },
      {
        id: 'umux_ease', type: 'scale', required: true,
        label: 'Aplikacja jest łatwa w obsłudze.',
        min: 1, max: 7, labels: ['Zdecydowanie nie', '', '', 'Neutralnie', '', '', 'Zdecydowanie tak'],
      },
    ],
  },

  /* ------------------------------------------------------------ 5. UŻYCIE */
  {
    id: 's_usage',
    title: 'Czy i jak byś tego używał',
    questions: [
      {
        id: 'usage_freq', type: 'single', required: true,
        label: 'Gdyby aplikacja była dziś gotowa i podłączona do Twoich danych, jak często byś jej używał?',
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
        id: 'usage_moment', type: 'textarea', required: true,
        label: 'W jakim konkretnym momencie pracy otworzyłbyś to narzędzie?',
        placeholder: 'np. "poniedziałkowy przegląd kampanii", "przed spotkaniem z klientem"',
        minLength: 15,
      },
      {
        id: 'replaces', type: 'single', required: true,
        label: 'Co by się stało z Twoimi obecnymi narzędziami?',
        options: [
          'Zastąpiłoby część z nich',
          'Byłoby dodatkiem, nic nie zastąpi',
          'Zastąpiłoby moją ręczną pracę w Excelu',
          'Nie widzę dla tego miejsca w moim procesie',
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
      {
        id: 'integrations_needed', type: 'multi',
        label: 'Bez których integracji nie ma to dla Ciebie sensu?',
        options: ['Google Ads', 'Meta Ads', 'GA4', 'LinkedIn Ads', 'Google Sheets / Excel', 'CRM (HubSpot, Salesforce, Pipedrive)', 'Shopify / WooCommerce / Baselinker', 'TikTok Ads', 'Marketing automation'],
        allowOther: true,
      },
      {
        id: 'time_saved', type: 'single', required: true,
        label: 'Ile godzin miesięcznie realnie zaoszczędziłoby Ci to narzędzie?',
        hint: 'Szacuj ostrożnie - to liczba, którą będziemy weryfikować.',
        options: ['0 godzin', '1-2 h', '3-5 h', '6-10 h', '11-20 h', 'Powyżej 20 h'],
      },
    ],
  },

  /* ------------------------------------------------------------- 6. CENA */
  {
    id: 's_price',
    title: 'Cena',
    subtitle: 'Odpowiadaj tak, jakbyś realnie miał wydać te pieniądze. Kwoty netto, za miesiąc, za jednego użytkownika.',
    questions: [
      {
        id: 'vw_too_cheap', type: 'money', required: true,
        label: 'Przy jakiej cenie miesięcznej uznałbyś, że to podejrzanie tanio i produkt jest pewnie słaby?',
      },
      {
        id: 'vw_bargain', type: 'money', required: true,
        label: 'Przy jakiej cenie to byłaby dla Ciebie okazja - dobry stosunek jakości do ceny?',
      },
      {
        id: 'vw_expensive', type: 'money', required: true,
        label: 'Przy jakiej cenie zaczyna być drogo, ale nadal rozważałbyś zakup?',
      },
      {
        id: 'vw_too_expensive', type: 'money', required: true,
        label: 'Przy jakiej cenie jest zdecydowanie za drogo i nie kupiłbyś w ogóle?',
      },
      {
        id: 'gg_intent', type: 'matrix', required: true,
        label: 'Czy kupiłbyś abonament przy tej cenie miesięcznej?',
        rows: 'PRICE_TIERS',
        cols: ['Nie', 'Może', 'Tak'],
      },
      {
        id: 'pricing_model', type: 'single', required: true,
        label: 'Jaki model rozliczeń byłby dla Ciebie najwygodniejszy?',
        options: [
          'Stała opłata za firmę (flat)',
          'Za użytkownika (per seat)',
          'Zależnie od budżetu mediowego',
          'Zależnie od liczby raportów / analiz',
          'Jednorazowo za projekt / audyt',
        ],
      },
      {
        id: 'budget_source', type: 'single',
        label: 'Z jakiego budżetu byłoby to finansowane?',
        options: ['Budżet narzędzi marketingowych', 'Budżet mediowy', 'Budżet IT', 'Nie mamy takiego budżetu', 'Nie wiem'],
      },
    ],
  },

  /* --------------------------------------------------- 7. DECYZJA I ZMIANY */
  {
    id: 's_decision',
    title: 'Ostatnie pytania - najważniejsze',
    questions: [
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
        id: 'nps', type: 'nps', required: true,
        label: 'Na ile prawdopodobne, że polecisz to narzędzie znajomemu marketerowi? (0-10)',
      },
      {
        id: 'nps_reason', type: 'textarea', required: true,
        label: 'Dlaczego taka ocena?',
        minLength: 10,
      },
      {
        id: 'change_1', type: 'text', required: true,
        label: 'Zmiana nr 1 - najważniejsza rzecz, którą powinniśmy zrobić',
        minLength: 5,
      },
      { id: 'change_2', type: 'text', label: 'Zmiana nr 2' },
      { id: 'change_3', type: 'text', label: 'Zmiana nr 3' },
      {
        id: 'who_needs_it', type: 'textarea', required: true,
        label: 'Kto Twoim zdaniem skorzysta z tego najbardziej?',
        placeholder: 'np. "agencje obsługujące 10+ klientów", "e-commerce bez analityka"',
        minLength: 10,
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
      {
        id: 'anything_else', type: 'textarea',
        label: 'Cokolwiek jeszcze chcesz nam powiedzieć',
      },
    ],
  },
];
