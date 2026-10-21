#!/usr/bin/env node
// 문제 JSON 검사기 — 사용법: node tools/check-staging.mjs <파일.json> [...]
// 스키마·키워드·해설 정렬·보기 위치 지칭 등을 검사한다. ERROR가 있으면 exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const KEYWORDS = ['FIRST', 'BEST', 'PRIMARY', 'GREATEST', 'MOST', 'LEAST', 'NONE'];

const POSITION_REF = /(?:^|[^A-Za-z0-9])[A-D](?:번|항|\)|\s*보기)|[①②③④]|(?:^|\s)[1-4]번(?:\s|$|[은는이가을를의도과와])|위\s*보기|보기\s*[A-D1-4](?![A-Za-z0-9])/;
const WRONG_TONE = /^(오답|함정|틀린|틀렸|부적절|잘못)/;
const RIGHT_TONE = /^(정답|올바른\s*답|맞는\s*답|이것이\s*정답)/;
const LABEL_PREFIX = /^(정답|오답|함정)\s*[:：.)]/;

export function parseJsonFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  try {
    return { data: JSON.parse(text) };
  } catch (err) {
    const m = /position (\d+)/.exec(err.message);
    let where = '';
    if (m) {
      const pos = Number(m[1]);
      const before = text.slice(0, pos);
      const line = before.split('\n').length;
      const col = pos - before.lastIndexOf('\n');
      where = ` (line ${line}, col ${col}: …${text.slice(Math.max(0, pos - 40), pos + 20).replace(/\n/g, '⏎')}…)`;
    }
    return { error: `JSON 파싱 실패: ${err.message}${where}` };
  }
}

const isStr = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;

export function checkQuestion(x) {
  const errors = [];
  const warns = [];
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { errors: ['객체가 아님'], warns };
  if (!isStr(x.t, 1, 30)) errors.push('t(토픽) 누락/길이 오류');
  if (!KEYWORDS.includes(x.k)) errors.push(`k 값 오류: ${x.k}`);
  if (![1, 2, 3].includes(x.lv)) errors.push(`lv 값 오류: ${x.lv}`);
  if (!isStr(x.q, 15, 700)) errors.push('q(지문) 누락/길이 오류(15~700자)');
  if (!Array.isArray(x.o) || x.o.length !== 4 || !x.o.every((s) => isStr(s, 1, 220))) errors.push('o는 1~220자 문자열 4개여야 함');
  if (!Number.isInteger(x.a) || x.a < 0 || x.a > 3) errors.push(`a 값 오류: ${x.a}`);
  if (!Array.isArray(x.e) || x.e.length !== 4 || !x.e.every((s) => isStr(s, 15, 450))) errors.push('e는 15~450자 문자열 4개여야 함');
  if (!isStr(x.f, 4, 100)) errors.push('f(한 줄 공식) 누락/길이 오류(4~100자)');
  if (errors.length) return { errors, warns };

  if (new Set(x.o.map((s) => s.trim())).size !== 4) errors.push('보기 중복');
  if (x.k !== 'NONE' && !x.q.includes(`(${x.k}`)) errors.push(`지문에 '(${x.k}' 표기가 없음`);
  if (x.k === 'NONE' && /\((FIRST|BEST|PRIMARY|GREATEST|MOST|LEAST)/.test(x.q)) warns.push('k=NONE인데 지문에 키워드 표기가 있음');

  x.e.forEach((s, i) => {
    if (POSITION_REF.test(s)) warns.push(`보기 위치 지칭 의심(e[${i}]): ${s.slice(0, 40)}…`);
    if (LABEL_PREFIX.test(s.trim())) warns.push(`해설 접두어 금지(e[${i}])`);
  });
  if (POSITION_REF.test(x.q.replace(/\((?:FIRST|BEST|PRIMARY|GREATEST|MOST|LEAST)[^)]*\)/g, ''))) warns.push('지문에서 보기 위치 지칭 의심');
  if (WRONG_TONE.test(x.e[x.a].trim())) warns.push('해설 정렬 의심: 정답 해설이 오답 어조로 시작');
  x.e.forEach((s, i) => {
    if (i !== x.a && RIGHT_TONE.test(s.trim())) warns.push(`해설 정렬 의심: 오답 해설(e[${i}])이 정답 어조로 시작`);
  });
  const others = x.o.filter((_, i) => i !== x.a);
  const avg = others.reduce((n, s) => n + s.length, 0) / 3;
  if (x.o[x.a].length > 28 && x.o[x.a].length > avg * 1.75) warns.push('정답 보기가 다른 보기보다 지나치게 김');
  if (/[\\]/.test(JSON.stringify([x.q, x.o, x.e, x.f]).replace(/\\"/g, ''))) {
    const raw = [x.q, ...x.o, ...x.e, x.f].join('');
    if (raw.includes('\\')) warns.push('백슬래시 사용');
  }
  return { errors, warns };
}

export function normStem(s) {
  return s.replace(/\((FIRST|BEST|PRIMARY|GREATEST|MOST|LEAST)[^)]*\)/g, '').replace(/[\s\p{P}]/gu, '');
}

function tally(arr, key) {
  const m = {};
  for (const x of arr) m[x[key]] = (m[x[key]] || 0) + 1;
  return m;
}

function main(files) {
  if (!files.length) {
    console.log('사용법: node tools/check-staging.mjs <파일.json> [...]');
    process.exit(2);
  }
  let total = 0;
  let errCount = 0;
  let warnCount = 0;
  const all = [];
  const seen = new Map();
  for (const f of files) {
    const name = path.basename(f);
    const { data, error } = parseJsonFile(f);
    if (error) {
      console.log(`ERROR ${name}: ${error}`);
      errCount++;
      continue;
    }
    if (!Array.isArray(data)) {
      console.log(`ERROR ${name}: 최상위가 배열이 아님`);
      errCount++;
      continue;
    }
    data.forEach((x, i) => {
      const { errors, warns } = checkQuestion(x);
      errors.forEach((e) => console.log(`ERROR ${name}[${i}] ${e}`));
      warns.forEach((w) => console.log(`WARN  ${name}[${i}] ${w}`));
      errCount += errors.length;
      warnCount += warns.length;
      if (!errors.length) {
        const key = normStem(x.q);
        if (seen.has(key)) {
          console.log(`ERROR ${name}[${i}] 지문 중복: ${seen.get(key)}`);
          errCount++;
        } else seen.set(key, `${name}[${i}]`);
        all.push(x);
      }
    });
    total += data.length;
  }
  console.log(`\n문항 ${total}개 · ERROR ${errCount} · WARN ${warnCount}`);
  if (all.length) {
    console.log('키워드:', JSON.stringify(tally(all, 'k')));
    console.log('난이도:', JSON.stringify(tally(all, 'lv')));
    console.log('정답위치:', JSON.stringify(tally(all, 'a')));
    console.log('토픽:', JSON.stringify(tally(all, 't')));
  }
  process.exit(errCount ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2));
