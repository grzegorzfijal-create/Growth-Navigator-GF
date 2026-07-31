/* =============================================================================
   Dashboard wyników. Liczy wszystko lokalnie (bez backendu) i renderuje raport.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (v, suffix = '') => (v == null ? '–' : v + suffix);
  /* "~" przy cenie oznacza przecięcie wyliczone w luce między grupami respondentów */
  const vwVal = (vw, key, v) => (v == null ? '–' : (vw.uncertain.includes(key) ? '~' : '') + v);

  /* --------------------------------------------------------------- parsowanie */
  function parseText(text) {
    const t = text.trim();
    if (!t) return [];
    try {
      const j = JSON.parse(t);
      return Array.isArray(j) ? j : [j];
    } catch (e) { /* może NDJSON */ }
    const out = [];
    t.split('\n').forEach((line) => {
      const s = line.trim().replace(/,$/, '');
      if (!s) return;
      try { out.push(JSON.parse(s)); } catch (e) { /* pomijamy śmieci */ }
    });
    if (!out.length) throw new Error('Nie udało się odczytać JSON-a.');
    return out;
  }

  function normalize(list) {
    return list
      .map((r) => {
        if (r && r.answers) return r;
        if (r && typeof r === 'object') return { answers: r };   // płaski obiekt też przyjmujemy
        return null;
      })
      .filter(Boolean);
  }

  /* ------------------------------------------------------------ małe komponenty */
  function kpi(label, val, note, tone) {
    return `<div class="kpi ${tone || ''}">
      <div class="kpi-label">${esc(label)}</div>
      <div class="kpi-val">${esc(val)}</div>
      <div class="kpi-note">${esc(note || '')}</div>
    </div>`;
  }

  function bars(items, opts) {
    const o = opts || {};
    const max = Math.max(1, ...items.map((i) => (o.valueKey ? i[o.valueKey] : i.n)));
    return '<div class="bars">' + items.map((i) => {
      const v = o.valueKey ? i[o.valueKey] : i.n;
      const w = Math.round((v / max) * 100);
      const right = o.render ? o.render(i) : `${i.share}% (${i.n})`;
      return `<div class="bar-row">
        <span>${esc(i.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${w}%"></span></span>
        <span class="bar-val">${esc(right)}</span>
      </div>`;
    }).join('') + '</div>';
  }

  function quotes(list, limit) {
    const rows = list.slice(0, limit || 100);
    if (!rows.length) return '<p class="muted">Brak odpowiedzi.</p>';
    return '<div class="quotes">' + rows.map((q) => `<div class="quote">
      <p>${esc(q.text)}</p>
      <p class="who">${esc(q.who)}${q.fit != null ? ` · fit ${q.fit}` : ''}${
        typeof q.nps === 'number' ? ` · NPS ${q.nps}` : ''}${
        q.outcome ? ` · ${esc(q.outcome)}` : ''}</p>
    </div>`).join('') + '</div>';
  }

  function table(head, rows) {
    return `<div class="table-scroll"><table class="data">
      <thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c, i) =>
        `<td class="${i ? 'num' : ''}">${c && c.html ? c.html : esc(c)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>`;
  }

  /* ------------------------------------------------------- wykres Van Westendorp */
  function vwChart(vw) {
    if (!vw || vw.insufficient) return '';
    const W = 720, H = 320, P = { t: 14, r: 14, b: 38, l: 42 };
    const prices = vw.curves.map((c) => c.price);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const x = (p) => P.l + ((p - minP) / Math.max(1, maxP - minP)) * (W - P.l - P.r);
    const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b);

    const series = [
      { key: 'tooCheap', color: '#7a869a', label: 'Za tanio' },
      { key: 'bargain', color: '#1c7c54', label: 'Okazja' },
      { key: 'expensive', color: '#d98324', label: 'Drogo' },
      { key: 'tooExpensive', color: '#c2334d', label: 'Za drogo' },
    ];

    const paths = series.map((s) =>
      `<path d="${vw.curves.map((c, i) => `${i ? 'L' : 'M'}${x(c.price).toFixed(1)},${y(c[s.key]).toFixed(1)}`).join(' ')}"
        fill="none" stroke="${s.color}" stroke-width="2"/>`).join('');

    /* Etykiety progów układamy rosnąco po cenie i schodkujemy w pionie,
       żeby nie zlewały się w jeden nieczytelny ciąg przy bliskich wartościach. */
    const marks = [['pmc', 'PMC'], ['opp', 'OPP'], ['ipp', 'IPP'], ['pme', 'PME']]
      .filter(([k]) => vw[k] != null)
      .sort((a, b) => vw[a[0]] - vw[b[0]])
      .map(([k, lab], i) => {
        const px = x(vw[k]);
        const ty = P.t + 11 + (i % 2) * 13;                 // co druga etykieta niżej
        const anchor = px > W - 60 ? 'end' : (px < 60 ? 'start' : 'middle');
        return `<g>
        <line x1="${px.toFixed(1)}" y1="${P.t}" x2="${px.toFixed(1)}" y2="${H - P.b}"
          stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity=".45"/>
        <text x="${px.toFixed(1)}" y="${ty}" font-size="10" text-anchor="${anchor}"
          fill="currentColor" opacity=".75">${lab} ${vw.uncertain.includes(k) ? '~' : ''}${vw[k]}</text></g>`;
      }).join('');

    const yTicks = [0, 25, 50, 75, 100].map((v) => `
      <line x1="${P.l}" y1="${y(v)}" x2="${W - P.r}" y2="${y(v)}" stroke="currentColor" opacity=".12"/>
      <text x="${P.l - 7}" y="${y(v) + 3.5}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${v}%</text>`).join('');

    const step = Math.max(1, Math.floor(vw.curves.length / 6));
    const xTicks = vw.curves.filter((_, i) => i % step === 0).map((c) => `
      <text x="${x(c.price).toFixed(1)}" y="${H - P.b + 16}" font-size="10" text-anchor="middle"
        fill="currentColor" opacity=".6">${c.price}</text>`).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Krzywe Van Westendorp">
        ${yTicks}${xTicks}${marks}${paths}
        <text x="${W / 2}" y="${H - 4}" font-size="10" text-anchor="middle" fill="currentColor" opacity=".6">
          Cena (${esc(PRODUCT.currency)} / mies.)</text>
      </svg>
      <div class="legend">${series.map((s) =>
        `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div>`;
  }

  /* ---------------------------------------------------------- wykres popytu (GG) */
  function ggChart(gg) {
    if (!gg) return '';
    const W = 720, H = 260, P = { t: 14, r: 44, b: 38, l: 42 };
    const pts = gg.points;
    const maxRev = Math.max(1, ...pts.map((p) => p.revenueIndex));
    const bw = (W - P.l - P.r) / pts.length;
    const yD = (v) => P.t + (1 - v / 100) * (H - P.t - P.b);
    const yR = (v) => P.t + (1 - v / maxRev) * (H - P.t - P.b);

    const barsSvg = pts.map((p, i) => {
      const h = (H - P.t - P.b) * (p.adjustedDemand / 100);
      return `<rect x="${(P.l + i * bw + bw * 0.22).toFixed(1)}" y="${(H - P.b - h).toFixed(1)}"
        width="${(bw * 0.56).toFixed(1)}" height="${h.toFixed(1)}" fill="#2f5fe0" opacity=".8" rx="3"/>
      <text x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${H - P.b + 16}" font-size="10"
        text-anchor="middle" fill="currentColor" opacity=".7">${p.price}</text>
      <text x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${(H - P.b - h - 5).toFixed(1)}" font-size="10"
        text-anchor="middle" fill="currentColor" opacity=".8">${p.adjustedDemand}%</text>`;
    }).join('');

    const revPath = `<path d="${pts.map((p, i) =>
      `${i ? 'L' : 'M'}${(P.l + i * bw + bw / 2).toFixed(1)},${yR(p.revenueIndex).toFixed(1)}`).join(' ')}"
      fill="none" stroke="#1c7c54" stroke-width="2"/>` + pts.map((p, i) =>
      `<circle cx="${(P.l + i * bw + bw / 2).toFixed(1)}" cy="${yR(p.revenueIndex).toFixed(1)}" r="3.5" fill="#1c7c54"/>`).join('');

    const yTicks = [0, 50, 100].map((v) => `
      <line x1="${P.l}" y1="${yD(v)}" x2="${W - P.r}" y2="${yD(v)}" stroke="currentColor" opacity=".12"/>
      <text x="${P.l - 7}" y="${yD(v) + 3.5}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${v}%</text>`).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Krzywa popytu i przychodu">
        ${yTicks}${barsSvg}${revPath}
      </svg>
      <div class="legend">
        <span><i style="background:#2f5fe0"></i>Popyt (skorygowany, „może" x ${gg.maybeWeight})</span>
        <span><i style="background:#1c7c54"></i>Względny przychód (cena x popyt)</span>
      </div>`;
  }

  /* -------------------------------------------------------------------- raport */
  function render(rows) {
    const tiers = PRODUCT.priceTiers;
    const mods = PRODUCT.modules;

    rows.forEach((r) => { r.__fit = M.fitScore(r, tiers, mods); r.__q = M.quality(r); });

    const n = rows.length;
    const trusted = rows.filter((r) => r.__q.trusted);
    const nps = M.nps(rows);
    const pmf = M.pmf(rows);
    const umux = M.umux(rows);
    const vw = M.vanWestendorp(rows);
    const gg = M.gaborGranger(rows, tiers);
    const taskStats = M.tasks(rows, PRODUCT.tasks);
    const modStats = M.moduleValue(rows, mods);
    const fits = M.nums(rows.map((r) => r.__fit));
    const fitMean = M.round(M.mean(fits), 0);
    const reportCounts = M.nums(rows.map((r) => M.get(r, 'reports_count')));

    const freq = M.distribution(rows, 'usage_freq', Object.keys(M.FREQ_SCORE));
    const wouldUseWeekly = freq.items
      .filter((i) => ['Codziennie', 'Kilka razy w tygodniu', 'Raz w tygodniu'].includes(i.label))
      .reduce((a, i) => a + i.n, 0);
    const pilots = rows.filter((r) => (M.get(r, 'pilot_interest') || '').startsWith('Tak')).length;
    const emails = rows.filter((r) => (M.get(r, 'email') || '').includes('@')).length;
    const medianMinutes = M.round((M.median(rows.map((r) => r.durationSeconds)) || 0) / 60, 1);

    const tone = (v, good, mid) => (v == null ? '' : v >= good ? 'good' : (v >= mid ? 'mid' : 'bad'));

    /* --- decyzja: jedno zdanie na górze --- */
    const verdictParts = [];
    if (pmf) verdictParts.push(`${pmf.veryDisappointed}% „bardzo rozczarowanych" (próg fitu: 40%)`);
    verdictParts.push(`${M.round(M.pct(wouldUseWeekly, n), 0)}% użyłoby min. raz w tygodniu`);
    if (vw && !vw.insufficient && vw.ipp != null) verdictParts.push(`cena obojętności ${vw.ipp} ${PRODUCT.currency}`);
    if (gg) verdictParts.push(`maks. przychód przy ${gg.revenueOptimalPrice} ${PRODUCT.currency}`);

    let html = `
    <section class="card">
      <h1>${esc(PRODUCT.name)} - wyniki ewaluacji</h1>
      <p class="lead">
        ${n} ${n === 1 ? 'odpowiedź' : 'odpowiedzi'} ·
        mediana czasu wypełniania ${medianMinutes} min ·
        ${trusted.length}/${n} bez flag jakości
      </p>
      <div class="panel"><strong>W jednym zdaniu:</strong> ${esc(verdictParts.join(' · '))}.</div>

      <div class="kpis">
        ${kpi('Product-Market Fit', pmf ? pmf.veryDisappointed + '%' : '–',
              pmf ? `„bardzo rozczarowany" · ${pmf.verdict}` : '', pmf ? tone(pmf.veryDisappointed, 40, 25) : '')}
        ${kpi('NPS', nps ? nps.score : '–',
              nps ? `${nps.promoters}% prom. / ${nps.detractors}% detr.` : '', nps ? tone(nps.score, 30, 0) : '')}
        ${kpi('Fit score (śr.)', fitMean == null ? '–' : fitMean,
              'złożony wskaźnik 0-100', tone(fitMean, 60, 40))}
        ${kpi('Użycie ≥ 1x/tydz.', M.round(M.pct(wouldUseWeekly, n), 0) + '%',
              `${wouldUseWeekly} z ${n} osób`, tone(M.pct(wouldUseWeekly, n), 50, 30))}
        ${kpi('UMUX-Lite (SUS)', umux ? umux.susEquivalent : '–',
              umux ? `benchmark 68 · łatwość ${umux.ease}/7` : '', umux ? tone(umux.susEquivalent, 68, 50) : '')}
        ${kpi('Chcą pilotażu', pilots, `${emails} zostawiło e-mail`, tone(M.pct(pilots, n), 40, 20))}
      </div>
      <p class="muted small">
        Fit score = PMF 25% + częstotliwość użycia 25% + gotowość cenowa 20% + NPS 15% + wartość funkcji 15%.
      </p>
    </section>

    <section class="card">
      <h2 class="subhead">Cena</h2>
      <p class="lead">Ile realnie są skłonni płacić - dwie niezależne metody.</p>
      ${vw && !vw.insufficient ? `
        <div class="kpis">
          ${kpi('Zakres akceptacji', vwVal(vw, 'pmc', vw.pmc) + '–' + vwVal(vw, 'pme', vw.pme),
                `${PRODUCT.currency} / mies. (PMC–PME)`)}
          ${kpi('Cena obojętności (IPP)', vwVal(vw, 'ipp', vw.ipp), 'tu „drogo" = „okazja"')}
          ${kpi('Cena optymalna (OPP)', vwVal(vw, 'opp', vw.opp), 'najmniej odrzuceń')}
          ${kpi('Mediana „okazji"', fmt(vw.medianBargain), `n=${vw.n}${vw.excluded ? `, odrzucono ${vw.excluded} niespójnych` : ''}`)}
        </div>
        ${vw.uncertain.length ? `<div class="panel panel-warn"><strong>Uwaga na
          ${esc(vw.uncertain.map((k) => k.toUpperCase()).join(', '))} (oznaczone ~):</strong>
          odpowiedzi cenowe rozjechały się na osobne grupy i to przecięcie wypada w przedziale,
          o którym nikt się nie wypowiedział. Potraktuj je jako sygnał, że masz dwa różne segmenty
          cenowe, a nie jako jedną cenę. Zajrzyj do podziału segmentów niżej.</div>` : ''}
        ${vwChart(vw)}
      ` : `<p class="muted">Za mało spójnych odpowiedzi cenowych do policzenia krzywych (n=${vw ? vw.n : 0}).</p>`}

      ${gg ? `
        <h3 style="margin-top:26px">Krzywa popytu i przychodu (Gabor-Granger)</h3>
        <p class="muted small">
          Maksimum przychodu przy <strong>${gg.revenueOptimalPrice} ${esc(PRODUCT.currency)}</strong> /mies.
          („może" liczone z wagą ${gg.maybeWeight}, bo deklaracje zawsze są zawyżone.)
        </p>
        ${ggChart(gg)}
        ${table(['Cena', 'Tak', 'Tak + może', 'Popyt skoryg.', 'Indeks przychodu'],
          gg.points.map((p) => [`${p.price} ${PRODUCT.currency}`, p.yes + '%', p.yesOrMaybe + '%',
            p.adjustedDemand + '%', p.revenueIndex]))}
      ` : ''}

      <h3 style="margin-top:26px">Model rozliczeń i budżet</h3>
      ${bars(M.distribution(rows, 'pricing_model').items)}
      ${bars(M.distribution(rows, 'budget_source').items)}
      <p class="muted small">Obecne wydatki na martech:</p>
      ${bars(M.distribution(rows, 'monthly_martech_spend').items)}
    </section>

    <section class="card">
      <h2 class="subhead">Czy to działa w praktyce - zadania</h2>
      <p class="lead">Deklaracje są tanie. To są wyniki realnych prób wykonania zadań w aplikacji.</p>
      ${table(['Zadanie', 'Sukces', 'Sukces (też „za długo")', 'Porażka', 'Łatwość (SEQ 1-7)'],
        taskStats.map((t) => [t.title, t.successRate + '%', t.successOrSlow + '%',
          t.failRate + '%', `${fmt(t.seqMean)} / 7`]))}
      <p class="muted small">
        Benchmark SEQ dla dobrze zaprojektowanych zadań to ok. 5,5. Wynik poniżej 5 = problem z UX,
        nie z użytkownikiem.
      </p>
      ${taskStats.map((t) => `
        <h3 style="margin-top:22px">${esc(t.title)}</h3>
        ${bars(t.outcomes)}
        ${t.frictions.length ? `<p class="muted small" style="margin-top:12px">Gdzie się zacinali:</p>
          ${quotes(t.frictions, 12)}` : ''}
      `).join('')}
    </section>

    <section class="card">
      <h2 class="subhead">Które funkcje mają wartość</h2>
      <p class="lead">
        Kolumna „zapłaciłbym" jest jedyną, która naprawdę się liczy - reszta to sympatia.
      </p>
      ${table(['Funkcja', 'Zapłaciłbym', 'Ważna/krytyczna', 'Bez wartości', 'Śr. ocena (0-4)'],
        modStats.map((m) => [m.label, m.payShare + '%', m.criticalShare + '%',
          m.deadShare + '%', fmt(m.meanScore)]))}
      ${bars(modStats.map((m) => ({ label: m.label, n: m.payShare, share: m.payShare })),
        { render: (i) => i.n + '%' })}

      <h3 style="margin-top:26px">Czego brakuje</h3>
      ${quotes(M.openText(rows, 'missing_features'), 30)}
    </section>

    <section class="card">
      <h2 class="subhead">Skala problemu</h2>
      <p class="lead">Ile raportów mają na głowie i czy nadążają z ich analizą.</p>
      <div class="kpis">
        ${kpi('Raportów / źródeł (mediana)', fmt(M.round(M.median(reportCounts), 0)),
          reportCounts.length
            ? `min ${Math.min(...reportCounts)}, maks. ${Math.max(...reportCounts)}`
            : 'brak odpowiedzi')}
        ${kpi('Nie nadążają z analizą', M.round(M.pct(rows.filter((r) => {
            const a = M.get(r, 'analysis_capability') || '';
            return a.startsWith('Nie jestem w stanie') || a.startsWith('Analizuję tylko część');
          }).length, n), 0) + '%', 'nie analizują wszystkich ważnych raportów')}
      </div>
      <h3 style="margin-top:22px">Możliwości analizy raportów</h3>
      ${bars(M.distribution(rows, 'analysis_capability').items)}
      <h3 style="margin-top:22px">Liczba raportów / źródeł danych</h3>
      ${bars(M.distribution(rows, 'reports_count').items)}
    </section>

    <section class="card">
      <h2 class="subhead">Użycie i blokery wdrożenia</h2>
      <h3>Jak często by używali</h3>
      ${bars(freq.items)}
      <h3 style="margin-top:22px">Co zablokuje wdrożenie</h3>
      ${bars(M.distribution(rows, 'blockers').items)}
      <h3 style="margin-top:22px">Wymagane integracje</h3>
      ${bars(M.distribution(rows, 'integrations_needed').items)}
      <h3 style="margin-top:22px">Miejsce w procesie / co zastąpi</h3>
      ${bars(M.distribution(rows, 'replaces').items)}
      ${bars(M.distribution(rows, 'time_saved').items)}
      <h3 style="margin-top:22px">Kiedy by to otworzyli</h3>
      ${quotes(M.openText(rows, 'usage_moment'), 20)}
    </section>

    <section class="card">
      <h2 class="subhead">Kto tego chce najbardziej</h2>
      <p class="lead">Segmenty posortowane po fit score. Tu widać, do kogo iść pierwszy.</p>
      ${['role', 'segment', 'company_size', 'decision_power', 'monthly_adspend', 'analysis_capability'].map((qid) => {
        const label = { role: 'Rola', segment: 'Typ organizacji', company_size: 'Wielkość firmy',
          decision_power: 'Wpływ na zakup', monthly_adspend: 'Budżet mediowy',
          analysis_capability: 'Możliwości analizy raportów' }[qid];
        const segs = M.segments(rows, qid, tiers, mods);
        return `<h3 style="margin-top:22px">${label}</h3>
          ${table(['Segment', 'n', 'Fit score', '„Bardzo rozcz."', 'Mediana WTP'],
            segs.map((s) => [s.label, s.n, fmt(s.fit), fmt(s.veryDisappointed, '%'),
              fmt(s.wtpMedian, ' ' + PRODUCT.currency)]))}`;
      }).join('')}
    </section>

    <section class="card">
      <h2 class="subhead">Co zmienić - lista priorytetów</h2>
      <p class="lead">Zmiana nr 1 od każdego respondenta, od najlepiej dopasowanych osób w dół.</p>
      ${quotes(M.openText(rows, 'change_1'), 50)}
      <h3 style="margin-top:26px">Zmiany nr 2 i 3</h3>
      ${quotes(M.openText(rows, 'change_2').concat(M.openText(rows, 'change_3')), 40)}
    </section>

    <section class="card">
      <h2 class="subhead">Pierwsze wrażenie i komunikacja</h2>
      <div class="kpis">
        ${kpi('Zrozumienie wartości', fmt(M.round(M.mean(M.nums(rows.map((r) => M.get(r, 'value_clarity')))), 1)) + ' / 5',
          'jak szybko rozumieją, po co to jest')}
        ${kpi('Zaufanie do danych', fmt(M.round(M.mean(M.nums(rows.map((r) => M.get(r, 'trust_data')))), 1)) + ' / 5',
          'na ile wierzą liczbom w aplikacji')}
      </div>
      <h3 style="margin-top:22px">Jak sami opisują, czym to jest</h3>
      <p class="muted small">Jeśli te opisy się rozjeżdżają, problem jest w komunikacji, nie w produkcie.</p>
      ${quotes(M.openText(rows, 'what_is_it'), 30)}
      <h3 style="margin-top:26px">Co się podobało</h3>
      ${quotes(M.openText(rows, 'first_impression_pos'), 20)}
      <h3 style="margin-top:26px">Co irytowało</h3>
      ${quotes(M.openText(rows, 'first_impression_neg'), 30)}
      <h3 style="margin-top:26px">Ból dnia codziennego (przed demem)</h3>
      ${quotes(M.openText(rows, 'pain_today'), 20)}
      <h3 style="margin-top:26px">Kto skorzysta najbardziej (ich zdaniem)</h3>
      ${quotes(M.openText(rows, 'who_needs_it'), 20)}
      <h3 style="margin-top:26px">Uzasadnienia NPS</h3>
      ${quotes(M.openText(rows, 'nps_reason'), 30)}
      ${M.openText(rows, 'anything_else').length ? `<h3 style="margin-top:26px">Inne uwagi</h3>
        ${quotes(M.openText(rows, 'anything_else'), 20)}` : ''}
    </section>

    <section class="card">
      <h2 class="subhead">Respondenci</h2>
      ${table(['#', 'Kto', 'Fit', 'NPS', 'PMF', 'Częstotliwość', 'WTP (okazja)', 'Pilotaż', 'Czas', 'Flagi'],
        rows.map((r, i) => [
          i + 1, M.who(r), fmt(r.__fit), fmt(M.get(r, 'nps')),
          M.get(r, 'pmf') || '–', M.get(r, 'usage_freq') || '–',
          fmt(M.get(r, 'vw_bargain')), (M.get(r, 'pilot_interest') || '–').slice(0, 12),
          r.durationSeconds ? Math.round(r.durationSeconds / 60) + ' min' : '–',
          { html: r.__q.flags.length
            ? r.__q.flags.map((f) => `<span class="tag tag-bad">${esc(f)}</span>`).join('')
            : '<span class="tag tag-good">ok</span>' },
        ]))}
      <div class="nav-row">
        <button class="btn btn-sm" id="btnCsv" type="button">Eksport CSV (surowe dane)</button>
        <button class="btn btn-sm" id="btnPrint" type="button">Zapisz jako PDF / wydruk</button>
      </div>
    </section>`;

    $('report').innerHTML = html;
    $('report').hidden = false;
    $('loader').hidden = true;
    $('footNote').textContent = `${n} odpowiedzi · policzone lokalnie w przeglądarce`;

    $('btnPrint').addEventListener('click', () => window.print());
    $('btnCsv').addEventListener('click', () => exportCsv(rows));
  }

  /* ---------------------------------------------------------------- eksport CSV */
  function exportCsv(rows) {
    const keys = new Set(['__fit', 'durationSeconds', 'submittedAt', 'source']);
    rows.forEach((r) => Object.keys(r.answers || {}).forEach((k) => keys.add(k)));
    const cols = [...keys];
    const cell = (v) => {
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [cols.join(',')];
    rows.forEach((r) => {
      lines.push(cols.map((c) => cell(c in r ? r[c] : (r.answers || {})[c])).join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ewaluacja-${PRODUCT.name.toLowerCase()}-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* --------------------------------------------------------- dane przykładowe */
  function demoData() {
    const pick = (arr, i) => arr[i % arr.length];
    const roles = ['Marketing manager / head of marketing', 'Performance / paid media specialist',
      'Agencja - obsługa klientów', 'Marketing analyst / data', 'Właściciel firmy / CMO / zarząd'];
    const segs = ['B2B SaaS / tech', 'E-commerce', 'Agencja marketingowa', 'Usługi B2B'];
    const sizes = ['2-10', '11-50', '51-200', '201-1000'];
    const freqs = Object.keys(M.FREQ_SCORE);
    const pmfs = ['Bardzo rozczarowany', 'Trochę rozczarowany', 'Obojętnie - poradzę sobie bez niego',
      'Nie dotyczy, i tak nie zamierzam go używać'];

    return Array.from({ length: 14 }, (_, i) => {
      const strong = i % 3 !== 2;
      const base = strong ? 260 : 90;
      const answers = {
        role: pick(roles, i), segment: pick(segs, i), company_size: pick(sizes, i),
        decision_power: i % 2 ? 'Tak, decyduję samodzielnie' : 'Współdecyduję z zespołem',
        reports_count: strong ? 8 + (i % 5) * 4 : 3 + (i % 3),
        analysis_capability: strong
          ? 'Analizuję tylko część raportów ze względu na ograniczony czas.'
          : 'Regularnie i szczegółowo analizuję wszystkie ważne raporty.',
        channels: ['Google Ads', 'Meta Ads'], monthly_adspend: '20-100 tys. PLN',
        tools_current: ['Excel / Google Sheets', 'GA4'], monthly_martech_spend: '1-5 tys. PLN',
        pain_today: 'Składanie danych z paneli do arkusza zajmuje mi kilka godzin w każdy poniedziałek.',
        what_is_it: strong ? 'Narzędzie, które zbiera dane z kampanii i mówi, co poprawić.'
          : 'Szczerze? Nie do końca rozumiem, wygląda jak kolejny dashboard.',
        value_clarity: strong ? 4 : 2,
        first_impression_pos: 'Czysty interfejs, szybko widzę najważniejsze liczby.',
        first_impression_neg: strong ? 'Za mało kontekstu przy rekomendacjach - nie wiem, skąd wynikają.'
          : 'Nie wiem, czym to się różni od Looker Studio, które już mam.',
        trust_data: strong ? 4 : 2,
        t1_outcome: strong ? 'Wykonałem bez problemu' : 'Nie udało mi się - nie znalazłem tego',
        t1_seq: strong ? 6 : 3, t1_friction: strong ? '' : 'Filtry są schowane pod ikoną, której nie zauważyłem.',
        t2_outcome: strong ? 'Wykonałem, ale zajęło mi to za długo' : 'Wykonałem częściowo / nie jestem pewien wyniku',
        t2_seq: strong ? 5 : 3, t2_friction: 'Rekomendacja bez uzasadnienia, nie wdrożyłbym jej na ślepo.',
        t3_outcome: strong ? 'Wykonałem bez problemu' : 'Nie udało mi się - funkcja nie działała',
        t3_seq: strong ? 6 : 2, t3_friction: strong ? '' : 'Eksport nic nie zrobił po kliknięciu.',
        module_importance: PRODUCT.modules.reduce((acc, m, j) => {
          acc[m.id] = strong ? [4, 3, 3, 2, 4, 1, 3][j % 7] : [2, 1, 2, 1, 2, 0, 3][j % 7];
          return acc;
        }, {}),
        must_have_top3: PRODUCT.modules.slice(i % 3, (i % 3) + 2).map((m) => m.label),
        missing_features: 'Integracja z Google Ads i możliwość eksportu do prezentacji dla klienta.',
        umux_capability: strong ? 5 : 3, umux_ease: strong ? 6 : 4,
        usage_freq: strong ? pick(freqs, i) : 'Raz w miesiącu lub rzadziej',
        usage_moment: 'Poniedziałkowy przegląd kampanii i przed spotkaniem statusowym z klientem.',
        replaces: strong ? 'Zastąpiłoby moją ręczną pracę w Excelu' : 'Byłoby dodatkiem, nic nie zastąpi',
        blockers: strong ? ['Brak integracji z moimi źródłami danych']
          : ['Cena', 'Mamy już podobne narzędzie', 'Zbyt ogólne wnioski, nic nowego dla mnie'],
        integrations_needed: ['Google Ads', 'Meta Ads', 'GA4'],
        time_saved: strong ? '6-10 h' : '1-2 h',
        vw_too_cheap: base * 0.2, vw_bargain: base, vw_expensive: base * 2, vw_too_expensive: base * 3.5,
        gg_intent: PRODUCT.priceTiers.reduce((acc, p) => {
          acc[`p${p}`] = p <= base ? 2 : (p <= base * 2 ? 1 : 0);
          return acc;
        }, {}),
        pricing_model: i % 2 ? 'Stała opłata za firmę (flat)' : 'Za użytkownika (per seat)',
        budget_source: 'Budżet narzędzi marketingowych',
        pmf: strong ? pmfs[i % 2] : pmfs[2 + (i % 2)],
        nps: strong ? 8 + (i % 3) : 3 + (i % 3),
        nps_reason: strong ? 'Oszczędza czas na raportowaniu, ale musi mieć integracje.'
          : 'Na razie nie widzę przewagi nad tym, czego już używam.',
        change_1: strong ? 'Pokazujcie źródło i uzasadnienie każdej rekomendacji.'
          : 'Wyjaśnijcie na wejściu, czym to się różni od Looker Studio.',
        change_2: 'Eksport do PDF z logo klienta.',
        change_3: i % 2 ? 'Alerty, kiedy kampania spada poniżej progu.' : '',
        who_needs_it: 'Agencje obsługujące kilkunastu klientów i e-commerce bez własnego analityka.',
        pilot_interest: strong ? 'Tak, chętnie - odezwijcie się' : 'Nie, dziękuję',
        email: strong ? `marketer${i}@example.com` : '',
        anything_else: '',
      };
      return {
        schema: 'markiq-eval/1', product: PRODUCT.name,
        submittedAt: new Date(Date.now() - i * 36e5).toISOString(),
        durationSeconds: strong ? 620 + i * 20 : 200 + i * 5,
        source: i % 4 === 0 ? 'linkedin' : 'mail', answers,
      };
    });
  }

  /* ---------------------------------------------------------------------- init */
  function loadAndRender(list, label) {
    const rows = normalize(list);
    if (!rows.length) throw new Error('Nie znalazłem żadnych odpowiedzi w tych danych.');
    render(rows);
    if (label) $('footNote').textContent += ` · ${label}`;
  }

  function tryLoad(fn) {
    const err = $('loadErr');
    err.hidden = true;
    try { fn(); } catch (e) {
      err.textContent = e.message || String(e);
      err.hidden = false;
    }
  }

  const collected = [];

  function readFiles(files) {
    const pending = [...files].map((f) => f.text().then((t) => {
      parseText(t).forEach((x) => collected.push(x));
    }));
    Promise.all(pending)
      .then(() => tryLoad(() => loadAndRender(collected, `${files.length} plików`)))
      .catch((e) => { $('loadErr').textContent = 'Błąd czytania pliku: ' + e.message; $('loadErr').hidden = false; });
  }

  $('fileInput').addEventListener('change', (e) => readFiles(e.target.files));

  const drop = $('drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) readFiles(e.dataTransfer.files);
  });

  $('btnLoad').addEventListener('click', () => tryLoad(() => {
    const pasted = $('pasteBox').value.trim();
    const list = collected.slice();
    if (pasted) parseText(pasted).forEach((x) => list.push(x));
    loadAndRender(list);
  }));

  $('btnDemo').addEventListener('click', () => tryLoad(() => loadAndRender(demoData(), 'DANE PRZYKŁADOWE')));
})();
