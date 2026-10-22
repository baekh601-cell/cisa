// 문제은행 품질 지표 — '내용을 모르고 패턴만으로' 정답을 맞힐 수 있는 정도를 측정한다.
// 실제 시험은 4개 보기가 모두 그럴듯하므로 이런 휴리스틱의 정답률이 무작위(25%)에 가까워야 한다.
const MIND = /위험|평가|검토|이해|파악|식별|보고|권고|비즈니스|목표|정렬|정책|경영진|근본|문서화|승인|독립/g;
const ABS = /즉시|모든|전부|항상|절대|생략|무시|폐기|중단|금지|직접 수정|직접 (변경|삭제|적용|구현)|징계/;
export const TRIVIA = /비용이 (증가|늘어)|인건비|라이선스 비용|서식|양식이 다|글씨|편의에 따라|교대 근무|색상|폰트|외관|시간을 많이|불만이|사기가 저하|선호한다/;

const argmax = (arr) => {
  const m = Math.max(...arr);
  const idx = arr.map((v, i) => (v === m ? i : -1)).filter((i) => i >= 0);
  return idx.length === 1 ? idx[0] : -1;
};

export function metrics(qs) {
  const n = qs.length || 1;
  let longest = 0, shortest = 0, heuristic = 0, trivia = 0, least = 0, opener = 0;
  for (const q of qs) {
    const L = q.o.map((s) => s.length);
    if (argmax(L) === q.a) longest++;
    if (argmax(L.map((x) => -x)) === q.a) shortest++;
    const ab = q.o.map((o) => ABS.test(o));
    const mk = q.o.map((o) => (o.match(MIND) || []).length);
    const best = q.o.map((_, i) => i).filter((i) => !ab[i]).sort((a, b) => mk[b] - mk[a] || L[b] - L[a])[0];
    if (best === q.a) heuristic++;
    if (q.o.some((o, i) => i !== q.a && TRIVIA.test(o))) trivia++;
    if (q.k === 'LEAST' || /\((NOT|EXCEPT|LEAST)/.test(q.q)) least++;
    if (/^IS 감사인이/.test(q.q)) opener++;
  }
  const p = (x) => x / n;
  return { n: qs.length, heuristic: p(heuristic), longest: p(longest), shortest: p(shortest), trivia: p(trivia), least: p(least), opener: p(opener) };
}

// 실전 기준 (표본 변동을 감안한 배치 단위 한도)
export const LIMITS = { heuristic: 0.33, longest: 0.32, shortest: 0.32, trivia: 0.0, least: 0.0, opener: 0.25 };

export function judge(m) {
  const fails = [];
  for (const k of Object.keys(LIMITS)) if (m[k] > LIMITS[k] + 1e-9) fails.push(`${k} ${(m[k] * 100).toFixed(1)}% > ${(LIMITS[k] * 100).toFixed(0)}%`);
  return fails;
}

export const fmt = (m) =>
  `패턴 찍기 정답률 ${(m.heuristic * 100).toFixed(1)}% · 최장 보기=정답 ${(m.longest * 100).toFixed(1)}% · 최단 보기=정답 ${(m.shortest * 100).toFixed(1)}% · 허수 오답 ${(m.trivia * 100).toFixed(1)}% · 부정형 ${(m.least * 100).toFixed(1)}% · 'IS 감사인이' 시작 ${(m.opener * 100).toFixed(1)}%`;
