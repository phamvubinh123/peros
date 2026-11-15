// PerOS Kit — Pure logic & data structures for PerOS (Personal OS)
// Zero DOM dependencies so it runs identically in Browser and Node.js self-tests (tools/web-selftest.mjs).

export const STORAGE_KEY = "peros.personalos.v2";

export const CAUSES = [
  "Phone",
  "New tab",
  "Wandering thought",
  "Notification",
  "Someone talked to me",
  "Other",
];

export const PARA_KINDS = ["project", "area", "resource", "archive"];

export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanTitle(raw, fallback = "Deep focus session") {
  const cleaned = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function formatCountdown(seconds) {
  const clamped = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = String(Math.floor(clamped / 60)).padStart(2, "0");
  const secs = String(clamped % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function toDateKey(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function isWeekendDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getMondayOfWeek(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function completedCountsByDay(hours = []) {
  const counts = {};
  for (const h of hours) {
    const key = toDateKey(h.date);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function calculateStreakDays(
  hours = [],
  dailyGoal = 1,
  countWeekends = true,
  referenceDate = new Date()
) {
  const counts = completedCountsByDay(hours);
  const effectiveGoal = Math.max(1, Number(dailyGoal) || 1);
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  if ((counts[toDateKey(cursor)] || 0) < effectiveGoal) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (!countWeekends && isWeekendDate(cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if ((counts[toDateKey(cursor)] || 0) >= effectiveGoal) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function calculateCapacitySummary(
  hours = [],
  dailyGoal = 1,
  autoLevelUp = false,
  countWeekends = true,
  referenceDate = new Date()
) {
  const counts = completedCountsByDay(hours);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  let effectiveGoal = Math.max(1, Math.min(4, Number(dailyGoal) || 1));

  let last7DaysHit = 0;
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    if (!countWeekends && isWeekendDate(d)) continue;
    if ((counts[toDateKey(d)] || 0) >= effectiveGoal) {
      last7DaysHit += 1;
    }
  }

  const readyToPromote = last7DaysHit >= 5 && effectiveGoal < 4;
  if (autoLevelUp && readyToPromote) {
    effectiveGoal = Math.min(4, effectiveGoal + 1);
  }

  const descriptors = [
    { hours: 1, titleEn: "Starting point", titleVi: "Điểm xuất phát", subEn: "One full 60-minute hour.", subVi: "Một giờ 60 phút trọn vẹn." },
    { hours: 2, titleEn: "Build consistency", titleVi: "Xây sự đều đặn", subEn: "Two hours, once one feels easy.", subVi: "Hai giờ mỗi ngày khi 1 giờ đã nhẹ nhàng." },
    { hours: 3, titleEn: "Increase capacity", titleVi: "Tăng sức bền", subEn: "Three hours a day.", subVi: "Ba giờ tập trung sâu mỗi ngày." },
    { hours: 4, titleEn: "Target baseline", titleVi: "Mốc mục tiêu", subEn: "Four focused hours, consistently.", subVi: "Bốn giờ tập trung đều đặn mỗi ngày." },
  ];

  const tiers = descriptors.map((desc) => {
    const state =
      desc.hours < effectiveGoal
        ? "passed"
        : desc.hours === effectiveGoal
        ? "current"
        : "locked";
    return {
      ...desc,
      state,
      daysHitInLast7: state === "current" ? Math.min(5, last7DaysHit) : state === "passed" ? 5 : 0,
      daysNeeded: 5,
    };
  });

  return {
    currentHoursPerDay: effectiveGoal,
    daysHitInLast7: Math.min(5, last7DaysHit),
    daysNeededToLevelUp: Math.max(0, 5 - last7DaysHit),
    readyToPromote,
    tiers,
  };
}

export function buildWeeklyHeatmap(hours = [], weeks = 12, referenceDate = new Date()) {
  const counts = completedCountsByDay(hours);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const currentMonday = getMondayOfWeek(today);
  const startMonday = new Date(currentMonday);
  startMonday.setDate(currentMonday.getDate() - (weeks - 1) * 7);

  const grid = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startMonday);
      cellDate.setDate(startMonday.getDate() + w * 7 + d);
      const key = toDateKey(cellDate);
      const count = counts[key] || 0;
      col.push({
        dateKey: key,
        hoursCount: count,
        level: Math.min(4, count),
        isFuture: cellDate > today,
      });
    }
    grid.push(col);
  }
  return grid;
}

export function calculateCauseBreakdown(hours = [], days = 30, referenceDate = new Date()) {
  const cutoff = new Date(referenceDate);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);

  const totals = {};
  for (const h of hours) {
    const d = new Date(h.date);
    if (d >= cutoff && h.distr > 0) {
      totals[h.cause] = (totals[h.cause] || 0) + h.distr;
    }
  }
  return Object.entries(totals)
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.cause.localeCompare(b.cause)));
}

export function calculateDistractionsBySlot(hours = [], maxSlots = 4) {
  const slots = [];
  for (let slot = 1; slot <= maxSlots; slot++) {
    const matching = hours.filter((h) => Number(h.slot) === slot);
    const total = matching.reduce((acc, h) => acc + (Number(h.distr) || 0), 0);
    slots.push({
      slotIndex: slot,
      averageDistractions: matching.length ? total / matching.length : 0,
      sessionCount: matching.length,
    });
  }
  return slots;
}

export function filterHoursByRange(hours = [], wallRange = "week", projectFilter = "all", referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const monday = getMondayOfWeek(today);
  const monthCutoff = new Date(today);
  monthCutoff.setDate(today.getDate() - 30);

  return hours.filter((h) => {
    if (projectFilter && projectFilter !== "all" && h.projectId !== projectFilter) {
      return false;
    }
    const d = new Date(h.date);
    if (wallRange === "week") return d >= monday;
    if (wallRange === "month") return d >= monthCutoff;
    return true;
  });
}

// MARK: - Knowledge Vault & Wiki-Link Helpers

export function extractWikiLinks(markdown = "") {
  const matches = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(String(markdown))) !== null) {
    const title = match[1].trim();
    if (title && !matches.includes(title)) {
      matches.push(title);
    }
  }
  return matches;
}

export function computeBacklinks(targetNote, allNotes = []) {
  if (!targetNote || !targetNote.title) return [];
  const targetTitleLower = targetNote.title.trim().toLowerCase();
  return allNotes.filter((n) => {
    if (n.id === targetNote.id) return false;
    const links = extractWikiLinks(n.body).map((t) => t.toLowerCase());
    return links.includes(targetTitleLower);
  });
}

export function exportHoursCsv(hours = [], projects = []) {
  const projMap = Object.fromEntries((projects || []).map((p) => [p.id, p.title]));
  const lines = ["Date,Hour Slot,Project,Outcome,Distractions,Top Cause,Finished,Result"];
  const sorted = [...hours].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const h of sorted) {
    const dateStr = toDateKey(h.date);
    const d = new Date(h.date);
    const finishedStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const projName = (projMap[h.projectId] || "General").replaceAll('"', '""');
    const outcome = String(h.outcome || "").replaceAll('"', '""');
    lines.push(`${dateStr},${h.slot},"${projName}","${outcome}",${h.distr},${h.cause},${finishedStr},${h.result}`);
  }
  return lines.join("\n");
}

// MARK: - Default State & Seed Data

export function createDefaultState() {
  return {
    version: 2,
    language: "vi",
    page: "today",
    workspaceTab: "projects", // "inbox" | "projects" | "notes"
    paraFilter: "project", // "project" | "area" | "resource" | "archive" | "all"
    selectedProjectId: "proj_course",
    selectedNoteId: "note_focus_os",
    theme: "light",
    dailyGoal: 3,
    sessionMinutes: 60,
    countWeekends: true,
    breakMinutes: 10,
    autoLevelUp: false,
    wallRange: "week",
    wallProjectFilter: "all",
    workLogSearch: "",
    workLogProjectFilter: "all",
    hours: [],
    inbox: [],
    projects: [],
    notes: [],
    preflight: [
      { id: "p1", title: "Phone is in another room", done: true },
      { id: "p2", title: "Blocklist on: X, YouTube, Reddit, news", done: true },
      { id: "p3", title: "Water on the desk", done: false },
    ],
    morning: [
      { id: "m1", title: "Walk outside", min: 10, done: true },
      { id: "m2", title: "Big glass of water", min: 1, done: true },
      { id: "m3", title: "Read the five goals out loud", min: 2, done: true },
      { id: "m4", title: "Plan four outcomes for today", min: 4, done: false },
      { id: "m5", title: "Stretch", min: 3, done: false },
      { id: "m6", title: "Phone to another room, blocklist on", min: 2, done: false },
    ],
    night: [
      { id: "n1", title: "Clear the desk, close every tab", done: false },
      { id: "n2", title: "Process today's Inbox to zero", done: false },
      { id: "n3", title: "Review today: what pulled you away?", done: false },
      { id: "n4", title: "Write tomorrow's first outcome", done: false },
    ],
    fiveGoals: [
      "Ship the course by December 15",
      "Reach your monthly revenue goal",
      "Run a half-marathon in spring",
      "Read 24 books this year",
      "Publish one video every week",
    ],
    identity: "I am someone who does the hard hour first.",
    thoughtHabits: [
      "\"Difficult\" means I am in the right place.",
      "Count it, capture the thought, then go back. No guilt.",
    ],
    tomorrowFirstOutcome: "Record module 2, lessons 1–3",
    rewards: [
      "Beer on the balcony",
      "10-min walk",
      "One chapter of a novel",
      "Close the laptop for the day",
    ],
    sync: {
      gistId: "",
      githubToken: "",
      lastSyncedAt: null,
      autoSync: false,
    },
  };
}

export function seedSampleData(target = createDefaultState(), referenceDate = new Date()) {
  const now = new Date(referenceDate);

  target.projects = [
    {
      id: "proj_course",
      title: "Flagship Course Launch",
      kind: "project",
      goalIndex: 0,
      status: "Active",
      deadline: "2026-12-15",
      summary: "Complete curriculum, record 12 core lessons, and launch landing page.",
      outcomes: [
        { id: "out_1", title: "Record module 2, lessons 1–3", done: false },
        { id: "out_2", title: "Write checkout page FAQ & guarantee copy", done: false },
        { id: "out_3", title: "Outline the onboarding video script, 7 sections", done: true },
      ],
    },
    {
      id: "proj_growth",
      title: "Q4 Revenue & Outbound System",
      kind: "project",
      goalIndex: 1,
      status: "Active",
      deadline: "2026-11-30",
      summary: "Daily outbound campaigns, case studies, and CRM pipeline conversion.",
      outcomes: [
        { id: "out_4", title: "Send 15 personalized follow-ups to warm leads", done: false },
        { id: "out_5", title: "Write three cold email variants for the spring campaign", done: true },
      ],
    },
    {
      id: "proj_video",
      title: "Weekly YouTube Production",
      kind: "area",
      goalIndex: 4,
      status: "Ongoing",
      deadline: "Weekly",
      summary: "Consistent weekly deep-dive video and 3 shorts on Personal OS & AI workflows.",
      outcomes: [
        { id: "out_6", title: "Draft B-roll shot list for Personal OS walkthrough", done: false },
      ],
    },
    {
      id: "proj_health",
      title: "Half-Marathon & Energy Protocol",
      kind: "area",
      goalIndex: 2,
      status: "Ongoing",
      deadline: "Spring",
      summary: "Zone 2 runs, sleep hygiene, and morning sunlight protocol.",
      outcomes: [
        { id: "out_7", title: "Log weekly running mileage & Sunday 12km route", done: false },
      ],
    },
    {
      id: "proj_resource_ai",
      title: "Agentic Coding & Design Patterns",
      kind: "resource",
      goalIndex: 3,
      status: "Reference",
      deadline: "Evergreen",
      summary: "Curated notes on BAMA architecture, 4pt grid discipline, and self-verification.",
      outcomes: [],
    },
  ];

  target.inbox = [
    {
      id: "in_1",
      text: "Test 30-minute sprint mode on Windows workstation before afternoon meetings",
      source: "Quick Capture",
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "in_2",
      text: "Add progressive summary callout to Module 2 Lesson 1 script",
      source: "Focus Thought",
      createdAt: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: "in_3",
      text: "Book domain renewal and check Cloudflare DNS settings",
      source: "Quick Capture",
      createdAt: new Date(now.getTime() - 22 * 3600 * 1000).toISOString(),
    },
  ];

  target.notes = [
    {
      id: "note_focus_os",
      title: "PerOS Execution Architecture",
      projectId: "proj_course",
      tags: ["architecture", "focus", "para"],
      highlight: "Evidence beats intention: every note should serve an upcoming 60-minute focus block.",
      body: "PerOS connects **Four-Step Deep Focus** with **PARA Knowledge Organization**.\n\n- Capture wandering thoughts immediately during focus so working memory stays clear.\n- Link every active Project to one of the Five Goals.\n- Reference [[Course Launch Blueprint]] and [[Cold Email Playbook]] when planning outcomes.",
      updatedAt: new Date(now.getTime() - 3600 * 1000).toISOString(),
    },
    {
      id: "note_course_blueprint",
      title: "Course Launch Blueprint",
      projectId: "proj_course",
      tags: ["course", "curriculum"],
      highlight: "Module 2 focuses on building a repeatable 4-hour daily deep work standard.",
      body: "### Module 2 Breakdown\n1. Designing the pre-flight environment checklist\n2. Counting distractions without guilt\n3. Connecting [[PerOS Execution Architecture]] to daily deliverables.",
      updatedAt: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
    },
    {
      id: "note_cold_email",
      title: "Cold Email Playbook",
      projectId: "proj_growth",
      tags: ["outbound", "copywriting"],
      highlight: "Keep emails under 75 words with one concrete observation and zero fluff.",
      body: "### Three Variants Tested Today\n- Variant A: Direct problem statement + 2-minute Loom teardown\n- Variant B: Case study metric hook (`+38% reply rate`)\n- Linked to [[PerOS Execution Architecture]].",
      updatedAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    },
  ];

  const samples = [
    [0, 1, "Write three cold email variants for the spring campaign", 2, "Phone", "Done", "proj_growth", "note_cold_email", "Drafted Variants A, B, and C. Variant B hook feels strongest."],
    [0, 2, "Outline the onboarding video script, 7 sections", 1, "Wandering thought", "Done", "proj_course", "note_course_blueprint", "Locked all 7 transitions and opening hook."],
    [-1, 1, "Prep the workshop slides", 1, "New tab", "Done", "proj_course", "note_course_blueprint", "24 slides clean on 4pt grid."],
    [-1, 2, "Record 3 shorts", 2, "Phone", "Done", "proj_video", null, "Recorded in one take."],
    [-1, 3, "Write the case study", 1, "Notification", "Done", "proj_growth", "note_cold_email", "Published draft."],
    [-2, 1, "Sketch the app icon", 1, "Wandering thought", "Done", "proj_course", "note_focus_os", "Terracotta dial icon finalized."],
    [-2, 2, "Clean the CRM: 40 leads", 2, "New tab", "Partly", "proj_growth", null, "Finished 28 of 40 leads."],
    [-3, 1, "Answer 12 support tickets", 3, "Someone talked to me", "Done", "proj_growth", null, "Inbox zero."],
    [-3, 2, "Draft the newsletter", 0, "Wandering thought", "Done", "proj_video", null, "Sent to list."],
    [-4, 1, "Write the client proposal", 1, "Phone", "Done", "proj_growth", null, "Signed and delivered."],
    [-4, 2, "Refactor the auth flow", 2, "New tab", "Done", "proj_course", null, "All tests green."],
    [-10, 1, "Build curriculum outline & milestone map", 1, "Phone", "Done", "proj_course", "note_course_blueprint", "Month view verification hour."],
    [-22, 1, "Q3 retrospective & Q4 revenue model", 0, "New tab", "Done", "proj_growth", "note_cold_email", "Baseline targets locked."],
  ];

  target.hours = samples.map(([dayOffset, slot, outcome, distr, cause, result, projectId, noteId, scratchpad], idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(8 + slot, 15, 0, 0);
    return {
      id: `hr_${idx + 1}`,
      date: d.toISOString(),
      slot,
      outcome,
      distr,
      cause,
      result,
      projectId,
      noteId,
      scratchpad: scratchpad || "",
    };
  });

  return target;
}
