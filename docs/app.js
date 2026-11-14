const STORAGE_KEY = "peros.web.v1";

const DEFAULT_STATE = {
  page: "today",
  theme: "light",
  dailyGoal: 3,
  countWeekends: true,
  breakMinutes: 10,
  autoLevelUp: false,
  wallRange: "week",
  workLogSearch: "",
  hours: [],
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
    { id: "n2", title: "Review today: what pulled you away?", done: false },
    { id: "n3", title: "Write tomorrow's first outcome", done: false },
    { id: "n4", title: "Share today's wall with Focus Crew", done: false },
  ],
  fiveGoals: [
    "Ship the course by December 15",
    "Reach your monthly revenue goal",
    "Run a half-marathon in spring",
    "Read 24 books this year",
    "Publish one video every week",
  ],
  identity: "I am someone who does the hard hour first.",
  tomorrowFirstOutcome: "Record module 2, lessons 1–3",
  rewards: [
    "Coffee on the balcony",
    "10-min walk",
    "One chapter of a novel",
    "Close the laptop for the day",
  ],
};

const CAUSES = ["Phone", "New tab", "Wandering thought", "Notification", "Someone talked to me"];

let state = loadState();
let session = {
  step: 1, // 1 choose, 2 focus, 3 record, 4 rest
  slot: 1,
  outcome: "",
  reward: state.rewards[0],
  remaining: 3600,
  breakRemaining: state.breakMinutes * 60,
  paused: false,
  distractions: 0,
  causes: {},
  timerId: null,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSampleData(structuredClone(DEFAULT_STATE));
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch {
    return seedSampleData(structuredClone(DEFAULT_STATE));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedSampleData(target) {
  const now = new Date();
  const samples = [
    [0, 1, "Write three cold email variants for the spring campaign", 3, "Phone", "Done"],
    [0, 2, "Outline the onboarding video script, 7 sections", 1, "Wandering thought", "Done"],
    [-1, 1, "Prep the workshop slides", 1, "New tab", "Done"],
    [-1, 2, "Record 3 shorts", 2, "Phone", "Done"],
    [-1, 3, "Write the case study", 1, "Notification", "Done"],
    [-2, 1, "Sketch the app icon", 1, "Wandering thought", "Done"],
    [-2, 2, "Clean the CRM: 40 leads", 2, "New tab", "Partly"],
    [-3, 1, "Answer 12 support tickets", 4, "Someone talked to me", "Done"],
    [-3, 2, "Draft the newsletter", 0, "Wandering thought", "Done"],
    [-4, 1, "Write the client proposal", 1, "Phone", "Done"],
    [-4, 2, "Refactor the auth flow", 2, "New tab", "Done"],
  ];
  target.hours = samples.map(([dayOffset, slot, outcome, distr, cause, result]) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(8 + slot, 0, 0, 0);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      date: d.toISOString(),
      slot,
      outcome,
      distr,
      cause,
      result,
    };
  });
  return target;
}

function fmtTime(sec) {
  const s = Math.max(0, sec);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function todayHours() {
  const now = new Date();
  return state.hours.filter((h) => isSameDay(new Date(h.date), now));
}

function nextOpenSlot() {
  const done = new Set(todayHours().map((h) => h.slot));
  for (let i = 1; i <= Math.max(4, state.dailyGoal); i++) {
    if (!done.has(i)) return i;
  }
  return done.size + 1;
}

function startTimer() {
  stopTimer();
  session.timerId = setInterval(() => {
    if (session.paused) return;
    if (session.step === 2) {
      session.remaining = Math.max(0, session.remaining - 1);
      document.title = `${fmtTime(session.remaining)} · Peros`;
      if (session.remaining === 0) {
        stopTimer();
        session.step = 3;
      }
      render();
    } else if (session.step === 4) {
      session.breakRemaining = Math.max(0, session.breakRemaining - 1);
      if (session.breakRemaining === 0) {
        finishBreak();
      } else {
        render();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (session.timerId) clearInterval(session.timerId);
  session.timerId = null;
  document.title = "Peros — Train Focus Like a Skill";
}

function finishBreak() {
  stopTimer();
  session.step = 1;
  session.outcome = "";
  session.slot = nextOpenSlot();
  session.reward = state.rewards[(session.slot - 1) % state.rewards.length];
  render();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSidebarLevel() {
  const daysHit = Math.min(5, new Set(state.hours.map((h) => h.date.slice(0, 10))).size);
  document.getElementById("sidebarLevelCard").innerHTML = `
    <div class="level-kicker">CURRENT LEVEL</div>
    <div class="level-value">${state.dailyGoal} ${state.dailyGoal === 1 ? "hour" : "hours"} / day</div>
    <div class="level-sub">${daysHit} of 5 days hit this week · ${Math.max(0, 5 - daysHit)} more to level up.</div>
  `;
}

function renderToday() {
  const doneToday = todayHours();
  const totalSlots = Math.max(4, state.dailyGoal);
  const bySlot = Object.fromEntries(doneToday.map((h) => [h.slot, h]));
  if (session.step === 1) session.slot = nextOpenSlot();

  let stageHtml = "";
  if (session.step === 1) {
    stageHtml = `
      <div class="grid-2">
        <div class="card">
          <div class="kicker">HOUR ${session.slot} OF ${totalSlots}</div>
          <h2 style="margin:0 0 8px;font-size:24px;">What will exist at the end of this hour?</h2>
          <p class="page-subtitle" style="margin-bottom:16px;">One specific outcome. Not a topic. You should be able to say "done" or "not done" when the timer ends.</p>
          <input class="input-text" id="outcomeInput" placeholder="Untitled hour" value="${escapeHtml(session.outcome)}" />
          <div class="chip-row">
            <button class="chip" data-example="Write three cold email variants for the spring campaign">Write three cold email variants...</button>
            <button class="chip" data-example="Record the 4-minute intro for module 2">Record the 4-minute intro...</button>
            <button class="chip" data-example="Fix the 5 failing checkout tests">Fix the 5 failing checkout tests</button>
          </div>
          <button class="btn-primary" id="startHourBtn">Start 60:00</button>
        </div>
        <div class="card">
          <h3 style="margin:0 0 12px;">Before you start</h3>
          ${state.preflight.map((p) => `
            <label class="check-row">
              <input type="checkbox" data-preflight="${p.id}" ${p.done ? "checked" : ""} />
              <span>${escapeHtml(p.title)}</span>
            </label>
          `).join("")}
          <hr style="border:0;border-top:1px solid var(--hairline);margin:16px 0;" />
          <div style="font-size:13px;color:var(--muted);margin-bottom:6px;">Reward after this hour</div>
          <input class="input-text" id="rewardInput" value="${escapeHtml(session.reward)}" />
        </div>
      </div>
    `;
  } else if (session.step === 2) {
    stageHtml = `
      <div class="grid-2">
        <div class="card">
          <div class="kicker">HOUR ${session.slot} OF ${totalSlots} · FOCUSING</div>
          <h2 style="margin:0 0 8px;">${escapeHtml(session.outcome)}</h2>
          <div class="countdown">${fmtTime(session.remaining)}</div>
          <div style="display:flex;gap:10px;margin-bottom:14px;">
            <button class="btn-secondary" id="pauseBtn">${session.paused ? "Resume" : "Pause"}</button>
            <button class="btn-primary" id="finishEarlyBtn">Finish &amp; Record</button>
          </div>
          <div style="font-size:14px;color:var(--muted);">Distractions logged: <strong>${session.distractions}</strong></div>
        </div>
        <div class="card">
          <h3 style="margin:0 0 10px;">Count a distraction</h3>
          ${CAUSES.map((c) => `
            <button class="btn-secondary" data-cause="${c}" style="width:100%;text-align:left;margin-bottom:8px;">
              +1 ${c} (${session.causes[c] || 0})
            </button>
          `).join("")}
        </div>
      </div>
    `;
  } else if (session.step === 3) {
    stageHtml = `
      <div class="card">
        <div class="kicker">HOUR ${session.slot} COMPLETE</div>
        <h2 style="margin:0 0 8px;">Did you finish: "${escapeHtml(session.outcome)}"?</h2>
        <p class="page-subtitle" style="margin-bottom:16px;">Distractions logged: ${session.distractions}.</p>
        <div style="display:flex;gap:10px;">
          <button class="btn-primary" data-result="Done">Done</button>
          <button class="btn-secondary" data-result="Partly">Partly</button>
          <button class="btn-secondary" data-result="Not done">Not done</button>
        </div>
      </div>
    `;
  } else {
    stageHtml = `
      <div class="card">
        <div class="kicker" style="color:var(--green);">REST &amp; REVIEW</div>
        <h2 style="margin:0 0 8px;">Take ${state.breakMinutes} minutes. Enjoy: ${escapeHtml(session.reward)}</h2>
        <div class="countdown">${fmtTime(session.breakRemaining)}</div>
        <button class="btn-primary" id="nextHourBtn">Start Next Hour</button>
      </div>
    `;
  }

  const slotsHtml = Array.from({ length: totalSlots }, (_, idx) => {
    const slot = idx + 1;
    const rec = bySlot[slot];
    if (rec) {
      return `
        <div class="slot-card done">
          <div style="font-size:12px;font-weight:700;color:var(--muted);">HOUR ${slot}</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px;">${escapeHtml(rec.outcome)}</div>
        </div>
      `;
    }
    const isCur = slot === session.slot;
    return `
      <div class="slot-card ${isCur ? "current" : ""}">
        <div style="font-size:12px;font-weight:700;color:${isCur ? "var(--accent)" : "var(--muted)"};">HOUR ${slot}${isCur ? " · NOW" : ""}</div>
        <div style="font-size:14px;color:var(--muted);margin-top:4px;">${isCur ? "Choosing outcome..." : "Not planned yet"}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="header-row">
      <div style="font-weight:600;color:var(--muted);">Today · ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
      <div style="font-size:14px;color:var(--muted);">Focused hours: <strong>${doneToday.length} / ${totalSlots}</strong></div>
    </div>
    <div class="step-bar">
      ${["1 Choose outcome", "2 Focus 60 min", "3 Record", "4 Rest & review"].map((label, i) => `
        <span class="step-pill ${session.step === i + 1 ? "active" : ""}">${label}</span>
      `).join("")}
    </div>
    ${stageHtml}
    <div class="slot-strip">${slotsHtml}</div>
  `;
}

function renderStickyWall() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const avgDistr = state.hours.length
    ? (state.hours.reduce((a, b) => a + b.distr, 0) / state.hours.length).toFixed(1)
    : "0.0";
  const hit = state.hours.filter((h) => h.result === "Done").length;

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">${state.hours.length} notes on the wall</h1>
        <p class="page-subtitle">Every note is one finished hour. Evidence beats intention.</p>
      </div>
      <div style="display:flex;gap:24px;">
        <div><div style="font-size:13px;color:var(--muted);">Distractions / hour</div><strong style="font-size:22px;">${avgDistr}</strong></div>
        <div><div style="font-size:13px;color:var(--muted);">Outcomes hit</div><strong style="font-size:22px;">${hit} of ${state.hours.length}</strong></div>
      </div>
    </div>
    <div class="card">
      <div class="week-grid">
        ${days.map((d) => {
          const items = state.hours.filter((h) => isSameDay(new Date(h.date), d));
          return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:8px;">
                <strong>${d.toLocaleDateString(undefined, { weekday: "short" })}</strong>
                <span>${items.length}/${state.dailyGoal}</span>
              </div>
              ${items.length ? items.map((h) => `
                <div class="sticky-item">
                  <div style="font-weight:600;margin-bottom:6px;">${escapeHtml(h.outcome)}</div>
                  <div style="font-size:12px;color:var(--muted);">${h.distr} distr. ${h.result === "Partly" ? "· partly" : ""}</div>
                </div>
              `).join("") : `<div style="height:84px;border:1px dashed var(--hairline);border-radius:8px;"></div>`}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderWorkLog() {
  const q = state.workLogSearch.trim().toLowerCase();
  const rows = [...state.hours]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((h) => !q || h.outcome.toLowerCase().includes(q) || h.cause.toLowerCase().includes(q));

  const causeCounts = {};
  for (const h of state.hours) {
    if (h.distr > 0) causeCounts[h.cause] = (causeCounts[h.cause] || 0) + h.distr;
  }
  const sortedCauses = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]);
  const maxCause = sortedCauses[0]?.[1] || 1;

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">Every hour, on the record</h1>
        <p class="page-subtitle">Date, outcome, distractions, finish time. Saved locally in your browser.</p>
      </div>
      <div style="display:flex;gap:10px;">
        <input class="input-text" id="workLogSearch" placeholder="Search outcomes" value="${escapeHtml(state.workLogSearch)}" style="width:220px;" />
        <button class="btn-secondary" id="exportCsvBtn">Export CSV</button>
      </div>
    </div>
    <div class="grid-2">
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="log-table">
          <thead>
            <tr><th>Date</th><th>Outcome</th><th>Distr.</th><th>Top cause</th><th>Result</th></tr>
          </thead>
          <tbody>
            ${rows.map((h) => `
              <tr>
                <td>${new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                <td>${escapeHtml(h.outcome)}</td>
                <td>${h.distr}</td>
                <td>${escapeHtml(h.cause)}</td>
                <td><span class="badge ${h.result === "Done" ? "done" : "partly"}">${escapeHtml(h.result)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3 style="margin:0 0 12px;">What pulls you away</h3>
        ${sortedCauses.map(([cause, count]) => `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
              <span>${escapeHtml(cause)}</span><strong>${count}</strong>
            </div>
            <div style="height:8px;border-radius:99px;background:var(--card-muted);overflow:hidden;">
              <div style="height:100%;width:${(count / maxCause) * 100}%;background:var(--accent);"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderProgress() {
  const tiers = [
    [1, "Starting point", "One full 60-minute hour."],
    [2, "Build consistency", "Two hours, once one feels easy."],
    [3, "Increase capacity", "Three hours a day."],
    [4, "Target baseline", "Four focused hours, consistently."],
  ];
  const countsByDay = {};
  for (const h of state.hours) {
    const key = h.date.slice(0, 10);
    countsByDay[key] = (countsByDay[key] || 0) + 1;
  }

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(monday);
  start.setDate(monday.getDate() - 11 * 7);

  let heatCols = "";
  for (let w = 0; w < 12; w++) {
    let cells = "";
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + w * 7 + d);
      const key = cellDate.toISOString().slice(0, 10);
      const c = Math.min(4, countsByDay[key] || 0);
      const isFuture = cellDate > today;
      cells += `<div class="heatmap-cell" style="background:${isFuture ? "transparent" : `var(--heat-${c})`};${isFuture ? "border:1px solid var(--hairline);" : ""}" title="${key}: ${countsByDay[key] || 0}h"></div>`;
    }
    heatCols += `<div class="heatmap-col">${cells}</div>`;
  }

  return `
    <div class="kicker">TRAIN FOCUS LIKE A SKILL</div>
    <h1 class="page-title">You are at ${state.dailyGoal} ${state.dailyGoal === 1 ? "hour" : "hours"} a day</h1>
    <p class="page-subtitle" style="margin-bottom:20px;">Hit your level on 5 of the last 7 days and Peros offers the next one.</p>

    <div class="grid-4" style="margin-bottom:20px;">
      ${tiers.map(([hrs, title, sub]) => {
        const isCur = hrs === state.dailyGoal;
        const isPassed = hrs < state.dailyGoal;
        return `
          <div class="card ${isCur ? "night" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="font-size:24px;">${hrs}h</strong>
              <span class="badge ${isPassed ? "done" : ""}" style="${isCur ? "background:var(--accent);color:var(--on-accent);" : ""}">
                ${isPassed ? "Passed" : isCur ? "You are here" : "Locked"}
              </span>
            </div>
            <div style="font-weight:600;margin-bottom:4px;">${title}</div>
            <div style="font-size:13px;color:${isCur ? "var(--night-muted)" : "var(--muted)"};">${sub}</div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="grid-2">
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
          <strong>Last 12 weeks</strong>
          <span style="font-size:14px;color:var(--muted);">${state.hours.length} focused hours</span>
        </div>
        <div class="heatmap-grid">${heatCols}</div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 12px;">Your standard</h3>
        <label style="display:block;margin-bottom:12px;">
          <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">Daily goal</div>
          <select class="input-text" id="dailyGoalSelect">
            ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${state.dailyGoal === n ? "selected" : ""}>${n} ${n === 1 ? "hour" : "hours"}</option>`).join("")}
          </select>
        </label>
        <label class="check-row">
          <input type="checkbox" id="countWeekendsChk" ${state.countWeekends ? "checked" : ""} />
          <span>Count weekends</span>
        </label>
      </div>
    </div>
  `;
}

function renderRitualsGoals() {
  return `
    <h1 class="page-title">Set up the day. Close it down.</h1>
    <p class="page-subtitle" style="margin-bottom:20px;">Your environment and habits should push you toward the next focused hour.</p>
    <div class="grid-3">
      <div class="card">
        <h3 style="margin:0 0 12px;">Morning · 20 min</h3>
        ${state.morning.map((m) => `
          <label class="check-row">
            <input type="checkbox" data-morning="${m.id}" ${m.done ? "checked" : ""} />
            <span style="flex:1;">${escapeHtml(m.title)}</span>
            <span style="font-size:12px;color:var(--muted);">${m.min}m</span>
          </label>
        `).join("")}
        <button class="btn-primary" id="planOutcomesBtn" style="width:100%;margin-top:16px;">Plan today's ${state.dailyGoal} outcomes</button>
      </div>

      <div class="card sticky">
        <h3 style="margin:0 0 12px;">Five goals</h3>
        ${state.fiveGoals.map((g, i) => `
          <div style="margin-bottom:8px;font-size:15px;"><strong>${i + 1}.</strong> ${escapeHtml(g)}</div>
        `).join("")}
        <hr style="border:0;border-top:1px solid var(--sticky-border);margin:14px 0;" />
        <div style="font-size:12px;color:var(--muted);font-weight:600;">Who I am becoming</div>
        <div style="font-weight:600;margin-top:4px;">${escapeHtml(state.identity)}</div>
      </div>

      <div class="card night">
        <h3 style="margin:0 0 12px;">Night · 4 min</h3>
        ${state.night.map((n) => `
          <label class="check-row">
            <input type="checkbox" data-night="${n.id}" ${n.done ? "checked" : ""} />
            <span>${escapeHtml(n.title)}</span>
          </label>
        `).join("")}
        <div style="margin-top:18px;">
          <div style="font-size:12px;color:var(--night-muted);margin-bottom:6px;">Tomorrow's first outcome</div>
          <input class="input-text" id="tomorrowOutcomeInput" value="${escapeHtml(state.tomorrowFirstOutcome)}" style="background:rgba(255,255,255,0.08);color:var(--night-ink);border-color:rgba(255,255,255,0.12);" />
        </div>
      </div>
    </div>
  `;
}

function render() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === state.page);
  });
  renderSidebarLevel();

  const main = document.getElementById("mainContent");
  if (state.page === "today") main.innerHTML = renderToday();
  else if (state.page === "stickyWall") main.innerHTML = renderStickyWall();
  else if (state.page === "workLog") main.innerHTML = renderWorkLog();
  else if (state.page === "progress") main.innerHTML = renderProgress();
  else main.innerHTML = renderRitualsGoals();

  bindEvents();
}

function bindEvents() {
  document.getElementById("outcomeInput")?.addEventListener("input", (e) => { session.outcome = e.target.value; });
  document.getElementById("rewardInput")?.addEventListener("input", (e) => { session.reward = e.target.value; });
  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      session.outcome = btn.dataset.example;
      render();
    });
  });
  document.getElementById("startHourBtn")?.addEventListener("click", () => {
    if (!session.outcome.trim()) session.outcome = "Deep focus session";
    session.remaining = 3600;
    session.distractions = 0;
    session.causes = {};
    session.paused = false;
    session.step = 2;
    startTimer();
    render();
  });
  document.getElementById("pauseBtn")?.addEventListener("click", () => {
    session.paused = !session.paused;
    render();
  });
  document.getElementById("finishEarlyBtn")?.addEventListener("click", () => {
    stopTimer();
    session.step = 3;
    render();
  });
  document.querySelectorAll("[data-cause]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = btn.dataset.cause;
      session.distractions += 1;
      session.causes[c] = (session.causes[c] || 0) + 1;
      render();
    });
  });
  document.querySelectorAll("[data-result]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const topCause = Object.entries(session.causes).sort((a, b) => b[1] - a[1])[0]?.[0] || "Phone";
      state.hours.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
        date: new Date().toISOString(),
        slot: session.slot,
        outcome: session.outcome,
        distr: session.distractions,
        cause: topCause,
        result: btn.dataset.result,
      });
      saveState();
      session.breakRemaining = state.breakMinutes * 60;
      session.step = 4;
      startTimer();
      render();
    });
  });
  document.getElementById("nextHourBtn")?.addEventListener("click", finishBreak);
  document.querySelectorAll("[data-preflight]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const item = state.preflight.find((p) => p.id === cb.dataset.preflight);
      if (item) item.done = cb.checked;
      saveState();
    });
  });
  document.querySelectorAll("[data-morning]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const item = state.morning.find((m) => m.id === cb.dataset.morning);
      if (item) item.done = cb.checked;
      saveState();
    });
  });
  document.querySelectorAll("[data-night]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const item = state.night.find((n) => n.id === cb.dataset.night);
      if (item) item.done = cb.checked;
      saveState();
    });
  });
  document.getElementById("planOutcomesBtn")?.addEventListener("click", () => {
    state.page = "today";
    render();
  });
  document.getElementById("tomorrowOutcomeInput")?.addEventListener("input", (e) => {
    state.tomorrowFirstOutcome = e.target.value;
    saveState();
  });
  document.getElementById("workLogSearch")?.addEventListener("input", (e) => {
    state.workLogSearch = e.target.value;
    render();
  });
  document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
    const csv = ["Date,Slot,Outcome,Distractions,Top Cause,Result"]
      .concat(state.hours.map((h) => `${h.date.slice(0, 10)},${h.slot},"${h.outcome.replaceAll('"', '""')}",${h.distr},${h.cause},${h.result}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "peros-work-log.csv";
    a.click();
  });
  document.getElementById("dailyGoalSelect")?.addEventListener("change", (e) => {
    state.dailyGoal = Number(e.target.value);
    saveState();
    render();
  });
  document.getElementById("countWeekendsChk")?.addEventListener("change", (e) => {
    state.countWeekends = e.target.checked;
    saveState();
  });
}

document.getElementById("navList").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  state.page = btn.dataset.page;
  saveState();
  render();
});

document.getElementById("toggleThemeBtn").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveState();
  render();
});

document.getElementById("seedDemoBtn").addEventListener("click", () => {
  state = seedSampleData(structuredClone(DEFAULT_STATE));
  saveState();
  render();
});

render();
