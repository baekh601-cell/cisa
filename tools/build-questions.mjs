#!/usr/bin/env node
// 문제은행 빌드 — staging/*.json 의 신규 문항을 data/questions/d1~d5.js 에 병합한다.
//  · 기존 문항과 ID는 그대로 보존(학습 기록이 ID에 연결되어 있음)
//  · 검사 오류 문항 제외, 지문 중복·유사 중복 제거
//  · 신규 문항만 정답 위치를 0~3에 균등 재배치(보기·해설 동시 이동)
//  · 신규 문항에 도메인별 다음 번호 ID 부여 (D1-0001 …)
// 사용법: node tools/build-questions.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { checkQuestion, normStem, parseJsonFile } from './check-staging.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QDIR = path.join(ROOT, 'data/questions');
const SDIR = path.join(ROOT, 'staging');
const DRY = process.argv.includes('--dry');
const KEYS = ['id', 'd', 't', 'k', 'lv', 'q', 'o', 'a', 'e', 'f'];

function loadExisting(d) {
  const file = path.join(QDIR, `d${d}.js`);
  if (!fs.existsSync(file)) return [];
  const box = { questions: [] };
  const ctx = { CISA: { addQuestions: (a) => box.questions.push(...a) } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return box.questions;
}

// 결정적 난수 (문항 지문 해시 시드) — 재빌드해도 같은 결과
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let x = seed || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}
function grams(s) {
  const t = normStem(s);
  const g = new Set();
  for (let i = 0; i < t.length - 3; i++) g.add(t.slice(i, i + 4));
  return g;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const report = { skippedErr: 0, dupExact: 0, dupNear: 0, nearPairs: [], added: {}, total: {} };
const all = {};
for (let d = 1; d <= 5; d++) all[d] = loadExisting(d);

const exactSeen = new Set();
const gramIdx = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (let d = 1; d <= 5; d++) {
  for (const q of all[d]) {
    exactSeen.add(normStem(q.q));
    gramIdx[d].push({ id: q.id, g: grams(q.q) });
  }
}

const files = fs.existsSync(SDIR) ? fs.readdirSync(SDIR).filter((f) => f.endsWith('.json')).sort() : [];
const fresh = { 1: [], 2: [], 3: [], 4: [], 5: [] };
for (const f of files) {
  const m = /D([1-5])/.exec(f);
  if (!m) { console.log(`건너뜀(도메인 미표기): ${f}`); continue; }
  const d = Number(m[1]);
  const { data, error } = parseJsonFile(path.join(SDIR, f));
  if (error) { console.log(`ERROR ${f}: ${error}`); continue; }
  data.forEach((x, i) => {
    const { errors } = checkQuestion(x);
    if (errors.length) { report.skippedErr++; console.log(`제외 ${f}[${i}]: ${errors.join('; ')}`); return; }
    const key = normStem(x.q);
    if (exactSeen.has(key)) { report.dupExact++; return; }
    const g = grams(x.q);
    let near = null;
    for (const o of gramIdx[d]) {
      const j = jaccard(g, o.g);
      if (j >= 0.82) { near = { id: o.id, j }; break; }
    }
    if (near) { report.dupNear++; report.nearPairs.push(`${f}[${i}] ≈ ${near.id} (${near.j.toFixed(2)})`); return; }
    exactSeen.add(key);
    const tmpId = `${f}[${i}]`;
    gramIdx[d].push({ id: tmpId, g });
    fresh[d].push({ x, src: tmpId });
  });
}

for (let d = 1; d <= 5; d++) {
  const list = fresh[d];
  // 정답 위치 균등화: 0,1,2,3 반복 시퀀스를 결정적으로 섞어 배정
  const targets = [];
  const r0 = rng(hash('targets-' + d + '-' + list.length));
  for (let i = 0; i < list.length; i++) targets.push(i % 4);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(r0() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }
  let maxNo = all[d].reduce((m, q) => Math.max(m, Number((/-(\d+)$/.exec(q.id) || [0, 0])[1])), 0);
  list.forEach(({ x }, i) => {
    const r = rng(hash(x.q));
    const others = [0, 1, 2, 3].filter((j) => j !== x.a);
    for (let k = others.length - 1; k > 0; k--) {
      const j = Math.floor(r() * (k + 1));
      [others[k], others[j]] = [others[j], others[k]];
    }
    const order = others.slice();
    order.splice(targets[i], 0, x.a);
    const q = {
      id: `D${d}-${String(++maxNo).padStart(4, '0')}`,
      d,
      t: x.t.trim(),
      k: x.k,
      lv: x.lv,
      q: x.q.trim(),
      o: order.map((j) => x.o[j].trim()),
      a: targets[i],
      e: order.map((j) => x.e[j].trim()),
      f: x.f.trim()
    };
    all[d].push(q);
  });
  report.added[d] = list.length;
  report.total[d] = all[d].length;
}

function tally(arr, fn) {
  const m = {};
  for (const x of arr) { const k = fn(x); m[k] = (m[k] || 0) + 1; }
  return m;
}
const NAMES = { 1: '정보시스템 감사 프로세스', 2: 'IT 거버넌스 및 관리', 3: '정보시스템 취득·개발·구현', 4: '정보시스템 운영 및 비즈니스 복원력', 5: '정보자산 보호' };
if (!DRY) {
  fs.mkdirSync(QDIR, { recursive: true });
  for (let d = 1; d <= 5; d++) {
    const lines = all[d].map((q) => JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, q[k]]))));
    const body = `/* CISA 문제은행 · Domain ${d} ${NAMES[d]} · ${lines.length}문항\n   tools/build-questions.mjs 로 생성 — 형식은 tools/AUTHORING_GUIDE.md 참고. ID는 학습 기록과 연결되므로 바꾸지 말 것. */\nCISA.addQuestions([\n${lines.join(',\n')}\n]);\n`;
    fs.writeFileSync(path.join(QDIR, `d${d}.js`), body);
  }
}
const every = Object.values(all).flat();
console.log(`\n${DRY ? '[DRY] ' : ''}신규 추가: ${JSON.stringify(report.added)} · 도메인별 합계: ${JSON.stringify(report.total)} · 전체 ${every.length}`);
console.log(`제외 — 검사 오류 ${report.skippedErr} · 지문 중복 ${report.dupExact} · 유사 중복 ${report.dupNear}`);
if (report.nearPairs.length) console.log('유사 중복 예:', report.nearPairs.slice(0, 15).join(' | '));
console.log('키워드:', JSON.stringify(tally(every, (q) => q.k)));
console.log('정답 위치:', JSON.stringify(tally(every, (q) => q.a)));
console.log('난이도:', JSON.stringify(tally(every, (q) => q.lv)));
