#!/usr/bin/env node
// Self-test for PerOS Web/PWA (tools/web-selftest.mjs)
// Mirrors Sources/Peros/SelfTest.swift: runs against an isolated in-memory state,
// verifies Stories 1–11, prints PASS or FAIL per check, and exits 0 or 1.

import {
  cleanTitle,
  formatCountdown,
  calculateStreakDays,
  calculateCapacitySummary,
  buildWeeklyHeatmap,
  calculateCauseBreakdown,
  calculateDistractionsBySlot,
  filterHoursByRange,
  extractWikiLinks,
  computeBacklinks,
  exportHoursCsv,
  createDefaultState,
  seedSampleData,
} from "../docs/peros-kit.js";

let failures = 0;
let count = 0;

function check(name, ok, detail = "") {
  count += 1;
  if (!ok) failures += 1;
  console.log(ok ? `PASS ${name}` : `FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

const refDate = new Date("2026-11-15T10:00:00Z");
const state = seedSampleData(createDefaultState(), refDate);

// 1. Core formatting & title cleaning
check("cleanTitle trims whitespace", cleanTitle("  Write   launch post ") === "Write launch post");
check("cleanTitle uses fallback when empty", cleanTitle("   ", "Deep focus") === "Deep focus");
check("countdown formats 41:12", formatCountdown(2472) === "41:12");
check("countdown clamps negative", formatCountdown(-10) === "00:00");

// 2. Heatmap & analytics
const grid = buildWeeklyHeatmap(state.hours, 12, refDate);
check(
  "heatmap has 12 weeks x 7 days",
  grid.length === 12 && grid.every((col) => col.length === 7)
);

const causes = calculateCauseBreakdown(state.hours, 30, refDate);
check("causeBreakdown returns sorted causes", causes.length > 0 && causes[0].count >= causes[causes.length - 1].count);

const slots = calculateDistractionsBySlot(state.hours, 4);
check("distractionsBySlot returns 4 slots", slots.length === 4);

const streak = calculateStreakDays(state.hours, 2, true, refDate);
check("streakDays calculates consecutive days", streak >= 2);

const cap = calculateCapacitySummary(state.hours, 2, true, true, refDate);
check("capacitySummary has 4 tiers", cap.tiers.length === 4);

// 3. Sticky Wall filters (Week vs Month vs All-time + Project Filter)
const weekHours = filterHoursByRange(state.hours, "week", "all", refDate);
const monthHours = filterHoursByRange(state.hours, "month", "all", refDate);
const courseHours = filterHoursByRange(state.hours, "allTime", "proj_course", refDate);
check("month filter includes more hours than week filter", monthHours.length > weekHours.length);
check("project filter isolates proj_course hours", courseHours.length > 0 && courseHours.every((h) => h.projectId === "proj_course"));

// 4. PerOS Workspace: Inbox, PARA Projects, Wiki-Links & Backlinks
check("seed data populates PARA projects", state.projects.length >= 4);
check("seed data populates Inbox items", state.inbox.length >= 3);
check("seed data populates Knowledge Notes", state.notes.length >= 3);

const archNote = state.notes.find((n) => n.id === "note_focus_os");
const links = extractWikiLinks(archNote.body);
check(
  "extractWikiLinks parses [[Note Title]] references",
  links.includes("Course Launch Blueprint") && links.includes("Cold Email Playbook")
);

const backlinks = computeBacklinks(archNote, state.notes);
check("computeBacklinks finds notes linking back to PerOS Execution Architecture", backlinks.length === 2);

// 5. CSV Export with Project column
const csv = exportHoursCsv(state.hours, state.projects);
check(
  "csv export includes Project and Outcome columns",
  csv.includes("Flagship Course Launch") && csv.includes("Write three cold email variants")
);

console.log(
  failures === 0
    ? `SELFTEST PASS ${count} checks`
    : `SELFTEST FAIL ${failures} of ${count} checks`
);
process.exit(failures === 0 ? 0 : 1);
