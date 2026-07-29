/* =============================================================================
   Wskaźniki. Czyste funkcje: tablica odpowiedzi (payloadów) -> liczby.
   Metody: NPS, Sean Ellis PMF, UMUX-Lite, SEQ, Van Westendorp PSM,
   Gabor-Granger, task success rate.
   ========================================================================== */
const M = (function () {
  'use strict';

  const pct = (n, d) => (d ? (n / d) * 100 : 0);
  const round = (x, k = 0) => (x == null || Number.isNaN(x) ? null : Number(x.toFixed(k)));
  const nums = (arr) => arr.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  function median(arr) {
    const a = nums(arr).slice().sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  const A = (r, id) => (r && r.answers ? r.answers[id] : undefined);

  /* ---------------------------------------------------------- rozkład odpowiedzi */
  function distribution(rows, qid, order) {
    const counts = new Map();
    let total = 0;
    rows.forEach((r) => {
      const v = A(r, qid);
      const list = Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
      const other = A(r, qid + '_other');
      if (other) list.push('Inne: ' + other);
      if (list.length) total++;
      list.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1));
    });
    let items = [...counts.entries()].map(([label, n]) => ({
      label, n, share: round(pct(n, rows.length), 0),
    }));
    if (order) items.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
    else items.sort((a, b) => b.n - a.n);
    return { items, respondents: total, base: rows.length };
  }

  /* ------------------------------------------------------------------------ NPS */
  function nps(rows) {
    const v = nums(rows.map((r) => A(r, 'nps')));
    if (!v.length) return null;
    const prom = v.filter((x) => x >= 9).length;
    const pass = v.filter((x) => x >= 7 && x <= 8).length;
    const det = v.filter((x) => x <= 6).length;
    return {
      n: v.length,
      score: round(pct(prom, v.length) - pct(det, v.length), 0),
      promoters: round(pct(prom, v.length), 0),
      passives: round(pct(pass, v.length), 0),
      detractors: round(pct(det, v.length), 0),
      mean: round(mean(v), 1),
    };
  }

  /* ------------------------------------------------- Product-Market Fit (Sean Ellis) */
  const PMF_VERY = 'Bardzo rozczarowany';
  const PMF_SOME = 'Trochę rozczarowany';

  function pmf(rows) {
    const v = rows.map((r) => A(r, 'pmf')).filter(Boolean);
    if (!v.length) return null;
    const very = v.filter((x) => x === PMF_VERY).length;
    const some = v.filter((x) => x === PMF_SOME).length;
    return {
      n: v.length,
      veryDisappointed: round(pct(very, v.length), 0),
      somewhatDisappointed: round(pct(some, v.length), 0),
      threshold: 40,
      verdict: pct(very, v.length) >= 40 ? 'fit' : (pct(very, v.length) >= 25 ? 'blisko' : 'brak fitu'),
    };
  }

  /* ------------------------------------------------------------------ UMUX-Lite */
  /* Skala 1-7 x 2 pytania. Przeliczenie na skalę SUS wg regresji Lewisa (2013). */
  function umux(rows) {
    const pairs = rows
      .map((r) => [A(r, 'umux_capability'), A(r, 'umux_ease')])
      .filter(([a, b]) => typeof a === 'number' && typeof b === 'number');
    if (!pairs.length) return null;
    const raw = pairs.map(([a, b]) => ((a - 1) + (b - 1)) / 12 * 100);
    const rawMean = mean(raw);
    return {
      n: pairs.length,
      raw: round(rawMean, 0),
      susEquivalent: round(0.65 * rawMean + 22.9, 0),
      capability: round(mean(pairs.map((p) => p[0])), 1),
      ease: round(mean(pairs.map((p) => p[1])), 1),
      benchmark: 68,
    };
  }

  /* -------------------------------------------------------------------- zadania */
  const OUTCOME_OK = 'Wykonałem bez problemu';
  const OUTCOME_SLOW = 'Wykonałem, ale zajęło mi to za długo';

  function tasks(rows, taskDefs) {
    return taskDefs.map((t) => {
      const outcomes = rows.map((r) => A(r, `${t.id}_outcome`)).filter(Boolean);
      const seq = nums(rows.map((r) => A(r, `${t.id}_seq`)));
      const ok = outcomes.filter((o) => o === OUTCOME_OK).length;
      const partial = outcomes.filter((o) => o === OUTCOME_SLOW).length;
      const frictions = rows
        .map((r) => ({ text: (A(r, `${t.id}_friction`) || '').trim(), who: who(r), outcome: A(r, `${t.id}_outcome`) }))
        .filter((f) => f.text.length > 2);
      return {
        id: t.id,
        title: t.title,
        n: outcomes.length,
        successRate: round(pct(ok, outcomes.length), 0),
        successOrSlow: round(pct(ok + partial, outcomes.length), 0),
        failRate: round(pct(outcomes.length - ok - partial, outcomes.length), 0),
        seqMean: round(mean(seq), 1),
        seqBenchmark: 5.5,
        outcomes: distribution(rows, `${t.id}_outcome`).items,
        frictions,
      };
    });
  }

  /* ------------------------------------------------------- Van Westendorp (PSM) */
  /*  4 ceny na respondenta. Odrzucamy niespójne (nie rosnące) odpowiedzi.
      Krzywe kumulatywne -> punkty przecięcia (definicje wg oryginalnego PSM):
        OPP  = "za tanio"    x "za drogo"          (cena optymalna)
        IPP  = "okazja"      x "drogo"             (punkt obojętności / cena rynkowa)
        PMC  = "za tanio"    x "nie okazja"        (dolna granica akceptacji)
        PME  = "nie drogo"   x "za drogo"          (górna granica akceptacji)
      "nie okazja" i "nie drogo" to dopełnienia krzywych do 100%.                    */
  function vanWestendorp(rows) {
    const raw = rows.map((r) => ({
      tooCheap: A(r, 'vw_too_cheap'),
      bargain: A(r, 'vw_bargain'),
      expensive: A(r, 'vw_expensive'),
      tooExpensive: A(r, 'vw_too_expensive'),
    })).filter((d) => Object.values(d).every((x) => typeof x === 'number' && !Number.isNaN(x) && x >= 0));

    const valid = raw.filter((d) =>
      d.tooCheap <= d.bargain && d.bargain <= d.expensive && d.expensive <= d.tooExpensive
      && d.tooExpensive > 0);
    if (valid.length < 2) {
      return { n: valid.length, excluded: raw.length - valid.length, insufficient: true };
    }

    const grid = [...new Set(valid.flatMap((d) => [d.tooCheap, d.bargain, d.expensive, d.tooExpensive]))]
      .sort((a, b) => a - b);
    const N = valid.length;

    const curves = grid.map((p) => ({
      price: p,
      tooCheap: pct(valid.filter((d) => d.tooCheap >= p).length, N),        // malejąca
      bargain: pct(valid.filter((d) => d.bargain >= p).length, N),          // malejąca
      expensive: pct(valid.filter((d) => d.expensive <= p).length, N),      // rosnąca
      tooExpensive: pct(valid.filter((d) => d.tooExpensive <= p).length, N),// rosnąca
    }));

    /* Przecięcie dwóch krzywych: interpolacja liniowa tam, gdzie różnica zmienia znak.
       Jeśli obie krzywe leżą po drodze na zerze (luka między rozjechanymi grupami
       respondentów), przeskakujemy taki płaski odcinek, ale oznaczamy wynik jako
       niepewny - inaczej podalibyśmy cenę, o której nikt się nie wypowiedział. */
    function findCross(fnA, fnB) {
      const d = curves.map((c) => fnA(c) - fnB(c));
      let last = -1;                                  // ostatni indeks z niezerową różnicą
      for (let i = 0; i < curves.length; i++) {
        if (d[i] === 0) {
          if (fnA(curves[i]) > 0 || fnB(curves[i]) > 0) {
            return { price: curves[i].price, uncertain: false };   // krzywe stykają się realnie
          }
          continue;                                   // płaski odcinek na zerze - szukamy dalej
        }
        if (last >= 0 && Math.sign(d[i]) !== Math.sign(d[last])) {
          const pL = curves[last].price, pR = curves[i].price;
          const t = d[last] / (d[last] - d[i]);
          return {
            price: pL + t * (pR - pL),
            uncertain: i - last > 1 && pR > pL * 2,    // przeskok przez szeroką lukę
          };
        }
        last = i;
      }
      return null;
    }

    const cTooCheap = (c) => c.tooCheap;
    const cBargain = (c) => c.bargain;
    const cNotBargain = (c) => 100 - c.bargain;
    const cExpensive = (c) => c.expensive;
    const cNotExpensive = (c) => 100 - c.expensive;
    const cTooExpensive = (c) => c.tooExpensive;

    const opp = findCross(cTooCheap, cTooExpensive);
    const ipp = findCross(cBargain, cExpensive);
    const pmc = findCross(cTooCheap, cNotBargain);
    const pme = findCross(cNotExpensive, cTooExpensive);

    return {
      n: N,
      excluded: raw.length - valid.length,
      curves,
      opp: opp ? round(opp.price, 0) : null,
      ipp: ipp ? round(ipp.price, 0) : null,
      pmc: pmc ? round(pmc.price, 0) : null,
      pme: pme ? round(pme.price, 0) : null,
      uncertain: ['opp', 'ipp', 'pmc', 'pme']
        .filter((k) => ({ opp, ipp, pmc, pme })[k] && ({ opp, ipp, pmc, pme })[k].uncertain),
      medianBargain: round(median(valid.map((d) => d.bargain)), 0),
      medianTooExpensive: round(median(valid.map((d) => d.tooExpensive)), 0),
    };
  }

  /* ---------------------------------------------------------- Gabor-Granger */
  /*  Macierz: wiersz = próg cenowy, kolumna 0=Nie, 1=Może, 2=Tak.
      "Może" liczymy z wagą 0.4 (typowa korekta deklaratywnej intencji).        */
  function gaborGranger(rows, tiers) {
    const MAYBE_WEIGHT = 0.4;
    const points = tiers.map((price) => {
      const key = `p${price}`;
      const vals = rows.map((r) => (A(r, 'gg_intent') || {})[key]).filter((x) => typeof x === 'number');
      const yes = vals.filter((x) => x === 2).length;
      const maybe = vals.filter((x) => x === 1).length;
      const adjusted = pct(yes + maybe * MAYBE_WEIGHT, vals.length);
      return {
        price, n: vals.length,
        yes: round(pct(yes, vals.length), 0),
        yesOrMaybe: round(pct(yes + maybe, vals.length), 0),
        adjustedDemand: round(adjusted, 0),
        revenueIndex: round(price * adjusted / 100, 0),
      };
    }).filter((p) => p.n > 0);

    if (!points.length) return null;
    const best = points.reduce((a, b) => (b.revenueIndex > a.revenueIndex ? b : a));
    return { points, revenueOptimalPrice: best.price, maxRevenueIndex: best.revenueIndex, maybeWeight: MAYBE_WEIGHT };
  }

  /* ------------------------------------------------------ wartość modułów */
  function moduleValue(rows, modules) {
    const mustHave = distribution(rows, 'must_have_top3');
    const mhMap = new Map(mustHave.items.map((i) => [i.label, i.n]));
    return modules.map((m) => {
      const v = nums(rows.map((r) => (A(r, 'module_importance') || {})[m.id]));
      const critical = v.filter((x) => x >= 3).length;   // "bardzo ważna" + "krytyczna"
      const dead = v.filter((x) => x <= 1).length;       // "bezwartościowa" + "mało ważna"
      return {
        id: m.id, label: m.label, n: v.length,
        meanScore: round(mean(v), 2),                    // 0-4
        criticalShare: round(pct(critical, v.length), 0),
        deadShare: round(pct(dead, v.length), 0),
        payShare: round(pct(mhMap.get(m.label) || 0, rows.length), 0),
      };
    }).sort((a, b) => (b.payShare - a.payShare) || (b.meanScore - a.meanScore));
  }

  /* ------------------------------------------- wynik dopasowania (0-100) */
  const FREQ_SCORE = {
    'Codziennie': 100,
    'Kilka razy w tygodniu': 85,
    'Raz w tygodniu': 70,
    'Kilka razy w miesiącu': 45,
    'Raz w miesiącu lub rzadziej': 20,
    'Nie używałbym wcale': 0,
  };
  const PMF_SCORE = {
    [PMF_VERY]: 100,
    [PMF_SOME]: 55,
    'Obojętnie - poradzę sobie bez niego': 10,
    'Nie dotyczy, i tak nie zamierzam go używać': 0,
  };

  function fitScore(r, tiers, modules) {
    const parts = [];
    const add = (val, weight) => { if (val != null) parts.push([val, weight]); };

    const p = PMF_SCORE[A(r, 'pmf')];
    add(p == null ? null : p, 0.25);

    const f = FREQ_SCORE[A(r, 'usage_freq')];
    add(f == null ? null : f, 0.25);

    const n = A(r, 'nps');
    add(typeof n === 'number' ? n * 10 : null, 0.15);

    /* gotowość do zapłaty: najwyższy próg z odpowiedzią "Tak".
       Brak odpowiedzi != odpowiedź "nie" - pustego pytania nie punktujemy wcale. */
    const gg = A(r, 'gg_intent') || {};
    const answeredTiers = tiers.filter((t) => typeof gg[`p${t}`] === 'number');
    if (answeredTiers.length) {
      let topYes = 0;
      answeredTiers.forEach((t) => { if (gg[`p${t}`] === 2) topYes = Math.max(topYes, t); });
      const maxTier = Math.max(...tiers);
      add(topYes ? Math.min(100, (Math.log(topYes) / Math.log(maxTier)) * 100) : 0, 0.2);
    }

    const imp = nums(modules.map((m) => (A(r, 'module_importance') || {})[m.id]));
    add(imp.length ? (mean(imp) / 4) * 100 : null, 0.15);

    const wsum = parts.reduce((a, [, w]) => a + w, 0);
    if (!wsum) return null;
    return round(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum, 0);
  }

  /* --------------------------------------------------- jakość odpowiedzi */
  function quality(r) {
    const flags = [];
    const dur = r.durationSeconds;
    if (typeof dur === 'number' && dur < 240) flags.push('szybkie wypełnienie');

    const texts = ['pain_today', 'what_is_it', 'first_impression_neg', 'missing_features', 'nps_reason']
      .map((id) => (A(r, id) || '').trim());
    const avgLen = mean(texts.map((t) => t.length)) || 0;
    if (avgLen < 25) flags.push('krótkie odpowiedzi opisowe');

    const imp = Object.values(A(r, 'module_importance') || {});
    if (imp.length > 3 && new Set(imp).size === 1) flags.push('jednakowe oceny (straightlining)');

    return { flags, trusted: flags.length === 0 };
  }

  function who(r) {
    const role = A(r, 'role') || A(r, 'role_other') || 'nieznana rola';
    const size = A(r, 'company_size');
    const seg = A(r, 'segment') || A(r, 'segment_other');
    return [role, seg, size && `${size} os.`].filter(Boolean).join(' · ');
  }

  /* --------------------------------------------------- segmenty wg fit score */
  function segments(rows, qid, tiers, modules) {
    const groups = new Map();
    rows.forEach((r) => {
      const k = A(r, qid) || A(r, qid + '_other') || '(brak)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    return [...groups.entries()]
      .map(([label, rs]) => {
        const fits = nums(rs.map((r) => fitScore(r, tiers, modules)));
        const p = pmf(rs);
        return {
          label, n: rs.length,
          fit: round(mean(fits), 0),
          veryDisappointed: p ? p.veryDisappointed : null,
          wtpMedian: round(median(rs.map((r) => A(r, 'vw_bargain'))), 0),
        };
      })
      .filter((g) => g.n > 0)
      .sort((a, b) => (b.fit || 0) - (a.fit || 0));
  }

  /* ------------------------------------------------- zebrane odpowiedzi tekstowe */
  function openText(rows, qid) {
    return rows
      .map((r) => ({ text: (A(r, qid) || '').trim(), who: who(r), fit: r.__fit, nps: A(r, 'nps') }))
      .filter((x) => x.text.length > 2)
      .sort((a, b) => (b.fit || 0) - (a.fit || 0));
  }

  return {
    pct, round, mean, median, nums, distribution, get: A,
    nps, pmf, umux, tasks, vanWestendorp, gaborGranger,
    moduleValue, fitScore, quality, who, segments, openText,
    FREQ_SCORE,
  };
})();
