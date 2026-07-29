/* =============================================================================
   Silnik ankiety - renderuje SECTIONS z config.js, waliduje, zapisuje, wysyła.
   Bez zależności zewnętrznych.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'markiq_eval_v1';
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ stan */
  const state = {
    answers: {},          // id -> wartość
    sectionIdx: 0,
    startedAt: null,
    sectionTimes: {},     // id sekcji -> sekundy
    _sectionEnteredAt: null,
    source: new URLSearchParams(location.search).get('r') || 'direct',
  };

  /* ------------------------------------- rozwinięcie placeholderów z configu */
  function buildTaskQuestions() {
    const qs = [];
    PRODUCT.tasks.forEach((t, i) => {
      qs.push({ type: 'info', id: `${t.id}_info`, title: t.title, body: t.instruction });
      qs.push({
        id: `${t.id}_outcome`, type: 'single', required: true,
        label: 'Jak poszło?',
        options: [
          'Wykonałem bez problemu',
          'Wykonałem, ale zajęło mi to za długo',
          'Wykonałem częściowo / nie jestem pewien wyniku',
          'Nie udało mi się - nie znalazłem tego',
          'Nie udało mi się - funkcja nie działała',
        ],
      });
      qs.push({
        id: `${t.id}_seq`, type: 'scale', required: true,
        label: 'Jak łatwe było to zadanie?',
        min: 1, max: 7,
        labels: ['Bardzo trudne', '', '', 'Średnio', '', '', 'Bardzo łatwe'],
      });
      qs.push({
        id: `${t.id}_friction`, type: 'text',
        label: 'Gdzie się zaciąłeś? (jeśli nigdzie - zostaw puste)',
        placeholder: 'np. "nie wiedziałem, że trzeba kliknąć w wiersz tabeli"',
      });
      if (i < PRODUCT.tasks.length - 1) qs.push({ type: 'divider', id: `${t.id}_div` });
    });
    return qs;
  }

  const moduleLabels = () => PRODUCT.modules.map((m) => m.label);
  const priceTierRows = () =>
    PRODUCT.priceTiers.map((p) => ({ id: `p${p}`, label: `${p} ${PRODUCT.currency} / mies.` }));

  function resolveSections() {
    return SECTIONS.map((sec) => {
      const out = Object.assign({}, sec);
      out.questions = sec.questions === 'GENERATED_TASKS' ? buildTaskQuestions() : sec.questions.slice();
      out.questions = out.questions.map((q) => {
        const r = Object.assign({}, q);
        if (r.rows === 'MODULES') r.rows = PRODUCT.modules;
        if (r.rows === 'PRICE_TIERS') r.rows = priceTierRows();
        if (r.options === 'MODULE_LABELS') r.options = moduleLabels();
        return r;
      });
      return out;
    });
  }

  const sections = resolveSections();
  const isInput = (q) => q.type !== 'info' && q.type !== 'divider';

  /* -------------------------------------------------------------- localStorage */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers: state.answers,
        sectionIdx: state.sectionIdx,
        startedAt: state.startedAt,
        sectionTimes: state.sectionTimes,
        source: state.source,
      }));
    } catch (e) { /* tryb prywatny - ignorujemy */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------------ render */
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  function questionShell(q) {
    const wrap = el('div', { class: 'q', 'data-qid': q.id });
    const label = el('label', { class: 'q-label' }, [document.createTextNode(q.label)]);
    if (q.required) label.appendChild(el('span', { class: 'q-req', text: '*' }));
    wrap.appendChild(label);
    if (q.hint) wrap.appendChild(el('p', { class: 'q-hint', text: q.hint }));
    return wrap;
  }

  function renderQuestion(q) {
    /* --- bloki nieinteraktywne --- */
    if (q.type === 'divider') return el('hr', { class: 'q' });
    if (q.type === 'info') {
      return el('div', { class: 'panel' }, [
        el('h3', { text: q.title }),
        el('p', { class: 'muted', text: q.body }),
      ]);
    }

    const wrap = questionShell(q);
    const val = state.answers[q.id];

    /* --- jednokrotny / wielokrotny wybór --- */
    if (q.type === 'single' || q.type === 'multi') {
      const multi = q.type === 'multi';
      const opts = el('div', { class: 'opts' });
      const chosen = multi ? (Array.isArray(val) ? val.slice() : []) : val;

      q.options.forEach((opt) => {
        const isSel = multi ? chosen.includes(opt) : chosen === opt;
        const input = el('input', {
          type: multi ? 'checkbox' : 'radio',
          name: q.id, value: opt, checked: isSel,
        });
        const row = el('label', { class: 'check' + (isSel ? ' sel' : '') }, [
          input, el('span', { text: opt }),
        ]);
        input.addEventListener('change', () => {
          if (multi) {
            const cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            const at = cur.indexOf(opt);
            if (input.checked && at < 0) cur.push(opt);
            if (!input.checked && at >= 0) cur.splice(at, 1);
            if (q.max && cur.length > q.max) {   // limit wyborów
              input.checked = false;
              return;
            }
            state.answers[q.id] = cur;
          } else {
            state.answers[q.id] = opt;
          }
          save();
          syncOptStyles(wrap, q);
          clearErr(wrap);
        });
        opts.appendChild(row);
      });

      if (q.allowOther) {
        const otherId = q.id + '_other';
        const inp = el('input', {
          type: 'text', class: 'other-input', placeholder: 'Inne - dopisz swoje',
          value: state.answers[otherId] || '',
        });
        inp.addEventListener('input', () => {
          state.answers[otherId] = inp.value.trim();
          save(); clearErr(wrap);
        });
        opts.appendChild(inp);
      }

      wrap.appendChild(opts);
      if (q.max) wrap.appendChild(el('p', { class: 'counter', text: `Maksymalnie ${q.max} odpowiedzi.` }));
      syncOptStyles(wrap, q);
      return wrap;
    }

    /* --- skala punktowa --- */
    if (q.type === 'scale' || q.type === 'nps') {
      const min = q.type === 'nps' ? 0 : q.min;
      const max = q.type === 'nps' ? 10 : q.max;
      const box = el('div', { class: 'scale' });
      const btns = el('div', { class: 'scale-btns' });
      for (let i = min; i <= max; i++) {
        const b = el('button', {
          type: 'button', class: 'scale-btn' + (val === i ? ' sel' : ''), text: String(i),
        });
        b.addEventListener('click', () => {
          state.answers[q.id] = i;
          save();
          btns.querySelectorAll('.scale-btn').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          clearErr(wrap);
        });
        btns.appendChild(b);
      }
      box.appendChild(btns);
      if (q.type === 'nps') {
        box.appendChild(el('div', { class: 'nps-legend' }, [
          el('span', { text: '0 - w żadnym wypadku' }),
          el('span', { text: '10 - na pewno polecę' }),
        ]));
      } else if (q.labels) {
        box.appendChild(el('div', { class: 'scale-ends' }, [
          el('span', { text: q.labels[0] || '' }),
          el('span', { text: q.labels[q.labels.length - 1] || '' }),
        ]));
      }
      wrap.appendChild(box);
      return wrap;
    }

    /* --- macierz (wiersze x kolumny, radio) --- */
    if (q.type === 'matrix') {
      const cur = (val && typeof val === 'object') ? val : {};
      const thead = el('thead', null, [
        el('tr', null, [el('th', { text: '' })].concat(
          q.cols.map((c) => el('th', { text: c }))
        )),
      ]);
      const tbody = el('tbody');
      q.rows.forEach((row) => {
        const tr = el('tr', null, [el('th', { text: row.label })]);
        q.cols.forEach((col, ci) => {
          const input = el('input', {
            type: 'radio', name: `${q.id}__${row.id}`,
            checked: cur[row.id] === ci,
            'aria-label': `${row.label}: ${col}`,
          });
          input.addEventListener('change', () => {
            const obj = Object.assign({}, state.answers[q.id] || {});
            obj[row.id] = ci;
            state.answers[q.id] = obj;
            save(); clearErr(wrap);
          });
          tr.appendChild(el('td', null, [input]));
        });
        tbody.appendChild(tr);
      });
      wrap.appendChild(el('div', { class: 'matrix-scroll' }, [
        el('table', { class: 'matrix' }, [thead, tbody]),
      ]));
      return wrap;
    }

    /* --- kwota --- */
    if (q.type === 'money') {
      const inp = el('input', {
        type: 'number', min: '0', step: '10', inputmode: 'numeric',
        placeholder: '0', value: (val ?? ''),
      });
      inp.addEventListener('input', () => {
        state.answers[q.id] = inp.value === '' ? null : Number(inp.value);
        save(); clearErr(wrap);
      });
      wrap.appendChild(el('div', { class: 'money-row' }, [
        inp, el('span', { class: 'money-suffix', text: `${PRODUCT.currency} / mies.` }),
      ]));
      return wrap;
    }

    /* --- tekst / email --- */
    const long = q.type === 'textarea';
    const field = el(long ? 'textarea' : 'input', {
      type: q.type === 'email' ? 'email' : 'text',
      placeholder: q.placeholder || '',
    });
    field.value = val || '';
    const counter = q.minLength ? el('p', { class: 'counter' }) : null;
    const updCounter = () => {
      if (!counter) return;
      const n = field.value.trim().length;
      counter.textContent = n >= q.minLength ? '' : `Jeszcze ${q.minLength - n} znaków`;
    };
    field.addEventListener('input', () => {
      state.answers[q.id] = field.value;
      save(); updCounter(); clearErr(wrap);
    });
    wrap.appendChild(field);
    if (counter) { wrap.appendChild(counter); updCounter(); }
    return wrap;
  }

  function syncOptStyles(wrap, q) {
    const rows = wrap.querySelectorAll('.check');
    const cur = state.answers[q.id];
    const chosen = Array.isArray(cur) ? cur : (cur == null ? [] : [cur]);
    const atMax = q.max && chosen.length >= q.max;
    rows.forEach((row) => {
      const input = row.querySelector('input');
      const sel = input.checked;
      row.classList.toggle('sel', sel);
      const block = Boolean(atMax) && !sel && q.type === 'multi';
      row.classList.toggle('disabled', block);
      input.disabled = block;
    });
  }

  function clearErr(wrap) {
    wrap.classList.remove('has-err');
    const e = wrap.querySelector('.q-err');
    if (e) e.remove();
    $('errSummary').hidden = true;
  }

  function setErr(wrap, msg) {
    wrap.classList.add('has-err');
    if (!wrap.querySelector('.q-err')) wrap.appendChild(el('p', { class: 'q-err', text: msg }));
  }

  /* -------------------------------------------------------------- walidacja */
  function validateQuestion(q) {
    const v = state.answers[q.id];
    const other = state.answers[q.id + '_other'];

    if (q.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) {
      return 'To nie wygląda na poprawny e-mail.';
    }
    if (q.type === 'matrix' && q.required) {
      const filled = v ? Object.keys(v).length : 0;
      if (filled < q.rows.length) return `Uzupełnij wszystkie wiersze (${filled}/${q.rows.length}).`;
    }
    if (!q.required) return null;

    switch (q.type) {
      case 'multi':
        if ((!Array.isArray(v) || !v.length) && !other) return 'Wybierz co najmniej jedną odpowiedź.';
        return null;
      case 'single':
        if (!v && !other) return 'Wybierz odpowiedź.';
        return null;
      case 'scale':
      case 'nps':
        if (typeof v !== 'number') return 'Wybierz ocenę na skali.';
        return null;
      case 'money':
        if (typeof v !== 'number' || Number.isNaN(v)) return 'Podaj kwotę (0 jeśli nie zapłaciłbyś nic).';
        return null;
      case 'matrix':
        return null;
      default: {
        const s = (v || '').trim();
        if (!s) return 'To pytanie jest wymagane.';
        if (q.minLength && s.length < q.minLength) return `Napisz trochę więcej - minimum ${q.minLength} znaków.`;
        return null;
      }
    }
  }

  function validateSection() {
    const sec = sections[state.sectionIdx];
    let firstBad = null;
    sec.questions.filter(isInput).forEach((q) => {
      const wrap = document.querySelector(`.q[data-qid="${q.id}"]`);
      if (!wrap) return;
      clearErr(wrap);
      const msg = validateQuestion(q);
      if (msg) {
        setErr(wrap, msg);
        if (!firstBad) firstBad = wrap;
      }
    });
    if (firstBad) {
      const sum = $('errSummary');
      sum.textContent = 'Kilka pytań wymaga uzupełnienia - zaznaczone na czerwono.';
      sum.hidden = false;
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  /* ----------------------------------------------------------- ekrany / nawigacja */
  function show(which) {
    ['screenIntro', 'screenSurvey', 'screenDone'].forEach((id) => { $(id).hidden = id !== which; });
    $('progressTrack').hidden = which !== 'screenSurvey';
  }

  function stampSectionTime() {
    if (state._sectionEnteredAt == null) return;
    const sec = sections[state.sectionIdx];
    const spent = Math.round((Date.now() - state._sectionEnteredAt) / 1000);
    state.sectionTimes[sec.id] = (state.sectionTimes[sec.id] || 0) + spent;
    state._sectionEnteredAt = Date.now();
  }

  function renderSection() {
    const sec = sections[state.sectionIdx];
    $('secCounter').textContent = `Sekcja ${state.sectionIdx + 1} z ${sections.length}`;
    $('secTitle').textContent = sec.title;
    $('secSubtitle').textContent = sec.subtitle || '';
    $('secSubtitle').hidden = !sec.subtitle;

    const link = $('secDemoLink');
    link.hidden = !sec.openDemo;
    link.href = PRODUCT.demoUrl;

    const form = $('qForm');
    form.innerHTML = '';
    sec.questions.forEach((q) => form.appendChild(renderQuestion(q)));

    $('btnBack').disabled = state.sectionIdx === 0;
    $('btnNext').textContent = state.sectionIdx === sections.length - 1 ? 'Wyślij odpowiedzi' : 'Dalej';
    $('progressBar').style.width = `${Math.round((state.sectionIdx / sections.length) * 100)}%`;
    $('errSummary').hidden = true;
    state._sectionEnteredAt = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goNext() {
    if (!validateSection()) return;
    stampSectionTime();
    if (state.sectionIdx === sections.length - 1) { submit(); return; }
    state.sectionIdx++;
    save();
    renderSection();
  }

  function goBack() {
    if (state.sectionIdx === 0) return;
    stampSectionTime();
    state.sectionIdx--;
    save();
    renderSection();
  }

  /* ------------------------------------------------------------------ wysyłka */
  function buildPayload() {
    return {
      schema: 'markiq-eval/1',
      product: PRODUCT.name,
      submittedAt: new Date().toISOString(),
      startedAt: state.startedAt,
      durationSeconds: state.startedAt
        ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000) : null,
      sectionTimes: state.sectionTimes,
      source: state.source,
      userAgent: navigator.userAgent,
      answers: state.answers,
    };
  }

  function fallbackDelivery(payload) {
    $('doneFallback').hidden = false;
    $('doneMsg').textContent =
      'Twoje odpowiedzi są gotowe. Zostaje jeszcze jeden krok - odeślij nam plik.';

    const json = JSON.stringify(payload, null, 2);
    $('btnDownload').addEventListener('click', () => {
      const blob = new Blob([json], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `ewaluacja-${PRODUCT.name.toLowerCase()}-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
    });
    $('btnMail').href = 'mailto:' + SUBMIT.contactEmail +
      '?subject=' + encodeURIComponent(`Ewaluacja ${PRODUCT.name} - odpowiedzi`) +
      '&body=' + encodeURIComponent('W załączniku plik z odpowiedziami (pobrany z ankiety).\n\n');
  }

  async function submit() {
    const payload = buildPayload();
    $('rawJson').textContent = JSON.stringify(payload, null, 2);
    show('screenDone');
    $('btnNext').disabled = true;

    if (!SUBMIT.endpoint) { fallbackDelivery(payload); return; }

    $('doneMsg').textContent = 'Zapisujemy odpowiedzi...';
    try {
      // text/plain omija preflight CORS - wymagane przez Google Apps Script
      const res = await fetch(SUBMIT.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      $('doneMsg').textContent =
        'Odpowiedzi zapisane. Twój feedback trafi wprost do listy zmian w produkcie - ' +
        'a jeśli zostawiłeś e-mail, wrócimy do Ciebie z tym, co z niego zrobiliśmy.';
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    } catch (e) {
      fallbackDelivery(payload);
    }
  }

  /* --------------------------------------------------------------------- init */
  function init() {
    $('brandName').textContent = `Ewaluacja: ${PRODUCT.name}`;
    $('topMeta').textContent = `ok. ${SUBMIT.estimatedMinutes} min`;
    $('introPitch').textContent = PRODUCT.pitch;
    $('introTime').textContent = `ok. ${SUBMIT.estimatedMinutes} minut`;
    $('footContact').textContent = `Pytania? ${SUBMIT.contactEmail}`;
    document.title = `Ewaluacja ${PRODUCT.name}`;

    const saved = load();
    if (saved && saved.answers && Object.keys(saved.answers).length) {
      state.answers = saved.answers;
      state.sectionIdx = Math.min(saved.sectionIdx || 0, sections.length - 1);
      state.startedAt = saved.startedAt;
      state.sectionTimes = saved.sectionTimes || {};
      state.source = saved.source || state.source;
      const note = $('resumeNote');
      note.hidden = false;
      note.textContent = `Mamy Twoje wcześniejsze odpowiedzi - wrócisz do sekcji ${state.sectionIdx + 1}.`;
      $('consent').checked = true;
      $('btnStart').disabled = false;
      $('btnStart').textContent = 'Wróć do ankiety';
    }

    $('consent').addEventListener('change', (e) => { $('btnStart').disabled = !e.target.checked; });
    $('btnStart').addEventListener('click', () => {
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      save();
      show('screenSurvey');
      renderSection();
    });
    $('btnNext').addEventListener('click', goNext);
    $('btnBack').addEventListener('click', goBack);
    window.addEventListener('beforeunload', () => { stampSectionTime(); save(); });
  }

  init();
})();
