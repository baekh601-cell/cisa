/* CISA 초단기 합격 마스터 — views: 화면 렌더링 · 이벤트 · 내비게이션 */
(function () {
  'use strict';
  const A = window.App;
  const S = A.S;
  const esc = A.esc;
  const D = A.DOMAINS;

  // ---------- 아이콘 ----------
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
    exam: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>'),
    wrong: svg('<path d="M5 3h11l3 3v15H5z"/><path d="m9.5 10.5 5 5M14.5 10.5l-5 5"/>'),
    cards: svg('<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>'),
    isaca: svg('<path d="M18 5H6l6 7-6 7h12"/>'),
    gear: svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
    back: svg('<path d="m15 18-6-6 6-6"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    star: svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    chev: svg('<path d="m9 6 6 6-6 6"/>'),
    grid: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
    flag: svg('<path d="M5 21V4h12l-2 4 2 4H5"/>'),
    bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
    timer: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    shuffle: svg('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    left: svg('<path d="M19 12H5m6-6-6 6 6 6"/>'),
    right: svg('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
    ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-5"/>'),
    no: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'),
    book: svg('<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>'),
    play: svg('<path d="M7 4v16l13-8z"/>')
  };
  A.I = I;

  // ---------- 공용 UI ----------
  const app = () => document.getElementById('app');
  let toastTimer = 0;
  A.toast = (msg) => {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2400);
  };
  let sheetResolve = null;
  A.sheet = (html) => {
    A.closeSheet(false);
    const el = document.createElement('div');
    el.className = 'scrim';
    el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    el.addEventListener('click', (e) => { if (e.target === el) A.closeSheet(false); });
    document.body.appendChild(el);
    return el;
  };
  A.closeSheet = (val) => {
    const el = document.querySelector('.scrim');
    if (el) el.remove();
    if (sheetResolve) {
      const r = sheetResolve;
      sheetResolve = null;
      r(val);
    }
  };
  A.confirm = (o) =>
    new Promise((res) => {
      A.sheet(`<h3>${esc(o.title)}</h3>${o.body ? `<p>${o.body}</p>` : ''}<div class="acts"><button class="btn" data-act="sheet-no">${esc(o.no || '취소')}</button><button class="btn ${o.danger ? 'danger' : 'primary'}" data-act="sheet-yes">${esc(o.yes || '확인')}</button></div>`);
      sheetResolve = res;
    });
  const vibrate = (p) => { try { if (S.set.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 미지원 */ } };
  const kb = (k) => `<span class="kbadge k-${k}">${k === 'NONE' ? '일반' : k}</span>`;
  const dtag = (d) => `<span class="dtag">${D[d].code} · ${esc(D[d].short)}</span>`;
  const lvDots = (lv) => `<span class="lv" title="난이도 ${lv}">${[1, 2, 3].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
  const barCls = (p) => (p == null ? '' : p >= A.PASS_P ? 'ok' : p >= 0.5 ? 'warn' : 'bad');
  const topbar = (title, o = {}) =>
    `<header class="topbar">${o.back ? `<button class="icon-btn" data-act="back" aria-label="뒤로">${I.back}</button>` : ''}<h1>${title}${o.sub ? `<span class="sub">${o.sub}</span>` : ''}</h1>${o.right || ''}</header>`;
  const toggleHtml = (id, on, act) => `<label class="toggle"><input type="checkbox" id="${id}" data-on="${act}" ${on ? 'checked' : ''}><span></span></label>`;
  const segHtml = (act, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;

  // ---------- 내비게이션 ----------
  const TABS = [
    { id: 'home', label: '홈', icon: 'home' },
    { id: 'exam', label: '모의고사', icon: 'exam' },
    { id: 'wrong', label: '오답노트', icon: 'wrong' },
    { id: 'cards', label: '암기카드', icon: 'cards' },
    { id: 'isaca', label: 'ISACA공식', icon: 'isaca' }
  ];
  const isTab = (n) => TABS.some((t) => t.id === n);
  const V = (A.V = {
    cur: { name: 'home', p: {} },
    stack: [],
    scroll: {},
    examSeg: 'practice',
    wrongSeg: 'wrong',
    wrongD: 0,
    isacaSeg: 'cmd',
    openCmd: {},
    f: Object.assign({ d: [], k: [], st: 'all', lv: [], topic: '', q: '', n: 20, order: 'rand' }, S.set.lastF || {}),
    preferNew: true,
    sess: null,
    pending: null,
    hint: false,
    deck: null,
    listLimit: 40
  });
  const key = (v) => v.name + ':' + JSON.stringify(v.p || {});
  A.go = (name, p = {}) => {
    V.scroll[key(V.cur)] = window.scrollY;
    if (isTab(name)) {
      V.stack = [];
      V.cur = { name, p };
    } else {
      V.stack.push(V.cur);
      V.cur = { name, p };
      try { history.pushState({ cisa: V.stack.length }, ''); } catch (e) { /* 프레임 제한 */ }
    }
    render({ top: true });
  };
  A.back = () => {
    if (document.querySelector('.scrim')) return A.closeSheet(false);
    if (V.cur.name === 'quiz') saveElapsed();
    if (V.stack.length) {
      V.cur = V.stack.pop();
      render({ restore: true });
    } else if (V.cur.name !== 'home') {
      V.cur = { name: 'home', p: {} };
      render({ top: true });
    }
  };
  window.addEventListener('popstate', () => {
    if (document.querySelector('.scrim')) return A.closeSheet(false);
    if (V.stack.length) A.back();
  });

  let timerId = 0;
  function render(o = {}) {
    const view = VIEWS[V.cur.name] || VIEWS.home;
    clearInterval(timerId);
    const tab = isTab(V.cur.name);
    const html = view(V.cur.p || {});
    app().innerHTML = html + (tab ? tabbarHtml() : '');
    if (o.top) window.scrollTo(0, 0);
    else if (o.restore) window.scrollTo(0, V.scroll[key(V.cur)] || 0);
    else if (o.keep != null) window.scrollTo(0, o.keep);
    if (AFTER[V.cur.name]) AFTER[V.cur.name](V.cur.p || {});
    wake(V.cur.name === 'quiz' || V.cur.name === 'deck');
  }
  A.render = render;
  const rerender = () => render({ keep: window.scrollY });
  function tabbarHtml() {
    const active = isTab(V.cur.name) ? V.cur.name : '';
    const wn = Object.keys(S.wrong).length;
    return `<nav class="tabbar" aria-label="주요 메뉴">${TABS.map((t) => `<button class="tab" data-act="tab" data-v="${t.id}" ${t.id === active ? 'aria-current="page"' : ''}>${I[t.icon]}<span>${t.label}</span>${t.id === 'wrong' && wn ? `<span class="dot">${wn > 99 ? '99+' : wn}</span>` : ''}</button>`).join('')}</nav>`;
  }

  // 화면 꺼짐 방지(선택)
  let lock = null;
  async function wake(on) {
    try {
      if (on && S.set.wake && 'wakeLock' in navigator && !lock) {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      } else if ((!on || !S.set.wake) && lock) {
        await lock.release();
        lock = null;
      }
    } catch (e) { lock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wake(V.cur.name === 'quiz' || V.cur.name === 'deck');
    else saveElapsed();
  });
  window.addEventListener('pagehide', saveElapsed);

  // ---------- 테마 ----------
  A.applyTheme = () => {
    const root = document.documentElement;
    let skin = S.set.theme;
    if (skin === 'auto') {
      const host = root.getAttribute('data-theme');
      skin = host === 'light' || host === 'dark' ? host : window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.setAttribute('data-skin', skin);
    root.setAttribute('data-fs', S.set.fs || 'md');
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', skin === 'light' ? '#f3f5fa' : '#0c1220');
  };
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => S.set.theme === 'auto' && A.applyTheme());
  } catch (e) { /* 구형 브라우저 */ }

  // =====================================================================
  // 홈
  // =====================================================================
  function dday() {
    if (!S.set.examDate) return '';
    const t = new Date(S.set.examDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const n = Math.round((t - now) / 86400000);
    return n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`;
  }
  function homeView() {
    const est = A.estimate();
    const wn = Object.keys(S.wrong).length;
    const total = A.Q.length;
    const todayN = (S.daily[A.today()] || [0])[0];
    const streak = A.dayStreak();
    const firstAcc = est.solved ? est.st && A.DIDS.reduce((s, d) => s + est.st[d].f, 0) / est.solved : null;
    const sc = est.solved >= 5 ? est.score : null;
    const pos = (v) => ((v - 200) / 600) * 100;
    let pill = '<span class="pill na">5문제 이상 풀면 계산</span>';
    if (sc != null) pill = sc >= 450 ? `<span class="pill pass">합격권 +${sc - 450}</span>` : `<span class="pill fail">합격선까지 ${450 - sc}점</span>`;
    const r = S.resume && S.resume.ids && S.resume.ids.every((id) => A.QM[id]) ? S.resume : null;
    const weak = weakestDomain(est.st);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = A.dateKey(d);
      days.push({ k, n: (S.daily[k] || [0])[0], lab: i === 0 ? '오늘' : String(d.getDate()) });
    }
    const maxDay = Math.max(10, ...days.map((x) => x.n));
    const sum14 = days.reduce((s, x) => s + x.n, 0);
    const ks = A.keywordStats();
    const dd = dday();
    return `${topbar('CISA 초단기 합격 마스터', { sub: dd, right: `<button class="icon-btn" data-act="go" data-v="settings" aria-label="설정">${I.gear}</button>` })}
<main class="view">
  ${r ? `<button class="card resume" data-act="resume">${I.play}<span class="grow"><b>이어서 풀기 · ${esc(r.title)}</b><span>${Math.min(r.i + 1, r.ids.length)} / ${r.ids.length}문항 · ${r.mode === 'exam' ? '모의고사 진행 중' : '맞춤 연습'} · ${A.ago(r.start)} 시작</span></span>${I.chev}</button>` : ''}
  <section class="card hero" aria-label="CISA 환산 예상 점수">
    <div class="row"><span class="eyebrow grow">CISA 환산 예상 점수</span>${pill}</div>
    <div class="score-row"><div class="score-num">${sc == null ? '—' : sc}<small>/ 800</small></div><div class="mono muted" style="font-size:.78rem;text-align:right">합격 450<br>200~800 스케일</div></div>
    <div><div class="gauge"><i class="fill" style="width:${sc == null ? 0 : pos(sc)}%"></i><i class="pass-line" style="left:${pos(450)}%"></i></div>
    <div class="gauge-scale"><span>200</span><span class="p" style="left:${pos(450)}%">450</span><span>800</span></div></div>
    <div class="kpis">
      <div class="kpi"><b>${A.fmtNum(est.solved)}</b><span>풀이 / ${A.fmtNum(total)}</span></div>
      <div class="kpi"><b>${A.pct(firstAcc)}</b><span>첫 시도 정답률</span></div>
      <div class="kpi"><b>${todayN}</b><span>오늘 · 연속 ${streak}일</span></div>
    </div>
    <p class="note-line">가중치 D1 18 · D2 18 · D3 12 · D4 26 · D5 26%를 반영한 첫 시도 정답률 기준 추정치(합격선 450 ≈ 65%).${est.missing.length && est.solved ? ` 미응시: ${est.missing.map((d) => D[d].code).join('·')} — 응시 도메인만 반영 중.` : ''}</p>
  </section>
  <div class="quick">
    <button class="qbtn hot" data-act="quick" data-q="daily"><span class="qi">${I.bolt}</span><span><b>오늘의 10문제</b><span>도메인 비중대로 · 미풀이 우선</span></span></button>
    <button class="qbtn" data-act="quick" data-q="weak"><span class="qi">${I.target}</span><span><b>약점 집중 20</b><span>${weak ? `${D[weak.d].code} ${weak.label}` : '가장 약한 도메인'}</span></span></button>
    <button class="qbtn" data-act="quick" data-q="wrong"><span class="qi">${I.repeat}</span><span><b>오답 복습</b><span>${wn ? `${wn}문항 대기` : '아직 오답 없음'}</span></span></button>
    <button class="qbtn" data-act="tab" data-v="exam" data-seg="mock"><span class="qi">${I.timer}</span><span><b>실전 모의고사</b><span>150문항 · 4시간 · 환산 점수</span></span></button>
  </div>
  <div class="sec-head"><h2 class="sec-title">도메인별 정답률</h2><small>탭하면 20문항 연습</small></div>
  <section class="card tight"><div class="list">
    ${A.DIDS.map((d) => {
      const x = est.st[d];
      const p = x.n ? x.f / x.n : null;
      return `<button class="drow" data-act="quick" data-q="dom" data-d="${d}"><span class="dn">${D[d].code} · ${Math.round(D[d].w * 100)}%<small>${esc(D[d].short)}</small></span><span class="bar"><i class="${barCls(p)}" style="width:${p == null ? 0 : Math.round(p * 100)}%"></i><span class="mark65"></span></span><span class="pct">${A.pct(p)}<small>${x.n}/${x.total}</small></span></button>`;
    }).join('')}
  </div></section>
  <div class="sec-head"><h2 class="sec-title">ISACA 키워드별 정답률</h2><small>탭하면 그 유형만</small></div>
  <div class="kstats">
    ${A.KTYPES.map((k) => {
      const x = ks[k];
      return `<button class="kstat k-${k}" data-act="quick" data-q="kw" data-k="${k}"><b>${k}</b><span>${x.n ? A.pct(x.f / x.n) : '—'}</span><small>${x.n}/${x.total}</small></button>`;
    }).join('')}
  </div>
  <div class="sec-head"><h2 class="sec-title">최근 14일 학습량</h2><small>합계 ${A.fmtNum(sum14)}문항</small></div>
  <section class="card"><div class="spark" role="img" aria-label="최근 14일 일별 풀이 수">${days.map((x) => `<i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, (x.n / maxDay) * 100) : 4}%" title="${x.k}: ${x.n}문항"></i>`).join('')}</div>
  <div class="spark-x">${days.map((x) => `<span>${x.lab}</span>`).join('')}</div></section>
  <div class="sec-head"><h2 class="sec-title">핵심 요점 노트</h2><small>${A.notes.length}권</small></div>
  <section class="card tight notes-list"><div class="list">${notesList()}</div></section>
</main>`;
  }
  function notesList() {
    if (!A.notes.length) return '<div class="empty">요점 노트 데이터가 없습니다.</div>';
    return A.notes.map((n) => `<button class="li" data-act="note" data-id="${esc(n.id)}"><span class="ic">${esc(n.domain ? 'D' + n.domain : n.badge || '★')}</span><span class="grow"><span class="t">${esc(n.title)}</span><span class="s">${(n.sections || []).length}개 단원${n.weight ? ` · 출제 ${n.weight}%` : ''}</span></span><span class="chev">${I.chev}</span></button>`).join('');
  }
  function weakestDomain(st) {
    let best = null;
    for (const d of A.DIDS) {
      const x = st[d];
      if (x.n >= 5) {
        const p = x.f / x.n;
        if (!best || p < best.p) best = { d, p, label: `정답률 ${A.pct(p)}` };
      }
    }
    if (best) return best;
    let low = null;
    for (const d of A.DIDS) {
      const cov = st[d].n / Math.max(1, st[d].total);
      const score = cov / D[d].w;
      if (!low || score < low.s) low = { d, s: score, label: '풀이 적음' };
    }
    return low;
  }

  // =====================================================================
  // 모의고사 탭 (맞춤 연습 + 실전 모의고사)
  // =====================================================================
  function examView() {
    const seg = V.examSeg;
    return `${topbar('모의고사', { right: `<button class="icon-btn" data-act="go" data-v="settings" aria-label="설정">${I.gear}</button>` })}
<main class="view ${seg === 'practice' ? 'with-start' : ''}">
  ${segHtml('eseg', [['practice', '맞춤 연습 · 즉시 해설'], ['mock', '실전 모의고사']], seg)}
  ${seg === 'practice' ? practiceSetup() : mockSetup()}
</main>`;
  }
  function practiceSetup() {
    const f = V.f;
    const list = A.filterQ(f);
    const n = f.n === 'all' ? list.length : Math.min(Number(f.n), list.length);
    const topics = f.d.length === 1 ? Object.keys(A.topics[f.d[0]]) : [];
    const kc = A.keywordStats();
    return `<section class="card stack">
    <span class="lbl">도메인</span>
    <div class="chips"><button class="chip" data-act="fd" data-v="0" aria-pressed="${!f.d.length}">전체 <span class="n">${A.fmtNum(A.Q.length)}</span></button>${A.DIDS.map((d) => `<button class="chip" data-act="fd" data-v="${d}" aria-pressed="${f.d.includes(d)}">${D[d].code} <span class="n">${A.byD[d].length}</span></button>`).join('')}</div>
    ${topics.length ? `<div class="field"><label for="ftopic">세부 토픽 (${D[f.d[0]].code})</label><select class="input select" id="ftopic" data-on="ftopic"><option value="">전체 토픽</option>${topics.map((t) => `<option value="${esc(t)}" ${t === f.topic ? 'selected' : ''}>${esc(t)} (${A.topics[f.d[0]][t]})</option>`).join('')}</select></div>` : ''}
    <span class="lbl">ISACA 결정 키워드</span>
    <div class="chips">${A.KCHIPS.map((k) => `<button class="chip k-${k}" data-k data-act="fk" data-v="${k}" aria-pressed="${f.k.includes(k)}">${k === 'NONE' ? '일반' : k} <span class="n">${kc[k].total}</span></button>`).join('')}</div>
    <span class="lbl">풀이 상태</span>
    ${segHtml('fst', [['all', '전체'], ['new', '미풀이'], ['wrong', '오답'], ['bm', '북마크'], ['right', '맞힘']], f.st)}
    <span class="lbl">난이도</span>
    <div class="chips">${[[1, '기본'], [2, '실전'], [3, '고난도']].map(([v, l]) => `<button class="chip" data-act="flv" data-v="${v}" aria-pressed="${f.lv.includes(v)}">${l}</button>`).join('')}</div>
    <div class="search">${I.search}<input class="input" id="fq" type="search" placeholder="지문·보기 검색 (예: RPO, 감사 훅)" value="${esc(f.q)}" data-on="fq" autocomplete="off"></div>
    <span class="lbl">문항 수</span>
    ${segHtml('fn', [[10, '10'], [20, '20'], [50, '50'], [100, '100'], ['all', '전체']], f.n)}
    <span class="lbl">출제 순서</span>
    ${segHtml('ford', [['rand', '랜덤'], ['seq', '번호 순']], f.order)}
  </section>
  <p class="note-line">문제를 풀면 즉시 모든 보기의 정답 근거·함정 해설과 ISACA 한 줄 공식이 나옵니다. <button class="btn ghost" style="min-height:32px;padding:0 8px" data-act="freset">필터 초기화</button></p>
  <div class="startbar"><span class="cnt"><b id="fcount">${A.fmtNum(list.length)}</b>조건 일치</span><button class="btn primary lg" data-act="start-practice" id="fstart" ${list.length ? '' : 'disabled'}>${I.play}연습 시작 · ${n}문항</button></div>`;
  }
  function mockSetup() {
    const hist = S.hist.filter((h) => h.mode === 'exam').slice(0, 20);
    return `<div class="stack">${A.EXAMS.map((e, i) => {
      const c = A.distCounts(e.n);
      return `<button class="card mock ${i === 0 ? 'main' : ''}" data-act="mock" data-v="${e.id}"><span class="row"><b class="grow">${e.name}</b><span class="mono muted">${e.n}문항 · ${e.min}분</span></span><span class="muted" style="font-size:.84rem">${e.desc}</span><span class="dist">${A.DIDS.map((d) => `${D[d].code} ${c[d]}`).join(' · ')}</span></button>`;
    }).join('')}</div>
  <section class="card row"><span class="grow"><b>미풀이 문제 우선 출제</b><br><span class="muted" style="font-size:.8rem">끄면 이미 푼 문제도 무작위로 섞입니다</span></span>${toggleHtml('prefnew', V.preferNew, 'prefnew')}</section>
  <p class="note-line">시험 중에는 해설이 나오지 않습니다. 제출하면 도메인 가중치를 반영한 200~800점 환산 점수와 전체 해설을 볼 수 있고, 모든 응답은 풀이 기록·오답노트에 저장됩니다.</p>
  <div class="sec-head"><h2 class="sec-title">응시 기록</h2><small>${hist.length}회</small></div>
  <section class="card tight">${hist.length ? `<div class="list">${hist.map(histRow).join('')}</div>` : '<div class="empty"><b>아직 응시 기록이 없습니다</b>스피드 모의고사(25문항)로 시작해 보세요.</div>'}</section>`;
  }
  function histRow(h) {
    return `<div class="hrow"><span><b>${esc(h.title)}</b><br><span class="s">${A.dateKey(new Date(h.t))} · ${h.c}/${h.n} 정답 · ${A.pct(h.n ? h.c / h.n : 0)}${h.dur ? ' · ' + A.mmss(h.dur / 1000) : ''}</span></span><span class="sc">${h.sc}<br><span class="pill ${h.sc >= 450 ? 'pass' : 'fail'}" style="height:22px;font-size:.66rem">${h.sc >= 450 ? '합격권' : '미달'}</span></span></div>`;
  }
  function updateCount() {
    const list = A.filterQ(V.f);
    const n = V.f.n === 'all' ? list.length : Math.min(Number(V.f.n), list.length);
    const c = document.getElementById('fcount');
    const b = document.getElementById('fstart');
    if (c) c.textContent = A.fmtNum(list.length);
    if (b) {
      b.innerHTML = `${I.play}연습 시작 · ${n}문항`;
      b.disabled = !list.length;
    }
  }
  function saveFilter() {
    S.set.lastF = Object.assign({}, V.f, { q: '' });
    A.save('set');
  }

  // =====================================================================
  // 퀴즈 (연습 · 모의고사 · 해설 복습)
  // =====================================================================
  async function startSession(o) {
    if (!o.ids || !o.ids.length) return A.toast('조건에 맞는 문제가 없습니다');
    if (S.resume && S.resume.mode === 'exam' && !S.resume.done && o.mode !== 'review') {
      const ok = await A.confirm({ title: '진행 중인 모의고사가 있습니다', body: `‘${esc(S.resume.title)}’를 종료하고 새로 시작할까요? 제출하지 않은 응답은 사라집니다.`, yes: '새로 시작', danger: true });
      if (!ok) return;
    }
    V.sess = A.newSession(o);
    V.pending = null;
    V.hint = false;
    A.persistSession(V.sess);
    if (V.cur.name === 'quiz') {
      V.cur = { name: 'quiz', p: {} };
      render({ top: true });
    } else A.go('quiz');
  }
  A.startSession = startSession;
  function curQ() {
    const s = V.sess;
    return s ? A.QM[s.ids[s.i]] : null;
  }
  function saveElapsed() {
    const s = V.sess;
    if (!s || s.mode !== 'exam' || s.done || !s._t0) return;
    s.elapsed += Date.now() - s._t0;
    s._t0 = Date.now();
    A.persistSession(s);
  }
  function remaining(s) {
    const run = s._t0 ? Date.now() - s._t0 : 0;
    return s.limit - (s.elapsed + run) / 1000;
  }
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function quizView() {
    const s = V.sess;
    const q = curQ();
    if (!s || !q) return `${topbar('문제', { back: true })}<main class="view plain"><div class="empty"><b>진행 중인 세션이 없습니다</b></div></main>`;
    const exam = s.mode === 'exam';
    const review = s.mode === 'review';
    const a = s.ans[q.id];
    const graded = !exam && a && a.ok != null;
    const perm = s.perm[q.id] || q.o.map((_, j) => j);
    const sel = exam ? (a ? a.s : null) : graded ? a.s : V.pending;
    const answeredN = Object.keys(s.ans).length;
    const last = s.i === s.ids.length - 1;
    const bm = A.isBm(q.id);
    const tip = A.isaca.keywordTips && A.isaca.keywordTips[q.k];
    const showHint = tip && !graded && (V.hint || (S.set.hint && !exam && !review && q.k !== 'NONE' && V.hint !== 'off'));

    let primary;
    if (exam) primary = last ? `<button class="btn primary" data-act="submit">제출하기 · ${answeredN}/${s.ids.length}</button>` : `<button class="btn primary" data-act="next">다음 ${I.right}</button>`;
    else if (graded || review) primary = last ? `<button class="btn primary" data-act="finish">${review ? '해설 닫기' : '결과 보기'}</button>` : `<button class="btn primary" data-act="next">다음 문제 ${I.right}</button>`;
    else primary = `<button class="btn primary" data-act="check" ${sel == null ? 'disabled' : ''}>${sel == null ? '보기를 선택하세요' : '정답 확인'}</button>`;

    const opts = perm.map((oi, j) => {
      let cls = '';
      let xp = '';
      if (graded || review) {
        const mine = a && a.s === oi;
        if (oi === q.a) cls = 'correct';
        else if (mine) cls = 'wrong';
        else cls = 'dim';
        const tag = oi === q.a ? `<span class="tag y">✓ 정답 근거${mine ? ' · 내 선택' : ''}</span>` : mine ? '<span class="tag me">✗ 내 선택 · 함정</span>' : '<span class="tag n">함정 포인트</span>';
        xp = `<span class="xp">${tag}<p>${esc(q.e && q.e[oi])}</p></span>`;
      } else if (sel === oi) cls = 'sel';
      return `<button class="opt ${cls}" data-act="pick" data-v="${oi}" ${graded || review ? 'disabled' : ''}><span class="L">${LETTERS[j]}</span><span class="ot">${esc(q.o[oi])}</span>${xp}</button>`;
    }).join('');

    let verdict = '';
    if (graded) verdict = a.ok ? `<div class="verdict y" id="verdict">${I.ok}<div>정답입니다<span>${q.k !== 'NONE' ? `${q.k} 문제 — ISACA 관점을 정확히 짚었습니다` : '개념을 정확히 알고 있습니다'}</span></div></div>` : `<div class="verdict n" id="verdict">${I.no}<div>오답 — 정답은 ${LETTERS[perm.indexOf(q.a)]}<span>오답노트에 자동 저장되었습니다 · ${S.set.grad}회 연속 맞히면 졸업</span></div></div>`;
    else if (review) verdict = a && a.s != null ? (a.ok ? `<div class="verdict y" id="verdict">${I.ok}<div>맞힌 문제</div></div>` : `<div class="verdict n" id="verdict">${I.no}<div>틀린 문제 — 정답은 ${LETTERS[perm.indexOf(q.a)]}</div></div>`) : `<div class="verdict n" id="verdict">${I.no}<div>미응답 — 정답은 ${LETTERS[perm.indexOf(q.a)]}</div></div>`;

    return `<header class="qtop"><div class="row">
      <button class="icon-btn" data-act="quiz-exit" aria-label="나가기">${I.close}</button>
      <div class="grow"><div class="qcount">${s.i + 1}<small> / ${s.ids.length}</small> <small style="font-family:var(--font-sans);margin-left:6px">${esc(s.title)}</small></div></div>
      ${exam ? `<span class="timer" id="timer">${A.mmss(remaining(s))}</span>` : ''}
      <button class="icon-btn" data-act="quiz-grid" aria-label="문항 목록">${I.grid}</button>
      ${exam ? `<button class="icon-btn ${bm ? 'on' : ''}" data-act="bm" aria-label="북마크">${bm ? I.starOn : I.star}</button>` : ''}
    </div><div class="qprog"><i style="width:${((s.i + 1) / s.ids.length) * 100}%"></i></div></header>
<main class="view with-bar" id="qmain">
  <div class="qmeta">${dtag(q.d)}${q.t ? `<span class="ttag">${esc(q.t)}</span>` : ''}<button class="kbadge k-${q.k}" data-act="khint" aria-label="${q.k} 공략법 보기">${q.k === 'NONE' ? '일반' : q.k} ⓘ</button>${lvDots(q.lv || 2)}<span class="wp">W/P ${esc(q.id)}</span></div>
  ${showHint ? `<div class="khint k-${q.k}"><span><b>${q.k} 공략</b><br>${esc(tip)}</span></div>` : ''}
  <p class="stem">${A.highlight(q.q)}</p>
  ${verdict}
  <div class="opts">${opts}</div>
  ${graded || review ? `<div class="formula"><span class="eyebrow">ISACA 한 줄 공식</span><p>${esc(q.f || '')}</p></div>` : ''}
  ${(graded || review) && A.notes.some((n) => n.domain === q.d) ? `<button class="btn ghost block" data-act="note" data-id="${esc((A.notes.find((n) => n.domain === q.d) || {}).id)}">${I.book}${D[q.d].code} 요점 노트 열기</button>` : ''}
  <p class="swipe-hint">← 밀어서 다음 · 이전 → ${exam ? '· 모든 응답은 제출 시 채점' : ''}</p>
</main>
<nav class="actionbar">
  <button class="btn sq" data-act="prev" aria-label="이전 문제" ${s.i === 0 ? 'disabled' : ''}>${I.left}</button>
  ${exam ? `<button class="btn sq ${s.flag[q.id] ? 'on' : ''}" data-act="flag" aria-label="검토 표시">${I.flag}</button>` : `<button class="btn sq ${bm ? 'on' : ''}" data-act="bm" aria-label="북마크">${bm ? I.starOn : I.star}</button>`}
  ${primary}
</nav>`;
  }
  function quizAfter() {
    const s = V.sess;
    if (!s || s.mode !== 'exam') return;
    if (!s._t0) s._t0 = Date.now();
    const el = document.getElementById('timer');
    const tick = () => {
      const r = remaining(s);
      if (el) {
        el.textContent = A.mmss(r);
        el.classList.toggle('low', r < 300);
      }
      if (r <= 0) {
        clearInterval(timerId);
        A.toast('시간 종료 — 자동 제출합니다');
        submitExam(true);
      }
    };
    tick();
    timerId = setInterval(tick, 1000);
  }
  function pick(oi) {
    const s = V.sess;
    const q = curQ();
    if (!s || !q) return;
    if (s.mode === 'exam') {
      s.ans[q.id] = { s: oi };
      vibrate(8);
      saveElapsed();
      A.persistSession(s);
      return rerender();
    }
    if (s.ans[q.id] && s.ans[q.id].ok != null) return;
    if (S.set.oneTap) return grade(oi);
    V.pending = oi;
    vibrate(6);
    rerender();
  }
  function grade(oi) {
    const s = V.sess;
    const q = curQ();
    if (oi == null) return;
    const ok = oi === q.a;
    s.ans[q.id] = { s: oi, ok };
    V.pending = null;
    const grad = A.record(q, oi, ok);
    vibrate(ok ? 18 : [30, 50, 30]);
    A.persistSession(s);
    render({ keep: window.scrollY });
    const v = document.getElementById('verdict');
    if (v) {
      const y = v.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
    if (grad) A.toast('오답노트 졸업! 이 문제는 이제 확실히 압니다');
  }
  function move(dir) {
    const s = V.sess;
    if (!s) return;
    const ni = s.i + dir;
    if (ni < 0) return;
    if (ni >= s.ids.length) return s.mode === 'exam' ? submitExam(false) : finishSession();
    s.i = ni;
    V.pending = null;
    V.hint = false;
    if (s.mode === 'exam') saveElapsed();
    A.persistSession(s);
    render({ top: true });
  }
  async function submitExam(force) {
    const s = V.sess;
    if (!s || s.done) return;
    const un = s.ids.length - Object.keys(s.ans).length;
    if (!force) {
      const fl = Object.keys(s.flag).filter((k) => s.flag[k]).length;
      const ok = await A.confirm({ title: '모의고사를 제출할까요?', body: `${un ? `미응답 <b>${un}문항</b>은 오답 처리됩니다. ` : '모든 문항에 응답했습니다. '}${fl ? `검토 표시 ${fl}문항이 있습니다.` : ''}`, yes: '제출하고 채점', no: '계속 풀기' });
      if (!ok) return;
    }
    saveElapsed();
    for (const id of s.ids) {
      const a = s.ans[id];
      const q = A.QM[id];
      if (a && a.s != null) {
        a.ok = a.s === q.a;
        A.record(q, a.s, a.ok);
      }
    }
    finishSession();
  }
  function finishSession() {
    const s = V.sess;
    if (!s) return;
    if (s.mode === 'review') return A.back();
    s.done = true;
    const sum = A.sessionSummary(s);
    const dur = s.mode === 'exam' ? s.elapsed : Date.now() - s.start;
    S.hist.unshift({ t: Date.now(), mode: s.mode, title: s.title, n: sum.n, c: sum.c, sc: sum.score, by: sum.by, dur });
    S.hist = S.hist.slice(0, 200);
    A.save('hist');
    A.persistSession(null);
    V.result = { sess: s, sum, dur };
    V.cur = { name: 'result', p: {} };
    render({ top: true });
  }
  function gridSheet() {
    const s = V.sess;
    const exam = s.mode === 'exam';
    const cells = s.ids.map((id, i) => {
      const a = s.ans[id];
      let cls = '';
      if (exam) cls = a ? 'done' : '';
      else if (a && a.ok != null) cls = a.ok ? 'y' : 'n';
      if (s.flag[id]) cls += ' flag';
      if (i === s.i) cls += ' cur';
      return `<button class="${cls}" data-act="jump" data-v="${i}">${i + 1}</button>`;
    }).join('');
    const an = Object.keys(s.ans).length;
    A.sheet(`<h3>문항 목록 · ${an}/${s.ids.length} 응답</h3><p class="muted" style="font-size:.8rem">${exam ? '파란색 = 응답 · 노란 점 = 검토 표시' : '초록 = 정답 · 빨강 = 오답'}</p><div class="grid-nav">${cells}</div>${exam ? '<button class="btn primary lg block" data-act="submit">제출하고 채점</button>' : ''}`);
  }

  // =====================================================================
  // 결과
  // =====================================================================
  function resultView() {
    const r = V.result;
    if (!r) return `${topbar('결과', { back: true })}<main class="view plain"><div class="empty">결과가 없습니다</div></main>`;
    const { sess: s, sum } = r;
    const wrongIds = s.ids.filter((id) => !(s.ans[id] && s.ans[id].ok));
    const pass = sum.score >= 450;
    return `${topbar(esc(s.title) + ' 결과', { right: `<button class="icon-btn" data-act="tab" data-v="home" aria-label="홈">${I.home}</button>` })}
<main class="view plain">
  <section class="card res-hero"><span class="eyebrow">CISA 환산 점수 · 가중치 반영</span><div class="score-num">${sum.score}</div><span class="pill ${pass ? 'pass' : 'fail'}">${pass ? '합격권 (450 이상)' : `합격선까지 ${450 - sum.score}점`}</span>
  <div class="kpis" style="width:100%;margin-top:8px"><div class="kpi"><b>${sum.c}/${sum.n}</b><span>정답</span></div><div class="kpi"><b>${A.pct(sum.n ? sum.c / sum.n : 0)}</b><span>원점수 정답률</span></div><div class="kpi"><b>${A.mmss((r.dur || 0) / 1000)}</b><span>소요 시간</span></div></div></section>
  <section class="card tight"><div class="list">${A.DIDS.filter((d) => sum.by[d]).map((d) => {
    const [n, c] = sum.by[d];
    const p = n ? c / n : 0;
    return `<div class="drow"><span class="dn">${D[d].code} · ${Math.round(D[d].w * 100)}%<small>${esc(D[d].short)}</small></span><span class="bar"><i class="${barCls(p)}" style="width:${Math.round(p * 100)}%"></i><span class="mark65"></span></span><span class="pct">${A.pct(p)}<small>${c}/${n}</small></span></div>`;
  }).join('')}</div></section>
  <div class="grid-2"><button class="btn" data-act="review" data-v="all">전체 해설</button><button class="btn" data-act="review" data-v="wrong" ${wrongIds.length ? '' : 'disabled'}>틀린 문제 해설</button></div>
  <button class="btn primary lg block" data-act="retry-wrong" ${wrongIds.length ? '' : 'disabled'}>${I.repeat}틀린 ${wrongIds.length}문항 다시 풀기</button>
  <div class="sec-head"><h2 class="sec-title">문항별 결과</h2><small>탭하면 해설</small></div>
  <section class="card"><div class="grid-nav">${s.ids.map((id, i) => `<button class="${s.ans[id] && s.ans[id].ok ? 'y' : 'n'}" data-act="review" data-v="all" data-i="${i}">${i + 1}</button>`).join('')}</div></section>
  <button class="btn ghost block" data-act="tab" data-v="home">홈으로</button>
</main>`;
  }

  // =====================================================================
  // 오답노트 · 북마크 · 기록
  // =====================================================================
  function wrongIdsSorted() {
    return Object.keys(S.wrong).filter((id) => A.QM[id]).sort((a, b) => S.wrong[b].t - S.wrong[a].t);
  }
  function wrongView() {
    const seg = V.wrongSeg;
    const wIds = wrongIdsSorted();
    const bIds = S.bm.filter((id) => A.QM[id]);
    let body = '';
    if (seg === 'hist') body = histBody();
    else {
      let ids = seg === 'wrong' ? wIds : bIds;
      const counts = {};
      for (const id of ids) counts[A.QM[id].d] = (counts[A.QM[id].d] || 0) + 1;
      if (V.wrongD) ids = ids.filter((id) => A.QM[id].d === V.wrongD);
      const shown = ids.slice(0, V.listLimit);
      body = `<div class="chips"><button class="chip" data-act="wd" data-v="0" aria-pressed="${!V.wrongD}">전체 <span class="n">${(seg === 'wrong' ? wIds : bIds).length}</span></button>${A.DIDS.map((d) => `<button class="chip" data-act="wd" data-v="${d}" aria-pressed="${V.wrongD === d}">${D[d].code} <span class="n">${counts[d] || 0}</span></button>`).join('')}</div>
      ${ids.length ? `<div class="grid-2"><button class="btn primary" data-act="wplay" data-v="all">${I.play}모두 풀기 · ${ids.length}</button><button class="btn" data-act="wplay" data-v="rand">${I.shuffle}랜덤 20</button></div>
      <div class="stack">${shown.map((id, i) => qItem(id, i, seg)).join('')}</div>
      ${ids.length > shown.length ? `<button class="btn block" data-act="more">더 보기 (${ids.length - shown.length})</button>` : ''}` :
      `<div class="card empty">${seg === 'wrong' ? '<b>오답노트가 비어 있습니다</b>틀린 문제는 자동으로 여기에 모이고, 연속으로 맞히면 졸업합니다.' : '<b>북마크한 문제가 없습니다</b>문제 화면 아래의 ★ 버튼으로 저장하세요.'}</div>`}`;
    }
    return `${topbar('오답노트', { right: `<button class="icon-btn" data-act="go" data-v="settings" aria-label="설정">${I.gear}</button>` })}
<main class="view">
  ${segHtml('wseg', [['wrong', `오답 ${wIds.length}`], ['bm', `북마크 ${bIds.length}`], ['hist', '풀이 기록']], seg)}
  ${body}
</main>`;
  }
  function qItem(id, i, seg) {
    const q = A.QM[id];
    const w = S.wrong[id];
    const p = S.prog[id];
    return `<button class="qitem" data-act="witem" data-v="${i}"><span class="meta">${dtag(q.d)}${kb(q.k)}${q.t ? `<span class="ttag">${esc(q.t)}</span>` : ''}</span><span class="qs">${esc(q.q)}</span><span class="meta">${w ? `<span class="cnt-bad">✗ ${w.n}회</span><span class="streak">졸업 ${w.ok}/${S.set.grad}</span>` : ''}${p ? `<span>시도 ${p.n} · 정답 ${p.c}</span><span>${A.ago(p.t)}</span>` : '<span>미풀이</span>'}<span class="wp mono" style="margin-left:auto">${esc(id)}</span></span></button>`;
  }
  function histBody() {
    const days = Object.keys(S.daily).sort().reverse().slice(0, 30);
    const est = A.estimate();
    return `<section class="card stack"><div class="kpis"><div class="kpi"><b>${A.fmtNum(est.att)}</b><span>총 풀이 횟수</span></div><div class="kpi"><b>${A.pct(est.att ? est.corr / est.att : null)}</b><span>누적 정답률</span></div><div class="kpi"><b>${A.dayStreak()}일</b><span>연속 학습</span></div></div></section>
    <div class="sec-head"><h2 class="sec-title">세션 기록</h2><small>최근 ${Math.min(S.hist.length, 30)}회</small></div>
    <section class="card tight">${S.hist.length ? `<div class="list">${S.hist.slice(0, 30).map(histRow).join('')}</div>` : '<div class="empty">아직 끝낸 세션이 없습니다.</div>'}</section>
    <div class="sec-head"><h2 class="sec-title">일별 기록</h2><small>최근 30일</small></div>
    <section class="card tight">${days.length ? `<div class="tbl"><table><thead><tr><th>날짜</th><th>풀이</th><th>정답</th><th>정답률</th></tr></thead><tbody>${days.map((d) => `<tr><td class="mono">${d}</td><td class="mono">${S.daily[d][0]}</td><td class="mono">${S.daily[d][1]}</td><td class="mono">${A.pct(S.daily[d][1] / Math.max(1, S.daily[d][0]))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">기록이 없습니다.</div>'}</section>`;
  }
  function currentWrongList() {
    let ids = V.wrongSeg === 'wrong' ? wrongIdsSorted() : S.bm.filter((id) => A.QM[id]);
    if (V.wrongD) ids = ids.filter((id) => A.QM[id].d === V.wrongD);
    return ids;
  }

  // =====================================================================
  // 암기카드
  // =====================================================================
  function deckKnown(d) {
    const m = S.cards[d.id] || {};
    return d.cards.reduce((n, _, i) => n + (m[i] === 1 ? 1 : 0), 0);
  }
  function cardsView() {
    const total = A.decks.reduce((n, d) => n + d.cards.length, 0);
    const known = A.decks.reduce((n, d) => n + deckKnown(d), 0);
    return `${topbar('암기카드', { right: `<button class="icon-btn" data-act="go" data-v="settings" aria-label="설정">${I.gear}</button>` })}
<main class="view">
  <section class="card row"><span class="grow"><span class="eyebrow">초압축 암기</span><br><b style="font-size:1.05rem">${A.decks.length}개 덱 · ${A.fmtNum(total)}장</b><br><span class="muted" style="font-size:.8rem">탭해서 뒤집고, ‘알아요/모름’으로 분류하세요. 모름 카드만 다시 돌릴 수 있습니다.</span></span><span class="mono" style="text-align:right"><b style="font-size:1.4rem">${A.pct(total ? known / total : 0)}</b><br><span class="muted" style="font-size:.72rem">${known}장 암기</span></span></section>
  ${A.decks.length ? `<div class="decks">${A.decks.map((d) => {
    const k = deckKnown(d);
    const p = d.cards.length ? k / d.cards.length : 0;
    return `<button class="deck" data-act="deck" data-v="${esc(d.id)}"><span class="ic">${esc(d.tag || (d.d ? 'D' + d.d : '★'))}</span><span style="min-width:0"><b>${esc(d.title)}</b><span>${esc(d.desc || '')}</span></span><span class="prog">${k}/${d.cards.length}<span class="bar"><i class="${p >= 0.8 ? 'ok' : ''}" style="width:${Math.round(p * 100)}%"></i></span></span></button>`;
  }).join('')}</div>` : '<div class="card empty">암기카드 데이터가 없습니다.</div>'}
</main>`;
  }
  function startDeck(id, onlyUnknown) {
    const d = A.decks.find((x) => x.id === id);
    if (!d) return;
    const m = S.cards[d.id] || {};
    let order = d.cards.map((_, i) => i);
    if (onlyUnknown) order = order.filter((i) => m[i] !== 1);
    if (!order.length) order = d.cards.map((_, i) => i);
    V.deck = { id, order: S.set.shuffleCards === false ? order : A.shuffle(order), i: 0, flip: false, yes: 0, no: [] };
  }
  function deckView() {
    const st = V.deck;
    const d = st && A.decks.find((x) => x.id === st.id);
    if (!d) return `${topbar('암기카드', { back: true })}<main class="view plain"><div class="empty">덱을 찾을 수 없습니다</div></main>`;
    const done = st.i >= st.order.length;
    const head = topbar(esc(d.title), { back: true, right: `<span class="mono muted" style="font-size:.85rem">${Math.min(st.i + 1, st.order.length)}/${st.order.length}</span><button class="icon-btn" data-act="deck-shuffle" aria-label="섞기">${I.shuffle}</button>` });
    if (done) {
      return `${head}<main class="view plain"><section class="card res-hero"><span class="eyebrow">덱 완료</span><div class="score-num">${st.yes}<small>/ ${st.order.length}</small></div><span class="pill ${st.no.length ? 'fail' : 'pass'}">${st.no.length ? `모름 ${st.no.length}장` : '전부 암기!'}</span></section>
      ${st.no.length ? `<button class="btn primary lg block" data-act="deck-again" data-v="no">${I.repeat}모름 ${st.no.length}장만 다시</button>` : ''}
      <button class="btn block" data-act="deck-again" data-v="all">처음부터 다시</button><button class="btn ghost block" data-act="deck-again" data-v="unknown">아직 못 외운 카드만</button></main>`;
    }
    const c = d.cards[st.order[st.i]];
    const m = S.cards[d.id] || {};
    const mark = m[st.order[st.i]];
    return `${head}
<main class="view with-bar">
  <div class="qprog" style="margin:0"><i style="width:${(st.i / st.order.length) * 100}%"></i></div>
  <div class="flip-wrap"><div class="flip ${st.flip ? 'on' : ''}" data-act="flip" role="button" aria-label="카드 뒤집기" tabindex="0">
    <div class="face front"><div class="eyebrow"><span>Q · ${esc(d.title)}</span><span>${mark === 1 ? '✓ 암기' : mark === 0 ? '✗ 복습' : ''}</span></div><div class="fq">${A.highlight(c.f)}</div><div class="tap">탭하여 뒤집기 · 밀어서 분류 (← 모름 / 알아요 →)</div></div>
    <div class="face back"><div class="eyebrow"><span>A</span><span>${st.i + 1}/${st.order.length}</span></div><div class="fa md" style="padding:0">${A.md(c.b)}</div></div>
  </div></div>
</main>
<nav class="card-actions"><button class="btn danger" data-act="card" data-v="0">${I.close}모름</button><button class="btn" data-act="flip">뒤집기</button><button class="btn ok" data-act="card" data-v="1">${I.ok}알아요</button></nav>`;
  }
  function cardMark(v) {
    const st = V.deck;
    if (!st || st.i >= st.order.length) return;
    const m = S.cards[st.id] || (S.cards[st.id] = {});
    const idx = st.order[st.i];
    m[idx] = v;
    if (v) st.yes++;
    else st.no.push(idx);
    A.save('cards');
    st.i++;
    st.flip = false;
    vibrate(v ? 10 : [15, 30, 15]);
    render({ top: true });
  }

  // =====================================================================
  // ISACA 공식 탭 (10계명 · 한 줄 공식 · 요점노트)
  // =====================================================================
  function isacaView() {
    const seg = V.isacaSeg;
    const X = A.isaca;
    let body = '';
    if (seg === 'cmd') {
      body = `<p class="note-line">헷갈리면 이 순서로 판단하세요. 10개 원칙이 CISA 정답의 대부분을 결정합니다.</p>
      ${X.commandments.map((c) => {
        const open = V.openCmd[c.n];
        return `<section class="card cmd ${open ? 'open' : ''}"><button data-act="cmd" data-v="${c.n}" aria-expanded="${!!open}"><span class="no">${String(c.n).padStart(2, '0')}</span><span class="tt"><b>${esc(c.title)}</b><span>${esc(c.rule)}</span></span><span class="chev">${I.chev}</span></button>
        ${open ? `<div class="body"><span class="eyebrow">${esc(c.en)}</span><p style="margin:0;color:var(--fg-2);font-size:.92rem">${esc(c.why)}</p>
        <div><span class="lbl">이런 지문이면 떠올리기</span><div class="chips" style="margin-top:6px">${c.signals.map((x) => `<span class="ttag" style="max-width:none">${A.highlight(x)}</span>`).join('')}</div></div>
        <div class="md" style="padding:0"><blockquote class="trap"><p><strong>함정 보기</strong></p>${c.traps.map((t) => `<p>✗ ${esc(t)}</p>`).join('')}</blockquote>
        ${c.ex ? `<blockquote class="tip"><p><strong>예시</strong> ${esc(c.ex.q)}</p><p>✓ ${esc(c.ex.a)} — ${esc(c.ex.why)}</p></blockquote>` : ''}</div></div>` : ''}</section>`;
      }).join('')}
      ${X.bonus && X.bonus.length ? `<div class="sec-head"><h2 class="sec-title">보너스 원칙</h2></div><section class="card tight"><div class="list">${X.bonus.map((b) => `<div class="frow"><b>${esc(b.title)}</b><span>${esc(b.rule)}</span></div>`).join('')}</div></section>` : ''}`;
    } else if (seg === 'formula') {
      body = `<div class="search">${I.search}<input class="input" id="fsearch" type="search" placeholder="공식 검색 (예: RPO, 전자서명, 샘플링)" data-on="fsearch" autocomplete="off"></div>
      <div class="sec-head"><h2 class="sec-title">키워드 공략법</h2></div>
      <div class="stack">${A.KTYPES.map((k) => `<div class="khint k-${k}"><span><b>${k}</b> ${esc(A.KLABEL[k])}<br>${esc((X.keywordTips || {})[k] || '')}</span></div>`).join('')}</div>
      ${X.formulas.map((g) => `<section class="card tight fgroup" data-fg><h3>${esc(g.g)}</h3><div class="list">${g.items.map(([f, d]) => `<div class="frow" data-fr="${esc((f + ' ' + d).toLowerCase())}"><b>${esc(f)}</b><span>${esc(d)}</span></div>`).join('')}</div></section>`).join('')}`;
    } else {
      body = `<section class="card tight notes-list"><div class="list">${notesList()}</div></section>
      <p class="note-line">각 노트는 단원별 ★ 중요도와 함께 시험에 나오는 개념을 압축했습니다. 노트 안에서 검색할 수 있습니다.</p>`;
    }
    return `${topbar('ISACA 공식', { right: `<button class="icon-btn" data-act="go" data-v="settings" aria-label="설정">${I.gear}</button>` })}
<main class="view">${segHtml('iseg', [['cmd', '10계명'], ['formula', '한 줄 공식'], ['notes', '요점노트']], seg)}${body}</main>`;
  }
  function noteView(p) {
    const n = A.notes.find((x) => x.id === p.id);
    if (!n) return `${topbar('요점 노트', { back: true })}<main class="view plain"><div class="empty">노트를 찾을 수 없습니다</div></main>`;
    const starOnly = V.noteStar;
    const secs = (n.sections || []).filter((s) => !starOnly || (s.stars || 0) >= 3);
    return `${topbar(esc(n.title), { back: true })}
<main class="view plain">
  <section class="card stack"><span class="eyebrow">${n.domain ? `${D[n.domain].code} · 출제 비중 ${n.weight || Math.round(D[n.domain].w * 100)}%` : '핵심 요약'}</span>${n.summary ? `<p style="margin:0;color:var(--fg-2)">${esc(n.summary)}</p>` : ''}
  <div class="row wrap"><button class="chip" data-act="note-star" aria-pressed="${!!starOnly}">★★★ 핵심만</button><button class="chip" data-act="note-open" data-v="1">모두 펼치기</button><button class="chip" data-act="note-open" data-v="0">모두 접기</button></div></section>
  <div class="search">${I.search}<input class="input" id="nsearch" type="search" placeholder="노트 내 검색" data-on="nsearch" autocomplete="off"></div>
  ${secs.map((s, i) => `<details class="card sec" data-sec="${esc((s.title + ' ' + s.body).toLowerCase())}" ${i === 0 ? 'open' : ''}><summary><b>${esc(s.title)}</b><span class="stars">${'★'.repeat(s.stars || 1)}</span><span class="chev">${I.chev}</span></summary><div class="md">${A.md(s.body)}</div></details>`).join('')}
  ${n.domain ? `<button class="btn primary lg block" data-act="quick" data-q="dom" data-d="${n.domain}">${I.play}${D[n.domain].code} 문제 20개 풀기</button>` : ''}
</main>`;
  }

  // =====================================================================
  // 설정 · 백업
  // =====================================================================
  function settingsView() {
    const t = S.set;
    const qn = A.Q.length;
    return `${topbar('설정', { back: true })}
<main class="view plain">
  <div class="sec-head"><h2 class="sec-title">화면</h2></div>
  <section class="card stack"><span class="lbl">테마</span>${segHtml('set-theme', [['dark', '다크(기본)'], ['light', '라이트'], ['auto', '시스템']], t.theme)}
  <span class="lbl">글자 크기</span>${segHtml('set-fs', [['sm', '작게'], ['md', '보통'], ['lg', '크게'], ['xl', '아주 크게']], t.fs)}
  <div class="row"><span class="grow">화면 꺼짐 방지 <span class="muted" style="font-size:.78rem">(문제·카드 화면, 지원 기기)</span></span>${toggleHtml('s-wake', t.wake, 'set-wake')}</div></section>
  <div class="sec-head"><h2 class="sec-title">풀이</h2></div>
  <section class="card stack">
    <div class="row"><span class="grow">원탭 채점<br><span class="muted" style="font-size:.78rem">끄면 ‘선택 → 정답 확인’ 두 단계 (흔들리는 지하철 오터치 방지)</span></span>${toggleHtml('s-onetap', t.oneTap, 'set-onetap')}</div>
    <div class="row"><span class="grow">보기 순서 섞기<br><span class="muted" style="font-size:.78rem">위치 암기를 막아 실력을 정확히 측정</span></span>${toggleHtml('s-shuffle', t.shuffle, 'set-shuffle')}</div>
    <div class="row"><span class="grow">키워드 공략 힌트 표시</span>${toggleHtml('s-hint', t.hint, 'set-hint')}</div>
    <div class="row"><span class="grow">진동 피드백</span>${toggleHtml('s-vib', t.vibrate, 'set-vib')}</div>
    <span class="lbl">오답노트 졸업 기준 (연속 정답)</span>${segHtml('set-grad', [[1, '1회'], [2, '2회'], [3, '3회']], t.grad)}
  </section>
  <div class="sec-head"><h2 class="sec-title">시험일</h2></div>
  <section class="card stack"><div class="field"><label for="s-date">CISA 응시 예정일 (홈에 D-day 표시)</label><input class="input" type="date" id="s-date" value="${esc(t.examDate || '')}" data-on="set-date"></div></section>
  <div class="sec-head"><h2 class="sec-title">학습 기록 백업</h2><small>${A.store.ok ? '이 기기 브라우저에 자동 저장 중' : '저장소 사용 불가 — 백업 필수'}</small></div>
  <section class="card stack">
    <p class="note-line" style="margin:0">풀이 기록·오답노트·북마크·카드 진도는 이 브라우저(localStorage)에 자동 저장됩니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에 백업하세요.</p>
    <div class="grid-2"><button class="btn" data-act="backup-copy">백업 코드 복사</button><button class="btn" data-act="backup-file">파일로 저장</button></div>
    <textarea class="input" id="s-backup" placeholder="복원: 백업 코드를 여기에 붙여넣기" spellcheck="false"></textarea>
    <div class="grid-2"><button class="btn primary" data-act="restore-text">붙여넣은 코드로 복원</button><label class="btn" for="s-file">파일에서 복원</label></div>
    <input type="file" id="s-file" accept="application/json,.json,.txt" data-on="restore-file" hidden>
    <button class="btn danger block" data-act="reset">모든 학습 기록 초기화</button>
  </section>
  <div class="sec-head"><h2 class="sec-title">정보</h2></div>
  <section class="card tight"><div class="list">
    <div class="frow"><b>문제은행 ${A.fmtNum(qn)}문항</b><span>${A.DIDS.map((d) => `${D[d].code} ${A.byD[d].length}`).join(' · ')}</span></div>
    <div class="frow"><b>암기카드 ${A.decks.length}덱 · 요점노트 ${A.notes.length}권</b><span>데이터 팩: ${(window.CISA.loaded || []).length}개 파일</span></div>
    <div class="frow"><b>점수 환산</b><span>첫 시도 정답률을 D1 18 · D2 18 · D3 12 · D4 26 · D5 26% 가중 평균 → 0~65%는 200~450, 65~100%는 450~800으로 선형 환산 (ISACA 비공개 환산식의 근사)</span></div>
  </div></section>
</main>`;
  }

  // ---------- 뷰 등록 ----------
  const VIEWS = { home: homeView, exam: examView, quiz: quizView, result: resultView, wrong: wrongView, cards: cardsView, deck: deckView, isaca: isacaView, note: noteView, settings: settingsView };
  const AFTER = { quiz: quizAfter };

  // =====================================================================
  // 액션
  // =====================================================================
  const pickIds = {
    daily: () => A.weightedPick(10, true),
    weak: () => {
      const w = weakestDomain(A.domainStats());
      return w ? prioritize(A.byD[w.d]).slice(0, 20) : [];
    },
    wrong: () => A.shuffle(wrongIdsSorted()).slice(0, 50),
    dom: (d) => prioritize(A.byD[d]).slice(0, 20),
    kw: (k) => prioritize(A.Q.filter((q) => q.k === k)).slice(0, 20)
  };
  function prioritize(qs) {
    // 오답 → 미풀이 → 나머지 순으로 섞어서
    const w = [];
    const n = [];
    const r = [];
    for (const q of qs) (S.wrong[q.id] ? w : !S.prog[q.id] ? n : r).push(q.id);
    return A.shuffle(w).concat(A.shuffle(n), A.shuffle(r));
  }
  const QTITLE = { daily: '오늘의 10문제', weak: '약점 집중', wrong: '오답 복습', dom: '도메인 연습', kw: '키워드 집중' };

  const ACT = {
    tab: (el) => {
      if (el.dataset.seg) V.examSeg = el.dataset.seg;
      if (V.cur.name === 'quiz') saveElapsed();
      A.go(el.dataset.v);
    },
    go: (el) => A.go(el.dataset.v),
    back: () => A.back(),
    'sheet-yes': () => A.closeSheet(true),
    'sheet-no': () => A.closeSheet(false),
    quick: (el) => {
      const t = el.dataset.q;
      const d = Number(el.dataset.d);
      const k = el.dataset.k;
      const ids = pickIds[t](t === 'kw' ? k : d);
      if (!ids.length) return A.toast(t === 'wrong' ? '오답노트가 비어 있습니다' : '문제가 없습니다');
      const title = t === 'dom' ? `${D[d].code} 연습` : t === 'kw' ? `${k} 집중` : t === 'weak' ? `약점 집중 · ${D[A.QM[ids[0]].d].code}` : QTITLE[t];
      startSession({ ids, title, src: t });
    },
    resume: () => {
      const r = S.resume;
      if (!r) return;
      V.sess = r;
      V.sess._t0 = 0;
      V.pending = null;
      A.go('quiz');
    },
    eseg: (el) => { V.examSeg = el.dataset.v; render({ top: true }); },
    fd: (el) => {
      const v = Number(el.dataset.v);
      const f = V.f;
      if (!v) f.d = [];
      else f.d = f.d.includes(v) ? f.d.filter((x) => x !== v) : f.d.concat(v).sort();
      if (f.d.length !== 1) f.topic = '';
      saveFilter();
      rerender();
    },
    fk: (el) => {
      const v = el.dataset.v;
      V.f.k = V.f.k.includes(v) ? V.f.k.filter((x) => x !== v) : V.f.k.concat(v);
      saveFilter();
      rerender();
    },
    fst: (el) => { V.f.st = el.dataset.v; saveFilter(); rerender(); },
    flv: (el) => {
      const v = Number(el.dataset.v);
      V.f.lv = V.f.lv.includes(v) ? V.f.lv.filter((x) => x !== v) : V.f.lv.concat(v);
      saveFilter();
      rerender();
    },
    fn: (el) => { V.f.n = el.dataset.v === 'all' ? 'all' : Number(el.dataset.v); saveFilter(); rerender(); },
    ford: (el) => { V.f.order = el.dataset.v; saveFilter(); rerender(); },
    freset: () => { V.f = { d: [], k: [], st: 'all', lv: [], topic: '', q: '', n: 20, order: 'rand' }; saveFilter(); rerender(); },
    'start-practice': () => {
      let list = A.filterQ(V.f).map((q) => q.id);
      if (V.f.order === 'rand') A.shuffle(list);
      if (V.f.n !== 'all') list = list.slice(0, Number(V.f.n));
      const parts = [];
      if (V.f.d.length) parts.push(V.f.d.map((d) => D[d].code).join('·'));
      if (V.f.k.length) parts.push(V.f.k.join('·'));
      startSession({ ids: list, title: parts.length ? parts.join(' ') + ' 연습' : '맞춤 연습', src: 'filter' });
    },
    mock: (el) => {
      const e = A.EXAMS.find((x) => x.id === el.dataset.v);
      startSession({ ids: A.weightedPick(e.n, V.preferNew), title: e.name, mode: 'exam', limit: e.min * 60, src: 'mock-' + e.id });
    },
    pick: (el) => pick(Number(el.dataset.v)),
    check: () => grade(V.pending),
    next: () => move(1),
    prev: () => move(-1),
    finish: () => finishSession(),
    submit: () => { A.closeSheet(false); submitExam(false); },
    bm: () => {
      const q = curQ();
      if (!q) return;
      const on = A.toggleBm(q.id);
      A.toast(on ? '북마크에 저장했습니다' : '북마크를 해제했습니다');
      rerender();
    },
    flag: () => {
      const s = V.sess;
      const q = curQ();
      s.flag[q.id] = !s.flag[q.id];
      A.persistSession(s);
      rerender();
    },
    khint: () => { V.hint = V.hint === true ? 'off' : true; rerender(); },
    'quiz-grid': () => gridSheet(),
    jump: (el) => {
      A.closeSheet(false);
      const s = V.sess;
      s.i = Number(el.dataset.v);
      V.pending = null;
      A.persistSession(s);
      render({ top: true });
    },
    'quiz-exit': async () => {
      const s = V.sess;
      if (s && s.mode === 'exam' && !s.done) {
        const ok = await A.confirm({ title: '모의고사를 잠시 나갈까요?', body: '응답과 남은 시간이 저장되어 홈의 ‘이어서 풀기’로 계속할 수 있습니다. 나가 있는 동안 타이머는 멈춥니다.', yes: '나가기', no: '계속 풀기' });
        if (!ok) return;
      }
      saveElapsed();
      A.back();
    },
    review: (el) => {
      const r = V.result;
      if (!r) return;
      const s = r.sess;
      const ids = el.dataset.v === 'wrong' ? s.ids.filter((id) => !(s.ans[id] && s.ans[id].ok)) : s.ids.slice();
      const rs = A.newSession({ ids, title: el.dataset.v === 'wrong' ? '틀린 문제 해설' : '전체 해설', mode: 'review' });
      for (const id of ids) {
        rs.ans[id] = s.ans[id] || { s: null, ok: false };
        rs.perm[id] = s.perm[id];
      }
      rs.i = el.dataset.i ? Number(el.dataset.i) : 0;
      V.sess = rs;
      A.go('quiz');
    },
    'retry-wrong': () => {
      const r = V.result;
      if (!r) return;
      const ids = r.sess.ids.filter((id) => !(r.sess.ans[id] && r.sess.ans[id].ok));
      startSession({ ids: A.shuffle(ids), title: '틀린 문제 재도전', src: 'retry' });
    },
    wseg: (el) => { V.wrongSeg = el.dataset.v; V.listLimit = 40; render({ top: true }); },
    wd: (el) => { V.wrongD = Number(el.dataset.v); V.listLimit = 40; rerender(); },
    more: () => { V.listLimit += 40; rerender(); },
    wplay: (el) => {
      let ids = currentWrongList();
      ids = el.dataset.v === 'rand' ? A.shuffle(ids.slice()).slice(0, 20) : ids.slice();
      startSession({ ids, title: V.wrongSeg === 'wrong' ? '오답노트' : '북마크', src: 'wrong' });
    },
    witem: (el) => {
      const ids = currentWrongList();
      const i = Number(el.dataset.v);
      startSession({ ids: ids.slice(i).concat(ids.slice(0, i)), title: V.wrongSeg === 'wrong' ? '오답노트' : '북마크', src: 'wrong' });
    },
    deck: (el) => { startDeck(el.dataset.v, false); A.go('deck', { id: el.dataset.v }); },
    flip: () => {
      if (!V.deck) return;
      V.deck.flip = !V.deck.flip;
      const f = document.querySelector('.flip');
      if (f) f.classList.toggle('on', V.deck.flip);
    },
    card: (el) => cardMark(Number(el.dataset.v)),
    'deck-shuffle': () => {
      const st = V.deck;
      if (!st) return;
      const rest = A.shuffle(st.order.slice(st.i));
      st.order = st.order.slice(0, st.i).concat(rest);
      st.flip = false;
      render({ top: true });
      A.toast('남은 카드를 섞었습니다');
    },
    'deck-again': (el) => {
      const st = V.deck;
      const v = el.dataset.v;
      if (v === 'no') V.deck = { id: st.id, order: A.shuffle(st.no.slice()), i: 0, flip: false, yes: 0, no: [] };
      else startDeck(st.id, v === 'unknown');
      render({ top: true });
    },
    iseg: (el) => { V.isacaSeg = el.dataset.v; render({ top: true }); },
    cmd: (el) => { const n = el.dataset.v; V.openCmd[n] = !V.openCmd[n]; rerender(); },
    note: (el) => { V.noteStar = false; A.go('note', { id: el.dataset.id }); },
    'note-star': () => { V.noteStar = !V.noteStar; rerender(); },
    'note-open': (el) => document.querySelectorAll('details.sec').forEach((d) => { d.open = el.dataset.v === '1'; }),
    'set-theme': (el) => { S.set.theme = el.dataset.v; A.save('set'); A.applyTheme(); rerender(); },
    'set-fs': (el) => { S.set.fs = el.dataset.v; A.save('set'); A.applyTheme(); rerender(); },
    'set-grad': (el) => { S.set.grad = Number(el.dataset.v); A.save('set'); rerender(); },
    'backup-copy': () => {
      const text = A.exportData();
      const ta = document.getElementById('s-backup');
      const fallback = () => {
        if (ta) {
          ta.value = text;
          ta.focus();
          ta.select();
        }
        A.toast('복사가 막혀 있어 아래 칸에 코드를 넣었습니다. 길게 눌러 복사하세요');
      };
      try {
        navigator.clipboard.writeText(text).then(() => A.toast(`백업 코드를 복사했습니다 (${Math.round(text.length / 1024)}KB)`), fallback);
      } catch (e) {
        fallback();
      }
    },
    'backup-file': () => {
      try {
        const blob = new Blob([A.exportData()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cisa-backup-${A.today()}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        A.toast('백업 파일 저장을 시작했습니다 (막히면 ‘백업 코드 복사’를 쓰세요)');
      } catch (e) {
        A.toast('이 환경에서는 파일 저장이 막혀 있습니다. 백업 코드 복사를 사용하세요');
      }
    },
    'restore-text': async () => {
      const ta = document.getElementById('s-backup');
      const text = ta && ta.value.trim();
      if (!text) return A.toast('백업 코드를 먼저 붙여넣으세요');
      await restore(text);
    },
    reset: async () => {
      const ok = await A.confirm({ title: '모든 학습 기록을 지울까요?', body: '풀이 기록, 오답노트, 북마크, 카드 진도, 모의고사 기록이 삭제됩니다. 되돌릴 수 없으니 먼저 백업하세요.', yes: '전부 초기화', danger: true });
      if (!ok) return;
      A.resetAll();
      V.sess = null;
      A.toast('초기화했습니다');
      rerender();
    }
  };
  async function restore(text) {
    const ok = await A.confirm({ title: '백업으로 덮어쓸까요?', body: '현재 이 기기의 학습 기록이 백업 내용으로 바뀝니다.', yes: '복원', danger: true });
    if (!ok) return;
    try {
      A.importData(text);
      A.applyTheme();
      A.toast('복원했습니다');
      rerender();
    } catch (e) {
      A.toast('복원 실패: ' + e.message);
    }
  }
  const ON = {
    ftopic: (el) => { V.f.topic = el.value; saveFilter(); rerender(); },
    fq: (el) => { V.f.q = el.value; updateCount(); },
    prefnew: (el) => { V.preferNew = el.checked; },
    fsearch: (el) => {
      const t = el.value.trim().toLowerCase();
      document.querySelectorAll('[data-fg]').forEach((g) => {
        let any = false;
        g.querySelectorAll('[data-fr]').forEach((r) => {
          const hit = !t || r.dataset.fr.includes(t);
          r.hidden = !hit;
          any = any || hit;
        });
        g.hidden = !any;
      });
    },
    nsearch: (el) => {
      const t = el.value.trim().toLowerCase();
      document.querySelectorAll('details.sec').forEach((d) => {
        const hit = !t || d.dataset.sec.includes(t);
        d.hidden = !hit;
        if (t && hit) d.open = true;
      });
    },
    'set-onetap': (el) => { S.set.oneTap = el.checked; A.save('set'); },
    'set-shuffle': (el) => { S.set.shuffle = el.checked; A.save('set'); },
    'set-hint': (el) => { S.set.hint = el.checked; A.save('set'); },
    'set-vib': (el) => { S.set.vibrate = el.checked; A.save('set'); vibrate(20); },
    'set-wake': (el) => { S.set.wake = el.checked; A.save('set'); },
    'set-date': (el) => { S.set.examDate = el.value; A.save('set'); },
    'restore-file': (el) => {
      const f = el.files && el.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => restore(String(rd.result));
      rd.readAsText(f);
      el.value = '';
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (fn) {
      e.preventDefault();
      fn(el, e);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return A.back();
    if (V.cur.name === 'quiz' && !e.target.closest('input,textarea,select')) {
      if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
      else if (/^[1-4]$/.test(e.key)) {
        const q = curQ();
        const perm = V.sess.perm[q.id];
        const oi = perm[Number(e.key) - 1];
        if (oi != null && !(V.sess.ans[q.id] && V.sess.ans[q.id].ok != null)) pick(oi);
      } else if (e.key === 'Enter') {
        const b = document.querySelector('.actionbar .btn.primary');
        if (b && !b.disabled) b.click();
      }
    }
    if (V.cur.name === 'deck' && (e.key === ' ' || e.key === 'Enter') && e.target.closest('.flip')) {
      e.preventDefault();
      ACT.flip();
    }
  });
  const onField = (e) => {
    const el = e.target.closest('[data-on]');
    if (el && ON[el.dataset.on]) ON[el.dataset.on](el, e);
  };
  document.addEventListener('input', (e) => { if (e.target.matches('input[type="search"], textarea')) onField(e); });
  document.addEventListener('change', (e) => { if (!e.target.matches('input[type="search"], textarea')) onField(e); });

  // 스와이프: 문제(다음/이전) · 카드(알아요/모름)
  let tx = 0;
  let ty = 0;
  let tt = 0;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    tx = t.clientX;
    ty = t.clientY;
    tt = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (document.querySelector('.scrim')) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tx;
    const dy = t.clientY - ty;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50 || Date.now() - tt > 700) return;
    if (e.target.closest('.tbl, input, textarea, select, .seg, .chips')) return;
    if (V.cur.name === 'quiz') {
      const s = V.sess;
      const q = curQ();
      if (!s || !q) return;
      if (dx < 0) {
        const graded = s.mode !== 'practice' || (s.ans[q.id] && s.ans[q.id].ok != null);
        if (graded) move(1);
        else A.toast('먼저 답을 고르고 정답을 확인하세요');
      } else move(-1);
    } else if (V.cur.name === 'deck' && V.deck && V.deck.i < V.deck.order.length) {
      cardMark(dx > 0 ? 1 : 0);
    }
  }, { passive: true });

  A.startApp = () => {
    A.buildIndex();
    A.applyTheme();
    if (S.resume && !(S.resume.ids || []).every((id) => A.QM[id])) A.persistSession(null);
    render({ top: true });
  };
})();
