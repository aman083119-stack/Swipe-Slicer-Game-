# Contributing to Swipe Slicer

Thanks for helping make the slice feel better.

## Development principles

- Keep the game dependency-free and fast to boot.
- Keep `index.html` at the project root and keep the official Playables SDK script before all game logic.
- Use only SDK pause/resume callbacks for YouTube Playables lifecycle pauses.
- Never call `saveData()` before `loadData()` has completed successfully.
- Keep gameplay responsive across portrait, square, landscape, ultrawide, and high-DPI viewports.
- Keep ads and payment integrations out of this project.

## Before opening a pull request

1. Run `npm test`.
2. Follow [`docs/PLAYABLES_CHECKLIST.md`](docs/PLAYABLES_CHECKLIST.md) for the relevant manual checks.
3. Describe any gameplay rule changes and test coverage in the pull request.
4. For changes to SDK lifecycle or canvas resizing, include the device/viewport sizes tested.

The official YouTube Playables Test Suite remains necessary before publishing; the local smoke test is not a certification result.