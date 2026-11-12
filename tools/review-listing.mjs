#!/usr/bin/env node
// 출제 검토용 목록 생성 — 토픽 단위로 묶어 staging/review/in/Q_D<d>_<nn>.txt(지문·보기·정답)와
// staging/revise/in/Q_D<d>_<nn>.json(원문), staging/review/plan.json(배정표)을 만든다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAXQ = 175;
const AUD = /감사인|감사\s?(팀|부서|책임자|관리자|조직|실|담당자)|내부감사/;
const plan = {};
for (let d = 1; d <= 5; d++) {
  const qs = [];
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, `data/questions/d${d}.js`), 'utf8'), { CISA: { addQuestions: (a) => qs.push(...a) } });
  const topics = {};
  for (const q of qs) (topics[q.t] ||= []).push(q);
  // 큰 토픽부터 first-fit 으로 묶는다(토픽은 쪼개지 않음)
  const groups = [];
  for (const [t, list] of Object.entries(topics).sort((a, b) => b[1].length - a[1].length)) {
    let g = groups.find((x) => x.n + list.length <= MAXQ);
    if (!g) groups.push((g = { ts: [], n: 0 }));
    g.ts.push(t);
    g.n += list.length;
  }
  groups.forEach((g, gi) => {
    const id = `Q_D${d}_${String(gi + 1).padStart(2, '0')}`;
    const lines = [];
    const all = [];
    for (const t of g.ts) {
      lines.push(`\n### 토픽: ${t} (${topics[t].length}문항)`);
      for (const q of topics[t]) {
        all.push(q);
        const flags = [q.k, 'lv' + q.lv, q.p ? 'ISACA관점' : '', AUD.test(q.q) ? '감사인' : '', q.q.length <= 80 ? '짧은형' : ''].filter(Boolean).join(',');
        lines.push(`${q.id} [${flags}] ${q.q}`);
        q.o.forEach((o, i) => lines.push(`  ${i === q.a ? '★' : '-'} ${o}`));
      }
    }
    fs.writeFileSync(path.join(ROOT, `staging/review/in/${id}.txt`), lines.join('\n') + '\n');
    fs.writeFileSync(path.join(ROOT, `staging/revise/in/${id}.json`), '[\n' + all.map((q) => JSON.stringify(q)).join(',\n') + '\n]\n');
    plan[id] = { d, topics: g.ts, n: g.n, core: Math.round(g.n * 0.15) };
    console.log(id, g.n, g.ts.join(', '));
  });
}
fs.writeFileSync(path.join(ROOT, 'staging/review/plan.json'), JSON.stringify(plan, null, 1));
console.log('배치', Object.keys(plan).length);
