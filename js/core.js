/* CISA 초단기 합격 마스터 — core: 저장소 · 데이터 인덱스 · 하이라이트 · 통계 · 세션 */
(function () {
  'use strict';
  const C = window.CISA;
  const A = (window.App = window.App || {});

  // ---------- 상수 ----------
  A.DOMAINS = {
    1: { code: 'D1', name: '정보시스템 감사 프로세스', short: '감사 프로세스', w: 0.18 },
    2: { code: 'D2', name: 'IT 거버넌스 및 관리', short: '거버넌스·관리', w: 0.18 },
    3: { code: 'D3', name: '정보시스템 취득·개발·구현', short: '취득·개발·구현', w: 0.12 },
    4: { code: 'D4', name: '정보시스템 운영 및 비즈니스 복원력', short: '운영·복원력', w: 0.26 },
    5: { code: 'D5', name: '정보자산 보호', short: '정보자산 보호', w: 0.26 }
  };
  A.DIDS = [1, 2, 3, 4, 5];
  A.KTYPES = ['FIRST', 'BEST', 'PRIMARY', 'GREATEST', 'MOST', 'LEAST'];
  A.KCHIPS = A.KTYPES.concat('NONE');
  A.KLABEL = { FIRST: '가장 먼저', BEST: '최선·가장 효과적', PRIMARY: '주된 목적', GREATEST: '가장 큰 우려', MOST: '가장 중요·가능성', LEAST: '가장 적은·부정형', NONE: '일반' };
  A.PASS_P = 0.65; // 합격선 450점 ≈ 정답률 65% (ISACA 비공개 환산식의 근사)
  A.EXAMS = [
    { id: 'full', n: 150, min: 240, name: '실전 모의고사', desc: '실제 시험과 같은 150문항 · 4시간' },
    { id: 'half', n: 75, min: 120, name: '하프 모의고사', desc: '75문항 · 2시간' },
    { id: 'mini', n: 50, min: 80, name: '미니 모의고사', desc: '50문항 · 80분' },
    { id: 'speed', n: 25, min: 40, name: '스피드 모의고사', desc: '25문항 · 40분 · 출퇴근 한 구간' }
  ];

  // ---------- 유틸 ----------
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  A.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  A.shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  A.dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  A.today = () => A.dateKey(new Date());
  A.pct = (x) => (x == null || isNaN(x) ? '—' : Math.round(x * 100) + '%');
  A.fmtNum = (n) => Number(n || 0).toLocaleString('ko-KR');
  A.ago = (t) => {
    if (!t) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 30) return Math.floor(s / 86400) + '일 전';
    return A.dateKey(new Date(t));
  };
  A.mmss = (sec) => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  };

  // ---------- 저장소 (localStorage + 메모리 폴백) ----------
  const NS = 'cisa.v1.';
  const mem = {};
  A.store = {
    ok: (() => {
      try {
        localStorage.setItem(NS + '_t', '1');
        localStorage.removeItem(NS + '_t');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    get(k, def) {
      try {
        const v = localStorage.getItem(NS + k);
        if (v != null) return JSON.parse(v);
      } catch (e) { /* 폴백 */ }
      return k in mem ? mem[k] : def;
    },
    set(k, v) {
      mem[k] = v;
      try {
        localStorage.setItem(NS + k, JSON.stringify(v));
        return true;
      } catch (e) {
        return false;
      }
    },
    del(k) {
      delete mem[k];
      try { localStorage.removeItem(NS + k); } catch (e) { /* 무시 */ }
    },
    keys: ['prog', 'bm', 'wrong', 'daily', 'hist', 'log', 'trend', 'cards', 'set', 'resume']
  };

  const DEFAULT_SET = { theme: 'dark', fs: 'md', shuffle: true, oneTap: false, vibrate: true, grad: 2, examDate: '', wake: false, hint: false };
  const S = (A.S = {
    prog: A.store.get('prog', {}),   // {id: {n 시도, c 정답, f 첫시도정답, l 최근정답, s 최근선택, t 시각, st 연속정답}}
    bm: A.store.get('bm', []),        // 북마크 id 배열
    wrong: A.store.get('wrong', {}),  // {id: {n 오답횟수, t 시각, ok 졸업 진행}}
    daily: A.store.get('daily', {}),  // {YYYY-MM-DD: [풀이, 정답]}
    hist: A.store.get('hist', []),    // 세션 기록 [{t, mode, title, n, c, sc, by}]
    log: A.store.get('log', []),      // 풀이 로그 [[시각, id, 선택, 정답여부]] 최근 3000건
    trend: A.store.get('trend', {}),  // 일자별 CISA 환산 예상 점수 {YYYY-MM-DD: 점수}
    cards: A.store.get('cards', {}),  // {deckId: {cardIdx: 1|0}}
    set: Object.assign({}, DEFAULT_SET, A.store.get('set', {})),
    resume: A.store.get('resume', null)
  });
  A.save = (k) => {
    const ok = A.store.set(k, S[k]);
    if (!ok && !A._warnedStore) {
      A._warnedStore = true;
      A.toast && A.toast('저장 공간을 쓸 수 없어 이번 세션에만 기록됩니다');
    }
  };
  A.isBm = (id) => S.bm.includes(id);
  A.toggleBm = (id) => {
    const i = S.bm.indexOf(id);
    if (i >= 0) S.bm.splice(i, 1);
    else S.bm.unshift(id);
    A.save('bm');
    return i < 0;
  };

  // ---------- 데이터 인덱스 ----------
  const KW_IN_STEM = /\((FIRST|BEST|PRIMARY|MAIN|GREATEST|MOST|LEAST|NOT|EXCEPT)\b/;
  const EN2K = { FIRST: 'FIRST', BEST: 'BEST', PRIMARY: 'PRIMARY', MAIN: 'PRIMARY', GREATEST: 'GREATEST', MOST: 'MOST', LEAST: 'LEAST', NOT: 'LEAST', EXCEPT: 'LEAST' };
  A.buildIndex = () => {
    const seen = new Set();
    A.Q = [];
    A.QM = {};
    A.byD = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    A.topics = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
    for (const q of C.questions) {
      if (!q || !q.id || seen.has(q.id) || !A.byD[q.d] || !Array.isArray(q.o) || q.o.length < 2) continue;
      seen.add(q.id);
      if (!q.k || (q.k !== 'NONE' && !A.KTYPES.includes(q.k))) {
        const m = KW_IN_STEM.exec(q.q);
        q.k = m ? EN2K[m[1]] : 'NONE';
      }
      A.Q.push(q);
      A.QM[q.id] = q;
      A.byD[q.d].push(q);
      if (q.t) A.topics[q.d][q.t] = (A.topics[q.d][q.t] || 0) + 1;
    }
    A.decks = C.decks || [];
    A.notes = (C.notes || []).slice().sort((a, b) => (a.domain || 99) - (b.domain || 99));
    A.isaca = C.isaca || { commandments: [], formulas: [], keywordTips: {}, bonus: [] };
  };

  // ---------- ISACA 키워드 하이라이트 ----------
  const KO =
    '(?:가장\\s*먼저|최우선으로|가장\\s*우선적으로|우선적으로|가장\\s*적절한|가장\\s*효과적인|가장\\s*효과적으로|가장\\s*좋은|가장\\s*바람직한|가장\\s*적합한|최선의|' +
    '가장\\s*큰\\s*(?:우려|위험|영향|문제|약점|이점|효과|가치|관심사|기여|위협|취약점|도전)|가장\\s*중요한|가장\\s*가능성이\\s*높은|가장\\s*신뢰할\\s*수\\s*있는|가장\\s*유용한|' +
    '가장\\s*정확한|가장\\s*적은|가장\\s*낮은|가장\\s*작은|주된|주요한?|일차적인?)';
  const EN = 'FIRST|BEST|PRIMARY|MAIN|GREATEST|MOST|LEAST|NOT|EXCEPT';
  const RE1 = new RegExp('(' + KO + '\\s?)?\\((' + EN + ')((?:\\s+[A-Za-z]+){0,3})\\)|\\b(' + EN + ')\\b', 'g');
  const RE2 = new RegExp(KO.replace('|주요한?|', '|주요(?=\\s*(?:목적|목표|이유|원인|역할|기능|이점|우려|관심사))|'), 'g');
  const ko2k = (s) => {
    if (/먼저|최우선|우선적/.test(s)) return 'FIRST';
    if (/큰/.test(s)) return 'GREATEST';
    if (/주된|주요|일차/.test(s)) return 'PRIMARY';
    if (/적은|낮은|작은/.test(s)) return 'LEAST';
    if (/중요|가능성|신뢰|유용|정확/.test(s)) return 'MOST';
    return 'BEST';
  };
  A.highlight = (text) => {
    const s = A.esc(text);
    let hit = false;
    let out = s.replace(RE1, (m, ko, en, rest, en2) => {
      hit = true;
      if (en2) return `<mark class="kw k-${EN2K[en2]}"><span class="en">${en2}</span></mark>`;
      return `<mark class="kw k-${EN2K[en]}">${ko ? ko.trim() : ''}<span class="en">(${en}${rest || ''})</span></mark>`;
    });
    if (!hit) out = out.replace(RE2, (m) => `<mark class="kw k-${ko2k(m)}">${m}</mark>`);
    return out;
  };

  // ---------- 미니 마크다운 ----------
  const inline = (t) =>
    A.esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/==(.+?)==/g, '<mark class="hl">$1</mark>');
  const BLOCK = /^(#{1,4}\s|\||>|\s*[-*•]\s|\s*\d+[.)]\s|-{3,}\s*$)/;
  A.md = (src) => {
    const L = String(src || '').replace(/\r/g, '').split('\n');
    let h = '';
    let i = 0;
    while (i < L.length) {
      const line = L[i];
      if (!line.trim()) { i++; continue; }
      if (/^#{1,4}\s/.test(line)) {
        const lv = Math.min(4, line.match(/^#+/)[0].length + 1);
        h += `<h${lv}>${inline(line.replace(/^#+\s*/, ''))}</h${lv}>`;
        i++;
        continue;
      }
      if (/^-{3,}\s*$/.test(line)) { h += '<hr>'; i++; continue; }
      if (/^\|/.test(line)) {
        const rows = [];
        while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]);
        const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        let body = rows.slice(1);
        if (body.length && /^[\s|:-]+$/.test(body[0])) body = body.slice(1);
        h += '<div class="tbl"><table><thead><tr>' + cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if (/^>/.test(line)) {
        const buf = [];
        while (i < L.length && /^>/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, ''));
        const t = buf.join(' ');
        const cls = /^(💡|TIP|팁|시험|출제|암기)/.test(t) ? 'tip' : /^(⚠️|⚠|함정|주의|오답)/.test(t) ? 'trap' : '';
        h += `<blockquote class="${cls}">${buf.map((b) => `<p>${inline(b)}</p>`).join('')}</blockquote>`;
        continue;
      }
      if (/^\s*[-*•]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
        const ordered = /^\s*\d+[.)]\s/.test(line);
        h += ordered ? '<ol>' : '<ul>';
        while (i < L.length && (/^\s*[-*•]\s/.test(L[i]) || /^\s*\d+[.)]\s/.test(L[i]))) {
          const sub = /^\s{2,}/.test(L[i]);
          h += `<li${sub ? ' class="sub"' : ''}>${inline(L[i].replace(/^\s*(?:[-*•]|\d+[.)])\s/, ''))}</li>`;
          i++;
        }
        h += ordered ? '</ol>' : '</ul>';
        continue;
      }
      const buf = [];
      while (i < L.length && L[i].trim() && !BLOCK.test(L[i])) buf.push(L[i++]);
      if (!buf.length) { buf.push(L[i++]); }
      h += `<p>${buf.map(inline).join('<br>')}</p>`;
    }
    return h;
  };

  // ---------- 채점 기록 ----------
  A.record = (q, sel, ok, defer) => {
    const now = Date.now();
    let p = S.prog[q.id];
    if (!p) p = S.prog[q.id] = { n: 0, c: 0, f: ok ? 1 : 0, l: 0, s: -1, t: 0, st: 0 };
    p.n++;
    if (ok) { p.c++; p.st++; } else p.st = 0;
    p.l = ok ? 1 : 0;
    p.s = sel;
    p.t = now;
    let graduated = false;
    if (!ok) {
      const w = S.wrong[q.id] || (S.wrong[q.id] = { n: 0, t: 0, ok: 0 });
      w.n++;
      w.t = now;
      w.ok = 0;
    } else if (S.wrong[q.id]) {
      const w = S.wrong[q.id];
      w.ok++;
      if (w.ok >= (S.set.grad || 2)) {
        delete S.wrong[q.id];
        graduated = true;
      }
    }
    const d = A.today();
    const day = S.daily[d] || (S.daily[d] = [0, 0]);
    day[0]++;
    if (ok) day[1]++;
    S.log.push([now, q.id, sel, ok ? 1 : 0]);
    if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
    if (!defer) A.flushRecords();
    return graduated;
  };
  // 기록 저장 + 오늘의 환산 점수 스냅샷 (모의고사 제출처럼 여러 건이면 마지막에 한 번만 호출)
  A.flushRecords = () => {
    const est = A.estimate();
    if (est.solved >= 5) S.trend[A.today()] = est.score;
    for (const k of ['prog', 'wrong', 'daily', 'log', 'trend']) A.save(k);
  };
  A.removeWrong = (id) => {
    delete S.wrong[id];
    A.save('wrong');
  };

  // ---------- 통계 · CISA 환산 점수 ----------
  A.scaled = (p) => {
    p = Math.max(0, Math.min(1, p));
    const P = A.PASS_P;
    return Math.round(p <= P ? 200 + (p / P) * 250 : 450 + ((p - P) / (1 - P)) * 350);
  };
  A.domainStats = () => {
    const r = {};
    for (const d of A.DIDS) r[d] = { n: 0, f: 0, att: 0, c: 0, l: 0, total: A.byD[d].length };
    for (const id in S.prog) {
      const q = A.QM[id];
      if (!q) continue;
      const p = S.prog[id];
      const x = r[q.d];
      x.n++;
      x.f += p.f;
      x.att += p.n;
      x.c += p.c;
      x.l += p.l;
    }
    return r;
  };
  A.keywordStats = () => {
    const r = {};
    for (const k of A.KTYPES.concat('NONE')) r[k] = { n: 0, f: 0, total: 0 };
    for (const q of A.Q) r[q.k] && r[q.k].total++;
    for (const id in S.prog) {
      const q = A.QM[id];
      if (!q || !r[q.k]) continue;
      r[q.k].n++;
      r[q.k].f += S.prog[id].f;
    }
    return r;
  };
  // 첫 시도 정답률(실전 예측력이 가장 높음)을 도메인 가중치로 합산. 미응시 도메인은 가중치 재정규화.
  A.estimate = () => {
    const st = A.domainStats();
    let wsum = 0;
    let acc = 0;
    let solved = 0;
    let att = 0;
    let corr = 0;
    const missing = [];
    for (const d of A.DIDS) {
      const x = st[d];
      solved += x.n;
      att += x.att;
      corr += x.c;
      if (x.n > 0) {
        wsum += A.DOMAINS[d].w;
        acc += A.DOMAINS[d].w * (x.f / x.n);
      } else missing.push(d);
    }
    const p = wsum ? acc / wsum : null;
    return { p, score: p == null ? null : A.scaled(p), missing, st, solved, att, corr };
  };
  A.examScore = (by) => {
    // by: {d: [n, c]} — 시험 내 도메인별 정답률에 공식 가중치 적용
    let wsum = 0;
    let acc = 0;
    for (const d of A.DIDS) {
      const x = by[d];
      if (x && x[0]) {
        wsum += A.DOMAINS[d].w;
        acc += A.DOMAINS[d].w * (x[1] / x[0]);
      }
    }
    const p = wsum ? acc / wsum : 0;
    return { p, score: A.scaled(p) };
  };
  A.dayStreak = () => {
    let n = 0;
    const d = new Date();
    if (!S.daily[A.dateKey(d)]) d.setDate(d.getDate() - 1);
    while (S.daily[A.dateKey(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  };

  // ---------- 문제 선택 ----------
  A.status = (id) => {
    const p = S.prog[id];
    if (!p) return 'new';
    return S.wrong[id] ? 'wrong' : p.l ? 'right' : 'wrong';
  };
  A.filterQ = (f) => {
    const ds = f.d && f.d.length ? f.d : A.DIDS;
    const ks = f.k && f.k.length ? new Set(f.k) : null;
    const lv = f.lv && f.lv.length ? new Set(f.lv) : null;
    const term = (f.q || '').trim().toLowerCase();
    const bm = new Set(S.bm);
    let out = [];
    for (const d of ds) {
      for (const q of A.byD[d]) {
        if (ks && !ks.has(q.k)) continue;
        if (lv && !lv.has(q.lv)) continue;
        if (f.topic && q.t !== f.topic) continue;
        if (f.st === 'new' && S.prog[q.id]) continue;
        if (f.st === 'wrong' && !S.wrong[q.id]) continue;
        if (f.st === 'bm' && !bm.has(q.id)) continue;
        if (f.st === 'right' && !(S.prog[q.id] && S.prog[q.id].l && !S.wrong[q.id])) continue;
        if (term && !(q.q + ' ' + q.o.join(' ') + ' ' + (q.t || '')).toLowerCase().includes(term)) continue;
        out.push(q);
      }
    }
    return out;
  };
  // 도메인 가중치에 맞춰 n문항 추출(미풀이 우선)
  A.distCounts = (n) => {
    const counts = {};
    let given = 0;
    const order = A.DIDS.map((d) => ({ d, raw: n * A.DOMAINS[d].w }));
    for (const o of order) {
      counts[o.d] = Math.floor(o.raw);
      given += counts[o.d];
    }
    order.sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)));
    for (let i = 0; given < n; i++, given++) counts[order[i % 5].d]++;
    return counts;
  };
  A.weightedPick = (n, preferNew) => {
    const counts = A.distCounts(n);
    let ids = [];
    for (const d of A.DIDS) {
      const pool = A.shuffle(A.byD[d].slice());
      if (preferNew) pool.sort((a, b) => (S.prog[a.id] ? 1 : 0) - (S.prog[b.id] ? 1 : 0));
      ids = ids.concat(pool.slice(0, counts[d]).map((q) => q.id));
    }
    return A.shuffle(ids);
  };

  // ---------- 세션 ----------
  A.newSession = (o) => {
    const s = {
      id: Date.now().toString(36),
      mode: o.mode || 'practice', // practice | exam | review
      title: o.title || '맞춤 연습',
      ids: o.ids,
      i: 0,
      ans: {},  // {id: {s: 원래 보기 인덱스, ok}}
      perm: {}, // {id: [표시 순서 → 원래 인덱스]}
      flag: {},
      start: Date.now(),
      elapsed: 0,
      limit: o.limit || 0, // 초
      src: o.src || '',
      done: false
    };
    for (const id of s.ids) {
      const q = A.QM[id];
      const idx = q.o.map((_, j) => j);
      s.perm[id] = S.set.shuffle && s.mode !== 'review' ? A.shuffle(idx) : idx;
    }
    return s;
  };
  A.persistSession = (s) => {
    if (!s || s.mode === 'review' || s.done) {
      S.resume = null;
      A.store.del('resume');
      return;
    }
    S.resume = s;
    A.save('resume');
  };
  A.sessionSummary = (s) => {
    const by = {};
    let c = 0;
    let n = 0;
    for (const id of s.ids) {
      const a = s.ans[id];
      const q = A.QM[id];
      if (!q) continue;
      const x = by[q.d] || (by[q.d] = [0, 0]);
      x[0]++;
      n++;
      if (a && a.ok) {
        x[1]++;
        c++;
      }
    }
    return { by, n, c, answered: Object.keys(s.ans).length, ...A.examScore(by) };
  };

  // ---------- 백업 ----------
  A.exportData = () => {
    const o = { app: 'cisa-master', v: 1, t: Date.now(), data: {} };
    for (const k of A.store.keys) o.data[k] = S[k];
    return JSON.stringify(o);
  };
  A.importData = (text) => {
    const o = JSON.parse(text);
    if (!o || o.app !== 'cisa-master' || !o.data) throw new Error('CISA 마스터 백업 형식이 아닙니다');
    for (const k of A.store.keys) {
      if (k in o.data) {
        S[k] = k === 'set' ? Object.assign({}, DEFAULT_SET, o.data[k]) : o.data[k];
        A.save(k);
      }
    }
  };
  A.resetAll = () => {
    for (const k of A.store.keys) A.store.del(k);
    S.prog = {};
    S.bm = [];
    S.wrong = {};
    S.daily = {};
    S.hist = [];
    S.log = [];
    S.trend = {};
    S.cards = {};
    S.resume = null;
    S.set = Object.assign({}, DEFAULT_SET, { theme: S.set.theme, fs: S.set.fs });
    A.save('set');
  };
})();
