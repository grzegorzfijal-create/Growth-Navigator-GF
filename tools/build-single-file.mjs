/* =============================================================================
   Skleja ankietę i dashboard w jeden samodzielny plik HTML (dist/ewaluacja.html).
   Wszystko inline: bez CDN, bez osobnych assetów - plik działa z dysku, z maila,
   z dowolnego hostingu statycznego i wewnątrz Artifactu na claude.ai.

   Uruchom: npm run build
   Źródłem prawdy pozostają index.html / results.html / assets/* - ten skrypt
   tylko je składa, więc nie ma tu skopiowanego kodu, który mógłby się rozjechać.
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/** Wyciąga element wraz z zawartością, licząc zagnieżdżenia tego samego tagu.
    `marker` (opcjonalny) zawęża wybór do otwierającego tagu z danym tekstem,
    np. konkretnym id - dzięki temu nie trafiamy w pierwszy przypadkowy <div>. */
function extract(html, tag, file, marker) {
  const open = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g');
  let start = -1;
  for (let m; (m = open.exec(html));) {
    if (!marker || m[0].includes(marker)) { start = m.index; break; }
  }
  if (start < 0) {
    throw new Error(`Nie znalazłem <${tag}${marker ? ' ' + marker : ''}> w ${file}`
      + ' - zmieniła się struktura pliku?');
  }
  const token = new RegExp(`<${tag}(\\s[^>]*)?>|</${tag}>`, 'g');
  token.lastIndex = start;
  let depth = 0;
  for (let m; (m = token.exec(html));) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  throw new Error(`Niedomknięty <${tag}> w ${file}.`);
}

const survey = read('index.html');
const results = read('results.html');

const progressTrack = extract(survey, 'div', 'index.html', 'id="progressTrack"');
const surveyMain = extract(survey, 'main', 'index.html');
const surveyFooter = extract(survey, 'footer', 'index.html');
const resultsMain = extract(results, 'main', 'results.html');
const resultsFooter = extract(results, 'footer', 'results.html');

/* Sanity check: jeśli któryś fragment zgubi swoje kluczowe id, silniki nie ruszą. */
[[progressTrack, 'progressBar'], [surveyMain, 'qForm'], [surveyMain, 'screenDone'],
 [resultsMain, 'pasteBox'], [resultsMain, 'report'], [surveyFooter, 'footContact'],
 [resultsFooter, 'footNote']].forEach(([frag, id]) => {
  if (!frag.includes(id)) throw new Error(`Wycięty fragment nie zawiera "${id}" - popraw ekstrakcję.`);
});

const css = read('assets/styles.css');
const js = ['assets/config.js', 'assets/metrics.js', 'assets/survey.js', 'assets/results.js']
  .map((p) => `/* ===== ${p} ===== */\n${read(p)}`)
  .join('\n');

/* Nawigacja między dwoma widokami po hashu. Domyślnie ankieta - marketer
   dostaje link bez hasha i nigdy nie trafi przypadkiem na wyniki. */
const router = `
/* ===== przełączanie widoków (jeden plik = dwie strony) ===== */
(function () {
  var views = { survey: document.getElementById('viewSurvey'), results: document.getElementById('viewResults') };
  var tabs = document.querySelectorAll('[data-view]');
  function route() {
    var showResults = location.hash === '#wyniki';
    views.survey.hidden = showResults;
    views.results.hidden = !showResults;
    tabs.forEach(function (t) {
      var active = (t.dataset.view === 'results') === showResults;
      t.setAttribute('aria-current', active ? 'page' : 'false');
    });
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);
  route();
})();`;

/* Charset musi być zadeklarowany w pliku i w pierwszym kilobajcie: bez tego
   przeglądarka otwierająca plik z dysku (file://, bez nagłówka HTTP) czyta
   UTF-8 jako latin-1 i polskie znaki się rozsypują. */
const html = `<meta charset="utf-8">
<title>Ewaluacja MarkIQ - ankieta dla marketerów</title>
<style>
${css}
/* --- dodatki tylko dla wersji jednoplikowej --- */
.viewtabs { display: flex; gap: 4px; align-items: center; }
.viewtabs a {
  font-size: .82rem; font-weight: 600; text-decoration: none;
  color: var(--ink-soft); padding: 5px 11px; border-radius: 7px;
}
.viewtabs a:hover { background: var(--accent-soft); color: var(--accent); }
.viewtabs a[aria-current="page"] { background: var(--accent-soft); color: var(--accent); }
</style>

<header class="topbar">
  <div class="wrap wrap-wide topbar-inner">
    <span class="brand" id="brandName">Ewaluacja</span>
    <nav class="viewtabs">
      <a href="#ankieta" data-view="survey">Ankieta</a>
      <a href="#wyniki" data-view="results">Wyniki</a>
      <span class="topbar-meta" id="topMeta"></span>
    </nav>
  </div>
</header>

<div id="viewSurvey">
  ${progressTrack}
  ${surveyMain}
  ${surveyFooter}
</div>

<div id="viewResults" hidden>
  ${resultsMain}
  ${resultsFooter}
</div>

<script>
${js}
${router}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist/ewaluacja.html');
writeFileSync(out, html);
console.log(`dist/ewaluacja.html - ${(html.length / 1024).toFixed(0)} kB, bez zewnętrznych zależności`);
