#!/usr/bin/env node
// claude.ai Artifact 게시용 페이지 생성 — index.html에서 문서 골격(doctype/html/head/body)과
// PWA 전용 태그를 걷어내 dist/artifact.html 로 저장한다. 나머지 파일(css/js/data/assets)은 그대로 함께 게시.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const drop = [
  /<!doctype html>\s*/i, /<html[^>]*>\s*/i, /<\/html>\s*/i, /<head>\s*/i, /<\/head>\s*/i, /<body>\s*/i, /<\/body>\s*/i,
  /<meta charset[^>]*>\s*/i, /<meta name="viewport"[^>]*>\s*/i, /<link rel="manifest"[^>]*>\s*/i,
  /<link rel="apple-touch-icon"[^>]*>\s*/i, /<meta name="(?:apple-)?mobile-web-app[^>]*>\s*/gi
];
for (const re of drop) html = html.replace(re, '');
html = html.replace('<script>\n/* 데이터 레지스트리', '<script>window.CISA_NO_SW = true;</script>\n<script>\n/* 데이터 레지스트리');
if (!html.includes('CISA_NO_SW = true')) throw new Error('레지스트리 스크립트 위치를 찾지 못했습니다');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/artifact.html'), html);

// 게시할 부속 파일 목록(경로 → 원본). --skip <경로> 로 아직 미완성인 데이터 파일을 빼고 게시할 수 있다.
const skip = process.argv.flatMap((a, i, all) => (all[i - 1] === '--skip' ? [a] : []));
let manifest = fs.readFileSync(path.join(ROOT, 'data/manifest.js'), 'utf8');
for (const f of skip) manifest = manifest.replace(new RegExp(`\\s*'${f.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}',?`), '');
fs.writeFileSync(path.join(ROOT, 'dist/manifest.js'), manifest);
const dataFiles = [...manifest.matchAll(/'(data\/[^']+\.js)'/g)].map((m) => m[1]);
const files = ['css/app.css', 'js/core.js', 'js/views.js', 'assets/icon.svg', ...dataFiles];
const map = Object.fromEntries(files.filter((f) => fs.existsSync(path.join(ROOT, f))).map((f) => [f, f]));
map['data/manifest.js'] = 'dist/manifest.js';
fs.writeFileSync(path.join(ROOT, 'dist/artifact-files.json'), JSON.stringify(map, null, 2));
const size = Object.keys(map).reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0);
console.log(`dist/artifact.html 생성 · 부속 파일 ${Object.keys(map).length}개 · ${(size / 1048576).toFixed(2)}MB`);
