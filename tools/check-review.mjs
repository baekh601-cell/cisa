#!/usr/bin/env node
// 출제 검토 결과 검사 — 사용법: node tools/check-review.mjs <배치ID>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'staging/review/plan.json'), 'utf8'))[id];
const errs = [];
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errs.push(`${path.basename(f)}: ${e.message}`); return null; } };
const src = read(path.join(ROOT, `staging/revise/in/${id}.json`));
const out = read(path.join(ROOT, `staging/review/out/${id}.json`));
const rev = read(path.join(ROOT, `staging/revise/out/${id}_p1.json`));
if (plan && src && out && rev) {
  const ids = new Map(src.map((q) => [q.id, q]));
  const flag = out.flag || [], core = out.core || [], sheet = out.sheet || [];
  const revIds = new Set(rev.map((q) => q.id));
  for (const f of flag) {
    if (!ids.has(f.id)) errs.push(`flag: 없는 id ${f.id}`);
    if (!/^[a-g]$/.test(f.why || '')) errs.push(`flag ${f.id}: why는 a~g`);
    if (!revIds.has(f.id)) errs.push(`flag ${f.id}: 교체 문항 없음`);
  }
  const flagIds = new Set(flag.map((f) => f.id));
  for (const q of rev) {
    if (!ids.has(q.id)) errs.push(`교체: 없는 id ${q.id}`);
    else if (q.t !== ids.get(q.id).t) errs.push(`교체 ${q.id}: 토픽(t) 변경 금지`);
    if (!flagIds.has(q.id)) errs.push(`교체 ${q.id}: flag에 사유 없음`);
  }
  if (new Set(rev.map((q) => q.id)).size !== rev.length) errs.push('교체: id 중복');
  if (new Set(core).size !== core.length) errs.push('core: id 중복');
  for (const c of core) if (!ids.has(c)) errs.push(`core: 없는 id ${c}`);
  if (Math.abs(core.length - plan.core) > 2) errs.push(`core 개수 ${core.length} (목표 ${plan.core}±2)`);
  const perTopic = {};
  for (const c of core) if (ids.has(c)) perTopic[ids.get(c).t] = (perTopic[ids.get(c).t] || 0) + 1;
  for (const t of plan.topics) {
    if ((perTopic[t] || 0) < 2) errs.push(`core: 토픽 ‘${t}’ 2개 미만`);
    const s = sheet.find((x) => x.t === t);
    if (!s) { errs.push(`sheet: 토픽 ‘${t}’ 없음`); continue; }
    if (!Array.isArray(s.must) || s.must.length < 4 || s.must.length > 7) errs.push(`sheet ‘${t}’: must 4~7개`);
    if (!Array.isArray(s.trap) || s.trap.length < 1 || s.trap.length > 3) errs.push(`sheet ‘${t}’: trap 1~3개`);
    for (const m of [...(s.must || []), ...(s.trap || [])]) {
      if (typeof m !== 'string' || m.length < 8) errs.push(`sheet ‘${t}’: 항목 형식 오류`);
      else if (m.length > 110) errs.push(`sheet ‘${t}’: 항목이 너무 김(${m.length}자): ${m.slice(0, 30)}…`);
    }
  }
  if (sheet.length !== plan.topics.length) errs.push(`sheet 토픽 수 ${sheet.length} (배정 ${plan.topics.length})`);
  console.log(`${id}: 문항 ${src.length} · 교체 ${rev.length} (${((100 * rev.length) / src.length).toFixed(0)}%) · 핵심 ${core.length} · 시트 ${sheet.length}토픽`);
  const why = {};
  for (const f of flag) why[f.why] = (why[f.why] || 0) + 1;
  console.log('사유:', JSON.stringify(why));
}
errs.forEach((e) => console.log('ERROR', e));
process.exit(errs.length ? 1 : 0);
