/**
 * Odbiera odpowiedzi z ankiety: zapisuje je do Arkusza Google I wysyła
 * powiadomienie mailem. Zero kosztów, 5 minut setupu, brak limitów w praktyce.
 *
 * SETUP
 * 1. Utwórz nowy Arkusz Google.
 * 2. Rozszerzenia -> Apps Script. Wklej ten plik (zastąp domyślny kod).
 * 3. Ustaw NOTIFY_EMAIL poniżej na swój adres.
 * 4. Wdróż -> Nowe wdrożenie -> typ "Aplikacja internetowa".
 *      Wykonaj jako: Ja
 *      Kto ma dostęp: Wszyscy   <-- KONIECZNE. Przy innym ustawieniu ankieta
 *                                   dostanie błąd i pokaże ekran "nie udało się".
 * 5. Zatwierdź uprawnienia (do arkusza i do wysyłki maila) - Google zapyta raz.
 * 6. Skopiuj URL wdrożenia (https://script.google.com/macros/s/.../exec)
 *    i wklej go do assets/config.js jako SUBMIT.endpoint.
 * 7. Wypełnij ankietę testowo i sprawdź: wiersz w arkuszu + mail w skrzynce.
 *
 * UWAGA: po każdej zmianie tego kodu zrób Wdróż -> Zarządzaj wdrożeniami ->
 * edytuj -> Wersja: Nowa. Bez tego działa stara wersja.
 *
 * Zakładka "raw" trzyma pełny JSON każdej odpowiedzi - to jest źródło prawdy
 * dla dashboardu (results.html). Zakładka "odpowiedzi" to spłaszczona tabela
 * do ręcznego przeglądania i filtrowania.
 */

/** Adres, na który leci powiadomienie o nowej odpowiedzi. Pusty = bez maili. */
var NOTIFY_EMAIL = 'grzegorz.fijal@gmail.com';

/** true = do maila dołączany jest plik JSON z odpowiedzią (wsad do dashboardu). */
var ATTACH_JSON = true;

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- 1. surowy JSON (źródło dla dashboardu) ---
    var raw = ss.getSheetByName('raw') || ss.insertSheet('raw');
    if (raw.getLastRow() === 0) raw.appendRow(['odebrano', 'json']);
    raw.appendRow([new Date(), JSON.stringify(payload)]);

    // --- 2. spłaszczona tabela ---
    var flat = flatten(payload);
    var sheet = ss.getSheetByName('odpowiedzi') || ss.insertSheet('odpowiedzi');

    var headers = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
      : [];

    // nowe klucze dopisujemy jako kolejne kolumny (schemat może się zmieniać)
    Object.keys(flat).forEach(function (k) {
      if (headers.indexOf(k) === -1) headers.push(k);
    });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);

    var row = headers.map(function (h) { return h in flat ? flat[h] : ''; });
    sheet.appendRow(row);

    // --- 3. powiadomienie mailem ---
    // Poza try/catch zapisu: nawet jeśli mail nie pójdzie, odpowiedź jest już w arkuszu.
    try {
      notify(payload, flat, raw.getLastRow() - 1);
    } catch (mailErr) {
      logError(mailErr, 'notify');
    }

    return json({ ok: true });
  } catch (err) {
    logError(err, e && e.postData ? e.postData.contents : '');
    return json({ ok: false, error: String(err) });
  }
}

/** Błędy lądują w zakładce "errors", żeby nie ginęły po cichu. */
function logError(err, context) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('errors') || ss.insertSheet('errors');
    sheet.appendRow([new Date(), String(err), context || '']);
  } catch (ignored) {}
}

/** Mail z podsumowaniem odpowiedzi + pełny JSON w załączniku. */
function notify(payload, flat, responseNumber) {
  if (!NOTIFY_EMAIL) return;
  var a = payload.answers || {};

  // Pola, które chce się zobaczyć od razu w telefonie, bez otwierania arkusza.
  var highlights = [
    ['Rola', a.role || a.role_other],
    ['Organizacja', a.segment || a.segment_other],
    ['Raportów / źródeł', a.reports_count],
    ['Możliwości analizy', a.analysis_capability],
    ['Zadanie', a.t1_outcome],
    ['Łatwość zadania (1-7)', a.t1_seq],
    ['Jak często by używał', a.usage_freq],
    ['PMF', a.pmf],
    ['Decyzyjność', a.decision_power],
    ['Pilotaż', a.pilot_interest],
    ['E-mail', a.email],
    ['Czas wypełniania', flat.durationMinutes ? flat.durationMinutes + ' min' : ''],
    ['Źródło linku', payload.source]
  ];

  var open = [
    ['Czym to jest wg respondenta', a.what_is_it],
    ['Co zirytowało', a.first_impression_neg],
    ['Gdzie się zaciął', a.t1_friction],
    ['Czego brakuje', a.missing_features],
    ['Najważniejsza zmiana', a.change_1]
  ];

  var lines = [];
  lines.push('Odpowiedź nr ' + responseNumber + ' w ankiecie ' + (payload.product || ''));
  lines.push('');
  highlights.forEach(function (h) {
    if (h[1] !== undefined && h[1] !== null && h[1] !== '') lines.push(h[0] + ': ' + h[1]);
  });
  if (a.must_have_top3 && a.must_have_top3.length) {
    lines.push('Zapłaciłby za: ' + a.must_have_top3.join(' | '));
  }
  if (a.gg_intent) {
    var yes = Object.keys(a.gg_intent)
      .filter(function (k) { return a.gg_intent[k] === 2; })
      .map(function (k) { return k.replace('p', ''); });
    lines.push('Powiedział "tak" na cenach: ' + (yes.length ? yes.join(', ') : 'żadnej'));
  }
  if (a.blockers && a.blockers.length) lines.push('Blokery: ' + a.blockers.join(' | '));

  lines.push('');
  lines.push('--- odpowiedzi otwarte ---');
  open.forEach(function (o) {
    if (o[1]) { lines.push(''); lines.push(o[0] + ':'); lines.push(o[1]); }
  });

  lines.push('');
  lines.push('Pełne dane: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  lines.push('Załączony plik .json wrzuć do results.html, żeby policzyć wskaźniki.');

  var options = {
    name: 'Ankieta ' + (payload.product || 'ewaluacja')
  };
  if (ATTACH_JSON) {
    options.attachments = [Utilities.newBlob(
      JSON.stringify(payload, null, 2),
      'application/json',
      'odpowiedz-' + responseNumber + '.json'
    )];
  }
  // Jeśli respondent zostawił maila, można mu odpowiedzieć jednym kliknięciem.
  if (a.email && /\S+@\S+\.\S+/.test(a.email)) options.replyTo = a.email;

  MailApp.sendEmail(
    NOTIFY_EMAIL,
    'Nowa odpowiedź #' + responseNumber + ' - ' + (a.role || 'ankieta ' + (payload.product || '')),
    lines.join('\n'),
    options
  );
}

function doGet() {
  return json({ ok: true, info: 'Endpoint ewaluacji dziala. Wysylaj POST z JSON-em.' });
}

/** Spłaszcza payload do jednego wiersza: tablice -> "a | b", obiekty -> klucz.pod. */
function flatten(payload) {
  var out = {
    submittedAt: payload.submittedAt || '',
    durationMinutes: payload.durationSeconds ? Math.round(payload.durationSeconds / 60 * 10) / 10 : '',
    source: payload.source || ''
  };
  var answers = payload.answers || {};
  Object.keys(answers).forEach(function (k) {
    var v = answers[k];
    if (Array.isArray(v)) out[k] = v.join(' | ');
    else if (v !== null && typeof v === 'object') {
      Object.keys(v).forEach(function (sub) { out[k + '.' + sub] = v[sub]; });
    } else out[k] = v === null ? '' : v;
  });
  return out;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
