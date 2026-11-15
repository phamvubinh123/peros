#!/usr/bin/env node
// BAMA Web Snapshot & Layout Verification Harness (tools/web-snap.mjs)
// Zero external npm dependencies required: uses built-in Node.js http/net/child_process
// and system Chromium (/usr/bin/chromium) via Chrome DevTools Protocol (CDP) WebSocket
// to capture Light & Dark screenshots of every PerOS page and verify layout geometry.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../docs");
const OUT_DIR = process.env.WEB_SNAPSHOT_DIR || "/tmp/Peros-web-shots";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startStaticServer(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url || "/").split("?")[0];
      const rel = urlPath === "/" ? "/index.html" : urlPath;
      const filePath = path.join(rootDir, path.normalize(rel));
      if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function launchChromiumCdp(debugPort = 9229) {
  const userDataDir = `/tmp/peros-chrome-profile-${Date.now()}`;
  const proc = spawn(
    "/usr/bin/chromium",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debugPort}`,
      "--window-size=1400,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        const pageTarget = targets.find((t) => t.type === "page");
        if (pageTarget?.webSocketDebuggerUrl) {
          return { proc, wsUrl: pageTarget.webSocketDebuggerUrl, userDataDir };
        }
      }
    } catch {
      // wait for startup
    }
    await sleep(100);
  }
  proc.kill();
  throw new Error("Failed to connect to Chromium CDP");
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (e) => reject(e));
      this.ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "JS Eval Error");
    }
    return res.result?.value;
  }

  close() {
    this.ws?.close();
  }
}

async function run() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { server, url } = await startStaticServer(DOCS_DIR);
  const { proc, wsUrl, userDataDir } = await launchChromiumCdp(9234);
  const cdp = new CdpSession(wsUrl);
  await cdp.connect();

  const layoutFailures = [];

  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send("Page.navigate", { url });
    await sleep(500);

    const targets = [
      { name: "today", pageId: "today" },
      { name: "workspace-projects", pageId: "workspace", wsTab: "projects" },
      { name: "workspace-inbox", pageId: "workspace", wsTab: "inbox" },
      { name: "workspace-notes", pageId: "workspace", wsTab: "notes" },
      { name: "stickyWall", pageId: "stickyWall" },
      { name: "workLog", pageId: "workLog" },
      { name: "progress", pageId: "progress" },
      { name: "ritualsGoals", pageId: "ritualsGoals" },
      { name: "userGuide", pageId: "userGuide" },
    ];

    for (const mode of ["light", "dark"]) {
      await cdp.eval(`(() => {
        const raw = localStorage.getItem("peros.personalos.v2");
        const st = raw ? JSON.parse(raw) : {};
        st.theme = "${mode}";
        localStorage.setItem("peros.personalos.v2", JSON.stringify(st));
        location.reload();
      })()`);
      await sleep(300);

      for (const t of targets) {
        const metrics = await cdp.eval(`(() => {
          document.querySelector('.nav-item[data-page="${t.pageId}"]')?.click();
          ${t.wsTab ? `document.querySelector('[data-ws-tab="${t.wsTab}"]')?.click();` : ""}
          const docWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const mainRect = document.getElementById("mainContent")?.getBoundingClientRect();
          return {
            overflowX: scrollWidth - docWidth,
            mainWidth: mainRect?.width || 0,
            mainHeight: mainRect?.height || 0,
            title: document.querySelector(".page-title")?.textContent || ""
          };
        })()`);

        await sleep(100);

        if (metrics.overflowX > 2) {
          layoutFailures.push(`${t.name}-${mode}: horizontal overflow by ${metrics.overflowX}px`);
        }
        if (metrics.mainWidth < 600 || metrics.mainHeight < 180) {
          layoutFailures.push(`${t.name}-${mode}: main content collapsed (${metrics.mainWidth}x${metrics.mainHeight})`);
        }

        const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
        const outPath = path.join(OUT_DIR, `${t.name}-${mode}.png`);
        fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
        console.log(`SNAPSHOT ${outPath}`);
      }
    }

    // Capture Quick Capture Modal in Dark Mode
    await cdp.eval(`document.getElementById("openQuickCaptureBtn")?.click()`);
    await sleep(100);
    const qcShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const qcPath = path.join(OUT_DIR, "modal-quick-capture-dark.png");
    fs.writeFileSync(qcPath, Buffer.from(qcShot.data, "base64"));
    console.log(`SNAPSHOT ${qcPath}`);
  } finally {
    cdp.close();
    proc.kill();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      // ignore cleanup race
    }
  }

  if (layoutFailures.length > 0) {
    for (const l of layoutFailures) console.error("FAIL LAYOUT", l);
    process.exit(1);
  }
  console.log(`PASS web-snap: 19 snapshots verified in Light & Dark (${OUT_DIR})`);
}

run();
