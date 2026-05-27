const API_BASE = "http://localhost:5000";

const STAT_ICONS  = { STR:"⚔️", AGI:"💨", INT:"🧠", VIT:"❤️", PER:"👁️", LUK:"⭐" };
const STAT_COLORS = { STR:"#ef4444", AGI:"#22c55e", INT:"#3b82f6", VIT:"#f97316", PER:"#a855f7", LUK:"#eab308" };
const RANK_COLORS = {
  "E":"#9ca3af","D":"#6ee7b7","C":"#60a5fa",
  "B":"#c084fc","A":"#fbbf24","S":"#f97316",
  "National Level":"#ef4444","Shadow Monarch":"#7c3aed"
};

let currentPlayer = null;
let notifId = 0;

// ── Show/Hide Screens ─────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if (!username || !password) { showNotif("Enter username and password!", "info"); return; }

  try {
    const res  = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { showNotif(data.error, "info"); return; }
    showNotif(`✦ ${data.message}`, "success");
    renderAll(data.player);
    showApp();
  } catch (err) { showNotif("Cannot connect to server!", "info"); }
}

async function register() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if (!username || !password) { showNotif("Enter username and password!", "info"); return; }

  try {
    const res  = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) { showNotif(data.error, "info"); return; }
    showNotif(`✦ ${data.message}`, "success");
    renderAll(data.player);
    showApp();
  } catch (err) { showNotif("Cannot connect to server!", "info"); }
}

async function logout() {
  await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  currentPlayer = null;
  showLogin();
  showNotif("◆ Logged out successfully", "info");
}

// ── Fetch Player ──────────────────────────────────────────────────────────────
async function fetchPlayer() {
  try {
    const res = await fetch(`${API_BASE}/player`, { credentials: "include" });
    if (res.status === 401) { showLogin(); return; }
    const player = await res.json();
    renderAll(player);
    showApp();
  } catch (err) { showLogin(); }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll(player) {
  currentPlayer = player;
  renderProfile(player);
  renderBars(player);
  renderStats(player);
  renderQuests(player);
  renderSkills(player);
}

function renderProfile(p) {
  const rankColor = RANK_COLORS[p.rank] || "#9ca3af";
  document.getElementById("playerName").textContent  = p.username;
  document.getElementById("playerRank").textContent  = `${p.title} · RANK ${p.rank}`;
  document.getElementById("playerRank").style.color  = rankColor;
  document.getElementById("playerLevel").textContent = p.level;
  const avatar = document.getElementById("avatar");
  avatar.style.borderColor = rankColor;
  avatar.style.boxShadow   = `0 0 20px ${rankColor}55`;
  const badge = document.getElementById("statBadge");
  if (p.stat_points > 0) {
    badge.textContent = `+${p.stat_points} pts`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function renderBars(p) {
  setBar("hpBar", "hpVal", p.hp, p.max_hp, " / ", "");
  setBar("mpBar", "mpVal", p.mp, p.max_mp, " / ", "");
  setBar("xpBar", "xpVal", p.xp, p.xp_to_next, " / ", " XP");
}

function setBar(barId, valId, val, max, sep, suffix) {
  const pct = Math.min(100, Math.floor((val / max) * 100));
  document.getElementById(barId).style.width = pct + "%";
  document.getElementById(valId).textContent = `${val}${sep}${max}${suffix}`;
}

function renderStats(p) {
  const grid  = document.getElementById("statGrid");
  const label = document.getElementById("statPtsLabel");
  label.textContent = p.stat_points > 0 ? `· ${p.stat_points} points available` : "";
  grid.innerHTML = Object.entries(p.stats).map(([stat, val]) => `
    <div class="stat-card">
      <div class="stat-left">
        <div class="stat-icon">${STAT_ICONS[stat]}</div>
        <div>
          <div class="stat-name">${stat}</div>
          <div class="stat-val" style="color:${STAT_COLORS[stat]}">${val}</div>
        </div>
      </div>
      ${p.stat_points > 0 ? `<button class="btn-alloc" onclick="allocateStat('${stat}')">+</button>` : ""}
    </div>
  `).join("");
}

function renderQuests(p) {
  document.getElementById("questList").innerHTML = p.quests.map(q => `
    <div class="quest-item ${q.done ? "done" : ""}">
      <div class="quest-info">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-xp">+${q.xp} EXP</div>
      </div>
      ${q.done ? `<div class="check-icon">✓</div>` : `<button class="btn-claim" onclick="completeQuest(${q.id})">CLAIM</button>`}
    </div>
  `).join("");
}

function renderSkills(p) {
  document.getElementById("skillList").innerHTML = p.skills.map(s => `
    <div class="skill-item ${s.unlocked ? "unlocked" : ""}">
      <div class="skill-icon">${s.icon}</div>
      <div class="skill-info">
        <div class="skill-header">
          <span class="skill-name">${s.name}</span>
          <span class="skill-type type-${s.type}">${s.type}</span>
        </div>
        <div class="skill-desc">${s.desc}</div>
      </div>
      ${s.unlocked ? `<div class="skill-active">✦ ACTIVE</div>` : `<div class="skill-req">LV ${s.req}</div>`}
    </div>
  `).join("");
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function completeQuest(questId) {
  try {
    const res  = await fetch(`${API_BASE}/complete-quest/${questId}`, { method: "POST", credentials: "include" });
    const data = await res.json();
    if (!res.ok) { showNotif(data.error, "info"); return; }
    showNotif(`✦ ${data.message}`, "success");
    if (data.leveled_up) showLevelUp(data.player.level);
    renderAll(data.player);
  } catch (err) { console.error(err); }
}

async function resetQuests() {
  try {
    const res  = await fetch(`${API_BASE}/reset-quests`, { method: "POST", credentials: "include" });
    const data = await res.json();
    showNotif("◆ Daily quests reset.", "info");
    renderAll(data.player);
  } catch (err) { console.error(err); }
}

async function allocateStat(stat) {
  try {
    const res  = await fetch(`${API_BASE}/allocate-stat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ stat })
    });
    const data = await res.json();
    if (!res.ok) { showNotif(data.error, "info"); return; }
    showNotif(`▲ ${data.message}`, "stat");
    renderAll(data.player);
  } catch (err) { console.error(err); }
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
}

function showLevelUp(level) {
  document.getElementById("overlayLevel").textContent = level;
  document.getElementById("levelUpOverlay").classList.remove("hidden");
}

function closeLevelUp() {
  document.getElementById("levelUpOverlay").classList.add("hidden");
}

function showNotif(msg, type = "info") {
  const div = document.createElement("div");
  div.className   = `notif notif-${type}`;
  div.textContent = msg;
  document.getElementById("notifContainer").appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// Allow pressing Enter key to login
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !document.getElementById("loginScreen").classList.contains("hidden")) {
    login();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
fetchPlayer();