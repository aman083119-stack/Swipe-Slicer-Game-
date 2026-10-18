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

## Aspect ratios, viewport and input

Test portrait, square, standard landscape, and ultrawide layouts. YouTube guidance gives examples including 9:32, 9:21, 9:16, 3:4, 1:1, 4:3, 16:9, 21:9, and 32:9.

- [ ] Resize while shapes are in flight; verify the run continues and shapes remain usable.
- [ ] Check at a small mobile viewport such as 360 × 800 CSS pixels.
- [ ] Check at a large desktop viewport such as 1920 × 1080 and a high-DPI device.
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

## Bundle checks

- [ ] Keep `index.html` at the root of the uploaded build.
- [ ] Keep file names within YouTube's allowed character set.
- [ ] Keep the initial bundle below 30 MiB and total bundle below 250 MiB.
- [ ] Keep saved game data below 3 MiB (the current payload is only a few numeric fields).
- [ ] Run the Playables Bundle Analyzer and the official Test Suite from the Developer Portal.
- [ ] Review current policy and metadata requirements; SDK readiness alone does not guarantee approval.