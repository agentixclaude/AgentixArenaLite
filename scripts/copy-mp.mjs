// Copies MediaPipe's vision WASM next to the app so the subject cut-out loads from our own origin.
import { mkdirSync, copyFileSync } from 'node:fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
mkdirSync('public/mp', { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) copyFileSync(`${src}/${f}`, `public/mp/${f}`);
console.log('mediapipe wasm copied');
