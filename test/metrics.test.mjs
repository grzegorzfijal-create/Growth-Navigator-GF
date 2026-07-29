/* Testy wskaźników. Uruchom: node test/metrics.test.mjs
   Wartości oczekiwane policzone ręcznie - jeśli test padnie, najpierw sprawdź,
   czy to nie Ty zmieniłeś definicję wskaźnika. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'assets/metrics.js'), 'utf8');
const M = new Function(`${src}; return M;`)();

let pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

const r = (answers, extra = {}) => Object.assign({ answers }, extra);

console.log('\nNPS');
test('promotorzy/detraktorzy i wynik', () => {
  const rows = [9, 10, 8, 7, 6, 0].map((nps) => r({ nps }));
  const n = M.nps(rows);
  assert.equal(n.n, 6);
  assert.equal(n.promoters, 33);        // 2/6
  assert.equal(n.passives, 33);         // 2/6 (8,7)
  assert.equal(n.detractors, 33);       // 2/6 (6,0)
  assert.equal(n.score, 0);             // 33 - 33
});
test('brak danych daje null', () => assert.equal(M.nps([r({})]), null));

console.log('\nPMF (Sean Ellis)');
test('próg 40% rozstrzyga o fitcie', () => {
  const rows = [
    ...Array(4).fill('Bardzo rozczarowany'),
    ...Array(3).fill('Trochę rozczarowany'),
    ...Array(3).fill('Obojętnie - poradzę sobie bez niego'),
  ].map((pmf) => r({ pmf }));
  const p = M.pmf(rows);
  assert.equal(p.veryDisappointed, 40);
  assert.equal(p.verdict, 'fit');
});
test('25-39% to "blisko"', () => {
  const rows = [...Array(3).fill('Bardzo rozczarowany'), ...Array(7).fill('Trochę rozczarowany')]
    .map((pmf) => r({ pmf }));
  assert.equal(M.pmf(rows).verdict, 'blisko');
});

console.log('\nUMUX-Lite');
test('maks. ocena daje 100 raw i ~88 SUS', () => {
  const u = M.umux([r({ umux_capability: 7, umux_ease: 7 })]);
  assert.equal(u.raw, 100);
  assert.equal(u.susEquivalent, 88);    // 0.65*100 + 22.9
});
test('środek skali', () => {
  const u = M.umux([r({ umux_capability: 4, umux_ease: 4 })]);
  assert.equal(u.raw, 50);              // (3+3)/12
  assert.equal(u.susEquivalent, 55);    // 0.65*50 + 22.9 = 55.4
});

console.log('\nVan Westendorp');
test('spójne odpowiedzi: przecięcia w oczekiwanych miejscach', () => {
  // 3 respondenci o zachodzących zakresach - krzywe przecinają się realnie
  const rows = [
    r({ vw_too_cheap: 50, vw_bargain: 150, vw_expensive: 300, vw_too_expensive: 500 }),
    r({ vw_too_cheap: 100, vw_bargain: 200, vw_expensive: 350, vw_too_expensive: 600 }),
    r({ vw_too_cheap: 80, vw_bargain: 180, vw_expensive: 250, vw_too_expensive: 450 }),
  ];
  const vw = M.vanWestendorp(rows);
  assert.equal(vw.n, 3);
  assert.equal(vw.excluded, 0);
  assert.equal(vw.medianBargain, 180);
  assert.ok(vw.ipp > 150 && vw.ipp < 350, 'IPP w przedziale okazja-drogo, jest ' + vw.ipp);
  assert.ok(vw.pmc != null && vw.pme != null, 'zakres akceptacji policzony');
  assert.ok(vw.pmc < vw.pme, `PMC (${vw.pmc}) < PME (${vw.pme})`);
  assert.ok(vw.pmc < vw.ipp && vw.ipp < vw.pme, 'IPP leży wewnątrz zakresu akceptacji');
  assert.ok(!vw.uncertain.includes('pmc') && !vw.uncertain.includes('pme'),
    'przy spójnych danych granice nie są niepewne');
});
test('niespójne odpowiedzi są odrzucane', () => {
  const rows = [
    r({ vw_too_cheap: 50, vw_bargain: 150, vw_expensive: 300, vw_too_expensive: 500 }),
    r({ vw_too_cheap: 900, vw_bargain: 100, vw_expensive: 50, vw_too_expensive: 10 }), // odwrotnie
    r({ vw_too_cheap: 80, vw_bargain: 180, vw_expensive: 250, vw_too_expensive: 450 }),
  ];
  const vw = M.vanWestendorp(rows);
  assert.equal(vw.n, 2);
  assert.equal(vw.excluded, 1);
});
test('przecięcie w luce jest oznaczone jako niepewne', () => {
  // nikt nie wypowiedział się o cenach 30-900: "za tanio" i "za drogo" są tam oba na zerze,
  // więc OPP wypada w pustce i musi być oznaczone
  const rows = [
    r({ vw_too_cheap: 10, vw_bargain: 20, vw_expensive: 30, vw_too_expensive: 900 }),
    r({ vw_too_cheap: 20, vw_bargain: 30, vw_expensive: 40, vw_too_expensive: 1000 }),
  ];
  const vw = M.vanWestendorp(rows);
  assert.ok(vw.opp != null, 'OPP nadal policzony');
  assert.ok(vw.uncertain.includes('opp'), 'OPP oznaczony jako niepewny, flagi: ' + vw.uncertain);
});
test('realne przecięcie krzywych na 50/50 nie jest niepewne', () => {
  // dwaj respondenci po przeciwnych stronach: przy 40 połowa mówi "za tanio",
  // połowa "za drogo" - to prawdziwy punkt przecięcia, nie luka
  const rows = [
    r({ vw_too_cheap: 10, vw_bargain: 20, vw_expensive: 30, vw_too_expensive: 40 }),
    r({ vw_too_cheap: 50, vw_bargain: 60, vw_expensive: 70, vw_too_expensive: 80 }),
  ];
  const vw = M.vanWestendorp(rows);
  assert.equal(vw.opp, 40);
  assert.deepEqual(vw.uncertain, []);
});
test('za mało danych zgłasza insufficient', () => {
  assert.equal(M.vanWestendorp([r({})]).insufficient, true);
});

console.log('\nGabor-Granger');
test('popyt, korekta "może" i cena maksymalizująca przychód', () => {
  const tiers = [100, 200];
  // 4 osoby: przy 100 -> 2x tak, 2x może ; przy 200 -> 1x tak, 3x nie
  const rows = [
    r({ gg_intent: { p100: 2, p200: 2 } }),
    r({ gg_intent: { p100: 2, p200: 0 } }),
    r({ gg_intent: { p100: 1, p200: 0 } }),
    r({ gg_intent: { p100: 1, p200: 0 } }),
  ];
  const gg = M.gaborGranger(rows, tiers);
  const at100 = gg.points[0], at200 = gg.points[1];
  assert.equal(at100.yes, 50);
  assert.equal(at100.yesOrMaybe, 100);
  assert.equal(at100.adjustedDemand, 70);     // (2 + 2*0.4)/4
  assert.equal(at100.revenueIndex, 70);       // 100 * 0.70
  assert.equal(at200.adjustedDemand, 25);     // 1/4
  assert.equal(at200.revenueIndex, 50);       // 200 * 0.25
  assert.equal(gg.revenueOptimalPrice, 100);  // 70 > 50
});

console.log('\nZadania (SEQ + success rate)');
test('liczy sukcesy, częściowe i porażki', () => {
  const rows = [
    r({ t1_outcome: 'Wykonałem bez problemu', t1_seq: 7 }),
    r({ t1_outcome: 'Wykonałem, ale zajęło mi to za długo', t1_seq: 4 }),
    r({ t1_outcome: 'Nie udało mi się - nie znalazłem tego', t1_seq: 1, t1_friction: 'zgubiłem się w menu' }),
    r({ t1_outcome: 'Nie udało mi się - funkcja nie działała', t1_seq: 2 }),
  ];
  const t = M.tasks(rows, [{ id: 't1', title: 'T1' }])[0];
  assert.equal(t.successRate, 25);
  assert.equal(t.successOrSlow, 50);
  assert.equal(t.failRate, 50);
  assert.equal(t.seqMean, 3.5);
  assert.equal(t.frictions.length, 1);
});

console.log('\nWartość modułów');
test('rozdziela "zapłacę" od "ładne, ale nie"', () => {
  const mods = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  const rows = [
    r({ module_importance: { a: 4, b: 0 }, must_have_top3: ['A'] }),
    r({ module_importance: { a: 3, b: 1 }, must_have_top3: ['A'] }),
  ];
  const [first, second] = M.moduleValue(rows, mods);
  assert.equal(first.label, 'A');
  assert.equal(first.payShare, 100);
  assert.equal(first.criticalShare, 100);
  assert.equal(first.meanScore, 3.5);
  assert.equal(second.payShare, 0);
  assert.equal(second.deadShare, 100);
});

console.log('\nFit score');
test('entuzjasta blisko 100, obojętny nisko', () => {
  const mods = [{ id: 'a', label: 'A' }];
  const tiers = [100, 500];
  const fan = r({
    pmf: 'Bardzo rozczarowany', usage_freq: 'Codziennie', nps: 10,
    gg_intent: { p100: 2, p500: 2 }, module_importance: { a: 4 },
  });
  const meh = r({
    pmf: 'Nie dotyczy, i tak nie zamierzam go używać', usage_freq: 'Nie używałbym wcale',
    nps: 2, gg_intent: { p100: 0, p500: 0 }, module_importance: { a: 0 },
  });
  const hi = M.fitScore(fan, tiers, mods);
  const lo = M.fitScore(meh, tiers, mods);
  assert.equal(hi, 100);
  assert.ok(lo <= 5, 'obojętny ma niski fit, jest ' + lo);
});
test('braki w odpowiedziach nie wywalają wyniku', () => {
  assert.equal(typeof M.fitScore(r({ nps: 8 }), [100], [{ id: 'a', label: 'A' }]), 'number');
  assert.equal(M.fitScore(r({}), [100], [{ id: 'a', label: 'A' }]), null);
});

console.log('\nJakość odpowiedzi');
test('wykrywa pośpiech, lakoniczność i straightlining', () => {
  const q = M.quality(r({ module_importance: { a: 2, b: 2, c: 2, d: 2 }, pain_today: 'nie wiem' },
    { durationSeconds: 90 }));
  assert.ok(q.flags.includes('szybkie wypełnienie'));
  assert.ok(q.flags.includes('krótkie odpowiedzi opisowe'));
  assert.ok(q.flags.includes('jednakowe oceny (straightlining)'));
  assert.equal(q.trusted, false);
});
test('rzetelna odpowiedź bez flag', () => {
  const long = 'Konkretna, rozbudowana odpowiedź opisowa z detalami z mojej pracy.';
  const q = M.quality(r({
    module_importance: { a: 4, b: 1, c: 3 },
    pain_today: long, what_is_it: long, first_impression_neg: long,
    missing_features: long, nps_reason: long,
  }, { durationSeconds: 700 }));
  assert.deepEqual(q.flags, []);
  assert.equal(q.trusted, true);
});

console.log('\nRozkłady i segmenty');
test('wielokrotny wybór i "inne" liczone razem', () => {
  const rows = [
    r({ blockers: ['Cena', 'Brak integracji z moimi źródłami danych'] }),
    r({ blockers: ['Cena'], blockers_other: 'nasz zarząd tego nie kupi' }),
  ];
  const d = M.distribution(rows, 'blockers');
  const cena = d.items.find((i) => i.label === 'Cena');
  assert.equal(cena.n, 2);
  assert.equal(cena.share, 100);
  assert.ok(d.items.some((i) => i.label.startsWith('Inne: nasz zarząd')));
});
test('segmenty sortowane po fit score', () => {
  const mods = [{ id: 'a', label: 'A' }];
  const rows = [
    r({ role: 'Analityk', pmf: 'Bardzo rozczarowany', usage_freq: 'Codziennie', nps: 10,
        gg_intent: { p100: 2 }, module_importance: { a: 4 }, vw_bargain: 300 }),
    r({ role: 'Stażysta', pmf: 'Obojętnie - poradzę sobie bez niego', usage_freq: 'Nie używałbym wcale',
        nps: 1, gg_intent: { p100: 0 }, module_importance: { a: 0 }, vw_bargain: 20 }),
  ];
  rows.forEach((x) => { x.__fit = M.fitScore(x, [100], mods); });
  const segs = M.segments(rows, 'role', [100], mods);
  assert.equal(segs[0].label, 'Analityk');
  assert.ok(segs[0].fit > segs[1].fit);
  assert.equal(segs[0].wtpMedian, 300);
});
test('openText sortuje najlepiej dopasowanych na górę', () => {
  const rows = [
    r({ change_1: 'druga uwaga' }, { __fit: 20 }),
    r({ change_1: 'pierwsza uwaga' }, { __fit: 90 }),
    r({ change_1: '' }, { __fit: 50 }),
  ];
  const t = M.openText(rows, 'change_1');
  assert.equal(t.length, 2);
  assert.equal(t[0].text, 'pierwsza uwaga');
});

console.log(`\n${pass} testów przeszło${process.exitCode ? ' (są błędy powyżej)' : ''}\n`);
