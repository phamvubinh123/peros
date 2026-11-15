# PerOS — Personal OS for Deep Focus & Knowledge Execution

## Overview
PerOS (**Personal OS**) is a local-first, cross-platform Personal Operating System (Web/PWA for Windows & macOS, plus native macOS reference in `Sources/`). It combines **deep focus training** (modeled after the 4-step 60-minute outcome loop) with an **action-oriented knowledge & execution system** (Inbox Quick Capture, PARA Projects/Areas/Resources/Archives linked to Five Goals, and Markdown Knowledge Notes).

## Look & Feel
- Clean, calm, editorial workspace with warm terracotta/burnt-orange accent (`#C85A32` in Light mode, `#EE825A` in Dark mode), crisp cards on a strict 4px/8px spacing grid, and full Light & Dark mode + Vietnamese/English (`VI` / `EN`) bilingual support.
- Unified sidebar navigation with 6 core pages, a Quick Capture trigger (`Ctrl+K` / `⌘K`), a compact **Current Level** card, and Cross-Device Cloud Sync (GitHub Gist + 1-click JSON Import/Export).
- Warm yellow sticky notes on the Sticky Wall and Five Goals card, and a high-contrast Night Review card.

## Sidebar Pages
1. **Today (`today`)** — Personalized greeting (`Hello, Binh`), 4-step focus flow (`1 Choose outcome` → `2 Focus 60/30 min` → `3 Record` → `4 Rest & review`), ability to pick outcomes directly from active **Projects** or **Inbox**, live **Session Scratchpad** during focus that saves directly to a Knowledge Note, distraction counter with instant **Wandering Thought → Inbox Capture**, pre-flight checklist, hourly reward, and bottom `Hour 1..N` slot strip.
2. **Workspace (`workspace` — Inbox · Projects · Notes)** — The knowledge & project engine of PerOS:
   - **Inbox:** Instant capture stream (`Ctrl+K` / `⌘K` or from focus distractions) with 1-click triage into a Project outcome, a Knowledge Note, or Archive.
   - **Projects & Areas (PARA):** Active projects linked to the user's **Five Goals**, with concrete next outcomes, progress tracking, and focused hours invested.
   - **Notes (Knowledge Vault):** Markdown notes with progressive summarization highlights, `[[Wiki-links]]` backlinks, tags, and linked focus hours.
3. **Sticky Wall (`stickyWall`)** — `Week` / `Month` / `All time` visual wall of completed hour sticky notes, filterable by Project, with streak counter, distractions/hour, and outcomes hit.
4. **Work Log (`workLog`)** — Searchable, Project-filterable, CSV-exportable table of every recorded hour (`Date`, `Project`, `Outcome`, `Distractions`, `Top cause`, `Finished`, `Result`) plus *"What pulls you away"* and *"Distractions per hour slot"* analytics charts.
5. **Progress (`progress`)** — 4-tier capacity ramp (`1h` → `2h` → `3h` → `4h`), 12-week focus heatmap, hours-by-goal breakdown, and `Your standard` settings (`Daily goal` including 30m option, `Count weekends`, `Break length`, `Auto level-up`).
6. **Rituals & Goals (`ritualsGoals`)** — `Morning · 20 min` checklist, editable `Five goals` + identity & thought habits card, `Night · 4 min` review card (including Inbox zero check & tomorrow's first outcome), per-hour reward chips, and **User Guide & Cross-Device Sync** (Private GitHub Gist Sync + JSON Backup/Restore for seamless Windows work PC ↔ personal MacBook handoff).
