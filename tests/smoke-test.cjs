'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'index.html must contain the game script');
const gameScript = scriptMatch[1];

// Static guardrails for packaging and monetization-free delivery.
assert.ok(html.includes('<script src="https://www.youtube.com/game_api/v1"></script>'), 'Playables SDK script must be present');
assert.ok(html.indexOf('<script src="https://www.youtube.com/game_api/v1"></script>') < html.indexOf('<script>'), 'SDK must load before game code');
assert.ok(/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/.test(html), 'viewport must be responsive');
assert.ok(html.includes('onPause(') && html.includes('onResume('), 'SDK pause/resume callbacks must be wired');
assert.ok(html.includes('onAudioEnabledChange(') && html.includes('isAudioEnabled('), 'SDK audio settings must be wired');
assert.ok(html.includes('firstFrameReady()') && html.includes('gameReady()'), 'SDK readiness calls must be present');
assert.ok(html.includes('loadData()') && html.includes('saveData('), 'cloud save APIs must be wired');
assert.ok(!/requestRewardedAd|requestInterstitialAd|yt\.ads|rewardBtn|interstitial/i.test(html), 'game must not contain advertising integrations');
assert.ok(!/End run|Back to title|Quit game|Exit game/i.test(html), 'game must not add in-game exit/quit controls');
assert.ok(html.includes('function triggerScreenShake') && html.includes('Chain Virtuoso'), 'combo shake and chain medals should be present');
assert.ok(!/preventDefault\s*\(\s*\)/.test(gameScript), 'keyboard escape/input must not be trapped');
assert.ok(!/visibilitychange|document\.hidden|document\.visibilityState/.test(gameScript), 'lifecycle must be controlled by the Playables SDK, not Page Visibility API');
assert.ok(html.length < 512 * 1024, 'initial HTML should stay far below the per-file size recommendation');

class FakeElement {
  constructor(id) {
    this.id = id;
    this.style = { display: id === 'overlay' ? 'flex' : '' };
    this.listeners = Object.create(null);
    this._innerHTML = '';
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this.classNames.add(name)),
      remove: (...names) => names.forEach(name => this.classNames.delete(name)),
      contains: name => this.classNames.has(name)
    };
    this.children = new Map();
    this.width = 0;
    this.height = 0;
  }
  set innerHTML(value) { this._innerHTML = String(value); this.children.clear(); }
  get innerHTML() { return this._innerHTML; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name, event = {}) { for (const callback of this.listeners[name] || []) callback({ target: this, ...event }); }
  click() { this.dispatch('click'); }
  querySelector(selector) {
    const id = selector.startsWith('#') ? selector.slice(1) : selector;
    if (!new RegExp(`id=["']${id}["']`).test(this._innerHTML)) return null;
    if (!this.children.has(id)) this.children.set(id, new FakeElement(id));
    return this.children.get(id);
  }
  setPointerCapture() {}
}

const gradients = () => ({ addColorStop() {} });
const ctx = {
  fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
  lineCap: 'round', lineJoin: 'round', shadowColor: '#000', shadowBlur: 0,
  font: '', textAlign: 'left', textBaseline: 'top', _tx: 0, _ty: 0, _stack: [], translations: [],
  setTransform() { this._tx = 0; this._ty = 0; },
  createLinearGradient: gradients, createRadialGradient: gradients,
  save() { this._stack.push({ tx: this._tx, ty: this._ty }); },
  restore() { const s = this._stack.pop(); if (s) { this._tx = s.tx; this._ty = s.ty; } },
  translate(x, y) { this._tx += x; this._ty += y; this.translations.push({ x: this._tx, y: this._ty }); },
  rotate() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  closePath() {}, arc() {}, rect() {}, ellipse() {}, fill() {}, stroke() {}, quadraticCurveTo() {}, fillText() {}
};

const els = Object.create(null);
for (const id of ['game', 'overlay', 'panel', 'pauseControl', 'loadStatus', 'startBtn']) els[id] = new FakeElement(id);
els.game.getContext = () => ctx;
els.game.setPointerCapture = () => {};
els.overlay.style.display = 'flex';
els.pauseControl.classList.add('hidden');
const windowListeners = Object.create(null);
let rafId = 0;
const rafs = new Map();
let now = 0;
const math = Object.create(Math);
math.random = () => 0.1;

const calls = { firstFrame: 0, gameReady: 0, saves: [], scores: [], events: [], warnings: 0, errors: 0 };
let pauseCallback = null;
let resumeCallback = null;
let audioCallback = null;
const ytgame = {
  IN_PLAYABLES_ENV: true,
  game: {
    firstFrameReady() { calls.firstFrame++; },
    gameReady() { calls.gameReady++; },
    async loadData() { calls.events.push({ type: 'load' }); return JSON.stringify({ version: 1, bestScore: 5, gamesPlayed: 2, bestChain: 1, totalSlices: 4 }); },
    async saveData(data) { const payload = JSON.parse(data); calls.saves.push(payload); calls.events.push({ type: 'save', payload }); }
  },
  system: {
    isAudioEnabled() { return false; },
    onAudioEnabledChange(callback) { audioCallback = callback; return () => {}; },
    onPause(callback) { pauseCallback = callback; return () => {}; },
    onResume(callback) { resumeCallback = callback; return () => {}; },
    async getLanguage() { return 'en-US'; }
  },
  engagement: { async sendScore(score) { calls.scores.push(score); calls.events.push({ type: 'score', value: score.value }); } },
  health: { logWarning() { calls.warnings++; }, logError() { calls.errors++; } }
};
const window = {
  innerWidth: 720, innerHeight: 900, devicePixelRatio: 2, ytgame,
  addEventListener(name, callback) { (windowListeners[name] ||= []).push(callback); },
  requestAnimationFrame(callback) { const id = ++rafId; rafs.set(id, callback); return id; },
  cancelAnimationFrame(id) { rafs.delete(id); },
  localStorage: { getItem() { throw new Error('Playables must not read localStorage'); }, setItem() { throw new Error('Playables must not write localStorage'); } }
};
const document = { documentElement: { lang: 'en' }, getElementById(id) { return els[id] ||= new FakeElement(id); } };
const sandbox = { window, document, console, Math: math, performance: { now: () => ++now }, Intl, Date, JSON, Promise, Set, Map, Number, String, Boolean, Object, Array, Error };
vm.createContext(sandbox);
vm.runInContext(gameScript, sandbox, { filename: 'index.html:inline-game.js', timeout: 3000 });

const sleepMicrotasks = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
function frame(timestamp) {
  assert.ok(rafs.size > 0, 'expected an animation frame to be scheduled');
  const [id, callback] = rafs.entries().next().value;
  rafs.delete(id);
  ctx.translations = [];
  callback(timestamp);
}
function uniquePositions() {
  const positions = [];
  for (const p of ctx.translations) if (!positions.some(q => Math.abs(q.x - p.x) < 1 && Math.abs(q.y - p.y) < 1)) positions.push(p);
  return positions;
}

(async () => {
  frame(16);
  await sleepMicrotasks();
  assert.equal(calls.firstFrame, 1, 'firstFrameReady should fire once');
  assert.equal(calls.gameReady, 1, 'gameReady should fire once after cloud load');
  assert.ok(els.panel.querySelector('#startBtn'), 'interactive title screen should be present');
  assert.equal(document.documentElement.lang, 'en-US', 'YouTube locale should be used when available');

  els.panel.querySelector('#startBtn').click();
  await sleepMicrotasks();
  assert.ok(calls.saves.some(save => save.gamesPlayed === 3), 'run count should save to cloud data');
  assert.ok(calls.events.findIndex(event => event.type === 'load') < calls.events.findIndex(event => event.type === 'save'), 'cloud load must finish before the first save');

  for (let i = 0; i < 22; i++) frame(32 + i * 16);
  let positions = uniquePositions().filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight);
  assert.ok(positions.length >= 2, 'a multi-shape volley should be rendered');
  const beforeResizeCount = positions.length;

  const testViewports = [[360,1280],[360,840],[360,640],[600,800],[800,800],[1066,800],[1422,800],[1680,720],[2560,720],[360,800]];
  let frameTime = 32 + 21 * 16;
  for (const [width, height] of testViewports) {
    window.innerWidth = width;
    window.innerHeight = height;
    for (const callback of windowListeners.resize || []) callback();
    assert.equal(els.game.width, Math.round(width * 2), `canvas backing width should respect DPR at ${width}x${height}`);
    assert.equal(els.game.height, Math.round(height * 2), `canvas backing height should respect DPR at ${width}x${height}`);
    frame(++frameTime);
    assert.equal(uniquePositions().length, beforeResizeCount, `resize should preserve active shapes at ${width}x${height}`);
  }
  positions = uniquePositions().filter(p => p.x > 0 && p.x < window.innerWidth && p.y > 0 && p.y < window.innerHeight);
  assert.ok(positions.length >= 2, 'active shapes should remain sliceable after the aspect-ratio sweep');

  positions.sort((a, b) => a.x - b.x);
  els.game.dispatch('pointerdown', { pointerId: 1, clientX: positions[0].x, clientY: positions[0].y });
  els.game.dispatch('pointermove', { pointerId: 1, clientX: positions[positions.length - 1].x, clientY: positions[positions.length - 1].y });
  els.game.dispatch('pointerup', { pointerId: 1 });
  await sleepMicrotasks();
  assert.ok(calls.saves.some(save => save.bestScore >= 30 && save.totalSlices >= 6 && save.bestChain >= 2), 'chain score and progress should be persisted');
  assert.ok(calls.scores.some(score => score.value >= 30), 'best score should be sent only after persistence');
  const savedBestIndex = calls.events.findIndex(event => event.type === 'save' && event.payload.bestScore >= 30);
  const submittedBestIndex = calls.events.findIndex(event => event.type === 'score' && event.value >= 30);
  assert.ok(savedBestIndex >= 0 && submittedBestIndex > savedBestIndex, 'the best score should be sent after its matching cloud save succeeds');

  assert.equal(typeof pauseCallback, 'function', 'SDK pause callback should be registered');
  assert.equal(typeof resumeCallback, 'function', 'SDK resume callback should be registered');
  pauseCallback();
  await sleepMicrotasks();
  assert.equal(rafs.size, 0, 'SDK pause should stop the animation loop');
  assert.ok(calls.saves.length >= 2, 'pause should flush progress');
  resumeCallback();
  assert.equal(rafs.size, 1, 'SDK resume should restart the animation loop');

  assert.equal(typeof windowListeners.keydown?.[0], 'function', 'keyboard controls should be registered');
  windowListeners.keydown[0]({ key: 'Escape' });
  assert.equal(els.overlay.style.display, 'flex', 'Escape should open the pause state during a run');
  assert.ok(els.pauseControl.classList.contains('hidden'), 'pause control should hide while paused');
  els.panel.querySelector('#resumeBtn').click();
  assert.equal(els.overlay.style.display, 'none', 'resume button should close the pause panel');
  assert.ok(!els.pauseControl.classList.contains('hidden'), 'pause control should return after resume');

  assert.equal(typeof audioCallback, 'function', 'SDK audio setting callback should be registered');
  audioCallback(false);
  audioCallback(true);
  assert.equal(calls.errors, 0, 'runtime should not report mock-environment errors');
  console.log('PASS: package structure, SDK order/readiness, cloud saves, score sync, responsive resize, input scoring, pause/resume, audio callback, and no-ad guardrails.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
