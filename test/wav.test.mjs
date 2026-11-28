import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeWav } from '../js/wav.js';
import { APP_VERSION } from '../js/version.js';

test('encodeWav: Kopf und Samples (16 Bit, mono, geklemmt)', () => {
  const buf = encodeWav(Float32Array.from([0, 1, -1, 2, -2, 0.5]), 22050);
  const v = new DataView(buf);
  const s = (o, l) => String.fromCharCode(...new Uint8Array(buf, o, l));
  assert.equal(buf.byteLength, 44 + 12);
  assert.equal(s(0, 4), 'RIFF');
  assert.equal(s(8, 4), 'WAVE');
  assert.equal(s(36, 4), 'data');
  assert.equal(v.getUint32(4, true), 36 + 12);
  assert.equal(v.getUint16(20, true), 1);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), 22050);
  assert.equal(v.getUint16(34, true), 16);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((i) => v.getInt16(44 + i * 2, true)), [0, 32767, -32768, 32767, -32768, 16383]);
});

test('APP_VERSION passt zum Cache-Namen in sw.js', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, new RegExp(`const CACHE = 'doggy-v${APP_VERSION}';`));
});
