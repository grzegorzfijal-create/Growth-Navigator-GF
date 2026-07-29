/**
 * Zapis odpowiedzi z ankiety do Arkusza Google. Zero kosztów, 5 minut setupu.
 *
 * SETUP
 * 1. Utwórz nowy Arkusz Google.
 * 2. Rozszerzenia -> Apps Script. Wklej ten plik (zastąp domyślny kod).
 * 3. Wdróż -> Nowe wdrożenie -> typ "Aplikacja internetowa".
 *      Wykonaj jako: Ja
 *      Kto ma dostęp: Wszyscy   <-- konieczne, inaczej ankieta nie zapisze
 * 4. Skopiuj URL wdrożenia (https://script.google.com/macros/s/.../exec)
 *    i wklej go do assets/config.js jako SUBMIT.endpoint.
 * 5. Wyślij testową odpowiedź i sprawdź, czy wiersz pojawił się w arkuszu.
 *
 * Zakładka "raw" trzyma pełny JSON każdej odpowiedzi - to jest źródło prawdy
 * dla dashboardu (results.html). Zakładka "odpowiedzi" to spłaszczona tabela
 * do ręcznego przeglądania i filtrowania.
 */

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

    return json({ ok: true });
  } catch (err) {
    // logujemy błąd, ale nie gubimy danych respondenta
    try {
      var errSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('errors')
        || SpreadsheetApp.getActiveSpreadsheet().insertSheet('errors');
      errSheet.appendRow([new Date(), String(err), e && e.postData ? e.postData.contents : '']);
    } catch (ignored) {}
    return json({ ok: false, error: String(err) });
  }
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
