#!/usr/bin/env node
/**
 * Guard del Tour 360° público (catálogo /cat).
 *
 * El visor 360° real se rompió varias veces por cambios chicos en el middleware,
 * el proxy de media o los assets de Pannellum. `tsc` y `next build` NO lo detectan
 * (compila igual aunque el comportamiento quede roto). Este script chequea de forma
 * estática los invariantes que efectivamente rompieron. Correr antes de deployar
 * cualquier cambio a middleware / storage proxy / Pannellum:
 *
 *   node scripts/check-tour360-invariants.mjs
 *
 * Sale con código != 0 si algún invariante falla (apto para prebuild/CI).
 * Ver el bloque "TOUR 360° PÚBLICO — INVARIANTES (NO ROMPER)" en CHECKLIST.md.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  fails.push(m);
  console.log(`  ✗ ${m}`);
};

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

console.log("Tour 360° público — chequeo de invariantes\n");

// --- Invariante 1 + 2: middleware ---
const mw = read("src/middleware.ts");
if (!mw) {
  fail("src/middleware.ts no encontrado");
} else {
  // (1) /api/storage/view debe ser público
  if (/storage\\\/view/.test(mw) && /PUBLIC_PATHS/.test(mw)) {
    ok("(1) /api/storage/view está en PUBLIC_PATHS (proxy de panoramas público)");
  } else {
    fail("(1) /api/storage/view NO figura en PUBLIC_PATHS → el anónimo iría a /login y el visor recibiría HTML");
  }

  // (2) el matcher debe excluir js y css (assets de Pannellum)
  const matcher = mw.match(/matcher:\s*\[([\s\S]*?)\]/);
  const matcherBody = matcher ? matcher[1] : "";
  const hasJs = /\|js\\\\?\.?map?\)|:js\b|\|js\|/.test(matcherBody) || /\bjs\|js\\\.map\b/.test(matcherBody);
  if (/\bjs\|js\\\.map\b/.test(matcherBody) || /\|js\|/.test(matcherBody)) {
    ok("(2a) el matcher excluye `js` → /pannellum.js se sirve sin gate de auth");
  } else {
    fail("(2a) el matcher NO excluye `js` → /pannellum.js puede quedar bloqueado por auth");
  }
  if (/\bcss\b/.test(matcherBody)) {
    ok("(2b) el matcher excluye `css` → /pannellum.css se sirve sin gate de auth");
  } else {
    fail("(2b) el matcher NO excluye `css` → /pannellum.css puede quedar bloqueado");
  }
  // (2c) el comentario arriba del matcher debe estar bien cerrado: no debe quedar
  // el string del matcher "comido" por un /* sin su */
  const configBlock = mw.slice(mw.indexOf("export const config"));
  const opens = (configBlock.match(/\/\*/g) || []).length;
  const closes = (configBlock.match(/\*\//g) || []).length;
  if (opens === closes) {
    ok("(2c) los comentarios del bloque config están balanceados (matcher no quedó dentro de un /* */)");
  } else {
    fail("(2c) comentario sin cerrar en el bloque config → el matcher puede quedar DENTRO del comentario (matcher vacío = todo roto)");
  }
}

// --- Invariante 3: assets de Pannellum ---
for (const asset of ["public/pannellum.js", "public/pannellum.css"]) {
  if (existsSync(join(root, asset))) ok(`(3) ${asset} existe`);
  else fail(`(3) FALTA ${asset} → no hay visor 360°`);
}

// --- Invariante 4 (parcial, estático): proxy de media ---
const proxy = read("src/app/api/storage/view/route.ts");
if (!proxy) {
  fail("(4) src/app/api/storage/view/route.ts no encontrado");
} else {
  if (/new Response\(\s*buffer as any/.test(proxy)) {
    ok("(4) el proxy devuelve el buffer como `new Response(buffer as any, ...)`");
  } else {
    fail("(4) el proxy ya no devuelve `new Response(buffer as any, ...)` (quitar el cast rompió el response, ver 3e89fc4)");
  }
  if (/searchParams\.get\("w"\)/.test(proxy) && /sharp/.test(proxy)) {
    ok("(4) el proxy soporta resize server-side con sharp (param `w`)");
  } else {
    fail("(4) el proxy perdió el resize server-side con sharp (param `w`)");
  }
}

console.log("");
if (fails.length) {
  console.error(`✗ ${fails.length} invariante(s) del Tour 360° roto(s). Ver CHECKLIST.md → "TOUR 360° PÚBLICO — INVARIANTES (NO ROMPER)".`);
  process.exit(1);
}
console.log("✓ Tour 360° público: todos los invariantes OK.");
