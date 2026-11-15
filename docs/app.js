import {
  STORAGE_KEY,
  CAUSES,
  PARA_KINDS,
  uid,
  cleanTitle,
  formatCountdown,
  toDateKey,
  isSameDay,
  getMondayOfWeek,
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
} from "./peros-kit.js";

let state = loadState();
let session = {
  step: 1, // 1 choose, 2 focus, 3 record, 4 rest
  slot: 1,
  outcome: "",
  projectId: state.projects[0]?.id || "proj_course",
  scratchpad: "",
  thoughtDraft: "",
  showThoughtCapture: false,
  reward: state.rewards[0] || "Beer on the balcony",
  durationSeconds: (state.sessionMinutes || 60) * 60,
  remaining: (state.sessionMinutes || 60) * 60,
  breakRemaining: (state.breakMinutes || 10) * 60,
  paused: false,
  distractions: 0,
  causes: {},
  timerId: null,
};

let syncStatusMsg = "";

function t(vi, en) {
  return state.language === "vi" ? vi : en;
}

function causeLabel(cause) {
  const map = {
    Phone: t("Điện thoại", "Phone"),
    "New tab": t("Mở tab mới", "New tab"),
    "Wandering thought": t("Suy nghĩ lan man", "Wandering thought"),
    Notification: t("Thông báo", "Notification"),
    "Someone talked to me": t("Có người bắt chuyện", "Someone talked to me"),
    Other: t("Khác", "Other"),
  };
  return map[cause] || cause;
}

function resultLabel(res) {
  const map = {
    Done: t("Xong", "Done"),
    Partly: t("Một phần", "Partly"),
    "Not done": t("Chưa xong", "Not done"),
  };
  return map[res] || res;
}

function paraLabel(kind) {
  const map = {
    project: t("Dự án (Projects)", "Projects"),
    area: t("Lĩnh vực (Areas)", "Areas"),
    resource: t("Tài nguyên (Resources)", "Resources"),
    archive: t("Lưu trữ (Archives)", "Archives"),
    all: t("Tất cả", "All"),
  };
  return map[kind] || kind;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSampleData(createDefaultState());
    const parsed = JSON.parse(raw);
    const merged = { ...createDefaultState(), ...parsed };
    if (!Array.isArray(merged.projects) || merged.projects.length === 0) {
      seedSampleData(merged);
    }
    return merged;
  } catch {
    return seedSampleData(createDefaultState());
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (state.sync?.autoSync && state.sync?.githubToken && state.sync?.gistId) {
    pushToGist(true);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function todayHours() {
  const now = new Date();
  return state.hours
    .filter((h) => isSameDay(new Date(h.date), now))
    .sort((a, b) => a.slot - b.slot);
}

function nextOpenSlot() {
  const done = new Set(todayHours().map((h) => h.slot));
  for (let i = 1; i <= Math.max(4, state.dailyGoal); i++) {
    if (!done.has(i)) return i;
  }
  return done.size + 1;
}

function projectById(id) {
  return state.projects.find((p) => p.id === id) || null;
}

function hoursForProject(projectId) {
  return state.hours.filter((h) => h.projectId === projectId);
}

// MARK: - Timer Lifecycle

function startTimer() {
  stopTimer();
  session.timerId = setInterval(() => {
    if (session.paused) return;
    if (session.step === 2) {
      session.remaining = Math.max(0, session.remaining - 1);
      document.title = `${formatCountdown(session.remaining)} · PerOS`;
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
  document.title = "PerOS — Personal OS";
}

function finishBreak() {
  stopTimer();
  session.step = 1;
  session.outcome = "";
  session.scratchpad = "";
  session.thoughtDraft = "";
  session.showThoughtCapture = false;
  session.slot = nextOpenSlot();
  session.reward = state.rewards[(session.slot - 1) % state.rewards.length] || "Beer on the balcony";
  render();
}

// MARK: - Sidebar & Shell Rendering

const NAV_ICONS = {
  today: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg>`,
  workspace: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h3.6a1.5 1.5 0 0 1 1.1.48l1.1 1.04a1.5 1.5 0 0 0 1.1.48H16a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-8Z"/><path d="M6.5 11.5h7"/></svg>`,
  stickyWall: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1.4"/><rect x="11" y="3" width="6" height="6" rx="1.4"/><rect x="3" y="11" width="6" height="6" rx="1.4"/><rect x="11" y="11" width="6" height="6" rx="1.4"/></svg>`,
  workLog: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="M5.5 7.5h.01M5.5 10h.01M5.5 12.5h.01M8.5 7.5h6M8.5 10h6M8.5 12.5h6"/></svg>`,
  progress: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="3.2" height="5.5" rx="0.8"/><rect x="8.4" y="7.5" width="3.2" height="9" rx="0.8"/><rect x="13.8" y="4" width="3.2" height="12.5" rx="0.8"/></svg>`,
  ritualsGoals: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/></svg>`,
  userGuide: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3.5A1.5 1.5 0 0 1 5.5 2H15.5v13.5H5.5A1.5 1.5 0 0 0 4 17V3.5Z"/><path d="M4 16.5A1.5 1.5 0 0 0 5.5 18H16"/><path d="M7 2v13.5"/></svg>`,
  bolt: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2.5 4.5 11H10l-1 6.5 6.5-8.5H10l1-6.5Z"/></svg>`,
};

function renderSidebar() {
  document.getElementById("sidebarQuickCaptureLabel").innerHTML = `
    ${NAV_ICONS.bolt}
    <span>${escapeHtml(t("Thu thập nhanh", "Quick Capture"))}</span>
  `;

  const navItems = [
    { id: "today", label: t("Hôm nay", "Today"), badge: `${todayHours().length}/${Math.max(1, state.dailyGoal)}` },
    { id: "workspace", label: t("Không gian PerOS", "Workspace"), badge: state.inbox.length > 0 ? String(state.inbox.length) : "" },
    { id: "stickyWall", label: t("Bảng ghi chú", "Sticky Wall"), badge: "" },
    { id: "workLog", label: t("Nhật ký giờ làm", "Work Log"), badge: "" },
    { id: "progress", label: t("Tiến độ", "Progress"), badge: "" },
    { id: "ritualsGoals", label: t("Nghi thức & Mục tiêu", "Rituals & Goals"), badge: "" },
    { id: "userGuide", label: t("Hướng dẫn", "User Guide"), badge: "" },
  ];

  document.getElementById("navList").innerHTML = navItems
    .map(
      (item) => `
      <button class="nav-item ${state.page === item.id ? "active" : ""}" data-page="${item.id}">
        <span class="nav-item-main">
          ${NAV_ICONS[item.id] || ""}
          <span>${escapeHtml(item.label)}</span>
        </span>
        ${item.badge ? `<span class="nav-badge">${escapeHtml(item.badge)}</span>` : ""}
      </button>
    `
    )
    .join("");

  document.querySelectorAll("#langSwitch .lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.language);
  });

  const cap = calculateCapacitySummary(
    state.hours,
    state.dailyGoal,
    state.autoLevelUp,
    state.countWeekends
  );
  const is30m = state.dailyGoal === 1 && state.sessionMinutes === 30;
  const levelTitle = is30m
    ? t("30 phút / ngày", "30 min / day")
    : `${cap.currentHoursPerDay} ${t("giờ / ngày", cap.currentHoursPerDay === 1 ? "hour / day" : "hours / day")}`;

  document.getElementById("sidebarLevelCard").innerHTML = `
    <div class="level-kicker">${t("CẤP ĐỘ HIỆN TẠI", "CURRENT LEVEL")}</div>
    <div class="level-value">${levelTitle}</div>
    <div class="level-sub">${t(
      `Đạt ${cap.daysHitInLast7}/5 ngày tuần này · Còn ${cap.daysNeededToLevelUp} ngày để lên cấp.`,
      `${cap.daysHitInLast7} of 5 days hit this week · ${cap.daysNeededToLevelUp} more to level up.`
    )}</div>
  `;
}

// MARK: - 1. Today View

function renderToday() {
  const doneToday = todayHours();
  const totalSlots = Math.max(4, state.dailyGoal);
  const bySlot = Object.fromEntries(doneToday.map((h) => [h.slot, h]));
  if (session.step === 1) session.slot = nextOpenSlot();

  const activeProjects = state.projects.filter((p) => p.kind === "project" || p.kind === "area");
  const currentProject = projectById(session.projectId) || activeProjects[0];
  const pendingOutcomes = (currentProject?.outcomes || []).filter((o) => !o.done);

  let stageHtml = "";
  if (session.step === 1) {
    stageHtml = `
      <div class="grid-2">
        <div class="card">
          <div class="kicker">${t(`GIỜ ${session.slot} / ${totalSlots}`, `HOUR ${session.slot} OF ${totalSlots}`)}</div>
          <h2 style="margin:0 0 8px;font-size:24px;">${t(
            "Cuối giờ này bạn sẽ tạo ra kết quả gì?",
            "What will exist at the end of this hour?"
          )}</h2>
          <p class="page-subtitle" style="margin-bottom:16px;">${t(
            "Một đầu ra cụ thể gắn với Dự án của bạn. Khi hết giờ bạn có thể trả lời rõ ràng là Xong hay Chưa xong.",
            "One concrete deliverable tied to your Project. When the timer ends, you can clearly mark it Done or Not done."
          )}</p>

          <div style="display:grid;grid-template-columns:220px 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;">${t("Dự án / Lĩnh vực", "Project / Area")}</label>
              <select class="input-text" id="sessionProjectSelect">
                ${activeProjects
                  .map(
                    (p) =>
                      `<option value="${p.id}" ${p.id === session.projectId ? "selected" : ""}>${escapeHtml(p.title)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;">${t("Mục tiêu đầu ra (Outcome)", "Concrete Outcome")}</label>
              <input class="input-text" id="outcomeInput" placeholder="${t("Chưa đặt tên giờ tập trung", "Untitled hour")}" value="${escapeHtml(session.outcome)}" />
            </div>
          </div>

          <div style="font-size:12px;font-weight:600;color:var(--muted);margin-top:8px;">
            ${t("Gợi ý từ Dự án đang chọn & Hộp thư đến:", "Suggested from active Project & Inbox:")}
          </div>
          <div class="chip-row">
            ${pendingOutcomes
              .slice(0, 3)
              .map(
                (o) =>
                  `<button class="chip" data-example="${escapeHtml(o.title)}">🎯 ${escapeHtml(o.title)}</button>`
              )
              .join("")}
            ${state.inbox
              .slice(0, 2)
              .map(
                (inItem) =>
                  `<button class="chip" data-example="${escapeHtml(inItem.text)}">📥 ${escapeHtml(inItem.text)}</button>`
              )
              .join("")}
          </div>

          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;">
            <button class="btn-primary" id="startHourBtn">▶ ${t(`Bắt đầu ${state.sessionMinutes}:00`, `Start ${state.sessionMinutes}:00`)}</button>
            <div class="segmented-bar">
              <button class="seg-btn ${state.sessionMinutes === 30 ? "active" : ""}" data-duration="30">30m</button>
              <button class="seg-btn ${state.sessionMinutes === 60 ? "active" : ""}" data-duration="60">60m</button>
            </div>
            <span style="font-size:13px;color:var(--muted);">${t(
              "Đếm ngược & tự động gắn kết quả vào Kho tri thức.",
              "Runs countdown & links output directly to your Project Vault."
            )}</span>
          </div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 12px;font-size:18px;">${t("Trước khi bắt đầu", "Before you start")}</h3>
          ${state.preflight
            .map(
              (p) => `
            <label class="check-row">
              <input type="checkbox" data-preflight="${p.id}" ${p.done ? "checked" : ""} />
              <span>${escapeHtml(p.title)}</span>
            </label>
          `
            )
            .join("")}
          <hr style="border:0;border-top:1px solid var(--hairline);margin:16px 0;" />
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px;">${t("Phần thưởng sau giờ này", "Reward after this hour")}</div>
          <input class="input-text" id="rewardInput" value="${escapeHtml(session.reward)}" />
        </div>
      </div>
    `;
  } else if (session.step === 2) {
    stageHtml = `
      <div class="grid-2">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div class="kicker">${t(`GIỜ ${session.slot} / ${totalSlots} · ĐANG TẬP TRUNG`, `HOUR ${session.slot} OF ${totalSlots} · FOCUSING`)}</div>
            <span class="badge neutral">${escapeHtml(currentProject?.title || "General")}</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:24px;">${escapeHtml(session.outcome)}</h2>
          <div class="countdown">${formatCountdown(session.remaining)}</div>
          <div style="display:flex;gap:12px;margin-bottom:16px;">
            <button class="btn-secondary" id="pauseBtn">${session.paused ? t("Tiếp tục", "Resume") : t("Tạm dừng", "Pause")}</button>
            <button class="btn-primary" id="finishEarlyBtn">${t("Hoàn thành & Ghi nhận", "Finish & Record")}</button>
          </div>
          <div style="font-size:14px;color:var(--muted);margin-bottom:16px;">
            ${t("Số lần xao nhãng giờ này:", "Distractions this hour:")} <strong>${session.distractions}</strong>
            · ${t("Phần thưởng:", "Reward:")} <strong>${escapeHtml(session.reward)}</strong>
          </div>

          <div style="border-top:1px solid var(--hairline);padding-top:16px;">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px;">
              📝 ${t("Ghi chú nháp trong phiên (Session Scratchpad — tự lưu vào Kho tri thức khi xong)", "Session Scratchpad (auto-saves to Project Notes on finish)")}
            </label>
            <textarea class="textarea-text" id="sessionScratchpadInput" placeholder="${t(
              "Viết nhanh dàn ý, kết quả, hoặc những gì bạn vừa làm xong trong giờ này...",
              "Jot down key outputs, links, or progress produced during this hour..."
            )}" style="min-height:88px;">${escapeHtml(session.scratchpad)}</textarea>
          </div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 4px;font-size:18px;">${t("Đếm lần xao nhãng", "Count a distraction")}</h3>
          <p class="page-subtitle" style="font-size:13px;margin-bottom:12px;">${t(
            "Nhận biết, bấm 1 lần rồi quay lại ngay với mục tiêu.",
            "Notice it, tap once, and return immediately to the outcome."
          )}</p>
          ${CAUSES.map(
            (c) => `
            <button class="btn-secondary" data-cause="${c}" style="width:100%;display:flex;justify-content:space-between;margin-bottom:8px;">
              <span>+1 ${escapeHtml(causeLabel(c))}</span>
              <strong>${session.causes[c] || 0}</strong>
            </button>
          `
          ).join("")}

          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--hairline);">
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px;">
              💡 ${t("BẮT NHANH SUY NGHĨ LAN MAN VÀO INBOX", "CATCH WANDERING THOUGHT TO INBOX")}
            </div>
            <div style="display:flex;gap:8px;">
              <input class="input-text" id="focusThoughtInput" placeholder="${t("Ghi lại 1 dòng để không quên...", "Park thought in Inbox...")}" value="${escapeHtml(session.thoughtDraft)}" />
              <button class="btn-primary" id="captureFocusThoughtBtn">${t("Lưu", "Park")}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (session.step === 3) {
    stageHtml = `
      <div class="card">
        <div class="kicker">${t(`HOÀN THÀNH GIỜ ${session.slot}`, `HOUR ${session.slot} COMPLETE`)}</div>
        <h2 style="margin:0 0 8px;font-size:24px;">${t(
          `Bạn đã hoàn thành: "${session.outcome}"?`,
          `Did you finish: "${session.outcome}"?`
        )}</h2>
        <p class="page-subtitle" style="margin-bottom:16px;">${t(
          `Số lần xao nhãng: ${session.distractions}. Bằng chứng thắng ý định — hãy ghi nhận trung thực.`,
          `Distractions logged: ${session.distractions}. Evidence beats intention — record it honestly.`
        )}</p>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px;">
            ${t("Bằng chứng / Ghi chú lưu vào dự án:", "Output summary / Note saved to Project:")}
          </label>
          <textarea class="textarea-text" id="recordScratchpadInput" style="min-height:80px;">${escapeHtml(session.scratchpad)}</textarea>
        </div>
        <div style="display:flex;gap:12px;">
          <button class="btn-primary" data-result="Done">${t("Xong (Done)", "Done")}</button>
          <button class="btn-secondary" data-result="Partly">${t("Một phần (Partly)", "Partly")}</button>
          <button class="btn-secondary" data-result="Not done">${t("Chưa xong (Not done)", "Not done")}</button>
        </div>
      </div>
    `;
  } else {
    stageHtml = `
      <div class="card">
        <div class="kicker" style="color:var(--green);">${t("NGHỈ NGƠI & TỔNG KẾT", "REST & REVIEW")}</div>
        <h2 style="margin:0 0 8px;font-size:24px;">${t(
          `Nghỉ ${state.breakMinutes} phút. Tận hưởng: ${session.reward}`,
          `Take ${state.breakMinutes} minutes. Enjoy: ${session.reward}`
        )}</h2>
        <div class="countdown">${formatCountdown(session.breakRemaining)}</div>
        <button class="btn-primary" id="nextHourBtn">${t("Bắt đầu giờ tiếp theo", "Start Next Hour")}</button>
      </div>
    `;
  }

  const slotsHtml = Array.from({ length: totalSlots }, (_, idx) => {
    const slot = idx + 1;
    const rec = bySlot[slot];
    if (rec) {
      const proj = projectById(rec.projectId);
      return `
        <div class="slot-card done">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:var(--muted);">
            <span>${t(`GIỜ ${slot}`, `HOUR ${slot}`)}</span>
            <span>${escapeHtml(proj?.title || "")}</span>
          </div>
          <div style="font-size:14px;font-weight:600;margin-top:4px;">${escapeHtml(rec.outcome)}</div>
        </div>
      `;
    }
    const isCur = slot === session.slot;
    return `
      <div class="slot-card ${isCur ? "current" : ""}" data-select-slot="${slot}">
        <div style="font-size:12px;font-weight:700;color:${isCur ? "var(--accent)" : "var(--muted)"};">
          ${t(`GIỜ ${slot}${isCur ? " · HIỆN TẠI" : ""}`, `HOUR ${slot}${isCur ? " · NOW" : ""}`)}
        </div>
        <div style="font-size:14px;color:var(--muted);margin-top:4px;">
          ${isCur ? t("Đang chọn mục tiêu...", "Choosing outcome...") : t("Chưa lên kế hoạch", "Not planned yet")}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">Hello, Binh</h1>
        <p class="page-subtitle">${t("Hôm nay", "Today")} · ${new Date().toLocaleDateString(
    state.language === "vi" ? "vi-VN" : "en-US",
    { weekday: "long", month: "short", day: "numeric" }
  )}</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:14px;color:var(--muted);">${t("Giờ tập trung:", "Focused hours:")}</span>
        <div style="display:flex;gap:4px;">
          ${Array.from(
            { length: totalSlots },
            (_, i) =>
              `<span style="width:28px;height:8px;border-radius:99px;background:${
                i < doneToday.length ? "var(--accent)" : "var(--hairline)"
              };display:inline-block;"></span>`
          ).join("")}
        </div>
        <strong>${doneToday.length} / ${totalSlots}</strong>
      </div>
    </div>

    <div class="step-bar">
      ${[
        t("1  Chọn mục tiêu", "1  Choose outcome"),
        t(`2  Tập trung ${state.sessionMinutes} phút`, `2  Focus ${state.sessionMinutes} min`),
        t("3  Ghi nhận", "3  Record"),
        t("4  Nghỉ & tổng kết", "4  Rest & review"),
      ]
        .map(
          (label, i) => `
        <span class="step-pill ${session.step === i + 1 ? "active" : ""}">${label}</span>
      `
        )
        .join("")}
    </div>

    ${stageHtml}
    <div class="slot-strip">${slotsHtml}</div>
  `;
}

// MARK: - 2. Workspace View (Inbox · Projects · Notes)

function renderWorkspace() {
  const tab = state.workspaceTab || "projects";

  let contentHtml = "";
  if (tab === "inbox") {
    contentHtml = renderWorkspaceInbox();
  } else if (tab === "projects") {
    contentHtml = renderWorkspaceProjects();
  } else {
    contentHtml = renderWorkspaceNotes();
  }

  return `
    <div class="header-row">
      <div>
        <div class="kicker">PEROS WORKSPACE · CODE + PARA</div>
        <h1 class="page-title">${t("Kho Dự Án & Tri Thức Thực Thi", "Projects, Inbox & Knowledge Vault")}</h1>
        <p class="page-subtitle">${t(
          "Mọi ý tưởng thu thập đều được chuyển hóa thành đầu ra cho các giờ tập trung 60 phút.",
          "Every captured thought converts into concrete outcomes for your 60-minute focus blocks."
        )}</p>
      </div>
      <div class="segmented-bar">
        <button class="seg-btn ${tab === "projects" ? "active" : ""}" data-ws-tab="projects">
          ${t("Dự án & PARA", "PARA Projects")} (${state.projects.length})
        </button>
        <button class="seg-btn ${tab === "inbox" ? "active" : ""}" data-ws-tab="inbox">
          ${t("Hộp thư đến", "Inbox")} (${state.inbox.length})
        </button>
        <button class="seg-btn ${tab === "notes" ? "active" : ""}" data-ws-tab="notes">
          ${t("Ghi chú (Notes)", "Notes")} (${state.notes.length})
        </button>
      </div>
    </div>
    ${contentHtml}
  `;
}

function renderWorkspaceInbox() {
  const activeProjects = state.projects.filter((p) => p.kind !== "archive");
  return `
    <div class="card" style="margin-bottom:24px;">
      <h3 style="margin:0 0 12px;font-size:18px;">${t("Thu thập nhanh vào Hộp thư đến", "Quick Capture to Inbox")}</h3>
      <div style="display:flex;gap:12px;">
        <input class="input-text" id="inlineInboxInput" placeholder="${t(
          "Gõ ý tưởng, việc cần làm, hoặc tài liệu tham khảo...",
          "Type a thought, action item, or reference..."
        )}" />
        <button class="btn-primary" id="inlineInboxAddBtn">${t("+ Thêm vào Inbox", "+ Add to Inbox")}</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:18px;">${t(
          `Danh sách chờ phân loại (${state.inbox.length})`,
          `Unprocessed Captures (${state.inbox.length})`
        )}</h3>
        <span style="font-size:13px;color:var(--muted);">${t(
          "Chuyển thành Mục tiêu giờ Focus, thêm vào Dự án, hoặc lưu thành Ghi chú.",
          "Promote to a Focus Hour, assign to a Project, or distill into a Note."
        )}</span>
      </div>

      ${
        state.inbox.length === 0
          ? `<div style="padding:32px;text-align:center;color:var(--muted);">
              <strong>Inbox Zero!</strong> ${t("Không còn mục nào tồn đọng.", "All captured thoughts have been processed.")}
            </div>`
          : state.inbox
              .map(
                (item) => `
          <div class="list-item-card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;cursor:default;">
            <div>
              <div style="font-weight:600;font-size:15px;">${escapeHtml(item.text)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;">
                <span class="badge neutral">${escapeHtml(item.source || "Quick Capture")}</span>
                · ${new Date(item.createdAt).toLocaleString(state.language === "vi" ? "vi-VN" : "en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <select class="input-text" data-inbox-proj="${item.id}" style="width:180px;padding:4px 8px;font-size:13px;">
                ${activeProjects.map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join("")}
              </select>
              <button class="btn-primary" data-inbox-focus="${item.id}" style="padding:4px 12px;font-size:13px;">
                🎯 ${t("Làm ngay (Focus)", "Focus Now")}
              </button>
              <button class="btn-secondary" data-inbox-to-outcome="${item.id}" style="padding:4px 12px;font-size:13px;">
                + ${t("Vào Dự án", "To Project")}
              </button>
              <button class="btn-secondary" data-inbox-to-note="${item.id}" style="padding:4px 12px;font-size:13px;">
                📝 ${t("Tạo Note", "To Note")}
              </button>
              <button class="btn-icon" data-inbox-delete="${item.id}" title="Delete">✕</button>
            </div>
          </div>
        `
              )
              .join("")
      }
    </div>
  `;
}

function renderWorkspaceProjects() {
  const filter = state.paraFilter || "project";
  const filteredProjects = state.projects.filter(
    (p) => filter === "all" || p.kind === filter
  );
  const selected =
    filteredProjects.find((p) => p.id === state.selectedProjectId) ||
    filteredProjects[0] ||
    state.projects[0];

  const projHours = selected ? hoursForProject(selected.id) : [];
  const projNotes = selected
    ? state.notes.filter((n) => n.projectId === selected.id)
    : [];
  const linkedGoal =
    selected && state.fiveGoals[selected.goalIndex]
      ? state.fiveGoals[selected.goalIndex]
      : t("Chưa gắn mục tiêu", "Unlinked goal");

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div class="segmented-bar">
        ${["project", "area", "resource", "archive", "all"]
          .map(
            (k) => `
          <button class="seg-btn ${filter === k ? "active" : ""}" data-para-filter="${k}">
            ${escapeHtml(paraLabel(k))}
          </button>
        `
          )
          .join("")}
      </div>
      <div style="display:flex;gap:8px;">
        <input class="input-text" id="newProjectTitleInput" placeholder="${t("Tên dự án / lĩnh vực mới...", "New project or area title...")}" style="width:240px;" />
        <button class="btn-primary" id="createProjectBtn">+ ${t("Tạo mới", "New")}</button>
      </div>
    </div>

    <div class="grid-workspace">
      <div class="card-compact">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;">
          ${escapeHtml(paraLabel(filter))} (${filteredProjects.length})
        </div>
        ${filteredProjects
          .map((p) => {
            const hrs = hoursForProject(p.id).length;
            const isSel = selected && p.id === selected.id;
            return `
              <div class="list-item-card ${isSel ? "active" : ""}" data-select-project="${p.id}">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:15px;">${escapeHtml(p.title)}</strong>
                  <span class="badge neutral">${hrs}h</span>
                </div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px;">
                  Goal #${(p.goalIndex ?? 0) + 1} · ${(p.outcomes || []).filter((o) => !o.done).length} ${t("đầu việc mở", "open outcomes")}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>

      ${
        selected
          ? `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;">
            <div>
              <div class="kicker">${escapeHtml(selected.kind.toUpperCase())} · GOAL #${(selected.goalIndex ?? 0) + 1}: ${escapeHtml(linkedGoal)}</div>
              <h2 style="margin:0;font-size:24px;">${escapeHtml(selected.title)}</h2>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <select class="input-text" id="changeProjectKindSelect" style="width:140px;padding:4px 8px;font-size:13px;">
                ${PARA_KINDS.map((k) => `<option value="${k}" ${selected.kind === k ? "selected" : ""}>${k.toUpperCase()}</option>`).join("")}
              </select>
              <span class="badge done">${projHours.length} ${t("giờ đã đầu tư", "hours invested")}</span>
            </div>
          </div>

          <p class="page-subtitle" style="margin-bottom:20px;">${escapeHtml(selected.summary || "")}</p>

          <div class="grid-2-equal">
            <div>
              <h3 style="margin:0 0 12px;font-size:16px;">🎯 ${t("Các đầu ra tiếp theo (Next 60m Outcomes)", "Next 60-Min Outcomes")}</h3>
              ${(selected.outcomes || [])
                .map(
                  (o) => `
                <div class="check-row" style="justify-content:space-between;padding:8px;border:1px solid var(--hairline);border-radius:8px;">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;">
                    <input type="checkbox" data-toggle-outcome="${o.id}" ${o.done ? "checked" : ""} />
                    <span style="${o.done ? "text-decoration:line-through;color:var(--muted);" : ""}">${escapeHtml(o.title)}</span>
                  </label>
                  ${
                    !o.done
                      ? `<button class="btn-secondary" data-launch-outcome="${escapeHtml(o.title)}" data-launch-project="${selected.id}" style="padding:4px 8px;font-size:12px;">
                          ▶ Focus
                        </button>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}

              <div style="display:flex;gap:8px;margin-top:12px;">
                <input class="input-text" id="newOutcomeInput" placeholder="${t("Thêm đầu ra 60 phút mới...", "Add a concrete 60m outcome...")}" />
                <button class="btn-primary" id="addOutcomeBtn">+</button>
              </div>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;font-size:16px;">📝 ${t("Ghi chú của Dự án", "Linked Knowledge Notes")} (${projNotes.length})</h3>
                <button class="btn-secondary" id="newNoteForProjectBtn" style="padding:4px 12px;font-size:12px;">+ ${t("Tạo Note", "New Note")}</button>
              </div>
              ${
                projNotes.length === 0
                  ? `<div style="font-size:13px;color:var(--muted);padding:12px;border:1px dashed var(--hairline);border-radius:8px;">
                      ${t("Chưa có ghi chú nào. Bấm + Tạo Note hoặc viết trong lúc Focus.", "No notes yet. Create one or use the Session Scratchpad during Focus.")}
                    </div>`
                  : projNotes
                      .map(
                        (n) => `
                    <div class="list-item-card" data-open-note="${n.id}">
                      <div style="font-weight:600;font-size:14px;">${escapeHtml(n.title)}</div>
                      <div style="font-size:12px;color:var(--muted);margin-top:4px;">${escapeHtml(n.highlight || "")}</div>
                    </div>
                  `
                      )
                      .join("")
              }

              <h3 style="margin:16px 0 8px;font-size:16px;">⏱ ${t("Các giờ làm gần đây", "Recent Focus Hours")}</h3>
              ${projHours
                .slice(0, 4)
                .map(
                  (h) => `
                <div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--hairline);display:flex;justify-content:space-between;">
                  <span>${escapeHtml(h.outcome)}</span>
                  <span style="color:var(--muted);">${toDateKey(h.date).slice(5)}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function renderWorkspaceNotes() {
  const selectedNote =
    state.notes.find((n) => n.id === state.selectedNoteId) || state.notes[0];
  const outboundLinks = selectedNote ? extractWikiLinks(selectedNote.body) : [];
  const backlinks = selectedNote ? computeBacklinks(selectedNote, state.notes) : [];
  const linkedHours = selectedNote
    ? state.hours.filter(
        (h) => h.noteId === selectedNote.id || h.projectId === selectedNote.projectId
      )
    : [];

  return `
    <div class="grid-workspace">
      <div class="card-compact">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;">
            ${t("KHO GHI CHÚ", "KNOWLEDGE VAULT")} (${state.notes.length})
          </span>
          <button class="btn-primary" id="createBlankNoteBtn" style="padding:4px 12px;font-size:13px;">+ Note</button>
        </div>
        ${state.notes
          .map((n) => {
            const proj = projectById(n.projectId);
            const isSel = selectedNote && n.id === selectedNote.id;
            return `
              <div class="list-item-card ${isSel ? "active" : ""}" data-select-note="${n.id}">
                <div style="font-weight:600;font-size:15px;">${escapeHtml(n.title)}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px;">
                  ${escapeHtml(proj?.title || "General")}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>

      ${
        selectedNote
          ? `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
            <input class="input-text" id="noteTitleInput" value="${escapeHtml(selectedNote.title)}" style="font-size:20px;font-weight:700;" />
            <select class="input-text" id="noteProjectSelect" style="width:220px;">
              ${state.projects
                .map(
                  (p) =>
                    `<option value="${p.id}" ${p.id === selectedNote.projectId ? "selected" : ""}>${escapeHtml(p.title)}</option>`
                )
                .join("")}
            </select>
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;">
              ✨ ${t("Tóm tắt cốt lõi (Progressive Summary Highlight)", "Progressive Summary Highlight (Key Takeaway)")}
            </label>
            <input class="input-text" id="noteHighlightInput" value="${escapeHtml(selectedNote.highlight || "")}" style="background:var(--sticky);border-color:var(--sticky-border);font-weight:600;" />
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;">
              Markdown Body (${t("Dùng [[Tên Note]] để liên kết 2 chiều", "Use [[Note Title]] for bi-directional links")})
            </label>
            <textarea class="textarea-text" id="noteBodyInput" style="min-height:200px;">${escapeHtml(selectedNote.body)}</textarea>
          </div>

          <div class="grid-2-equal" style="border-top:1px solid var(--hairline);padding-top:16px;">
            <div>
              <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;">
                🔗 ${t("Liên kết đi & Liên kết ngược (Backlinks)", "Wiki-Links & Backlinks")}
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${outboundLinks
                  .map(
                    (title) =>
                      `<button class="wiki-pill" data-wiki-jump="${escapeHtml(title)}">↗ [[${escapeHtml(title)}]]</button>`
                  )
                  .join("")}
                ${backlinks
                  .map(
                    (bn) =>
                      `<button class="wiki-pill" data-select-note="${bn.id}">↙ ${escapeHtml(bn.title)}</button>`
                  )
                  .join("")}
                ${
                  outboundLinks.length === 0 && backlinks.length === 0
                    ? `<span style="font-size:13px;color:var(--muted);">${t("Chưa có liên kết [[...]] nào.", "No [[Wiki-links]] yet.")}</span>`
                    : ""
                }
              </div>
            </div>

            <div>
              <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;">
                ⏱ ${t("Giờ Focus liên quan", "Linked Focus Sessions")} (${linkedHours.length})
              </div>
              ${linkedHours
                .slice(0, 3)
                .map(
                  (h) => `
                <div style="font-size:13px;margin-bottom:4px;">
                  <strong>${toDateKey(h.date).slice(5)}:</strong> ${escapeHtml(h.outcome)}
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

// MARK: - 3. Sticky Wall View (Fixes Week/Month/All-time + Project Filter)

function renderStickyWall() {
  const filtered = filterHoursByRange(
    state.hours,
    state.wallRange,
    state.wallProjectFilter
  );
  const streak = calculateStreakDays(
    state.hours,
    state.dailyGoal,
    state.countWeekends
  );
  const avgDistr = filtered.length
    ? (filtered.reduce((a, b) => a + b.distr, 0) / filtered.length).toFixed(1)
    : "0.0";
  const hit = filtered.filter((h) => h.result === "Done").length;

  let wallBodyHtml = "";
  if (state.wallRange === "week") {
    const monday = getMondayOfWeek(new Date());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    wallBodyHtml = `
      <div class="week-grid">
        ${days
          .map((d) => {
            const items = filtered.filter((h) => isSameDay(new Date(h.date), d));
            return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:8px;">
                  <strong>${d.toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-US", { weekday: "short" })}</strong>
                  <span>${items.length}/${state.dailyGoal}</span>
                </div>
                ${
                  items.length
                    ? items
                        .map((h) => {
                          const proj = projectById(h.projectId);
                          return `
                          <div class="sticky-item">
                            ${proj ? `<div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;">${escapeHtml(proj.title)}</div>` : ""}
                            <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(h.outcome)}</div>
                            <div style="font-size:12px;color:var(--muted);">${h.distr} distr. ${h.result === "Partly" ? "· partly" : ""}</div>
                          </div>
                        `;
                        })
                        .join("")
                    : `<div style="height:88px;border:1px dashed var(--hairline);border-radius:8px;"></div>`
                }
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  } else {
    wallBodyHtml = `
      <div class="cards-grid">
        ${filtered
          .map((h) => {
            const proj = projectById(h.projectId);
            return `
              <div class="sticky-item" style="margin-bottom:0;">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px;">
                  <strong>${toDateKey(h.date)} · ${t("Giờ", "Hour")} ${h.slot}</strong>
                  <span>${escapeHtml(proj?.title || "")}</span>
                </div>
                <div style="font-weight:600;font-size:15px;margin-bottom:8px;">${escapeHtml(h.outcome)}</div>
                <div style="font-size:12px;color:var(--muted);">${h.distr} distr. · ${escapeHtml(resultLabel(h.result))}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">${t(
          `${filtered.length} ghi chú trên bảng`,
          `${filtered.length} notes on the wall`
        )}</h1>
        <p class="page-subtitle">${t(
          "Mỗi ghi chú là một giờ hoàn thành. Bằng chứng thắng ý định.",
          "Every note is one finished hour. Evidence beats intention."
        )}</p>
      </div>
      <div style="display:flex;gap:24px;">
        <div><div style="font-size:13px;color:var(--muted);">${t("Chuỗi ngày", "Streak")}</div><strong style="font-size:22px;">${streak} ${t("ngày", "days")}</strong></div>
        <div><div style="font-size:13px;color:var(--muted);">${t("Xao nhãng / giờ", "Distractions / hour")}</div><strong style="font-size:22px;">${avgDistr}</strong></div>
        <div><div style="font-size:13px;color:var(--muted);">${t("Đạt mục tiêu", "Outcomes hit")}</div><strong style="font-size:22px;">${hit} / ${filtered.length}</strong></div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div class="segmented-bar">
        ${[
          ["week", t("Tuần này", "Week")],
          ["month", t("30 ngày", "Month")],
          ["allTime", t("Tất cả", "All time")],
        ]
          .map(
            ([val, label]) => `
          <button class="seg-btn ${state.wallRange === val ? "active" : ""}" data-wall-range="${val}">${label}</button>
        `
          )
          .join("")}
      </div>

      <select class="input-text" id="wallProjectFilterSelect" style="width:240px;">
        <option value="all">${t("Tất cả Dự án", "All Projects")}</option>
        ${state.projects
          .map(
            (p) =>
              `<option value="${p.id}" ${state.wallProjectFilter === p.id ? "selected" : ""}>${escapeHtml(p.title)}</option>`
          )
          .join("")}
      </select>
    </div>

    <div class="card">
      ${wallBodyHtml}
    </div>
  `;
}

// MARK: - 4. Work Log View

function renderWorkLog() {
  const q = state.workLogSearch.trim().toLowerCase();
  const rows = [...state.hours]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((h) => {
      if (state.workLogProjectFilter !== "all" && h.projectId !== state.workLogProjectFilter) {
        return false;
      }
      if (!q) return true;
      const projTitle = projectById(h.projectId)?.title?.toLowerCase() || "";
      return (
        h.outcome.toLowerCase().includes(q) ||
        h.cause.toLowerCase().includes(q) ||
        projTitle.includes(q)
      );
    });

  const sortedCauses = calculateCauseBreakdown(state.hours, 30);
  const maxCause = sortedCauses[0]?.count || 1;
  const slotStats = calculateDistractionsBySlot(state.hours, 4);
  const maxSlotAvg = Math.max(1, ...slotStats.map((s) => s.averageDistractions));

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">${t("Mỗi giờ làm, đều được ghi lại", "Every hour, on the record")}</h1>
        <p class="page-subtitle">${t(
          "Ngày, dự án, mục tiêu, số lần xao nhãng, kết quả. Lưu cục bộ và sẵn sàng đồng bộ.",
          "Date, project, outcome, distractions, result. Saved locally and ready for sync."
        )}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select class="input-text" id="workLogProjectSelect" style="width:200px;">
          <option value="all">${t("Tất cả Dự án", "All Projects")}</option>
          ${state.projects
            .map(
              (p) =>
                `<option value="${p.id}" ${state.workLogProjectFilter === p.id ? "selected" : ""}>${escapeHtml(p.title)}</option>`
            )
            .join("")}
        </select>
        <input class="input-text" id="workLogSearch" placeholder="${t("Tìm kiếm mục tiêu...", "Search outcomes...")}" value="${escapeHtml(state.workLogSearch)}" style="width:200px;" />
        <button class="btn-secondary" id="exportCsvBtn">${t("Xuất CSV", "Export CSV")}</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="log-table">
          <thead>
            <tr>
              <th>${t("Ngày", "Date")}</th>
              <th>${t("Dự án", "Project")}</th>
              <th>${t("Mục tiêu", "Outcome")}</th>
              <th>${t("Nhiễu", "Distr.")}</th>
              <th>${t("Nguyên nhân", "Top cause")}</th>
              <th>${t("Kết quả", "Result")}</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((h) => {
                const proj = projectById(h.projectId);
                return `
                <tr>
                  <td>${new Date(h.date).toLocaleDateString(state.language === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" })}</td>
                  <td><span class="badge neutral">${escapeHtml(proj?.title || "General")}</span></td>
                  <td>
                    <div style="font-weight:600;">${escapeHtml(h.outcome)}</div>
                    ${h.scratchpad ? `<div style="font-size:12px;color:var(--muted);">${escapeHtml(h.scratchpad)}</div>` : ""}
                  </td>
                  <td>${h.distr}</td>
                  <td>${escapeHtml(causeLabel(h.cause))}</td>
                  <td><span class="badge ${h.result === "Done" ? "done" : "partly"}">${escapeHtml(resultLabel(h.result))}</span></td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <h3 style="margin:0 0 12px;font-size:18px;">${t("Điều gì kéo bạn ra ngoài", "What pulls you away")}</h3>
          ${sortedCauses
            .map(
              ({ cause, count }) => `
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span>${escapeHtml(causeLabel(cause))}</span><strong>${count}</strong>
              </div>
              <div style="height:8px;border-radius:99px;background:var(--card-muted);overflow:hidden;">
                <div style="height:100%;width:${(count / maxCause) * 100}%;background:var(--accent);"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="card">
          <h3 style="margin:0 0 12px;font-size:18px;">${t("Xao nhãng theo khung giờ", "Distractions per hour slot")}</h3>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end;height:112px;">
            ${slotStats
              .map(
                (s) => `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <span style="font-size:12px;color:var(--muted);">${s.averageDistractions.toFixed(1)}</span>
                <div style="width:100%;height:${Math.max(8, Math.round((s.averageDistractions / maxSlotAvg) * 64))}px;background:var(--accent);border-radius:4px;"></div>
                <span style="font-size:12px;color:var(--muted);">${t("Giờ", "Hour")} ${s.slotIndex}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// MARK: - 5. Progress View

function renderProgress() {
  const summary = calculateCapacitySummary(
    state.hours,
    state.dailyGoal,
    state.autoLevelUp,
    state.countWeekends
  );
  const grid = buildWeeklyHeatmap(state.hours, 12);
  const heatCols = grid
    .map(
      (col) => `
      <div class="heatmap-col">
        ${col
          .map(
            (cell) => `
          <div class="heatmap-cell" style="background:${
            cell.isFuture ? "transparent" : `var(--heat-${cell.level})`
          };${cell.isFuture ? "border:1px solid var(--hairline);" : ""}" title="${cell.dateKey}: ${cell.hoursCount}h"></div>
        `
          )
          .join("")}
      </div>
    `
    )
    .join("");

  const currentGoalChoice =
    state.dailyGoal === 1 && state.sessionMinutes === 30 ? 30 : state.dailyGoal * 60;

  return `
    <div class="kicker">${t("RÈN LUYỆN SỰ TẬP TRUNG NHƯ MỘT KỸ NĂNG", "TRAIN FOCUS LIKE A SKILL")}</div>
    <h1 class="page-title">${t(
      `Bạn đang ở mức ${summary.currentHoursPerDay} giờ mỗi ngày`,
      `You are at ${summary.currentHoursPerDay} ${summary.currentHoursPerDay === 1 ? "hour" : "hours"} a day`
    )}</h1>
    <p class="page-subtitle" style="margin-bottom:24px;">${t(
      "Đạt mục tiêu 5 trong 7 ngày gần nhất để lên cấp tiếp theo.",
      "Hit your level on 5 of the last 7 days and PerOS offers the next one."
    )}</p>

    <div class="grid-4" style="margin-bottom:24px;">
      ${summary.tiers
        .map((tier) => {
          const isCur = tier.state === "current";
          const isPassed = tier.state === "passed";
          return `
            <div class="card ${isCur ? "night" : ""}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="font-size:24px;">${tier.hours}h</strong>
                <span class="badge ${isPassed ? "done" : ""}" style="${
            isCur ? "background:var(--accent);color:var(--on-accent);" : ""
          }">
                  ${
                    isPassed
                      ? t("Đã đạt", "Passed")
                      : isCur
                      ? `${tier.daysHitInLast7}/${tier.daysNeeded} ${t("ngày", "days")}`
                      : t("Chưa mở", "Locked")
                  }
                </span>
              </div>
              <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(
                state.language === "vi" ? tier.titleVi : tier.titleEn
              )}</div>
              <div style="font-size:13px;color:${
                isCur ? "var(--night-muted)" : "var(--muted)"
              };">${escapeHtml(state.language === "vi" ? tier.subVi : tier.subEn)}</div>
            </div>
          `;
        })
        .join("")}
    </div>

    <div class="grid-2">
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <strong>${t("12 tuần gần nhất", "Last 12 weeks")}</strong>
          <span style="font-size:14px;color:var(--muted);">${state.hours.length} ${t("giờ tập trung", "focused hours")}</span>
        </div>
        <div class="heatmap-grid">${heatCols}</div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 12px;font-size:18px;">${t("Chuẩn của bạn", "Your standard")}</h3>
        <label style="display:block;margin-bottom:12px;">
          <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">${t("Mục tiêu mỗi ngày", "Daily goal")}</div>
          <select class="input-text" id="dailyGoalSelect">
            <option value="30" ${currentGoalChoice === 30 ? "selected" : ""}>${t("30 phút", "30 minutes")}</option>
            ${[1, 2, 3, 4]
              .map(
                (n) =>
                  `<option value="${n * 60}" ${currentGoalChoice === n * 60 ? "selected" : ""}>${n} ${t(
                    "giờ",
                    n === 1 ? "hour" : "hours"
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label style="display:block;margin-bottom:12px;">
          <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">${t("Thời gian nghỉ", "Break length")}</div>
          <select class="input-text" id="breakLengthSelect">
            ${[5, 10, 15]
              .map(
                (m) =>
                  `<option value="${m}" ${state.breakMinutes === m ? "selected" : ""}>${m} ${t("phút", "minutes")}</option>`
              )
              .join("")}
          </select>
        </label>
        <label class="check-row">
          <input type="checkbox" id="countWeekendsChk" ${state.countWeekends ? "checked" : ""} />
          <span>${t("Tính cả cuối tuần", "Count weekends")}</span>
        </label>
        <label class="check-row">
          <input type="checkbox" id="autoLevelUpChk" ${state.autoLevelUp ? "checked" : ""} />
          <span>${t("Tự động tăng mục tiêu khi đạt 5/7 ngày", "Auto level-up after 5/7 days")}</span>
        </label>
      </div>
    </div>
  `;
}

// MARK: - 6. Rituals & Goals View

function renderRitualsGoals() {
  const doneToday = todayHours();
  const hitToday = doneToday.filter((h) => h.result === "Done").length;
  const avgDistr = doneToday.length
    ? (doneToday.reduce((a, b) => a + b.distr, 0) / doneToday.length).toFixed(1)
    : "0.0";

  return `
    <div class="header-row">
      <div>
        <h1 class="page-title">${t("Khởi động ngày mới. Khép lại gọn gàng.", "Set up the day. Close it down.")}</h1>
        <p class="page-subtitle">${t(
          "Môi trường, 5 mục tiêu lớn và thói quen nên tự đẩy bạn tới giờ tập trung tiếp theo.",
          "Your environment, Five Goals, and habits should push you toward the next focused hour."
        )}</p>
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:18px;">${t("Buổi sáng · 20 phút", "Morning · 20 min")}</h3>
          <span style="font-size:12px;color:var(--muted);">${state.morning.filter((m) => m.done).length}/${state.morning.length}</span>
        </div>
        ${state.morning
          .map(
            (m) => `
          <label class="check-row">
            <input type="checkbox" data-morning="${m.id}" ${m.done ? "checked" : ""} />
            <span style="flex:1;">${escapeHtml(m.title)}</span>
            <span style="font-size:12px;color:var(--muted);">${m.min}m</span>
          </label>
        `
          )
          .join("")}
        <button class="btn-primary" id="planOutcomesBtn" style="width:100%;margin-top:16px;">
          ${t(`Lập ${state.dailyGoal} mục tiêu hôm nay`, `Plan today's ${state.dailyGoal} outcomes`)}
        </button>
      </div>

      <div class="card sticky">
        <h3 style="margin:0 0 12px;font-size:18px;">${t("Năm mục tiêu lớn (Five Goals)", "Five Goals")}</h3>
        ${state.fiveGoals
          .map(
            (g, i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong>${i + 1}.</strong>
            <input class="input-text" data-goal-idx="${i}" value="${escapeHtml(g)}" style="padding:4px 8px;font-size:14px;" />
          </div>
        `
          )
          .join("")}
        <hr style="border:0;border-top:1px solid var(--sticky-border);margin:16px 0;" />
        <div style="font-size:12px;color:var(--muted);font-weight:700;">${t("Con người tôi đang trở thành", "Who I am becoming")}</div>
        <input class="input-text" id="identityInput" value="${escapeHtml(state.identity)}" style="margin-top:4px;font-weight:600;" />
      </div>

      <div class="card night">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:18px;">${t("Buổi tối · 4 phút", "Night · 4 min")}</h3>
          <span style="font-size:12px;color:var(--night-muted);">${t("Tổng kết cuối ngày", "Evening review")}</span>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:16px;">
          <div><div style="font-size:12px;color:var(--night-muted);">${t("Giờ", "Hours")}</div><strong style="font-size:20px;">${doneToday.length}/${state.dailyGoal}</strong></div>
          <div><div style="font-size:12px;color:var(--night-muted);">${t("Nhiễu/giờ", "Distr./h")}</div><strong style="font-size:20px;">${avgDistr}</strong></div>
          <div><div style="font-size:12px;color:var(--night-muted);">${t("Đạt", "Hit")}</div><strong style="font-size:20px;">${hitToday}/${Math.max(1, doneToday.length)}</strong></div>
        </div>

        ${state.night
          .map(
            (n) => `
          <label class="check-row">
            <input type="checkbox" data-night="${n.id}" ${n.done ? "checked" : ""} />
            <span>${escapeHtml(n.title)}</span>
          </label>
        `
          )
          .join("")}

        <div style="margin-top:16px;">
          <div style="font-size:12px;color:var(--night-muted);margin-bottom:4px;">${t("Mục tiêu đầu tiên ngày mai", "Tomorrow's first outcome")}</div>
          <input class="input-text" id="tomorrowOutcomeInput" value="${escapeHtml(state.tomorrowFirstOutcome)}" style="background:rgba(255,255,255,0.08);color:var(--night-ink);border-color:rgba(255,255,255,0.16);" />
        </div>
      </div>
    </div>
  `;
}

// MARK: - 7. User Guide View

function renderUserGuide() {
  return `
    <div class="kicker">${t("HƯỚNG DẪN SỬ DỤNG PEROS", "PEROS PERSONAL OS GUIDE")}</div>
    <h1 class="page-title">${t("Hệ điều hành cá nhân cho Tập trung sâu & Tri thức", "Personal OS for Deep Focus & Knowledge Execution")}</h1>
    <p class="page-subtitle" style="margin-bottom:24px;">${t(
      "PerOS kết hợp rèn luyện tập trung theo block 60 phút với quản lý Dự án & Ghi chú PARA, hoạt động mượt mà trên cả máy Windows công ty và Mac cá nhân.",
      "PerOS unites 60-minute deep focus blocks with PARA project & note management across your Windows office PC and personal Mac."
    )}</p>

    <div class="grid-2-equal" style="margin-bottom:24px;">
      <div class="card">
        <div class="kicker">01 · FOCUS LOOP</div>
        <h3 style="margin:0 0 12px;font-size:20px;">${t("Quy trình 4 bước mỗi giờ", "The 4-Step Hourly Loop")}</h3>
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;">
          <li><strong>1. Choose outcome:</strong> ${t("Chọn 1 đầu ra cụ thể từ Dự án đang chạy hoặc Hộp thư đến.", "Pick one concrete deliverable from an active Project or Inbox.")}</li>
          <li><strong>2. Focus 60m / 30m:</strong> ${t("Đếm ngược, ghi nháp kết quả vào Session Scratchpad. Nếu nảy ra ý tưởng khác, thả vào ô Catch Thought để không quên.", "Run timer, write in Session Scratchpad, and park wandering thoughts into Inbox.")}</li>
          <li><strong>3. Record:</strong> ${t("Đánh giá Xong / Một phần / Chưa xong. Ghi chú phiên sẽ tự lưu vào Kho tri thức.", "Mark Done, Partly, or Not done. Scratchpad notes save to your Project Vault.")}</li>
          <li><strong>4. Rest & review:</strong> ${t("Nghỉ 10 phút và tận hưởng phần thưởng đã chọn.", "Take a 10-minute break and enjoy your chosen reward.")}</li>
        </ul>
      </div>

      <div class="card">
        <div class="kicker">02 · WORKSPACE & SYNC</div>
        <h3 style="margin:0 0 12px;font-size:20px;">${t("Kho Dự án PARA & Đồng bộ Đa máy", "PARA Workspace & Windows ↔ Mac Sync")}</h3>
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;">
          <li><strong>Quick Capture (Ctrl+K / ⌘K):</strong> ${t("Bấm tổ hợp phím từ bất kỳ màn hình nào để ghi lại ý tưởng trong 3 giây.", "Press Ctrl+K or ⌘K anywhere to capture thoughts in under 3 seconds.")}</li>
          <li><strong>PARA Projects:</strong> ${t("Mỗi Dự án gắn trực tiếp với 1 trong 5 Mục tiêu lớn (Five Goals) và thống kê tổng số giờ đã đầu tư.", "Every Project links to one of your Five Goals and tracks total hours invested.")}</li>
          <li><strong>Wiki-Links [[...]]:</strong> ${t("Gõ [[Tên Note]] trong phần nội dung ghi chú để tạo liên kết 2 chiều tự động.", "Type [[Note Title]] inside any note to create automatic bi-directional backlinks.")}</li>
          <li><strong>Cloud Sync (GitHub Gist / JSON):</strong> ${t("Bấm nút Sync ở góc dưới bên trái để đồng bộ tức thời giữa máy Windows công ty và MacBook ở nhà.", "Click Sync in the sidebar to push/pull state via Private GitHub Gist or JSON file.")}</li>
        </ul>
      </div>
    </div>
  `;
}

// MARK: - Modals (Quick Capture & Cloud Sync)

function openQuickCaptureModal() {
  const modal = document.getElementById("quickCaptureModal");
  modal.classList.remove("hidden");
  document.getElementById("qcModalTitle").textContent = t(
    "Thu thập nhanh vào PerOS",
    "Capture to PerOS Inbox"
  );
  document.getElementById("qcModalSub").textContent = t(
    "Ghi nhanh ý tưởng, đầu việc hoặc tài liệu vào Inbox trong 3 giây rồi quay lại việc đang làm.",
    "Drop a thought, task, or reference link into your Inbox in 3 seconds, then return to what you were doing."
  );
  document.getElementById("saveToProjectOutcomeBtn").textContent = t(
    "+ Đầu việc Dự án",
    "+ Project Outcome"
  );
  document.getElementById("saveToInboxBtn").textContent = t(
    "Lưu vào Inbox ↵",
    "Save to Inbox ↵"
  );
  const select = document.getElementById("quickCaptureTargetProject");
  select.innerHTML = state.projects
    .filter((p) => p.kind !== "archive")
    .map((p) => `<option value="${p.id}">${escapeHtml(p.title)}</option>`)
    .join("");
  const input = document.getElementById("quickCaptureInput");
  input.placeholder = t("Bạn đang nghĩ gì?", "What's on your mind?");
  input.value = "";
  setTimeout(() => input.focus(), 20);
}

function closeQuickCaptureModal() {
  document.getElementById("quickCaptureModal").classList.add("hidden");
}

function renderSyncModalBody() {
  const body = document.getElementById("syncModalBody");
  if (!body) return;
  body.innerHTML = `
    <p class="page-subtitle" style="margin-bottom:16px;">
      ${t(
        "Đồng bộ toàn bộ Giờ tập trung, Hộp thư đến, Dự án và Ghi chú giữa máy Windows công ty và Mac cá nhân qua GitHub Gist bí mật hoặc file JSON.",
        "Sync all Focus Hours, Inbox, Projects, and Notes between your Windows work PC and personal Mac via a Private GitHub Gist or local JSON file."
      )}
    </p>

    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">
      <div>
        <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px;">
          GitHub Personal Access Token (scope: <code>gist</code>)
        </label>
        <input type="password" class="input-text" id="syncTokenInput" placeholder="ghp_..." value="${escapeHtml(state.sync?.githubToken || "")}" />
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px;">
          Gist ID (${t("Để trống lần đầu để tự tạo Gist bí mật mới", "Leave blank on first push to create a new secret Gist")})
        </label>
        <input class="input-text" id="syncGistIdInput" placeholder="e.g. a1b2c3d4e5f6..." value="${escapeHtml(state.sync?.gistId || "")}" />
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button class="btn-primary" id="gistPushBtn">☁️ ${t("Đẩy lên Cloud (Push)", "Push to Gist")}</button>
      <button class="btn-secondary" id="gistPullBtn">⬇️ ${t("Tải từ Cloud (Pull)", "Pull from Gist")}</button>
      <button class="btn-secondary" id="exportJsonBtn">💾 ${t("Tải file .JSON", "Export .JSON")}</button>
      <label class="btn-secondary" style="cursor:pointer;">
        📂 ${t("Nhập file .JSON", "Import .JSON")}
        <input type="file" id="importJsonInput" accept=".json,application/json" style="display:none;" />
      </label>
    </div>

    ${
      syncStatusMsg
        ? `<div class="highlight-callout" style="margin-bottom:0;">${escapeHtml(syncStatusMsg)}</div>`
        : state.sync?.lastSyncedAt
        ? `<div style="font-size:12px;color:var(--muted);">Last synced: ${escapeHtml(state.sync.lastSyncedAt)}</div>`
        : ""
    }
  `;

  document.getElementById("syncTokenInput")?.addEventListener("input", (e) => {
    state.sync.githubToken = e.target.value.trim();
    saveState();
  });
  document.getElementById("syncGistIdInput")?.addEventListener("input", (e) => {
    state.sync.gistId = e.target.value.trim();
    saveState();
  });
  document.getElementById("gistPushBtn")?.addEventListener("click", () => pushToGist(false));
  document.getElementById("gistPullBtn")?.addEventListener("click", pullFromGist);
  document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `peros-backup-${toDateKey(new Date())}.json`;
    a.click();
  });
  document.getElementById("importJsonInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      state = { ...createDefaultState(), ...imported };
      saveState();
      syncStatusMsg = t("Đã khôi phục dữ liệu từ file JSON thành công!", "Successfully restored PerOS state from JSON!");
      render();
      renderSyncModalBody();
    } catch {
      syncStatusMsg = t("File JSON không hợp lệ.", "Invalid JSON backup file.");
      renderSyncModalBody();
    }
  });
}

async function pushToGist(silent = false) {
  const token = state.sync?.githubToken;
  if (!token) {
    if (!silent) {
      syncStatusMsg = t("Vui lòng nhập GitHub Token trước.", "Please enter a GitHub Personal Access Token first.");
      renderSyncModalBody();
    }
    return;
  }
  try {
    const payload = {
      description: "PerOS Personal OS State Sync",
      public: false,
      files: {
        "peros-state.json": {
          content: JSON.stringify(state, null, 2),
        },
      },
    };
    const gistId = state.sync?.gistId;
    const url = gistId ? `https://api.github.com/gists/${gistId}` : "https://api.github.com/gists";
    const res = await fetch(url, {
      method: gistId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.sync.gistId = data.id;
    state.sync.lastSyncedAt = new Date().toLocaleString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!silent) {
      syncStatusMsg = `Synced to Gist ID: ${data.id}`;
      renderSyncModalBody();
    }
  } catch (err) {
    if (!silent) {
      syncStatusMsg = `Sync failed: ${err.message}`;
      renderSyncModalBody();
    }
  }
}

async function pullFromGist() {
  const token = state.sync?.githubToken;
  const gistId = state.sync?.gistId;
  if (!gistId) {
    syncStatusMsg = t("Vui lòng nhập Gist ID để tải dữ liệu về.", "Please enter your Gist ID to pull data.");
    renderSyncModalBody();
    return;
  }
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data.files?.["peros-state.json"]?.content;
    if (!content) throw new Error("Missing peros-state.json in Gist");
    const remoteState = JSON.parse(content);
    state = {
      ...createDefaultState(),
      ...remoteState,
      sync: {
        ...state.sync,
        lastSyncedAt: new Date().toLocaleString(),
      },
    };
    saveState();
    syncStatusMsg = t("Đã đồng bộ dữ liệu mới nhất từ Gist!", "Pulled latest state from Gist!");
    render();
    renderSyncModalBody();
  } catch (err) {
    syncStatusMsg = `Pull failed: ${err.message}`;
    renderSyncModalBody();
  }
}

// MARK: - Main Render & Event Wiring

function render() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.documentElement.setAttribute("lang", state.language);
  renderSidebar();

  const main = document.getElementById("mainContent");
  if (state.page === "today") main.innerHTML = renderToday();
  else if (state.page === "workspace") main.innerHTML = renderWorkspace();
  else if (state.page === "stickyWall") main.innerHTML = renderStickyWall();
  else if (state.page === "workLog") main.innerHTML = renderWorkLog();
  else if (state.page === "progress") main.innerHTML = renderProgress();
  else if (state.page === "ritualsGoals") main.innerHTML = renderRitualsGoals();
  else main.innerHTML = renderUserGuide();

  bindPageEvents();
}

function saveScratchpadToProjectNote(outcomeTitle, projectId, scratchpadText) {
  const cleanText = String(scratchpadText || "").trim();
  if (!cleanText) return null;
  const proj = projectById(projectId);
  let targetNote = state.notes.find((n) => n.projectId === projectId);
  const stamp = new Date().toLocaleString(state.language === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const entry = `\n\n### ${stamp} · ${outcomeTitle}\n${cleanText}`;

  if (targetNote) {
    targetNote.body = `${targetNote.body.trim()}${entry}`;
    targetNote.updatedAt = new Date().toISOString();
    return targetNote.id;
  }
  const newNote = {
    id: uid("note"),
    title: `${proj?.title || "Focus"} — Session Notes`,
    projectId: projectId || "proj_course",
    tags: ["focus-output"],
    highlight: outcomeTitle,
    body: `### ${stamp} · ${outcomeTitle}\n${cleanText}`,
    updatedAt: new Date().toISOString(),
  };
  state.notes.unshift(newNote);
  return newNote.id;
}

function bindPageEvents() {
  // Today events
  document.getElementById("sessionProjectSelect")?.addEventListener("change", (e) => {
    session.projectId = e.target.value;
    render();
  });
  document.getElementById("outcomeInput")?.addEventListener("input", (e) => {
    session.outcome = e.target.value;
  });
  document.getElementById("rewardInput")?.addEventListener("input", (e) => {
    session.reward = e.target.value;
  });
  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      session.outcome = btn.dataset.example;
      render();
    });
  });
  document.querySelectorAll("[data-duration]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.sessionMinutes = Number(btn.dataset.duration);
      session.durationSeconds = state.sessionMinutes * 60;
      session.remaining = session.durationSeconds;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-select-slot]").forEach((card) => {
    card.addEventListener("click", () => {
      if (session.step === 1) {
        session.slot = Number(card.dataset.selectSlot);
        session.reward = state.rewards[(session.slot - 1) % state.rewards.length] || "Beer on the balcony";
        render();
      }
    });
  });
  document.getElementById("startHourBtn")?.addEventListener("click", () => {
    session.outcome = cleanTitle(session.outcome, "Deep focus session");
    session.durationSeconds = (state.sessionMinutes || 60) * 60;
    session.remaining = session.durationSeconds;
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
  document.getElementById("sessionScratchpadInput")?.addEventListener("input", (e) => {
    session.scratchpad = e.target.value;
  });
  document.getElementById("recordScratchpadInput")?.addEventListener("input", (e) => {
    session.scratchpad = e.target.value;
  });
  document.querySelectorAll("[data-cause]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = btn.dataset.cause;
      session.distractions += 1;
      session.causes[c] = (session.causes[c] || 0) + 1;
      render();
      if (c === "Wandering thought") {
        document.getElementById("focusThoughtInput")?.focus();
      }
    });
  });
  document.getElementById("focusThoughtInput")?.addEventListener("input", (e) => {
    session.thoughtDraft = e.target.value;
  });
  document.getElementById("captureFocusThoughtBtn")?.addEventListener("click", () => {
    const txt = cleanTitle(session.thoughtDraft, "");
    if (!txt) return;
    state.inbox.unshift({
      id: uid("in"),
      text: txt,
      source: "Focus Thought",
      createdAt: new Date().toISOString(),
    });
    session.thoughtDraft = "";
    session.distractions += 1;
    session.causes["Wandering thought"] = (session.causes["Wandering thought"] || 0) + 1;
    saveState();
    render();
  });
  document.querySelectorAll("[data-result]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const topCause =
        Object.entries(session.causes).sort((a, b) => b[1] - a[1])[0]?.[0] || "Phone";
      const noteId = saveScratchpadToProjectNote(
        session.outcome,
        session.projectId,
        session.scratchpad
      );
      const proj = projectById(session.projectId);
      if (proj && btn.dataset.result === "Done") {
        const matchedOutcome = (proj.outcomes || []).find(
          (o) => o.title.toLowerCase() === session.outcome.toLowerCase()
        );
        if (matchedOutcome) matchedOutcome.done = true;
      }
      state.hours.push({
        id: uid("hr"),
        date: new Date().toISOString(),
        slot: session.slot,
        outcome: session.outcome,
        distr: session.distractions,
        cause: topCause,
        result: btn.dataset.result,
        projectId: session.projectId,
        noteId,
        scratchpad: session.scratchpad,
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

  // Workspace events
  document.querySelectorAll("[data-ws-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.workspaceTab = btn.dataset.wsTab;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-para-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.paraFilter = btn.dataset.paraFilter;
      saveState();
      render();
    });
  });
  document.getElementById("inlineInboxAddBtn")?.addEventListener("click", () => {
    const input = document.getElementById("inlineInboxInput");
    const txt = cleanTitle(input?.value, "");
    if (!txt) return;
    state.inbox.unshift({
      id: uid("in"),
      text: txt,
      source: "Quick Capture",
      createdAt: new Date().toISOString(),
    });
    saveState();
    render();
  });
  document.querySelectorAll("[data-inbox-focus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.inboxFocus;
      const item = state.inbox.find((x) => x.id === id);
      const projSelect = document.querySelector(`[data-inbox-proj="${id}"]`);
      if (!item) return;
      session.outcome = item.text;
      if (projSelect?.value) session.projectId = projSelect.value;
      state.inbox = state.inbox.filter((x) => x.id !== id);
      state.page = "today";
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-inbox-to-outcome]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.inboxToOutcome;
      const item = state.inbox.find((x) => x.id === id);
      const projSelect = document.querySelector(`[data-inbox-proj="${id}"]`);
      const proj = projectById(projSelect?.value || state.selectedProjectId);
      if (!item || !proj) return;
      proj.outcomes = proj.outcomes || [];
      proj.outcomes.unshift({ id: uid("out"), title: item.text, done: false });
      state.inbox = state.inbox.filter((x) => x.id !== id);
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-inbox-to-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.inboxToNote;
      const item = state.inbox.find((x) => x.id === id);
      const projSelect = document.querySelector(`[data-inbox-proj="${id}"]`);
      if (!item) return;
      const newNote = {
        id: uid("note"),
        title: item.text.slice(0, 60),
        projectId: projSelect?.value || "proj_course",
        tags: ["inbox"],
        highlight: item.text,
        body: `Captured on ${new Date().toLocaleDateString()}:\n\n${item.text}`,
        updatedAt: new Date().toISOString(),
      };
      state.notes.unshift(newNote);
      state.selectedNoteId = newNote.id;
      state.inbox = state.inbox.filter((x) => x.id !== id);
      state.workspaceTab = "notes";
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-inbox-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.inbox = state.inbox.filter((x) => x.id !== btn.dataset.inboxDelete);
      saveState();
      render();
    });
  });

  // Projects tab events
  document.querySelectorAll("[data-select-project]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedProjectId = el.dataset.selectProject;
      saveState();
      render();
    });
  });
  document.getElementById("createProjectBtn")?.addEventListener("click", () => {
    const input = document.getElementById("newProjectTitleInput");
    const title = cleanTitle(input?.value, "");
    if (!title) return;
    const kind = state.paraFilter === "all" ? "project" : state.paraFilter;
    const newProj = {
      id: uid("proj"),
      title,
      kind,
      goalIndex: 0,
      status: "Active",
      deadline: "",
      summary: "Created in PerOS Workspace.",
      outcomes: [],
    };
    state.projects.unshift(newProj);
    state.selectedProjectId = newProj.id;
    saveState();
    render();
  });
  document.getElementById("changeProjectKindSelect")?.addEventListener("change", (e) => {
    const proj = projectById(state.selectedProjectId);
    if (proj) {
      proj.kind = e.target.value;
      saveState();
      render();
    }
  });
  document.getElementById("addOutcomeBtn")?.addEventListener("click", () => {
    const input = document.getElementById("newOutcomeInput");
    const title = cleanTitle(input?.value, "");
    const proj = projectById(state.selectedProjectId);
    if (!title || !proj) return;
    proj.outcomes = proj.outcomes || [];
    proj.outcomes.push({ id: uid("out"), title, done: false });
    saveState();
    render();
  });
  document.querySelectorAll("[data-toggle-outcome]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const proj = projectById(state.selectedProjectId);
      const out = proj?.outcomes?.find((o) => o.id === cb.dataset.toggleOutcome);
      if (out) {
        out.done = cb.checked;
        saveState();
        render();
      }
    });
  });
  document.querySelectorAll("[data-launch-outcome]").forEach((btn) => {
    btn.addEventListener("click", () => {
      session.outcome = btn.dataset.launchOutcome;
      session.projectId = btn.dataset.launchProject || state.selectedProjectId;
      state.page = "today";
      saveState();
      render();
    });
  });
  document.getElementById("newNoteForProjectBtn")?.addEventListener("click", () => {
    const proj = projectById(state.selectedProjectId);
    const note = {
      id: uid("note"),
      title: `${proj?.title || "Project"} — New Note`,
      projectId: proj?.id || "proj_course",
      tags: [],
      highlight: "",
      body: "",
      updatedAt: new Date().toISOString(),
    };
    state.notes.unshift(note);
    state.selectedNoteId = note.id;
    state.workspaceTab = "notes";
    saveState();
    render();
  });
  document.querySelectorAll("[data-open-note]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedNoteId = el.dataset.openNote;
      state.workspaceTab = "notes";
      saveState();
      render();
    });
  });

  // Notes tab events
  document.querySelectorAll("[data-select-note]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedNoteId = el.dataset.selectNote;
      saveState();
      render();
    });
  });
  document.getElementById("createBlankNoteBtn")?.addEventListener("click", () => {
    const note = {
      id: uid("note"),
      title: "Untitled Note",
      projectId: state.selectedProjectId || "proj_course",
      tags: [],
      highlight: "",
      body: "",
      updatedAt: new Date().toISOString(),
    };
    state.notes.unshift(note);
    state.selectedNoteId = note.id;
    saveState();
    render();
  });
  document.getElementById("noteTitleInput")?.addEventListener("change", (e) => {
    const note = state.notes.find((n) => n.id === state.selectedNoteId);
    if (note) {
      note.title = cleanTitle(e.target.value, "Untitled Note");
      note.updatedAt = new Date().toISOString();
      saveState();
      render();
    }
  });
  document.getElementById("noteProjectSelect")?.addEventListener("change", (e) => {
    const note = state.notes.find((n) => n.id === state.selectedNoteId);
    if (note) {
      note.projectId = e.target.value;
      saveState();
      render();
    }
  });
  document.getElementById("noteHighlightInput")?.addEventListener("input", (e) => {
    const note = state.notes.find((n) => n.id === state.selectedNoteId);
    if (note) {
      note.highlight = e.target.value;
      saveState();
    }
  });
  document.getElementById("noteBodyInput")?.addEventListener("input", (e) => {
    const note = state.notes.find((n) => n.id === state.selectedNoteId);
    if (note) {
      note.body = e.target.value;
      note.updatedAt = new Date().toISOString();
      saveState();
    }
  });
  document.querySelectorAll("[data-wiki-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTitle = btn.dataset.wikiJump.trim().toLowerCase();
      let target = state.notes.find((n) => n.title.trim().toLowerCase() === targetTitle);
      if (!target) {
        target = {
          id: uid("note"),
          title: btn.dataset.wikiJump.trim(),
          projectId: state.selectedProjectId || "proj_course",
          tags: [],
          highlight: "",
          body: "",
          updatedAt: new Date().toISOString(),
        };
        state.notes.unshift(target);
      }
      state.selectedNoteId = target.id;
      saveState();
      render();
    });
  });

  // Sticky Wall & Work Log events
  document.querySelectorAll("[data-wall-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.wallRange = btn.dataset.wallRange;
      saveState();
      render();
    });
  });
  document.getElementById("wallProjectFilterSelect")?.addEventListener("change", (e) => {
    state.wallProjectFilter = e.target.value;
    saveState();
    render();
  });
  document.getElementById("workLogProjectSelect")?.addEventListener("change", (e) => {
    state.workLogProjectFilter = e.target.value;
    saveState();
    render();
  });
  document.getElementById("workLogSearch")?.addEventListener("input", (e) => {
    state.workLogSearch = e.target.value;
    render();
  });
  document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
    const csv = exportHoursCsv(state.hours, state.projects);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "peros-work-log.csv";
    a.click();
  });

  // Progress & Rituals events
  document.getElementById("dailyGoalSelect")?.addEventListener("change", (e) => {
    const val = Number(e.target.value);
    if (val === 30) {
      state.dailyGoal = 1;
      state.sessionMinutes = 30;
    } else {
      state.dailyGoal = Math.max(1, Math.min(4, val / 60));
      state.sessionMinutes = 60;
    }
    saveState();
    render();
  });
  document.getElementById("breakLengthSelect")?.addEventListener("change", (e) => {
    state.breakMinutes = Number(e.target.value);
    saveState();
    render();
  });
  document.getElementById("countWeekendsChk")?.addEventListener("change", (e) => {
    state.countWeekends = e.target.checked;
    saveState();
    render();
  });
  document.getElementById("autoLevelUpChk")?.addEventListener("change", (e) => {
    state.autoLevelUp = e.target.checked;
    saveState();
    render();
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
  document.querySelectorAll("[data-goal-idx]").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const idx = Number(inp.dataset.goalIdx);
      state.fiveGoals[idx] = e.target.value;
      saveState();
    });
  });
  document.getElementById("identityInput")?.addEventListener("change", (e) => {
    state.identity = e.target.value;
    saveState();
  });
  document.getElementById("planOutcomesBtn")?.addEventListener("click", () => {
    state.page = "today";
    render();
  });
  document.getElementById("tomorrowOutcomeInput")?.addEventListener("input", (e) => {
    state.tomorrowFirstOutcome = e.target.value;
    saveState();
  });
}

// MARK: - Global Listeners & Shortcuts

document.getElementById("navList").addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-item");
  if (!btn) return;
  state.page = btn.dataset.page;
  saveState();
  render();
});

document.getElementById("langSwitch").addEventListener("click", (e) => {
  const btn = e.target.closest(".lang-btn");
  if (!btn) return;
  state.language = btn.dataset.lang;
  saveState();
  render();
});

document.getElementById("toggleThemeBtn").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveState();
  render();
});

document.getElementById("seedDemoBtn").addEventListener("click", () => {
  state = seedSampleData(createDefaultState());
  saveState();
  render();
});

document.getElementById("openQuickCaptureBtn").addEventListener("click", openQuickCaptureModal);
document.getElementById("closeQuickCaptureBtn").addEventListener("click", closeQuickCaptureModal);

document.getElementById("saveToInboxBtn").addEventListener("click", () => {
  const input = document.getElementById("quickCaptureInput");
  const txt = cleanTitle(input.value, "");
  if (!txt) return;
  state.inbox.unshift({
    id: uid("in"),
    text: txt,
    source: "Quick Capture",
    createdAt: new Date().toISOString(),
  });
  saveState();
  closeQuickCaptureModal();
  render();
});

document.getElementById("saveToProjectOutcomeBtn").addEventListener("click", () => {
  const input = document.getElementById("quickCaptureInput");
  const projId = document.getElementById("quickCaptureTargetProject").value;
  const txt = cleanTitle(input.value, "");
  const proj = projectById(projId);
  if (!txt || !proj) return;
  proj.outcomes = proj.outcomes || [];
  proj.outcomes.unshift({ id: uid("out"), title: txt, done: false });
  saveState();
  closeQuickCaptureModal();
  render();
});

document.getElementById("quickCaptureInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("saveToInboxBtn").click();
  }
});

document.getElementById("openSyncModalBtn").addEventListener("click", () => {
  syncStatusMsg = "";
  renderSyncModalBody();
  document.getElementById("syncModal").classList.remove("hidden");
});

document.getElementById("closeSyncModalBtn").addEventListener("click", () => {
  document.getElementById("syncModal").classList.add("hidden");
});

window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openQuickCaptureModal();
  } else if (e.key === "Escape") {
    closeQuickCaptureModal();
    document.getElementById("syncModal")?.classList.add("hidden");
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
