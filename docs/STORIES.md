# Peros User Stories

## Story 1: Data Models, Sample Seeding & Self-Test Foundation
- Define SwiftData models: `FocusHour` (date, slotIndex, outcome, reward, durationSeconds, elapsedSeconds, distractionsCount, topCause, status: planned/active/completed, result: done/partly/notDone, finishedAt), `DistractionEvent` (timestamp, cause, note), `RitualTask` (period: morning/night, title, minutes, isCompleted, sortOrder), `GoalSettings` (dailyGoalHours, countWeekends, breakMinutes, autoLevelUp, fiveGoals, identityStatement, thoughtHabits, preflightChecklist, blockedSites, hourRewards).
- Add `PerosKit` pure-Swift logic for capacity level calculation (1h–4h ramp, 5-of-7-day promotion), 12-week heatmap aggregation, distraction cause breakdown, and CSV export formatting.
- Unit tests in `PerosKitTests` and `--selftest` checks in `SelfTest.swift`.

## Story 2: Today — 4-Step Focus Flow & Timer
- Implement `TodayView` with header (`Today · <Date>`, segmented daily progress), 4-step pill bar (`Choose outcome`, `Focus 60 min`, `Record`, `Rest & review`), `Before you start` checklist, `Reward after this hour`, and bottom `Hour 1..N` slot strip.
- Live 60-minute countdown timer, `+1 Distraction` with cause selector, `Record` step (`Done` / `Partly` / `Not done`), and `Rest & review` break timer.

## Story 3: Sticky Wall
- Implement `StickyWallView` with `Week` / `Month` / `All time` filter, top stats (`Streak`, `Distractions / hour`, `Outcomes hit`), 7-column day grid with sticky-note cards, and Focus Crew card.

## Story 4: Work Log & Distraction Analytics
- Implement `WorkLogView` with outcome search, `Export CSV` action, full history table, *"What pulls you away"* bar chart, and *"Distractions per hour slot"* chart.

## Story 5: Progress — 1h→4h Capacity Ramp & 12-Week Heatmap
- Implement `ProgressView` with 4 level cards (`1h`, `2h`, `3h`, `4h`), 12-week contribution heatmap, and `Your standard` controls (`Daily goal`, `Count weekends`, `Break length`, `Auto level-up`).

## Story 6: Rituals & Goals
- Implement `RitualsGoalsView` with `Morning · 20 min` checklist + *"Plan today's outcomes"* action, editable `Five goals` yellow card, `Night · 4 min` review card + *"Tomorrow's first outcome"*, and bottom reward chips.

## Story 7: Menu Bar Timer, Floating HUD & Polish
- Add macOS `MenuBarExtra` showing active timer (`41:12`), quick `+1 Distraction`, and `Open Peros`.
- Verify all pages in light & dark mode via `tools/snap.sh`, `tools/grid-lint.sh`, and `swift tools/check-layout.swift`.
