/**
 * Honey & Mumford LSQ scoring (80 items; 4 styles; 20 items per style).
 * Scoring keys updated to exactly match the scoring table shown in the attached document. :contentReference[oaicite:1]{index=1}
 */

// EXACTLY as per the scoring table in the document:
// Column 1 = Activist, Column 2 = Reflector, Column 3 = Theorist, Column 4 = Pragmatist
const STYLE_KEYS = {
  activist:   [2, 4, 6, 10, 17, 23, 24, 32, 34, 38, 40, 43, 45, 48, 58, 64, 71, 72, 74, 79],
  reflector:  [7, 13, 15, 16, 25, 28, 29, 31, 33, 36, 39, 41, 46, 52, 55, 60, 62, 66, 67, 76],
  theorist:   [1, 3, 8, 12, 14, 18, 20, 22, 26, 30, 42, 47, 51, 57, 61, 63, 68, 75, 77, 78],
  pragmatist: [5, 9, 11, 19, 21, 27, 35, 37, 44, 49, 50, 53, 54, 56, 59, 65, 69, 70, 73, 80],
};

const STORAGE_ANSWERS = "hm_lsq_answers";
const STORAGE_NAME = "hm_lsq_name";

const els = {
  qList: document.getElementById("question-list"),
  sActivist: document.getElementById("s-activist"),
  sReflector: document.getElementById("s-reflector"),
  sTheorist: document.getElementById("s-theorist"),
  sPragmatist: document.getElementById("s-pragmatist"),
  sTicked: document.getElementById("s-ticked"),
  sTotal: document.getElementById("s-total"),
  cross: document.getElementById("cross"),
  btnCheckAll: document.getElementById("btn-check-all"),
  btnUncheckAll: document.getElementById("btn-uncheck-all"),
  btnRandom: document.getElementById("btn-random"),
  nameInput: document.getElementById("name-input"),
  resultTitle: document.getElementById("result-title"),
  btnDownload: document.getElementById("btn-download"),
  downloadStatus: document.getElementById("download-status"),
};

let QUESTIONS = [];
// answers[id] => boolean
const answers = {};

function getDisplayName() {
  const raw = (els.nameInput?.value ?? "").trim();
  return raw.length ? raw : "Anonymous";
}

function setResultTitle() {
  const nm = getDisplayName();
  els.resultTitle.textContent = nm === "Anonymous" ? "Results" : `Results for ${nm}`;
}

function scoreStyle(styleKey) {
  let total = 0;
  for (const id of styleKey) {
    if (answers[id]) total += 1;
  }
  return total;
}

function computeScores() {
  const activist = scoreStyle(STYLE_KEYS.activist);
  const reflector = scoreStyle(STYLE_KEYS.reflector);
  const theorist = scoreStyle(STYLE_KEYS.theorist);
  const pragmatist = scoreStyle(STYLE_KEYS.pragmatist);

  const ticked = Object.values(answers).filter(Boolean).length;

  els.sActivist.textContent = activist;
  els.sReflector.textContent = reflector;
  els.sTheorist.textContent = theorist;
  els.sPragmatist.textContent = pragmatist;
  els.sTicked.textContent = ticked;
  els.sTotal.textContent = QUESTIONS.length || 80;

  setResultTitle();
  drawCross({ activist, reflector, theorist, pragmatist });
}

function makeQuestionRow(q) {
  const row = document.createElement("label");
  row.className = "q";
  row.setAttribute("for", `q-${q.id}`);

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = `q-${q.id}`;
  cb.checked = Boolean(answers[q.id]);
  cb.addEventListener("change", () => {
    answers[q.id] = cb.checked;
    persistAnswers();
    computeScores();
  });

  const textWrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.className = "qid";
  meta.textContent = `#${String(q.id).padStart(2, "0")}`;

  const txt = document.createElement("div");
  txt.className = "qtext";
  txt.textContent = q.text;

  textWrap.appendChild(meta);
  textWrap.appendChild(txt);

  row.appendChild(cb);
  row.appendChild(textWrap);
  return row;
}

async function loadQuestions() {
  const res = await fetch("questions.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load questions.json (${res.status})`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length < 1) {
    throw new Error("questions.json must be an array of {id, text} objects.");
  }

  QUESTIONS = data
    .map((q) => ({ id: Number(q.id), text: String(q.text ?? "").trim() }))
    .filter((q) => Number.isFinite(q.id) && q.id >= 1 && q.id <= 80)
    .sort((a, b) => a.id - b.id);

  // Ensure answers map has all keys
  for (const q of QUESTIONS) {
    if (answers[q.id] === undefined) answers[q.id] = false;
  }
}

function renderQuestions() {
  els.qList.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const q of QUESTIONS) frag.appendChild(makeQuestionRow(q));
  els.qList.appendChild(frag);
}

function persistAnswers() {
  try {
    localStorage.setItem(STORAGE_ANSWERS, JSON.stringify(answers));
  } catch (_) {}
}

function restoreAnswers() {
  try {
    const raw = localStorage.getItem(STORAGE_ANSWERS);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        const id = Number(k);
        if (id >= 1 && id <= 80) answers[id] = Boolean(v);
      }
    }
  } catch (_) {}
}

function persistName() {
  try {
    localStorage.setItem(STORAGE_NAME, (els.nameInput.value ?? "").trim());
  } catch (_) {}
}

function restoreName() {
  try {
    const nm = localStorage.getItem(STORAGE_NAME);
    if (nm && els.nameInput) els.nameInput.value = nm;
  } catch (_) {}
}

function setAll(val) {
  for (const q of QUESTIONS) answers[q.id] = val;
  persistAnswers();
  renderQuestions();
  computeScores();
}

function randomDemo() {
  // Randomly tick about 40% for demo purposes
  for (const q of QUESTIONS) answers[q.id] = Math.random() < 0.4;
  persistAnswers();
  renderQuestions();
  computeScores();
}

// --- SVG cross drawing ---
function drawCross({ activist, reflector, theorist, pragmatist }) {
  const svg = els.cross;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const W = 520, H = 520;
  const cx = W / 2, cy = H / 2;
  const pad = 60;
  const left = pad, right = W - pad, top = pad, bottom = H - pad;

  svg.appendChild(svgRect(0, 0, W, H, { fill: "#0f1118" }));

  // Axes
  svg.appendChild(svgLine(cx, top, cx, bottom, { stroke: "#2a2d3a", "stroke-width": 3 }));
  svg.appendChild(svgLine(left, cy, right, cy, { stroke: "#2a2d3a", "stroke-width": 3 }));

  // Centre dot
  svg.appendChild(svgCircle(cx, cy, 5, { fill: "#7aa2ff" }));

  // Labels + scores
  svg.appendChild(labelBlock(cx, top - 18, "Activist", activist, "middle"));
  svg.appendChild(labelBlock(cx, bottom + 18, "Theorist", theorist, "middle"));
  svg.appendChild(labelBlock(left - 10, cy, "Reflector", reflector, "end"));
  svg.appendChild(labelBlock(right + 10, cy, "Pragmatist", pragmatist, "start"));

  // Tick marks (0..20) on each arm
  const ticks = 20;
  for (let i = 1; i < ticks; i++) {
    const t = i / ticks;

    // vertical ticks along y-axis
    const yUp = cy - (cy - top) * t;
    const yDown = cy + (bottom - cy) * t;
    svg.appendChild(svgLine(cx - 7, yUp, cx + 7, yUp, { stroke: "#1d2030", "stroke-width": 2 }));
    svg.appendChild(svgLine(cx - 7, yDown, cx + 7, yDown, { stroke: "#1d2030", "stroke-width": 2 }));

    // horizontal ticks along x-axis
    const xLeft = cx - (cx - left) * t;
    const xRight = cx + (right - cx) * t;
    svg.appendChild(svgLine(xLeft, cy - 7, xLeft, cy + 7, { stroke: "#1d2030", "stroke-width": 2 }));
    svg.appendChild(svgLine(xRight, cy - 7, xRight, cy + 7, { stroke: "#1d2030", "stroke-width": 2 }));
  }
}

// --- SVG helpers ---
function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function svgLine(x1, y1, x2, y2, attrs = {}) {
  return svgEl("line", { x1, y1, x2, y2, ...attrs });
}
function svgRect(x, y, w, h, attrs = {}) {
  return svgEl("rect", { x, y, width: w, height: h, ...attrs });
}
function svgCircle(cx, cy, r, attrs = {}) {
  return svgEl("circle", { cx, cy, r, ...attrs });
}
function svgText(x, y, text, attrs = {}) {
  const t = svgEl("text", { x, y, ...attrs });
  t.textContent = text;
  return t;
}
function labelBlock(x, y, label, value, anchor) {
  const g = svgEl("g", {});
  g.appendChild(svgText(x, y, label, {
    fill: "#a9a9b6", "font-size": 16, "text-anchor": anchor, "dominant-baseline": "middle"
  }));
  g.appendChild(svgText(x, y + 22, String(value), {
    fill: "#e9e9ee", "font-size": 26, "font-weight": 700,
    "text-anchor": anchor, "dominant-baseline": "middle"
  }));
  return g;
}

// --- Download outcome (PNG) ---
async function downloadOutcomePng() {
  const name = getDisplayName();
  const dateStr = new Date().toLocaleString("en-GB");

  const activist = Number(els.sActivist.textContent) || 0;
  const reflector = Number(els.sReflector.textContent) || 0;
  const theorist = Number(els.sTheorist.textContent) || 0;
  const pragmatist = Number(els.sPragmatist.textContent) || 0;

  els.downloadStatus.textContent = "Preparing download…";

  // Convert SVG to image
  const svgDataUrl = svgToDataUrl(els.cross);
  const crossImg = await loadImage(svgDataUrl);

  // Canvas export
  // Layout: title + name + date + scores + cross
  const scale = 2;                 // higher = sharper
  const W = 1100, H = 800;         // logical pixels
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#111827";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText("Learning Styles Outcome (Honey & Mumford)", 40, 60);

  // Name + date
  ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText(`Name: ${name}`, 40, 95);
  ctx.fillText(`Generated: ${dateStr}`, 40, 120);

  // Scores box
  const boxX = 40, boxY = 150, boxW = 420, boxH = 240;
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.font = "700 20px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText("Scores", boxX + 16, boxY + 34);

  ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  const lines = [
    ["Activist", activist],
    ["Reflector", reflector],
    ["Theorist", theorist],
    ["Pragmatist", pragmatist],
  ];
  let y = boxY + 70;
  for (const [label, val] of lines) {
    ctx.fillText(`${label}:`, boxX + 16, y);
    ctx.font = "700 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    ctx.fillText(String(val), boxX + 200, y);
    ctx.font = "500 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    y += 38;
  }

  ctx.font = "400 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Cross: Activist (top), Theorist (bottom), Reflector (left), Pragmatist (right).", boxX + 16, boxY + boxH - 16);

  // Cross image
  const crossX = 520, crossY = 150;
  const crossW = 520, crossH = 520;
  ctx.fillStyle = "#111827";
  ctx.font = "700 20px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText("Honey & Mumford Cross", crossX, crossY - 14);

  // Draw cross SVG as image
  ctx.drawImage(crossImg, crossX, crossY, crossW, crossH);

  // Footer notes
  ctx.fillStyle = "#6b7280";
  ctx.font = "400 12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  ctx.fillText("Honey & Mumford Questions are copyrighted by Honey & Mumford.", 40, H - 40);
  ctx.fillText("Code copyrighted by Dr Somdip Dey, Regent European University.", 40, H - 22);

  // Download
  const safeName = name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "Anonymous";
  const filename = `Learning_Styles_Outcome_${safeName}.png`;

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create PNG blob.");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  els.downloadStatus.textContent = `Downloaded: ${filename}`;
}

function svgToDataUrl(svgElement) {
  const clone = svgElement.cloneNode(true);

  // Ensure xmlns exists
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const svgText = new XMLSerializer().serializeToString(clone);
  const encoded = encodeURIComponent(svgText)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for export."));
    img.src = src;
  });
}

// --- Init ---
(async function init() {
  restoreAnswers();
  restoreName();
  setResultTitle();

  els.nameInput.addEventListener("input", () => {
    persistName();
    setResultTitle();
  });

  try {
    await loadQuestions();
    renderQuestions();
    computeScores();
  } catch (err) {
    els.qList.innerHTML = `<div class="loading">Error: ${escapeHtml(err.message)}</div>`;
  }

  els.btnCheckAll.addEventListener("click", () => setAll(true));
  els.btnUncheckAll.addEventListener("click", () => setAll(false));
  els.btnRandom.addEventListener("click", () => randomDemo());

  els.btnDownload.addEventListener("click", async () => {
    els.downloadStatus.textContent = "";
    try {
      await downloadOutcomePng();
    } catch (e) {
      els.downloadStatus.textContent = `Download failed: ${e?.message ?? "Unknown error"}`;
    }
  });
})();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}
