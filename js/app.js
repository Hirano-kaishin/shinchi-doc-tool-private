/* ---------- data ---------- */
const crumbMap = {
    dash: "トップ",
    projects: "案件一覧",
    upload: "図面アップロード",
    sekou: "書類作成 › 施工計画書",
    koutei: "書類作成 › 工程管理表",
    hinshitsu: "書類作成 › 品質管理計画書",
    anzen: "安全衛生管理計画書",
    saigai: "災害防止協議会資料",
    staff: "マスタ管理 › 社員名簿",
    company: "マスタ管理 › 企業情報登録",
    orderer: "マスタ管理 › 発注者情報登録",
};

const docViews = {
    sekou: "施工計画書",
    koutei: "工程管理表",
    hinshitsu: "品質管理計画書",
    anzen: "安全衛生管理計画書",
    saigai: "災害防止協議会資料",
};

const projects = [
    {
        id: "DS-2603",
        name: "DS千葉袖ヶ浦下泉 太陽光発電所建設工事",
        place: "千葉県袖ケ浦市下泉",
        period: "2026/04〜2026/09",
        status: "作成中",
        tag: "y",
        type: "private_solar",
    },
    {
        id: "KB-2409",
        name: "小林松ケ尾 太陽光発電所建設工事",
        place: "宮崎県小林市松ケ尾",
        period: "2024/09〜2025/03",
        status: "完了",
        tag: "g",
        type: "public",
    },
    {
        id: "MY-2512",
        name: "都城太陽光 第2期 造成工事",
        place: "宮崎県都城市",
        period: "2025/12〜2026/06",
        status: "完了",
        tag: "g",
        type: "private_solar",
    },
];

const projectTypeLabel = {
    public: "公共工事",
    private_solar: "民間（太陽光）",
    private_other: "民間（一般）",
};

const ordererTypeLabel = {
    private: "民間企業",
    public_miyazaki: "公共（宮崎県）",
    public_miyakonojo: "公共（都城市）",
    public_other: "公共（その他）",
};

const sections = [
    { t: "表紙", s: "ok" },
    { t: "工事概要", s: "ok" },
    { t: "工事内容", s: "ok" },
    { t: "施工場所", s: "ok" },
    { t: "計画工程表", s: "ok" },
    { t: "現場組織票", s: "ok" },
    { t: "施工体系図", s: "ok" },
    { t: "使用機械", s: "ok" },
    { t: "施工方法", s: "ok" },
    { t: "防災対策", s: "ok" },
    { t: "防災対策②", s: "ok" },
    { t: "防災対策中止基準", s: "ok" },
    { t: "施工管理計画", s: "edit" },
    { t: "交通管理", s: "edit" },
    { t: "現場環境対策", s: "todo" },
    { t: "中止基準", s: "todo" },
];

const stIcon = {
    ok: '<span style="color:var(--ok)">●</span>',
    edit: '<span style="color:var(--warn)">◑</span>',
    todo: '<span style="color:var(--muted2)">○</span>',
};

const defaultScheduleTasks = [
    ["準備工・片付け", "式", "1", [["done", 0, 1]], 100],
    [
        "土工（切土・畦畔）",
        "m²",
        "—",
        [
            ["done", 0, 1],
            ["now", 1, 1],
        ],
        55,
    ],
    ["排水路工", "m", "—", [["plan", 1, 2]], 0],
    ["スクリュー杭", "本", "—", [["plan", 2, 2]], 0],
    ["架台・パネル設置", "区画", "9", [["plan", 3, 2]], 0],
    ["蓄電池基礎・設置", "区画", "9", [["plan", 4, 2]], 0],
];

const API_BASE = (
    window.SD_API_BASE ||
    (window.location.protocol === "file:"
        ? "http://127.0.0.1:5000"
        : window.location.origin)
).replace(/\/$/, "");
const CLIENT_STATE_KEY = "shinchiDocToolStateV2";

/* ---------- state ---------- */
let currentSekouSection = 0;
let pendingDeleteProjectId = "";
let pendingDeleteDocView = "";
let ft;

const selectedProjectByDoc = {
    sekou: "",
    koutei: "",
    hinshitsu: "",
    anzen: "",
    saigai: "",
};

const docFlowState = { sekou: {}, koutei: {} };
const projectScheduleState = {};
const companyMaster = {
    name: "株式会社 新地建設工業",
    representative: "新地 太郎",
    address: "宮崎県都城市...",
    tel: "000-0000-0000",
    standardText:
        "当社は安全・品質・工程管理を徹底し、関係法令と発注者要求に基づいて施工します。",
};
let ordererMasters = [
    {
        id: "ord-public-miyazaki",
        type: "public_miyazaki",
        name: "宮崎県 県土整備部",
        dept: "道路保全課",
        code: "任意入力",
        specFiles: "仕様書.pdf, 管理基準.xlsx",
        manualRules:
            "例）品質管理基準、段階確認ルール、提出書類様式、工程管理ルールを手入力で追記。",
    },
    {
        id: "ord-private-sample",
        type: "private",
        name: "民間発注者（サンプル）",
        dept: "工事管理部",
        code: "PVT-001",
        specFiles: "民間仕様.pdf",
        manualRules:
            "安全・品質・工程の報告様式は発注者指定フォーマットを優先。",
    },
];
const projectOrdererMap = {
    "DS-2603": "ord-private-sample",
    "KB-2409": "ord-public-miyazaki",
    "MY-2512": "ord-private-sample",
};
const ordererSpecFileMap = {};

/* ---------- utils ---------- */
function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeText(text, max = 120) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);
}

function cloneScheduleTasks(tasks) {
    return tasks.map((t) => [
        t[0],
        t[1],
        t[2],
        (t[3] || []).map((b) => [b[0], b[1], b[2]]),
        Number(t[4] || 0),
    ]);
}

function getScheduleTasks(projectId) {
    if (!projectId) return cloneScheduleTasks(defaultScheduleTasks);
    if (!projectScheduleState[projectId]) {
        projectScheduleState[projectId] =
            cloneScheduleTasks(defaultScheduleTasks);
    }
    return projectScheduleState[projectId];
}

function saveClientState() {
    try {
        localStorage.setItem(
            CLIENT_STATE_KEY,
            JSON.stringify({
                selectedProjectByDoc,
                docFlowState,
                projectScheduleState,
                currentSekouSection,
                companyMaster,
                ordererMasters,
                projectOrdererMap,
                ordererSpecFileMap,
            }),
        );
    } catch (_e) {
        // ignore
    }
}

function loadClientState() {
    try {
        const raw = localStorage.getItem(CLIENT_STATE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (state.selectedProjectByDoc) {
            Object.keys(selectedProjectByDoc).forEach((k) => {
                if (typeof state.selectedProjectByDoc[k] === "string") {
                    selectedProjectByDoc[k] = state.selectedProjectByDoc[k];
                }
            });
        }
        if (state.docFlowState) {
            if (state.docFlowState.sekou) {
                Object.assign(docFlowState.sekou, state.docFlowState.sekou);
            }
            if (state.docFlowState.koutei) {
                Object.assign(docFlowState.koutei, state.docFlowState.koutei);
            }
        }
        if (state.projectScheduleState) {
            Object.keys(state.projectScheduleState).forEach((pid) => {
                if (Array.isArray(state.projectScheduleState[pid])) {
                    projectScheduleState[pid] = cloneScheduleTasks(
                        state.projectScheduleState[pid],
                    );
                }
            });
        }
        if (Number.isInteger(state.currentSekouSection)) {
            currentSekouSection = Math.max(
                0,
                Math.min(sections.length - 1, state.currentSekouSection),
            );
        }
        if (state.companyMaster && typeof state.companyMaster === "object") {
            companyMaster.name = state.companyMaster.name || companyMaster.name;
            companyMaster.representative =
                state.companyMaster.representative ||
                companyMaster.representative;
            companyMaster.address =
                state.companyMaster.address || companyMaster.address;
            companyMaster.tel = state.companyMaster.tel || companyMaster.tel;
            companyMaster.standardText =
                state.companyMaster.standardText || companyMaster.standardText;
        }
        if (Array.isArray(state.ordererMasters)) {
            ordererMasters = state.ordererMasters
                .filter((o) => o && o.id && o.name)
                .map((o) => ({
                    id: String(o.id),
                    type: String(o.type || "private"),
                    name: String(o.name || ""),
                    dept: String(o.dept || ""),
                    code: String(o.code || ""),
                    specFiles: String(o.specFiles || ""),
                    manualRules: String(o.manualRules || ""),
                }));
        }
        if (
            state.projectOrdererMap &&
            typeof state.projectOrdererMap === "object"
        ) {
            Object.keys(state.projectOrdererMap).forEach((pid) => {
                projectOrdererMap[pid] = String(
                    state.projectOrdererMap[pid] || "",
                );
            });
        }
        if (
            state.ordererSpecFileMap &&
            typeof state.ordererSpecFileMap === "object"
        ) {
            Object.keys(state.ordererSpecFileMap).forEach((oid) => {
                if (Array.isArray(state.ordererSpecFileMap[oid])) {
                    ordererSpecFileMap[oid] = state.ordererSpecFileMap[oid]
                        .filter((f) => f && f.id)
                        .map((f) => ({
                            id: String(f.id),
                            originalName: String(f.originalName || ""),
                            storedName: String(f.storedName || ""),
                            relativePath: String(f.relativePath || ""),
                            size: Number(f.size || 0),
                            uploadedAt: String(f.uploadedAt || ""),
                        }));
                }
            });
        }
    } catch (_e) {
        // ignore
    }
}

function currentEditingOrdererId() {
    const id = document.getElementById("ordererEditId");
    return (id && id.value) || "";
}

function ordererSpecFilesToText(ordererId) {
    const files = ordererSpecFileMap[ordererId] || [];
    if (!files.length) return "";
    return files
        .map((f) => f.originalName)
        .join(", ")
        .slice(0, 220);
}

function renderOrdererSpecFileList(ordererId) {
    const list = document.getElementById("ordererSpecFileList");
    if (!list) return;
    const files = ordererId ? ordererSpecFileMap[ordererId] || [] : [];
    if (!files.length) {
        list.innerHTML =
            '<span style="color:var(--muted)">アップロード済みファイルはありません</span>';
        return;
    }
    list.innerHTML = files
        .map(
            (f) =>
                `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed var(--line)"><span>${escapeHtml(f.originalName)} <span style="color:var(--muted)">(${Math.max(1, Math.round(Number(f.size || 0) / 1024))}KB)</span></span><button class="btn ghost sm" type="button" onclick="deleteOrdererSpecFile('${ordererId}','${f.id}')">削除</button></div>`,
        )
        .join("");
}

async function fetchOrdererSpecFiles(ordererId) {
    if (!ordererId) {
        renderOrdererSpecFileList("");
        return;
    }
    try {
        const r = await fetch(
            API_BASE +
                "/api/orderers/" +
                encodeURIComponent(ordererId) +
                "/spec-files",
        );
        if (!r.ok) throw new Error("list_failed");
        const data = await r.json();
        ordererSpecFileMap[ordererId] = Array.isArray(data.items)
            ? data.items
            : [];
    } catch (_e) {
        // Fall back to local cached list if API is unavailable.
        if (!ordererSpecFileMap[ordererId]) ordererSpecFileMap[ordererId] = [];
    }

    const specText = document.getElementById("ordererSpecFiles");
    if (specText && currentEditingOrdererId() === ordererId) {
        specText.value = ordererSpecFilesToText(ordererId);
    }
    renderOrdererSpecFileList(ordererId);
    saveClientState();
}

function openOrdererSpecFilePicker() {
    const ordererId = currentEditingOrdererId();
    if (!ordererId) {
        flash("先に発注者条件を保存してください");
        return;
    }
    const input = document.getElementById("ordererSpecFileInput");
    if (!input) return;
    input.click();
}

async function uploadOrdererSpecFiles(fileList) {
    const ordererId = currentEditingOrdererId();
    if (!ordererId) {
        flash("先に発注者条件を保存してください");
        return;
    }
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    try {
        const r = await fetch(
            API_BASE +
                "/api/orderers/" +
                encodeURIComponent(ordererId) +
                "/spec-files",
            { method: "POST", body: form },
        );
        if (!r.ok) throw new Error("upload_failed");
        const data = await r.json();
        const existing = ordererSpecFileMap[ordererId] || [];
        ordererSpecFileMap[ordererId] = existing.concat(data.items || []);

        const specText = document.getElementById("ordererSpecFiles");
        if (specText) specText.value = ordererSpecFilesToText(ordererId);
        const idx = ordererMasters.findIndex((o) => o.id === ordererId);
        if (idx >= 0)
            ordererMasters[idx].specFiles = ordererSpecFilesToText(ordererId);

        renderOrdererSpecFileList(ordererId);
        renderOrdererMasterList();
        saveClientState();
        flash("条件ファイルを保存しました");
    } catch (_e) {
        flash("条件ファイルの保存に失敗しました（API起動を確認）");
    } finally {
        const input = document.getElementById("ordererSpecFileInput");
        if (input) input.value = "";
    }
}

async function deleteOrdererSpecFile(ordererId, fileId) {
    if (!ordererId || !fileId) return;
    try {
        const r = await fetch(
            API_BASE +
                "/api/orderers/" +
                encodeURIComponent(ordererId) +
                "/spec-files/" +
                encodeURIComponent(fileId),
            { method: "DELETE" },
        );
        if (!r.ok) throw new Error("delete_failed");

        ordererSpecFileMap[ordererId] = (
            ordererSpecFileMap[ordererId] || []
        ).filter((f) => f.id !== fileId);
        const specText = document.getElementById("ordererSpecFiles");
        if (specText) specText.value = ordererSpecFilesToText(ordererId);

        const idx = ordererMasters.findIndex((o) => o.id === ordererId);
        if (idx >= 0)
            ordererMasters[idx].specFiles = ordererSpecFilesToText(ordererId);

        renderOrdererSpecFileList(ordererId);
        renderOrdererMasterList();
        saveClientState();
        flash("条件ファイルを削除しました");
    } catch (_e) {
        flash("条件ファイルの削除に失敗しました");
    }
}

function flash(msg) {
    const f = document.getElementById("saveflash");
    const t = document.getElementById("saveflashtxt");
    if (!f || !t) return;
    t.textContent = msg;
    f.classList.add("on");
    clearTimeout(ft);
    ft = setTimeout(() => f.classList.remove("on"), 2200);
}

function isDocView(v) {
    return Object.prototype.hasOwnProperty.call(docViews, v);
}

function hasProject(projectId) {
    return projects.some((p) => p.id === projectId);
}

function getProjectById(id) {
    return projects.find((p) => p.id === id) || projects[0] || null;
}

function getOrdererById(id) {
    return ordererMasters.find((o) => o.id === id) || null;
}

function getProjectOrderer(projectId) {
    const ordererId = projectOrdererMap[projectId] || "";
    return getOrdererById(ordererId);
}

function getCurrentTopProjectId() {
    const sel = document.getElementById("dashProjectSelect");
    if (sel && sel.value) return sel.value;
    return (projects[0] && projects[0].id) || "";
}

function renderCompanyMasterFields() {
    const name = document.getElementById("companyName");
    const rep = document.getElementById("companyRepresentative");
    const address = document.getElementById("companyAddress");
    const tel = document.getElementById("companyTel");
    const standard = document.getElementById("companyStandardText");
    if (name) name.value = companyMaster.name;
    if (rep) rep.value = companyMaster.representative;
    if (address) address.value = companyMaster.address;
    if (tel) tel.value = companyMaster.tel;
    if (standard) standard.value = companyMaster.standardText;
}

function saveCompanyMaster() {
    const name = document.getElementById("companyName");
    const rep = document.getElementById("companyRepresentative");
    const address = document.getElementById("companyAddress");
    const tel = document.getElementById("companyTel");
    const standard = document.getElementById("companyStandardText");
    companyMaster.name = normalizeText(name && name.value, 120);
    companyMaster.representative = normalizeText(rep && rep.value, 80);
    companyMaster.address = normalizeText(address && address.value, 160);
    companyMaster.tel = normalizeText(tel && tel.value, 40);
    companyMaster.standardText = normalizeText(standard && standard.value, 400);
    saveClientState();
    flash("企業情報を保存しました");
}

function clearOrdererForm() {
    const id = document.getElementById("ordererEditId");
    const type = document.getElementById("ordererType");
    const name = document.getElementById("ordererName");
    const dept = document.getElementById("ordererDept");
    const code = document.getElementById("ordererCode");
    const specFiles = document.getElementById("ordererSpecFiles");
    const rules = document.getElementById("ordererManualRules");
    if (id) id.value = "";
    if (type) type.value = "private";
    if (name) name.value = "";
    if (dept) dept.value = "";
    if (code) code.value = "";
    if (specFiles) specFiles.value = "";
    if (rules) rules.value = "";
    renderOrdererSpecFileList("");
}

function editOrdererMaster(ordererId) {
    const orderer = getOrdererById(ordererId);
    if (!orderer) return;
    const id = document.getElementById("ordererEditId");
    const type = document.getElementById("ordererType");
    const name = document.getElementById("ordererName");
    const dept = document.getElementById("ordererDept");
    const code = document.getElementById("ordererCode");
    const specFiles = document.getElementById("ordererSpecFiles");
    const rules = document.getElementById("ordererManualRules");
    if (id) id.value = orderer.id;
    if (type) type.value = orderer.type;
    if (name) name.value = orderer.name;
    if (dept) dept.value = orderer.dept;
    if (code) code.value = orderer.code;
    if (specFiles) specFiles.value = orderer.specFiles || "";
    if (rules) rules.value = orderer.manualRules;
    fetchOrdererSpecFiles(ordererId);
}

function removeOrdererMaster(ordererId) {
    ordererMasters = ordererMasters.filter((o) => o.id !== ordererId);
    Object.keys(projectOrdererMap).forEach((pid) => {
        if (projectOrdererMap[pid] === ordererId) projectOrdererMap[pid] = "";
    });
    renderOrdererMasterList();
    refreshOrdererSelects();
    delete ordererSpecFileMap[ordererId];
    renderOrdererSpecFileList("");
    saveClientState();
    flash("発注者条件を削除しました");
}

function saveOrdererMaster() {
    const editId = document.getElementById("ordererEditId");
    const type = document.getElementById("ordererType");
    const name = document.getElementById("ordererName");
    const dept = document.getElementById("ordererDept");
    const code = document.getElementById("ordererCode");
    const specFiles = document.getElementById("ordererSpecFiles");
    const rules = document.getElementById("ordererManualRules");

    const payload = {
        id:
            (editId && editId.value) ||
            "ord-" +
                Date.now().toString(36) +
                "-" +
                Math.random().toString(36).slice(2, 6),
        type: (type && type.value) || "private",
        name: normalizeText(name && name.value, 120),
        dept: normalizeText(dept && dept.value, 120),
        code: normalizeText(code && code.value, 80),
        specFiles: normalizeText(specFiles && specFiles.value, 220),
        manualRules: normalizeText(rules && rules.value, 500),
    };

    if (!payload.name) {
        flash("発注者名を入力してください");
        return;
    }

    const idx = ordererMasters.findIndex((o) => o.id === payload.id);
    if (idx >= 0) ordererMasters[idx] = payload;
    else ordererMasters.unshift(payload);

    if (!ordererSpecFileMap[payload.id]) ordererSpecFileMap[payload.id] = [];
    payload.specFiles = ordererSpecFilesToText(payload.id) || payload.specFiles;
    const idNode = document.getElementById("ordererEditId");
    if (idNode) idNode.value = payload.id;

    renderOrdererMasterList();
    refreshOrdererSelects();
    fetchOrdererSpecFiles(payload.id);
    saveClientState();
    flash("発注者条件を保存しました");
}

function renderOrdererMasterList() {
    const body = document.getElementById("ordererBody");
    if (!body) return;
    if (!ordererMasters.length) {
        body.innerHTML =
            '<tr><td colspan="7" class="mini" style="padding:16px;color:var(--muted)">発注者条件は未登録です</td></tr>';
        return;
    }
    body.innerHTML = ordererMasters
        .map(
            (o) => `<tr>
      <td><b>${escapeHtml(o.name)}</b></td>
      <td><span class="pill">${escapeHtml(ordererTypeLabel[o.type] || "民間企業")}</span></td>
      <td>${escapeHtml(o.dept || "-")}</td>
      <td>${escapeHtml(o.code || "-")}</td>
      <td class="mini">${escapeHtml(normalizeText(o.manualRules || "-", 46))}</td>
            <td class="mini">${escapeHtml(normalizeText(o.specFiles || "-", 34))}</td>
      <td style="display:flex;gap:8px"><button class="btn ghost sm" onclick="editOrdererMaster('${o.id}')">編集</button><button class="btn ghost sm" style="color:#b42318;border-color:#f3d1cc" onclick="removeOrdererMaster('${o.id}')">削除</button></td>
    </tr>`,
        )
        .join("");
}

function refreshOrdererSelects() {
    const options =
        '<option value="">発注者条件を選択してください</option>' +
        ordererMasters
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}（${escapeHtml(ordererTypeLabel[o.type] || "民間企業")}）</option>`,
            )
            .join("");

    const topSel = document.getElementById("projectOrdererSelect");
    if (topSel) {
        const pid = getCurrentTopProjectId();
        const selected = (pid && projectOrdererMap[pid]) || "";
        topSel.innerHTML = options;
        topSel.value = selected;
    }

    const upSel = document.getElementById("uploadOrdererSelect");
    if (upSel) {
        const selected = upSel.value;
        upSel.innerHTML = options;
        upSel.value = selected || "";
    }
}

function applyProjectOrdererFromTop() {
    const pid = getCurrentTopProjectId();
    const sel = document.getElementById("projectOrdererSelect");
    if (!pid || !sel) {
        flash("先に工事を選択してください");
        return;
    }
    projectOrdererMap[pid] = sel.value || "";
    saveClientState();
    renderDashboardProjectList();
    renderDashboard(pid);
    flash("発注者条件を工事に適用しました");
}

function currentProjectIdForDoc(v) {
    if (selectedProjectByDoc[v]) return selectedProjectByDoc[v];
    return (projects[0] && projects[0].id) || "";
}

function statusKey(projectId) {
    return String(projectId || "").replace("-", "");
}

function getFlowState(v, projectId) {
    if (!projectId) return null;
    if (!docFlowState[v][projectId]) {
        docFlowState[v][projectId] =
            v === "sekou"
                ? { createdSections: {}, confirmedSections: {} }
                : { linked: false, confirmed: false };
    }
    return docFlowState[v][projectId];
}

function sekouCreated(projectId, sectionTitle) {
    const state = getFlowState("sekou", projectId);
    return !!(state && state.createdSections[sectionTitle]);
}

function sekouConfirmed(projectId, sectionTitle) {
    const state = getFlowState("sekou", projectId);
    return !!(state && state.confirmedSections[sectionTitle]);
}

function sekouConfirmedCount(projectId) {
    const state = getFlowState("sekou", projectId);
    return state ? Object.keys(state.confirmedSections).length : 0;
}

/* ---------- sidebar and view ---------- */
function syncTopProject(v) {
    const node = document.querySelector(".topbar .proj");
    if (!node) return;
    if (v === "upload") {
        node.innerHTML = '<span class="dot"></span>新規工事作成モード';
        return;
    }
    if (!projects.length) {
        node.innerHTML = '<span class="dot"></span>工事データがありません';
        return;
    }
    const selected = isDocView(v) ? selectedProjectByDoc[v] : "";
    const project = getProjectById(selected || projects[0].id);
    if (!project) return;
    node.innerHTML = `<span class="dot"></span>${escapeHtml(project.name)} <span class="mini" style="font-size:10px;color:var(--muted)">(${escapeHtml(projectTypeLabel[project.type] || "工事")})</span>`;
}

function show(v) {
    document.querySelectorAll(".view").forEach((e) => e.classList.remove("on"));
    const target = document.getElementById("v-" + v);
    if (!target) return;
    target.classList.add("on");
    document
        .querySelectorAll(".nav a")
        .forEach((a) => a.classList.toggle("on", a.dataset.view === v));

    const crumb = crumbMap[v] || "";
    const parts = crumb.split(" › ");
    document.getElementById("crumb").innerHTML = parts
        .map((s, i) => (i === parts.length - 1 ? "<b>" + s + "</b>" : s))
        .join(" › ");

    if (v === "sekou") {
        renderSecNav(currentSekouSection);
        document.getElementById("secBody").innerHTML =
            secContent(currentSekouSection);
        updateSekouProgressBadge();
    }
    if (v === "koutei") {
        renderKouteiGantt(currentProjectIdForDoc("koutei"));
        updateKouteiFlowStatus();
    }
    if (v === "upload") {
        resetUploadForm();
    }

    syncTopProject(v);
    window.scrollTo(0, 0);
}

function resetUploadForm() {
    const projectName = document.getElementById("uploadProjectName");
    const projectPlace = document.getElementById("uploadProjectPlace");
    const projectStart = document.getElementById("uploadProjectStart");
    const projectEnd = document.getElementById("uploadProjectEnd");
    const majorWorks = document.getElementById("uploadMajorWorks");
    const ordererSelect = document.getElementById("uploadOrdererSelect");
    const fileInput = document.getElementById("ordererSpecFileInput");

    if (projectName) projectName.value = "";
    if (projectPlace) projectPlace.value = "";
    if (projectStart) projectStart.value = "";
    if (projectEnd) projectEnd.value = "";
    if (majorWorks) majorWorks.value = "";
    if (ordererSelect) ordererSelect.value = "";
    if (fileInput) fileInput.value = "";
}

/* ---------- dashboard ---------- */
const dashDocDefs = [
    { view: "sekou", name: "施工計画書", meta: "16項目" },
    { view: "koutei", name: "工程管理表", meta: "新地 進捗基準" },
    { view: "hinshitsu", name: "品質管理計画書", meta: "ひな形あり" },
    { view: "anzen", name: "安全衛生管理計画書", meta: "図面連動" },
    { view: "saigai", name: "災害防止協議会資料", meta: "月次資料" },
];

const dashStatusMap = {
    DS2603: {
        sekou: [0, "未着手", "gray"],
        koutei: [0, "未着手", "gray"],
        hinshitsu: [100, "確認待ち", "g"],
        anzen: [40, "作成中", "y"],
        saigai: [25, "未着手", "gray"],
    },
    KB2409: {
        sekou: [100, "完了", "g"],
        koutei: [100, "完了", "g"],
        hinshitsu: [100, "完了", "g"],
        anzen: [100, "完了", "g"],
        saigai: [100, "完了", "g"],
    },
    MY2512: {
        sekou: [100, "完了", "g"],
        koutei: [100, "完了", "g"],
        hinshitsu: [100, "完了", "g"],
        anzen: [100, "完了", "g"],
        saigai: [100, "完了", "g"],
    },
};

function statusFromPercent(pct) {
    if (pct >= 100) return ["完了", "g"];
    if (pct > 0) return ["作成中", "y"];
    return ["未着手", "gray"];
}

function updateDashStatusFromFlow(projectId) {
    if (!projectId) return;
    const key = statusKey(projectId);
    if (!dashStatusMap[key]) {
        dashStatusMap[key] = {
            sekou: [0, "未着手", "gray"],
            koutei: [0, "未着手", "gray"],
            hinshitsu: [0, "未着手", "gray"],
            anzen: [0, "未着手", "gray"],
            saigai: [0, "未着手", "gray"],
        };
    }

    const sekouPct = Math.round(
        (sekouConfirmedCount(projectId) / sections.length) * 100,
    );
    const [sLabel, sTag] = statusFromPercent(sekouPct);
    dashStatusMap[key].sekou = [sekouPct, sLabel, sTag];

    const kState = getFlowState("koutei", projectId) || {
        linked: false,
        confirmed: false,
    };
    const kPct = kState.confirmed ? 100 : kState.linked ? 60 : 0;
    const [kLabel, kTag] = statusFromPercent(kPct);
    dashStatusMap[key].koutei = [kPct, kLabel, kTag];

    const sel = document.getElementById("dashProjectSelect");
    if (sel && sel.value === projectId) renderDashboard(projectId);
}

function calcScheduleRows(projectId) {
    const tasks = getScheduleTasks(projectId).slice(0, 6);
    return tasks.map((t) => {
        const actual = Number(t[4] || 0);
        const plan = Math.min(100, actual === 0 ? 20 : actual + 10);
        return { name: t[0], plan, actual, diff: actual - plan };
    });
}

function calcOverall(rows) {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((a, r) => a + r.actual, 0) / rows.length);
}

function setDashboardState(hasSelection) {
    const empty = document.getElementById("dashEmptyState");
    const detail = document.getElementById("dashDetailArea");
    if (empty) empty.style.display = hasSelection ? "none" : "block";
    if (detail) detail.style.display = hasSelection ? "block" : "none";
}

function renderDashboardProjectList() {
    const body = document.getElementById("topProjectTableBody");
    if (!body) return;
    if (!projects.length) {
        body.innerHTML =
            '<tr><td colspan="7" class="mini" style="padding:16px;color:var(--muted)">工事がありません</td></tr>';
        return;
    }

    body.innerHTML = projects
        .map((p) => {
            const orderer = getProjectOrderer(p.id);
            const ordererLabel = orderer
                ? `${orderer.name}（${ordererTypeLabel[orderer.type] || "民間企業"}）`
                : "未設定";
            return `<tr>
      <td><b>${escapeHtml(p.name)}</b><div class="mini">${escapeHtml(p.id)}</div></td>
      <td><span class="pill">${escapeHtml(projectTypeLabel[p.type] || "工事")}</span></td>
      <td>${escapeHtml(ordererLabel)}</td>
      <td>${escapeHtml(p.place)}</td>
      <td>${escapeHtml(p.period)}</td>
      <td><span class="tag ${p.tag}">${escapeHtml(p.status)}</span></td>
      <td><button class="btn primary sm" onclick="quickSelectDashboardProject('${p.id}')">この工事を選択</button></td>
    </tr>`;
        })
        .join("");
}

function quickSelectDashboardProject(projectId) {
    const sel = document.getElementById("dashProjectSelect");
    if (!sel) return;
    sel.value = projectId;
    renderDashboard(projectId);
    refreshOrdererSelects();
}

function renderDashboard(projectId) {
    if (!projectId) {
        setDashboardState(false);
        return;
    }
    const project = getProjectById(projectId);
    if (!project) {
        setDashboardState(false);
        return;
    }

    setDashboardState(true);
    const key = statusKey(projectId);
    const state = dashStatusMap[key] || dashStatusMap.DS2603;

    const body = document.getElementById("dashDocStatusBody");
    if (body) {
        body.innerHTML = dashDocDefs
            .map((d) => {
                const row = state[d.view] || [0, "未着手", "gray"];
                return `<tr>
          <td><b>${d.name}</b><div class="mini">${d.meta}</div></td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="flex:1"><i style="width:${row[0]}%"></i></div><span class="mini">${row[0]}%</span></div></td>
          <td><span class="tag ${row[2]}">${row[1]}</span></td>
          <td><button class="btn ghost sm" onclick="openDocFromDashboard('${d.view}')">開く</button></td>
        </tr>`;
            })
            .join("");
    }

    const summary = document.getElementById("topProjectSummary");
    if (summary) {
        const orderer = getProjectOrderer(projectId);
        const ordererText = orderer
            ? `${orderer.name} / ${ordererTypeLabel[orderer.type] || "民間企業"}`
            : "発注者条件 未設定";
        summary.textContent = ` 選択中：${project.name}（${project.period}） / ${ordererText}`;
    }

    const projectOrdererSelect = document.getElementById(
        "projectOrdererSelect",
    );
    if (projectOrdererSelect) {
        projectOrdererSelect.value = projectOrdererMap[projectId] || "";
    }
}

function initDashboard() {
    const sel = document.getElementById("dashProjectSelect");
    if (!sel) return;
    sel.innerHTML =
        '<option value="">工事名を選択してください</option>' +
        projects
            .map(
                (p) =>
                    `<option value="${p.id}">${escapeHtml(p.name)}（${escapeHtml(projectTypeLabel[p.type] || "工事")}）</option>`,
            )
            .join("");
    sel.addEventListener("change", () => renderDashboard(sel.value));
    renderDashboardProjectList();
    const initial = sel.value || (projects[0] && projects[0].id) || "";
    if (initial) sel.value = initial;
    refreshOrdererSelects();
    renderDashboard(initial);
}

function openDocFromDashboard(view) {
    const sel = document.getElementById("dashProjectSelect");
    const pid =
        (sel && sel.value) ||
        currentProjectIdForDoc("sekou") ||
        (projects[0] && projects[0].id) ||
        "";
    if (!pid) {
        flash("先に工事を選択してください");
        return;
    }
    show(view);
    openDocForProject(view, pid);
}

/* ---------- staff ---------- */
const staff = [
    [
        "坂下 豪",
        "現場代理人 / 主任技術者",
        ["1級土木施工管理技士", "車両系建設機械", "職長・安責者"],
        "g",
        "稼働中",
    ],
    ["新地 一馬", "施工管理", ["2級土木施工管理技士", "玉掛け"], "g", "稼働中"],
    [
        "田中 誠",
        "安全管理 / 巡視員",
        ["職長・安責者", "車両系建設機械"],
        "g",
        "稼働中",
    ],
    [
        "山口 健",
        "重機オペレーター",
        ["車両系建設機械", "小型移動式クレーン", "玉掛け"],
        "g",
        "稼働中",
    ],
    ["紙屋 了誠", "電気工事(協力)", ["第一種電気工事士"], "b", "協力会社"],
    ["大山 直樹", "作業員", ["玉掛け"], "y", "要資格更新"],
];

function renderStaff() {
    const body = document.getElementById("staffBody");
    if (!body) return;
    body.innerHTML = staff
        .map(
            (s) => `<tr>
      <td><b>${s[0]}</b></td><td>${s[1]}</td>
      <td class="qual-tags">${s[2].map((q) => `<span class="chip">${q}</span>`).join("")}</td>
      <td><span class="tag ${s[3]}">${s[4]}</span></td>
      <td><button class="btn ghost sm" onclick="flash('編集（デモ）')">編集</button></td></tr>`,
        )
        .join("");
}

function openStaff() {
    document.getElementById("staffModal").classList.add("on");
}

function closeStaff() {
    document.getElementById("staffModal").classList.remove("on");
}

/* ---------- project picker wrappers ---------- */
function renderDocProjectPicker(v) {
    const picker = document.getElementById("docPicker-" + v);
    if (!picker) return;
    const rows = projects
        .map(
            (p) => `<tr>
      <td><b>${escapeHtml(p.name)}</b><div class="mini">${p.id}</div></td>
      <td><span class="pill">${escapeHtml(projectTypeLabel[p.type] || "工事")}</span></td>
      <td>${escapeHtml(p.place)}</td>
      <td>${escapeHtml(p.period)}</td>
      <td><span class="tag ${p.tag}">${escapeHtml(p.status)}</span></td>
      <td style="display:flex;gap:8px"><button class="btn primary sm" onclick="openDocForProject('${v}','${p.id}')">この工事を開く</button><button class="btn ghost sm" style="color:#b42318;border-color:#f3d1cc" onclick="askDeleteProject('${v}','${p.id}')">削除</button></td>
    </tr>`,
        )
        .join("");

    picker.innerHTML = `
    <div class="pagehead">
      <div>
        <h1 class="page">${docViews[v]}</h1>
        <div class="sub">先に工事名を選択してください。選択後に書類を表示します。</div>
      </div>
    </div>
    <div class="panel"><div class="panel-b" style="padding:0">
      <table>
        <thead><tr><th>工事名</th><th>種別</th><th>施工場所</th><th>工期</th><th>状態</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>
  `;
}

function updateDocView(v) {
    const picker = document.getElementById("docPicker-" + v);
    const body = document.getElementById("docBody-" + v);
    if (!picker || !body) return;
    const selected = selectedProjectByDoc[v];
    picker.style.display = selected ? "none" : "block";
    body.style.display = selected ? "block" : "none";
    if (selected) renderDocPreview(v);
}

function initDocProjectPickers() {
    Object.keys(docViews).forEach((v) => {
        const view = document.getElementById("v-" + v);
        if (!view) return;

        const workspace = document.createElement("div");
        workspace.className = "doc-workspace";

        const main = document.createElement("div");
        main.className = "doc-main";
        main.id = "docMain-" + v;

        const body = document.createElement("div");
        body.id = "docBody-" + v;

        while (view.firstChild) {
            main.appendChild(view.firstChild);
        }

        const preview = document.createElement("aside");
        preview.id = "docPreview-" + v;
        preview.className = "doc-preview";

        workspace.appendChild(main);
        workspace.appendChild(preview);
        body.appendChild(workspace);

        const picker = document.createElement("div");
        picker.id = "docPicker-" + v;

        view.appendChild(picker);
        view.appendChild(body);

        renderDocProjectPicker(v);
        updateDocView(v);
    });
}

function openDocForProject(v, projectId) {
    if (!hasProject(projectId)) {
        flash("対象工事が見つかりません");
        return;
    }
    selectedProjectByDoc[v] = projectId;
    getFlowState(v, projectId);
    updateDocView(v);
    renderDocPreview(v);

    if (v === "sekou") {
        renderSecNav(currentSekouSection);
        document.getElementById("secBody").innerHTML =
            secContent(currentSekouSection);
        updateSekouProgressBadge();
    }
    if (v === "koutei") {
        renderKouteiGantt(projectId);
        updateKouteiFlowStatus();
    }

    updateDashStatusFromFlow(projectId);
    syncTopProject(v);
    saveClientState();
    flash(
        "「" +
            getProjectById(projectId).name +
            "」の" +
            docViews[v] +
            "を開きました",
    );
}

function refreshProjectDependentViews() {
    Object.keys(docViews).forEach((v) => {
        renderDocProjectPicker(v);
        updateDocView(v);
    });

    const sel = document.getElementById("dashProjectSelect");
    if (sel) {
        const current = sel.value;
        sel.innerHTML =
            '<option value="">工事名を選択してください</option>' +
            projects
                .map(
                    (p) =>
                        `<option value="${p.id}">${escapeHtml(p.name)}（${escapeHtml(projectTypeLabel[p.type] || "工事")}）</option>`,
                )
                .join("");
        sel.value = hasProject(current) ? current : "";
        renderDashboard(sel.value);
    }

    renderDashboardProjectList();
    refreshOrdererSelects();
    if (!projects.length) show("dash");
    syncTopProject("dash");
    saveClientState();
}

function askDeleteProject(v, projectId) {
    const modal = document.getElementById("deleteProjectModal");
    const nameNode = document.getElementById("deleteProjectTargetName");
    const p = getProjectById(projectId);
    if (!modal || !nameNode || !p) return;
    pendingDeleteProjectId = projectId;
    pendingDeleteDocView = v;
    nameNode.textContent = p.name;
    modal.classList.add("on");
}

function closeDeleteProjectModal() {
    const modal = document.getElementById("deleteProjectModal");
    if (!modal) return;
    modal.classList.remove("on");
    pendingDeleteProjectId = "";
    pendingDeleteDocView = "";
}

function confirmDeleteProject() {
    if (!pendingDeleteProjectId) return;
    const idx = projects.findIndex((p) => p.id === pendingDeleteProjectId);
    if (idx < 0) {
        closeDeleteProjectModal();
        return;
    }
    const name = projects[idx].name;
    projects.splice(idx, 1);
    Object.keys(selectedProjectByDoc).forEach((k) => {
        if (selectedProjectByDoc[k] === pendingDeleteProjectId)
            selectedProjectByDoc[k] = "";
    });
    delete projectScheduleState[pendingDeleteProjectId];
    delete docFlowState.sekou[pendingDeleteProjectId];
    delete docFlowState.koutei[pendingDeleteProjectId];
    closeDeleteProjectModal();
    refreshProjectDependentViews();
    flash("「" + name + "」を削除しました");
}

/* ---------- sekou sections ---------- */
function updateSekouProgressBadge() {
    const badge = document.getElementById("sekouProgressBadge");
    if (!badge) return;
    const pid = currentProjectIdForDoc("sekou");
    badge.textContent = `完了 ${sekouConfirmedCount(pid)} / ${sections.length} 項目`;
}

function renderSekouFlowActions(sectionTitle) {
    const pid = currentProjectIdForDoc("sekou");
    if (!pid) return "";
    const created = sekouCreated(pid, sectionTitle);
    const confirmed = sekouConfirmed(pid, sectionTitle);
    const stateClass = confirmed
        ? "flow-state done"
        : created
          ? "flow-state edit"
          : "flow-state";
    const stateText = confirmed ? "✓ 決定済み" : created ? "編集中" : "未作成";
    return `<div class="sec-flow-actions">
      <button class="btn ghost sm" onclick="markSekouSectionCreated()">${escapeHtml(sectionTitle)}を作成</button>
      <button class="btn primary sm" onclick="confirmSekouSection()">この内容で決定</button>
      <span class="${stateClass}">${stateText}</span>
      <span class="hinttext">プレビュー確認後、下の入力欄は手修正できます。</span>
    </div>`;
}

function renderSecNav(active) {
    const pid = currentProjectIdForDoc("sekou");
    const nav = document.getElementById("secNav");
    if (!nav) return;
    nav.innerHTML = sections
        .map((s, i) => {
            const icon =
                pid && sekouConfirmed(pid, s.t)
                    ? '<span style="color:var(--ok)">✓</span>'
                    : pid && sekouCreated(pid, s.t)
                      ? '<span style="color:var(--warn)">◑</span>'
                      : stIcon[s.s];
            return `<a class="${i === active ? "on" : ""}" onclick="selSec(${i})"><span class="n">${i + 1}</span>${escapeHtml(s.t)}<span class="st">${icon}</span></a>`;
        })
        .join("");
}

function renderSekouScheduleEditor() {
    const pid = currentProjectIdForDoc("sekou");
    const tasks = getScheduleTasks(pid);
    return `<div class="panel" style="box-shadow:none;border:1px solid var(--line)"><div class="panel-b" style="padding:0"><table>
      <thead><tr><th>工種</th><th>単位</th><th>数量</th><th>進捗(%)</th></tr></thead>
      <tbody>
        ${tasks
            .map(
                (t, i) => `<tr>
              <td><b>${escapeHtml(t[0])}</b></td>
              <td>${escapeHtml(t[1])}</td>
              <td>${escapeHtml(t[2])}</td>
              <td><input type="number" min="0" max="100" value="${Number(t[4] || 0)}" style="width:90px;border:1px solid var(--line);border-radius:6px;padding:4px 7px" onchange="updateScheduleProgress(${i}, this.value)"></td>
            </tr>`,
            )
            .join("")}
      </tbody></table></div></div>`;
}

function secContent(i) {
    const t = sections[i].t;
    const header = `<div class="sbh"><h2>${i + 1}. ${escapeHtml(t)}</h2></div>${renderSekouFlowActions(t)}<div class="gen-note"><span>🤖</span><div><b>図面から生成</b>：下記は契約図から自動作成したたたき台です。青枠に直接入力して修正できます。</div></div>`;

    if (t === "表紙") {
        const pid = currentProjectIdForDoc("sekou");
        const orderer = getProjectOrderer(pid);
        const ordererName = orderer ? orderer.name : "民間発注者";
        return `${header}<div class="grid2">
      <div class="field"><label>工事名</label><input type="text" value="${escapeHtml((getProjectById(currentProjectIdForDoc("sekou")) || {}).name || "")}"></div>
      <div class="field"><label>工事番号</label><input type="text" value="${escapeHtml(currentProjectIdForDoc("sekou"))}"></div>
            <div class="field"><label>発注者</label><input type="text" value="${escapeHtml(ordererName)}"></div>
            <div class="field"><label>受注者</label><input type="text" value="${escapeHtml(companyMaster.name)}"></div>
      <div class="field"><label>提出年月日</label><input type="text" value="令和8年3月19日"></div>
            <div class="field"><label>現場代理人</label><input type="text" value="${escapeHtml(companyMaster.representative)}"></div>
    </div>`;
    }

    if (t === "計画工程表") {
        return `${header}<div class="notice" style="margin-top:0"><span class="i">📐</span><div>ここで作成した工程表を工程管理表へ連携します。</div></div>${renderSekouScheduleEditor()}`;
    }

    return `${header}<div class="field"><label>${escapeHtml(t)} 内容</label><textarea style="min-height:120px">${escapeHtml(t)}の初期案をここで編集できます。</textarea></div>`;
}

function selSec(i) {
    currentSekouSection = i;
    const body = document.getElementById("secBody");
    if (!body) return;
    renderSecNav(i);
    body.innerHTML = secContent(i);
    updateSekouProgressBadge();
    renderDocPreview("sekou");
    saveClientState();
    window.scrollTo(0, 0);
}

function markSekouSectionCreated() {
    const pid = currentProjectIdForDoc("sekou");
    if (!pid) {
        flash("先に工事を選択してください");
        return;
    }
    const title = sections[currentSekouSection].t;
    getFlowState("sekou", pid).createdSections[title] = true;
    updateDashStatusFromFlow(pid);
    renderSecNav(currentSekouSection);
    document.getElementById("secBody").innerHTML =
        secContent(currentSekouSection);
    updateSekouProgressBadge();
    renderDocPreview("sekou");
    saveClientState();
    flash("「" + title + "」のたたき台を作成しました");
}

function confirmSekouSection() {
    const pid = currentProjectIdForDoc("sekou");
    if (!pid) {
        flash("先に工事を選択してください");
        return;
    }
    const title = sections[currentSekouSection].t;
    const state = getFlowState("sekou", pid);
    state.createdSections[title] = true;
    state.confirmedSections[title] = true;
    if (title === "計画工程表") {
        const ks = getFlowState("koutei", pid);
        ks.linked = true;
    }
    updateDashStatusFromFlow(pid);
    renderSecNav(currentSekouSection);
    document.getElementById("secBody").innerHTML =
        secContent(currentSekouSection);
    updateSekouProgressBadge();
    renderDocPreview("sekou");
    saveClientState();
    flash("「" + title + "」を決定しました（✓）");
}

function updateScheduleProgress(index, value) {
    const pid = currentProjectIdForDoc("sekou");
    const tasks = getScheduleTasks(pid);
    if (!tasks[index]) return;
    const pct = Math.max(0, Math.min(100, Number(value || 0)));
    tasks[index][4] = pct;
    tasks[index][3] =
        pct >= 100
            ? [["done", 0, 1]]
            : pct > 0
              ? [["now", 1, 1]]
              : [["plan", 1, 2]];
    renderKouteiGantt(pid);
    renderDocPreview("sekou");
    renderDocPreview("koutei");
    updateDashStatusFromFlow(pid);
    saveClientState();
}

/* ---------- koutei ---------- */
function cellBars(bars) {
    const cells = Array(6).fill("");
    (bars || []).forEach(([type, start, len]) => {
        for (let k = 0; k < len; k++) {
            const idx = start + k;
            if (idx >= 0 && idx < 6) {
                cells[idx] =
                    `<div class="bar ${type === "done" ? "done" : type === "plan" ? "plan" : ""}"></div>`;
            }
        }
    });
    return cells.map((c) => `<td>${c}</td>`).join("");
}

function renderKouteiGantt(projectId) {
    const body = document.getElementById("ganttBody");
    if (!body) return;
    const tasks = getScheduleTasks(
        projectId || currentProjectIdForDoc("koutei"),
    );
    body.innerHTML = tasks
        .map(
            (t) => `<tr>
      <td class="name">${escapeHtml(t[0])}</td><td>${escapeHtml(t[1])}</td><td>${escapeHtml(t[2])}</td>
      ${cellBars(t[3])}
      <td><div style="display:flex;align-items:center;gap:5px"><div class="progress" style="min-width:50px"><i style="width:${Number(t[4] || 0)}%"></i></div><span class="mini">${Number(t[4] || 0)}%</span></div></td></tr>`,
        )
        .join("");
}

function updateKouteiFlowStatus() {
    const node = document.getElementById("kouteiFlowStatus");
    if (!node) return;
    const pid = currentProjectIdForDoc("koutei");
    if (!pid) {
        node.textContent = "未作成";
        node.className = "flow-state";
        return;
    }
    const state = getFlowState("koutei", pid);
    if (state.confirmed) {
        node.textContent = "✓ 決定済み";
        node.className = "flow-state done";
        return;
    }
    if (state.linked) {
        node.textContent = "編集中";
        node.className = "flow-state edit";
        return;
    }
    node.textContent = "未作成";
    node.className = "flow-state";
}

function syncKouteiFromSekou() {
    const pid =
        currentProjectIdForDoc("koutei") || currentProjectIdForDoc("sekou");
    if (!pid) {
        flash("先に工事を選択してください");
        return;
    }
    selectedProjectByDoc.koutei = pid;
    getFlowState("koutei", pid).linked = true;
    renderKouteiGantt(pid);
    updateKouteiFlowStatus();
    updateDashStatusFromFlow(pid);
    renderDocPreview("koutei");
    saveClientState();
    flash("施工計画書の計画工程表を反映しました");
}

function confirmKouteiFlow() {
    const pid = currentProjectIdForDoc("koutei");
    if (!pid) {
        flash("先に工事を選択してください");
        return;
    }
    const state = getFlowState("koutei", pid);
    state.linked = true;
    state.confirmed = true;
    updateKouteiFlowStatus();
    updateDashStatusFromFlow(pid);
    saveClientState();
    flash("工程管理表を決定しました（✓）");
}

/* ---------- preview ---------- */
function collectPreviewRows(v) {
    const rows = [];
    const root = document.querySelector("#v-" + v + " .doc-main");
    if (!root) return rows;
    const fields = [...root.querySelectorAll(".field")].slice(0, 6);
    fields.forEach((f) => {
        const labelNode = f.querySelector("label");
        const input = f.querySelector('input[type="text"], textarea, select');
        if (!labelNode || !input) return;
        rows.push({
            label: normalizeText(labelNode.textContent, 28),
            value: normalizeText(input.value || input.textContent || "", 72),
        });
    });
    return rows;
}

function buildA4Rows(rows) {
    return rows
        .map(
            (r) =>
                `<div class="a4-row"><span>${escapeHtml(r.label)}</span><b>${escapeHtml(r.value)}</b></div>`,
        )
        .join("");
}

function getSchedulePreviewRows(projectId) {
    const tasks = getScheduleTasks(projectId).slice(0, 6);
    return tasks.map((t) => ({
        name: t[0],
        apr: "",
        may: "",
        jun: "",
        jul: "",
        aug: "",
        sep: "",
        progress: String(Number(t[4] || 0)) + "%",
    }));
}

function fillScheduleBars(rows, projectId) {
    const tasks = getScheduleTasks(projectId).slice(0, 6);
    tasks.forEach((task, idx) => {
        const bars = task[3] || [];
        const marks = ["", "", "", "", "", ""];
        bars.forEach(([type, start, len]) => {
            for (let i = 0; i < len; i++) {
                const p = start + i;
                if (p >= 0 && p < 6) {
                    marks[p] =
                        type === "done" ? "■" : type === "now" ? "▮" : "□";
                }
            }
        });
        if (rows[idx]) {
            rows[idx].apr = marks[0];
            rows[idx].may = marks[1];
            rows[idx].jun = marks[2];
            rows[idx].jul = marks[3];
            rows[idx].aug = marks[4];
            rows[idx].sep = marks[5];
        }
    });
    return rows;
}

function buildA3ScheduleTable(projectId) {
    const rows = fillScheduleBars(getSchedulePreviewRows(projectId), projectId);
    if (!rows.length) return "";
    return `<table class="a3-schedule-table">
      <thead><tr><th>工種</th><th>4月</th><th>5月</th><th>6月</th><th>7月</th><th>8月</th><th>9月</th><th>進捗</th></tr></thead>
      <tbody>
      ${rows
          .map(
              (r) =>
                  `<tr><td>${escapeHtml(r.name)}</td><td>${r.apr}</td><td>${r.may}</td><td>${r.jun}</td><td>${r.jul}</td><td>${r.aug}</td><td>${r.sep}</td><td>${escapeHtml(r.progress)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderDocPreview(v) {
    const pane = document.getElementById("docPreview-" + v);
    if (!pane) return;
    const pid = currentProjectIdForDoc(v);
    const project = getProjectById(pid);
    if (!project) {
        pane.innerHTML = "";
        return;
    }

    let html = "";
    if (
        v === "koutei" ||
        (v === "sekou" && sections[currentSekouSection].t === "計画工程表")
    ) {
        html = `<article class="a4-page a3-landscape-page">
      <header class="a4-header excel-head"><span>${escapeHtml(project.name)}</span><span>${escapeHtml(docViews[v])}</span></header>
      <main class="a4-body a3-body"><h3 class="a4-sec-title">${escapeHtml(docViews[v])}</h3>${buildA3ScheduleTable(pid)}</main>
      <footer class="a4-footer"><span>${escapeHtml(project.id)}</span><span>1 / 1</span></footer>
    </article>`;
    } else {
        const baseRows = [
            { label: "工事番号", value: project.id },
            { label: "施工場所", value: project.place },
            { label: "工期", value: project.period },
        ];
        const bodyRows = collectPreviewRows(v);
        html = `<article class="a4-page">
      <header class="a4-header excel-head"><span>${escapeHtml(project.name)}</span><span>${escapeHtml(docViews[v] || "書類")}</span></header>
      <main class="a4-body"><div class="a4-table excel-grid">${buildA4Rows(baseRows.concat(bodyRows))}</div></main>
      <footer class="a4-footer"><span>${escapeHtml(project.id)}</span><span>1 / 1</span></footer>
    </article>`;
    }

    pane.innerHTML = `<div class="preview-card"><div class="preview-h"><span>A4ページプレビュー</span><span class="preview-scale">縮尺 43%</span></div><div class="preview-b preview-sheet-stack">${html}</div></div>`;
}

function bindDocPreviewInteractions() {
    Object.keys(docViews).forEach((v) => {
        const root = document.getElementById("v-" + v);
        if (!root) return;
        const update = () => {
            if (selectedProjectByDoc[v]) renderDocPreview(v);
        };
        root.addEventListener("input", update);
        root.addEventListener("change", update);
    });
}

/* ---------- upload and export ---------- */
function genDocs() {
    const uploadOrderer = document.getElementById("uploadOrdererSelect");
    const selectedOrdererId = (uploadOrderer && uploadOrderer.value) || "";
    const pid = getCurrentTopProjectId();
    if (pid && selectedOrdererId) {
        projectOrdererMap[pid] = selectedOrdererId;
        saveClientState();
        renderDashboardProjectList();
    }

    flash("図面・仕様書から5書類のたたき台を生成しました");
    setTimeout(() => {
        show("sekou");
        if (projects[0]) openDocForProject("sekou", projects[0].id);
    }, 700);
}

async function exportAllZip() {
    const projectId =
        currentProjectIdForDoc("sekou") || currentProjectIdForDoc("koutei");
    const project = getProjectById(projectId);
    if (!project) {
        flash("工事が選択されていません");
        return;
    }

    const payload = {
        project,
        flow: docFlowState,
        schedules: projectScheduleState,
        companyMaster,
        ordererMasters,
        projectOrdererMap,
    };

    try {
        const r = await fetch(API_BASE + "/api/export/zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("export_failed");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (project.id || "project") + "_documents.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        flash("ExcelデータをZIPでダウンロードしました");
    } catch (_e) {
        flash("ZIP出力に失敗しました（API起動を確認）");
    }
}

/* ---------- initialize ---------- */
(function init() {
    loadClientState();

    renderStaff();
    renderCompanyMasterFields();
    renderOrdererMasterList();
    refreshOrdererSelects();
    initDocProjectPickers();
    bindDocPreviewInteractions();
    initDashboard();

    renderSecNav(currentSekouSection);
    const secBody = document.getElementById("secBody");
    if (secBody) secBody.innerHTML = secContent(currentSekouSection);
    updateSekouProgressBadge();

    renderKouteiGantt(currentProjectIdForDoc("koutei"));
    updateKouteiFlowStatus();

    document
        .querySelectorAll(".nav a")
        .forEach((a) =>
            a.addEventListener("click", () => show(a.dataset.view)),
        );

    document.addEventListener("click", (e) => {
        const g = e.target.closest("[data-goto]");
        if (!g) return;
        show(g.dataset.goto);
    });

    const staffModal = document.getElementById("staffModal");
    if (staffModal) {
        staffModal.addEventListener("click", (e) => {
            if (e.target.id === "staffModal") closeStaff();
        });
    }

    const deleteModal = document.getElementById("deleteProjectModal");
    if (deleteModal) {
        deleteModal.addEventListener("click", (e) => {
            if (e.target.id === "deleteProjectModal") closeDeleteProjectModal();
        });
    }

    show("dash");
})();
