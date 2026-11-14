# Peros — Focus Training & Personal OS for macOS

## Overview
Peros is a native macOS SwiftUI application for training deep focus like a skill, modeled after the Tally focus-training workflow. It runs 100% locally on Mac with SwiftData persistence, helping you plan concrete hourly outcomes, run 60-minute focus sessions with a floating menu-bar/HUD timer, log distractions and their causes, build a visual Sticky Wall of finished hours, track progression from 1h to 4h/day, and anchor each day with Morning & Night rituals and Five Goals.

## Look & Feel
- Clean, calm, editorial macOS workspace with warm terracotta/burnt-orange accent (`#C85A32` brand accent when Mac is Multicolor, or system accent), crisp cards, and full Light & Dark mode support.
- System `NavigationSplitView` sidebar with 5 pages + a compact **Current Level** card at the bottom of the sidebar.
- Warm yellow sticky notes on the Sticky Wall and Five Goals card, and a high-contrast Night Review card.

## Sidebar Pages
1. **Today** — 4-step hourly focus flow (`1 Choose outcome` → `2 Focus 60 min` → `3 Record` → `4 Rest & review`), pre-flight checklist, hourly reward, bottom `Hour 1..4` slot strip, and live countdown + distraction counter.
2. **Sticky Wall** — Weekly/Monthly/All-time grid of completed hour sticky notes, streak counter, distractions/hour, outcomes hit, and local Focus Crew summary.
3. **Work Log** — Searchable, CSV-exportable table of every recorded hour (`Date`, `Outcome`, `Distractions`, `Top cause`, `Finished`, `Result`) plus *"What pulls you away"* and *"Distractions per hour slot"* analytics charts.
4. **Progress** — 4-tier capacity ramp (`1h` → `2h` → `3h` → `4h`), 12-week focus heatmap, and `Your standard` settings (`Daily goal`, `Count weekends`, `Break length`, `Auto level-up`).
5. **Rituals & Goals** — `Morning · 20 min` checklist, editable `Five goals` + identity & thought habits card, `Night · 4 min` review card, and per-hour reward chips.

## Menu Bar & Floating HUD
- Menu bar extra displaying active focus countdown (`MM:SS`) and current hour slot, with quick `+1 Distraction` and `Open Peros` actions.
- Optional compact floating HUD panel during active focus sessions.
