#!/usr/bin/env node
// v3 개정 대상 선정 — 감사인 관점(A)·짧은 지식형(S) 비중을 도메인별 목표까지 끌어올릴 문항을 고른다.
// 출력: staging/revise/in/V3_D<d>_<nn>.json (각 70문항, 문항마다 "mode": "A" | "S")
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = { 1: { A: 0.6, S: 0.3 }, 2: { A: 0.4, S: 0.35 }, 3: { A: 0.35, S: 0.35 }, 4: { A: 0.35, S: 0.35 }, 5: { A: 0.3, S: 0.4 } };
const PER = 70;
const isA = (q) => /감사인/.test(q.q);
const isS = (q) => q.q.length <= 80;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const ACTOR = /조직|기업|회사|팀|담당자|경영진|관리자|은행|기관|부서|운영자|개발자|CISO|CIO/;

for (let d = 1; d <= 5; d++) {
  const qs = [];
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, `data/questions/d${d}.js`), 'utf8'), { CISA: { addQuestions: (a) => qs.push(...a) } });
  const n = qs.length;
  const needA = Math.max(0, Math.round(TARGET[d].A * n) - qs.filter(isA).length);
  const needS = Math.max(0, Math.round(TARGET[d].S * n) - qs.filter(isS).length);
  const pool = qs.filter((q) => !isA(q) && !isS(q)).sort((a, b) => hash(a.id) - hash(b.id));
  // A: 행위 주체가 있는 행동·통제 판단형 우선, 토픽 고르게
  const scoreA = (q) => (ACTOR.test(q.q) ? 2 : 0) + (['FIRST', 'BEST', 'GREATEST'].includes(q.k) ? 1 : 0);
  const byTopic = {};
  for (const q of [...pool].sort((a, b) => scoreA(b) - scoreA(a))) (byTopic[q.t] ||= []).push(q);
  const A = [];
  const topics = Object.values(byTopic);
  for (let i = 0; A.length < needA && topics.some((t) => t.length); i = (i + 1) % topics.length) if (topics[i].length) A.push(topics[i].shift());
  const chosen = new Set(A.map((q) => q.id));
  const S = pool.filter((q) => !chosen.has(q.id)).sort((a, b) => (['PRIMARY', 'MOST', 'BEST'].includes(b.k) ? 1 : 0) - (['PRIMARY', 'MOST', 'BEST'].includes(a.k) ? 1 : 0)).slice(0, needS);
  const all = [...A.map((q) => ({ mode: 'A', ...q })), ...S.map((q) => ({ mode: 'S', ...q }))].sort((a, b) => a.id.localeCompare(b.id));
  const batches = Math.ceil(all.length / PER);
  for (let b = 0; b < batches; b++) {
    const part = all.filter((_, i) => i % batches === b);
    fs.writeFileSync(path.join(ROOT, `staging/revise/in/V3_D${d}_${String(b + 1).padStart(2, '0')}.json`), '[\n' + part.map((q) => JSON.stringify(q)).join(',\n') + '\n]\n');
  }
  console.log(`D${d}: 문항 ${n} · 감사인 ${qs.filter(isA).length}→목표 ${Math.round(TARGET[d].A * n)} (A ${A.length}) · 짧은형 ${qs.filter(isS).length}→목표 ${Math.round(TARGET[d].S * n)} (S ${S.length}) · 배치 ${batches}`);
}
