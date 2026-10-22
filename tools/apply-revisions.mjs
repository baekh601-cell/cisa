#!/usr/bin/env node
// 개정본 반영 — staging/revise/out/<배치>_p1·p2.json 의 개정 문항으로 data/questions 의 같은 ID 문항을 교체한다.
//  · staging/revise/DONE 에 적힌 배치만 반영, 검사 오류·ID 불일치 문항은 기존 문항 유지
//  · 개정 문항의 정답 위치를 0~3에 균등 재배치(보기·해설 동시 이동)
// 사용법: node tools/apply-revisions.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { checkQuestion, parseJsonFile } from './check-staging.mjs';
import { metrics, fmt } from './quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QDIR = path.join(ROOT, 'data/questions');
const RDIR = path.join(ROOT, 'staging/revise');
const DRY = process.argv.includes('--dry');
const KEYS = ['id', 'd', 't', 'k', 'lv', 'q', 'o', 'a', 'e', 'f', 'p'];
const NAMES = { 1: '정보시스템 감사 프로세스', 2: 'IT 거버넌스 및 관리', 3: '정보시스템 취득·개발·구현', 4: '정보시스템 운영 및 비즈니스 복원력', 5: '정보자산 보호' };

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const rng = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const bank = {};
for (let d = 1; d <= 5; d++) {
  const box = [];
  vm.runInNewContext(fs.readFileSync(path.join(QDIR, `d${d}.js`), 'utf8'), { CISA: { addQuestions: (a) => box.push(...a) } });
  bank[d] = box;
}
const byId = new Map(Object.values(bank).flat().map((q) => [q.id, q]));
const before = metrics([...byId.values()]);

const done = fs.existsSync(path.join(RDIR, 'DONE')) ? fs.readFileSync(path.join(RDIR, 'DONE'), 'utf8').split(/\s+/).filter(Boolean) : [];
const revised = [];
let rejected = 0;
for (const b of done) {
  const want = new Set(JSON.parse(fs.readFileSync(path.join(RDIR, 'in', `${b}.json`), 'utf8')).map((q) => q.id));
  for (const part of ['p1', 'p2']) {
    const f = path.join(RDIR, 'out', `${b}_${part}.json`);
    if (!fs.existsSync(f)) { console.log(`누락: ${b}_${part}`); continue; }
    const { data, error } = parseJsonFile(f);
    if (error) { console.log(`ERROR ${b}_${part}: ${error}`); continue; }
    for (const x of data) {
      const old = byId.get(x.id);
      const errs = checkQuestion(x).errors;
      if (!old || !want.has(x.id) || errs.length || x.k === 'LEAST') { rejected++; console.log(`유지(기존): ${x.id} ${errs.join('; ')}`); continue; }
      revised.push({ x, old });
    }
  }
}
// 정답 위치 균등화 (개정분 전체 기준)
const order = revised.map((_, i) => i).sort((i, j) => revised[i].old.id.localeCompare(revised[j].old.id));
const targets = order.map((_, i) => i % 4);
const r0 = rng(hash('rev-' + revised.length));
for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(r0() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
order.forEach((ri, k) => {
  const { x, old } = revised[ri];
  const r = rng(hash(x.id + x.q));
  const others = [0, 1, 2, 3].filter((j) => j !== x.a);
  for (let m = others.length - 1; m > 0; m--) { const j = Math.floor(r() * (m + 1)); [others[m], others[j]] = [others[j], others[m]]; }
  const perm = others.slice();
  perm.splice(targets[k], 0, x.a);
  Object.assign(old, { t: (x.t || old.t).trim(), k: x.k, lv: x.lv, q: x.q.trim(), o: perm.map((j) => x.o[j].trim()), a: targets[k], e: perm.map((j) => x.e[j].trim()), f: x.f.trim(), p: x.p === 1 ? 1 : undefined });
});
const after = metrics([...byId.values()]);
const rev = metrics(revised.map((r) => r.old));
if (!DRY) {
  for (let d = 1; d <= 5; d++) {
    const lines = bank[d].map((q) => JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, q[k]]))));
    fs.writeFileSync(path.join(QDIR, `d${d}.js`), `/* CISA 문제은행 · Domain ${d} ${NAMES[d]} · ${lines.length}문항\n   tools/build-questions.mjs · tools/apply-revisions.mjs 로 생성 — 형식은 tools/AUTHORING_GUIDE.md 참고. ID는 학습 기록과 연결되므로 바꾸지 말 것. */\nCISA.addQuestions([\n${lines.join(',\n')}\n]);\n`);
  }
}
console.log(`${DRY ? '[DRY] ' : ''}개정 반영 ${revised.length}문항 (배치 ${done.length}개) · 기존 유지 ${rejected}`);
console.log('개정 전 전체 :', fmt(before));
console.log('개정 문항    :', fmt(rev));
console.log('개정 후 전체 :', fmt(after));
