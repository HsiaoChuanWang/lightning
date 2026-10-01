# Changelog - guideline

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Added

### Fixed

### Changed

### Removed

## [0.16.0] - 2026-07-19

### Fixed

- Remove stray template literal left in LoginView.vue
- Remove redundant abandoned-match check in RoundResultView

### Changed

- Extract StartChallengeView preparation flow into `useChallengePreparation` composable
- Move hardcoded hex colors into design tokens in `variables.scss`
- Standardize `console.error` tagging to `[functionName] failed:` across composables and services
- Comment out client-side console logging; keep server-side logging in `api/` and `server/dev-server.js` active
- Document StartChallengeView composables and GameResultView components in PROJECT_STRUCTURE.md

### Removed

- Remove dead debug `console.log` from EntryBanner

## [0.15.0] - 2026-07-15

### Added

- Add project structure documentation

### Fixed

- Refine round completion and answer reveal flow
- Correct misspelled image asset filenames

### Changed

- Improve game, scoring, loading, and rematch flows
- Update PlayAgainModal text
- Move the local Express API server to `server/dev-server.js`
- Reorganize shared and file-specific TypeScript types
- Expand files excluded from Vercel deployments
- Rename the project from Lightening to Lightning

### Removed

- Remove unused standalone type declaration files

## [0.14.1] - 2026-01-04

### Added

- Add entry banner animation
- Add EntryBanner animation between Login and StartChallenge

## [0.14.0] - 2026-01-03

### Added

- Add initial load animation to StartChallenge on page mount

### Changed

- Change the cloud image on the Login page

## [0.13.0] - 2025-11-16

### Added

- Add bonus time
- Add initial load animation to LoginView on page mount

## [0.12.0] - 2025-11-09

### Added

- UI: GameView
- UI: RoundResultView
- Add component "PlayerScoreRow" in RoundResultView
- UI: GameResultView

## [0.11.2] - 2025-11-02

### Added

- UI: RoundStartView

## [0.11.1] - 2025-10-29

### Added

- UI: StartChallengeView
- Standardize font families

## [0.10.6] - 2025-10-27

### Fixed

- Add support for width of ButtonComponent
- Display different text based on isWin

## [0.10.5] - 2025-10-26

### Added

- Refine UI of PlayAgainModal
- Refine UI of BackToLoginModal

## [0.10.4] - 2025-10-26

### Added

- Install Naive UI
- Add ModalComponent
- Refine UI of LoadingModal

## [0.10.3] - 2025-10-24

### Added

- Add InputComponent

## [0.10.2] - 2025-10-23

### Added

- Add ButtonComponent

## [0.10.1] - 2025-10-22

### Fixed

- Update img sources to 2x versions

## [0.10.0] - 2025-10-19

### Added

- UI: LoginView

## [0.9.1] - 2025-09-02

### Added

- Implement manual offline flow on window close
- Implement flow for handling disconnection

## [0.9.0] - 2025-09-01

### Added

- Add Vue Router guard to successfully block back navigation

## [0.8.0] - 2025-08-28

### Added

- Implement Google-style navigation blocking for back button(sometimes fails) and page refresh

## [0.7.2] - 2025-08-13

### Added

- Implement scoring flow using Embedding API vectors

### Changed

- Modify fetch API to retrieve image description file for Vercel
- Update vercel.json

## [0.7.1] - 2025-08-12

### Changed

- Update image import path from Supabase Storage
- Request and return all image descriptions in one shot
- Implement AI-generated image description flow

## [0.7.0] - 2025-08-11

### Added

- Add vectors API and verify Vercel deployment with Gemini API
- Choose "gemini-2.0-flash-lite" as model

## [0.6.1] - 2025-08-05

### Added

- Add vercel json

## [0.6.0] - 2025-08-04

### Added

- Add phantom flow
- Add ai flow

### Fixed

- Fix revenge flow

## [0.5.1] - 2025-08-01

### Added

- Implement rematch flow
- Add cancel match flow

## [0.5.0] - 2025-07-28

### Added

- Add update win/loss/total match flow after game completion

### Fixed

- Correct scoring flow during round submission

## [0.4.1] - 2025-07-25

### Changed

- Use SQL to prevent duplicate human match

## [0.4.0] - 2025-07-21

### Added

- Complete game-result page logic (human mode)

## [0.3.0] - 2025-07-17

### Added

- Complete game page logic (human mode)

## [0.2.1] - 2025-07-11

### Added

- Add initial match data to Pinia store
- Complete round start page logic

### Changed

- Adjust matchmaking logic (human, phantom, AI)

## [0.2.0] - 2025-07-07

### Added

- Complete matchmaking logic (human, phantom, AI) and navigate to game page after pairing

## [0.1.0] - 2025-07-01

### Added

- Implement user login and matchmaking with avatar upload

## [0.0.0] - 2025-06-23

### Removed

- Delete unnecessary files
