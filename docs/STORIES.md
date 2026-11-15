# PerOS User Stories

## Story 1: Data Models, Sample Seeding & Self-Test Foundation
- Define core models for `FocusHour`, `DistractionEvent`, `RitualTask`, and `GoalSettings`.
- Pure logic for capacity level calculation (1h–4h ramp, 5-of-7-day promotion), 12-week heatmap aggregation, distraction cause breakdown, and CSV export formatting.

## Story 2: Today — 4-Step Focus Flow & Timer
- Implement `Today` view with personalized greeting (`Hello, Binh`), segmented daily progress, 4-step pill bar (`Choose outcome`, `Focus 60/30 min`, `Record`, `Rest & review`), `Before you start` checklist, `Reward after this hour`, and bottom `Hour 1..N` slot strip.
- Live countdown timer (with 30m and 60m duration toggle), `+1 Distraction` with cause selector, `Record` step (`Done` / `Partly` / `Not done`), and `Rest & review` break timer.

## Story 3: Sticky Wall (Week / Month / All-Time + Project Filter)
- Implement `Sticky Wall` with `Week` / `Month` / `All time` range filter and Project filter, top stats (`Streak`, `Distractions / hour`, `Outcomes hit`), and visual sticky-note cards.

## Story 4: Work Log & Distraction Analytics
- Implement `Work Log` with outcome/project search, `Export CSV` action, full history table, *"What pulls you away"* bar chart, and *"Distractions per hour slot"* chart.

## Story 5: Progress — 1h→4h Capacity Ramp & 12-Week Heatmap
- Implement `Progress` with 4 level cards (`1h`, `2h`, `3h`, `4h`), 12-week contribution heatmap, Goal/Project time allocation, and `Your standard` controls (`Daily goal` 30m/1h/2h/3h/4h, `Count weekends`, `Break length`, `Auto level-up`).

## Story 6: Rituals & Goals
- Implement `Rituals & Goals` with `Morning · 20 min` checklist + *"Plan today's outcomes"* action, editable `Five goals` yellow card, `Night · 4 min` review card + *"Tomorrow's first outcome"*, and bottom reward chips.

## Story 7: Bilingual Support (VI/EN) & User Guide
- Full Vietnamese (`VI`) and English (`EN`) toggle across all pages, plus a comprehensive `User Guide` page with keyboard shortcuts and core principles.

## Story 8: PerOS Core Engine (`peros-kit.js`) & Cross-Platform PWA
- Extract pure, framework-free logic module (`docs/peros-kit.js`) shared between the Web/PWA app and automated Node.js self-tests (`tools/web-selftest.mjs`).
- Add Progressive Web App manifest (`docs/manifest.webmanifest`) and Service Worker (`docs/sw.js`) so PerOS installs cleanly as a standalone desktop app on both Windows and macOS.

## Story 9: Global Quick Capture (`Ctrl+K` / `⌘K`) & Focus Thought-Catcher
- Global Quick Capture modal (`Ctrl+K` / `⌘K` or Sidebar button) to capture thoughts, tasks, or links into the PerOS **Inbox** in under 3 seconds.
- During an active focus session on `Today`, tapping `+1 Wandering thought` offers an inline 1-line capture input that logs the distraction and pushes the thought straight into **Inbox** so the user never loses an idea or breaks focus.

## Story 10: PerOS Workspace (Inbox · PARA Projects · Knowledge Notes)
- Implement the **Workspace** page with three integrated views:
  - **Inbox:** Triage captured items into a Project's outcome queue, convert to a Knowledge Note, or mark done/archived.
  - **Projects & Areas (PARA):** Create and manage active Projects/Areas linked to the **Five Goals**, with next-outcome queues and automatic calculation of focused hours invested.
  - **Notes (Knowledge Vault):** Create and edit Markdown notes linked to Projects, supporting `[[Wiki-links]]` with automatic backlinks, progressive summary highlights, and linked focus sessions.

## Story 11: Execution Integration & Windows ↔ Mac Cloud Sync
- On `Today`: Pick an outcome directly from any active Project or Inbox item, attach the focus hour to a Project, and write in a live **Session Scratchpad** during focus that appends/saves to the Project's Knowledge Note upon completion.
- Add **Cloud Sync & Backup** modal/panel supporting **Private GitHub Gist Sync** (1-click Push/Pull or Auto-Sync between Windows office PC and personal MacBook) and **JSON File Export/Import**.
