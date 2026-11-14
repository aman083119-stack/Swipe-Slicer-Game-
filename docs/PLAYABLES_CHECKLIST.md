# Swipe Slicer — Playables QA checklist

Use this checklist before submitting a build to the official YouTube Playables Test Suite. The automated smoke test is a fast local guard, not a substitute for certification testing.

## SDK and saves

- [ ] Confirm the `https://www.youtube.com/game_api/v1` script is loaded before game code.
- [ ] Verify `firstFrameReady()` fires after the first visible frame.
- [ ] Verify `gameReady()` waits until the title menu is interactive and follows first-frame readiness.
- [ ] Verify `loadData()` finishes before `saveData()` is called.
- [ ] Verify old save payloads load without a crash.
- [ ] Verify `sendScore()` reports the same best score written to the saved payload.
- [ ] Trigger an SDK pause while playing; confirm motion, swiping, and sound all stop and progress saves.
- [ ] Resume from the SDK callback; confirm the run resumes without resetting positions.
- [ ] Toggle YouTube audio; confirm the game follows the setting and produces no sound when disabled.

## 3D renderer, aspect ratios, viewport and input

- [ ] Verify `renderer3d.js` loads after the YouTube SDK and before the game bootstrap.
- [ ] Verify the WebGL renderer starts on a WebGL-capable browser and draws beveled 3D meshes with lighting.
- [ ] Disable WebGL or simulate a context loss; verify the Canvas 2D fallback remains playable.
- [ ] Verify a WebGL context loss does not leave a blank or frozen game.
- [ ] Verify the WebGL and HUD canvases stay aligned after a viewport resize.
- [ ] Check device-pixel scaling on high-DPI mobile and desktop hardware; confirm GPU limits do not cause blank frames or memory spikes.


Test portrait, square, standard landscape, and ultrawide layouts. YouTube guidance gives examples including 9:32, 9:21, 9:16, 3:4, 1:1, 4:3, 16:9, 21:9, and 32:9.

- [ ] Resize while shapes are in flight; verify the run continues and shapes remain usable.
- [ ] Check at a small mobile viewport such as 360 × 800 CSS pixels.
- [ ] Check at a large desktop viewport such as 1920 × 1080 and a high-DPI device.
- [ ] Check a high-resolution desktop display (for example 3840 × 2560); inspect 3D edges, HUD text, and performance. Do not assume every device can allocate a native 8K framebuffer.
- [ ] Confirm HUD text remains legible and controls respect safe-area insets.
- [ ] Verify touch drag and mouse click-drag both slice shapes.
- [ ] Verify `Enter` / `Space` start from the title and `P` / `Esc` pause and resume.
- [ ] Verify `Esc` is not cancelled or trapped with `preventDefault()`.
- [ ] Verify the game never locks orientation and produces no unintended browser scrollbars.

## Gameplay and performance

- [ ] Same-color slices in one gesture increase the chain and bank on pointer-up.
- [ ] Different colors bank the prior chain and begin a new chain.
- [ ] Prism links into the following color chain.
- [ ] A chain of 6 activates Chromatic Fever and double scoring.
- [ ] Slicing a bomb ends the run immediately.
- [ ] Three missed regular shapes end the run; bombs do not count as misses.
- [ ] Daily theme is consistent through one UTC day and rotates on the next day.
- [ ] Sound is triggered only after user interaction and respects the SDK setting.
- [ ] Confirm no reproducible crashes, console errors, or frame stalls during a longer session.
- [ ] Test on real Android/iOS devices and desktop browsers; mocked WebGL is not a substitute for actual GPU testing.

## Bundle checks

- [ ] Keep `index.html` at the root of the uploaded build.
- [ ] Keep file names within YouTube's allowed character set.
- [ ] Keep the initial bundle below 30 MiB and total bundle below 250 MiB.
- [ ] Keep saved game data below 3 MiB (the current payload is only a few numeric fields).
- [ ] Run the Playables Bundle Analyzer and the official Test Suite from the Developer Portal.
- [ ] Review current policy and metadata requirements; SDK readiness alone does not guarantee approval.