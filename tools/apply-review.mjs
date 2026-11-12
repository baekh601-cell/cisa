#!/usr/bin/env node
// 출제 검토 결과 반영 — staging/review/out/<배치>.json 의 핵심 선정(core)을 문항의 h:1 로 표시하고,
// 토픽별 압축 요약(sheet)을 data/notes/cram.js (도메인별 ‘압축 시트’ 노트)로 만든다.
// 교체 문항은 먼저 tools/apply-revisions.mjs 로 반영할 것. 사용법: node tools/apply-review.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QDIR = path.join(ROOT, 'data/questions');
const DRY = process.argv.includes('--dry');
const KEYS = ['id', 'd', 't', 'k', 'lv', 'q', 'o', 'a', 'e', 'f', 'p', 'h'];
const NAMES = { 1: '정보시스템 감사 프로세스', 2: 'IT 거버넌스 및 관리', 3: '정보시스템 취득·개발·구현', 4: '정보시스템 운영 및 비즈니스 복원력', 5: '정보자산 보호' };
const W = { 1: 18, 2: 18, 3: 12, 4: 26, 5: 26 };

const bank = {};
for (let d = 1; d <= 5; d++) {
  const box = [];
  vm.runInNewContext(fs.readFileSync(path.join(QDIR, `d${d}.js`), 'utf8'), { CISA: { addQuestions: (a) => box.push(...a) } });
  bank[d] = box;
}
const byId = new Map(Object.values(bank).flat().map((q) => [q.id, q]));
for (const q of byId.values()) delete q.h;

const done = fs.readFileSync(path.join(ROOT, 'staging/revise/DONE'), 'utf8').split(/\s+/).filter((x) => x.startsWith('Q_'));
const sheets = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
let core = 0, flagged = 0;
const why = {};
for (const b of done) {
  const r = JSON.parse(fs.readFileSync(path.join(ROOT, `staging/review/out/${b}.json`), 'utf8'));
  for (const id of r.core || []) { const q = byId.get(id); if (q && !q.h) { q.h = 1; core++; } }
  for (const f of r.flag || []) { flagged++; why[f.why] = (why[f.why] || 0) + 1; }
  const d = Number(b[3]);
  for (const s of r.sheet || []) sheets[d][s.t] = s;
}
const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const notes = [];
for (let d = 1; d <= 5; d++) {
  const order = [...new Set(bank[d].map((q) => q.t))];
  const sections = order.filter((t) => sheets[d][t]).map((t) => {
    const s = sheets[d][t];
    const n = bank[d].filter((q) => q.t === t && q.h).length;
    return { title: t, stars: 3, body: `${s.must.map((m) => `- ${clean(m)}`).join('\n')}\n\n**실무자 함정**\n${s.trap.map((m) => `- ${clean(m)}`).join('\n')}\n\n핵심 ★ ${n}문항` };
  });
  notes.push({ id: `cram${d}`, domain: d, cram: true, badge: '압축', order: d - 10, title: `D${d} 압축 시트 — ${NAMES[d]}`, weight: W[d],
    summary: '정답을 직접 가르는 암기 사실과, 실무 감각대로 답하면 틀리는 지점만 토픽별로 모았다. 주말에 정독하고, 시험 전날 한 번 더 훑는다.', sections });
}
if (!DRY) {
  for (let d = 1; d <= 5; d++) {
    const lines = bank[d].map((q) => JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, q[k]]))));
    fs.writeFileSync(path.join(QDIR, `d${d}.js`), `/* CISA 문제은행 · Domain ${d} ${NAMES[d]} · ${lines.length}문항\n   tools/build-questions.mjs · tools/apply-revisions.mjs · tools/apply-review.mjs 로 생성 — 형식은 tools/AUTHORING_GUIDE.md 참고. ID는 학습 기록과 연결되므로 바꾸지 말 것. */\nCISA.addQuestions([\n${lines.join(',\n')}\n]);\n`);
  }
  fs.writeFileSync(path.join(ROOT, 'data/notes/cram.js'), `/* 도메인별 압축 시트 — tools/apply-review.mjs 로 생성(출제 검토 결과의 토픽별 요약) */\nCISA.addNotes(${JSON.stringify(notes, null, 1)});\n`);
}
console.log(`${DRY ? '[DRY] ' : ''}배치 ${done.length} · 교체 판정 ${flagged} ${JSON.stringify(why)} · 핵심 ★ ${core}`);
for (let d = 1; d <= 5; d++) console.log(`D${d}: 핵심 ${bank[d].filter((q) => q.h).length}/${bank[d].length} · 시트 ${notes[d - 1].sections.length}/${new Set(bank[d].map((q) => q.t)).size}토픽`);
