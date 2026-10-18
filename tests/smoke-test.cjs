'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function check(condition, message) {
  assert.ok(condition, message);
  console.log('✓ ' + message);
}

const sdkTag = '<script src="https://www.youtube.com/game_api/v1"></script>';
const sdkAt = html.indexOf(sdkTag);
const inlineAt = html.indexOf('<script>', sdkAt + sdkTag.length);

check(sdkAt >= 0 && inlineAt > sdkAt, 'Playables SDK is loaded before game code');
check(/ytgame\.game\.firstFrameReady\(\)/.test(html), 'firstFrameReady integration is present');
check(/ytgame\.game\.gameReady\(\)/.test(html), 'gameReady integration is present');
check(/ytgame\.game\.loadData\(\)/.test(html), 'cloud loadData integration is present');
check(/ytgame\.game\.saveData\(/.test(html), 'cloud saveData integration is present');
check(/onAudioEnabledChange/.test(html) && /isAudioEnabled/.test(html), 'YouTube audio settings are handled');
check(/onPause/.test(html) && /onResume/.test(html), 'YouTube pause and resume callbacks are handled');
check(/sendScore/.test(html), 'best-score submission integration is present');
check(/safe-area-inset/.test(html), 'safe-area-aware layout is present');
check(/device-width/.test(html) && /resize/.test(html), 'responsive viewport and resize handling is present');
check(/pointerdown/.test(html) && /pointermove/.test(html), 'pointer-based swipe input is present');
check(!/requestInterstitialAd|requestRewardedAd/.test(html), 'no monetization SDK calls are present');
check(!/End run|Quit game|Exit game/i.test(html), 'no in-game quit/exit controls are present');
check(/<canvas\b/.test(html), 'canvas game surface is present');

console.log('\nSwipe Slicer static smoke tests passed.');
