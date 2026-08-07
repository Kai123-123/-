const TAU = Math.PI * 2;

const state = {
  page: "home",
  plotMode: "oneD2d",
  heroPhase: 0,
  oneD: { V0: 8, a: 1.2, m: 1, E: 3, xmin: -2, xmax: 4, n: 1200 },
  alpha: { Zd: 82, Ealpha: 8.8, R: 8, well: -25 },
  stm: { d: 5, phi: 4.5, bias: 0.1 },
  flash: { gateV: 10, tox: 8, phi: 3.2, vth: 1.2 },
  rtd: { barrierHeight: 0.42, barrierWidth: 1.8, wellWidth: 5.0, bias: 0.28, mEff: 0.067 },
  oneDFocus: null,
  oneDFocusLocked: false,
  linkedFocusModule: null,
  linkedFocusSymbol: null,
  linkedFocusLocked: false,
  learningMode: "inquiry",
  activeTaskId: null,
  activeTaskModule: "oneD",
  prediction: null,
  predictionText: "",
  taskStep: "predict",
  hintLevel: 0,
  taskBaseline: null,
  taskPassed: false,
  taskFeedback: "",
  taskExplanationText: "",
  authUser: null,
  authToken: localStorage.getItem("qt_auth_token") || "",
  authMode: "login",
  pendingPageAfterAuth: null,
  learningProgress: { oneD: false, stm: false, alpha: false, flash: false, rtd: false },
  ai: { loadingModule: null, conversations: {}, messages: {} },
  initialHome: true
};

const defaults = {
  oneD: { V0: 8, a: 1.2, m: 1, E: 3, xmin: -2, xmax: 4, n: 1200 },
  alpha: { Zd: 82, Ealpha: 8.8, R: 8, well: -25 },
  stm: { d: 5, phi: 4.5, bias: 0.1 },
  flash: { gateV: 10, tox: 8, phi: 3.2, vth: 1.2 },
  rtd: { barrierHeight: 0.42, barrierWidth: 1.8, wellWidth: 5.0, bias: 0.28, mEff: 0.067 }
};

const controlSyncers = [];

const pages = {
  home: document.getElementById("home"),
  oneD: document.getElementById("oneD"),
  alpha: document.getElementById("alpha"),
  stm: document.getElementById("stm"),
  flash: document.getElementById("flash"),
  rtd: document.getElementById("rtd")
};

const oneDSymbolInfo = {
  V0: {
    label: "V₀",
    name: "势垒高度 V₀",
    region: "势能图中的矩形势垒高度，以及公式中的 V₀。",
    explain: "V₀ 越高，E < V₀ 时势垒越难穿透；衰减系数 κ 增大，透射率 T 通常快速降低。"
  },
  a: {
    label: "a",
    name: "势垒宽度 a",
    region: "x=0 到 x=a 的禁阻区宽度。",
    explain: "a 越大，波函数在势垒内衰减的距离越长，透射率近似按指数规律下降。"
  },
  E: {
    label: "E",
    name: "粒子能量 E",
    region: "势能图中的红色能量虚线。",
    explain: "E 越接近 V₀ 或超过 V₀，粒子越容易通过势垒；E > V₀ 时还会出现波动干涉导致的透射振荡。"
  },
  m: {
    label: "m",
    name: "粒子质量 m",
    region: "参数表与 κ、k 的计算项。",
    explain: "m 会改变波数 k 和衰减系数 κ；质量越大，同样势垒下波函数通常衰减更快。"
  },
  kappa: {
    label: "κ",
    name: "衰减系数 κ",
    region: "势垒区波函数的指数衰减段。",
    explain: "κ=√(2m(V₀-E))。κ 越大，势垒区波函数下降越陡，穿出势垒后的振幅越小。"
  },
  T: {
    label: "T",
    name: "透射率 T",
    region: "势垒右侧的透射波区域、T(E) 曲线，以及计算结果中的 T。",
    explain: "T 表示粒子穿过势垒的概率。T 越大，右侧透射波振幅越明显。"
  },
  R: {
    label: "R",
    name: "反射率 R",
    region: "R(E) 曲线和计算结果中的 R。",
    explain: "R=1−T，表示粒子被势垒反射回去的概率。无吸收势垒时透射与反射概率守恒。"
  }
};

const linkedSymbolInfo = {
  oneD: oneDSymbolInfo,
  stm: {
    d: {
      name: "探针距离 d",
      region: "STM 图中探针与样品之间的真空势垒宽度，以及参数 d。",
      explain: "d 直接出现在指数衰减项 exp(-2κd) 中，因此很小的距离变化也会让隧穿电流明显变化。"
    },
    phi: {
      name: "功函数 φ",
      region: "真空势垒高度与 κ≈0.512√φ 的计算项。",
      explain: "φ 越大，电子进入真空势垒后衰减越快，κ 增大，电流通常降低。"
    },
    bias: {
      name: "偏置电压 Vb",
      region: "STM 势能图中的左右电极能量差，以及电流公式中的比例因子。",
      explain: "Vb 提供隧穿电流的驱动力；在简化模型中，Irel 与 Vb 近似成正比。"
    },
    kappa: {
      name: "衰减系数 κ",
      region: "真空势垒内波函数指数衰减的斜率。",
      explain: "κ 由有效势垒高度决定。κ 越大，波函数在相同距离内下降越多。"
    },
    I: {
      name: "相对隧穿电流 Irel",
      region: "下方电流-距离曲线上的红点位置。",
      explain: "Irel 反映当前参数下电子隧穿概率的相对强弱，是 STM 能分辨原子级高度差的关键。"
    }
  },
  alpha: {
    Zd: {
      name: "子核电荷数 Zd",
      region: "库仑势 V(r)=1.44ZdZα/r 中的电荷数。",
      explain: "Zd 越大，库仑排斥势垒越高，α 粒子越难穿过势垒。"
    },
    Ealpha: {
      name: "α 粒子能量 Eα",
      region: "图中的红色能量线，以及外转折点 r₂ 的计算项。",
      explain: "Eα 越高，外转折点越靠近原子核，禁阻区变窄，隧穿趋势增强。"
    },
    R: {
      name: "核半径 R",
      region: "核内势阱与库仑势垒的交界位置。",
      explain: "R 决定禁阻区起点。R 增大时，在 r₂ 基本不变的情况下势垒宽度 r₂-R 变小。"
    },
    r2: {
      name: "外转折点 r₂",
      region: "库仑势等于 α 粒子能量的位置。",
      explain: "r₂ 是经典允许区与禁阻区的边界。r₂ 越远，α 粒子需要穿越的势垒越宽。"
    },
    P: {
      name: "穿透趋势 P",
      region: "禁阻区宽度和势垒高度共同决定的 WKB 穿透趋势。",
      explain: "P 用于定性表示 α 粒子穿过库仑势垒的可能性；势垒越窄、能量越高，P 越大。"
    }
  },
  flash: {
    gateV: {
      name: "控制栅电压 Vg",
      region: "氧化层电场 Eox≈Veff/tox 的主要来源。",
      explain: "Vg 增大时，氧化层势垒被拉斜，Fowler-Nordheim 隧穿电流通常快速增大。"
    },
    tox: {
      name: "氧化层厚度 tox",
      region: "电子需要穿越的隧穿氧化层宽度。",
      explain: "tox 越小，在相同电压下电场越强、穿越距离越短，隧穿写入/擦除更容易发生。"
    },
    phi: {
      name: "势垒高度 φB",
      region: "Si/SiO₂ 界面势垒高度，以及 FN 指数项中的 φB。",
      explain: "φB 越大，电子越难进入氧化层势垒，FN 电流会降低。"
    },
    eox: {
      name: "氧化层电场 Eox",
      region: "三角势垒倾斜程度和 FN 电流曲线。",
      explain: "Eox 越强，三角势垒越薄，电子更容易通过 Fowler-Nordheim 隧穿进入浮栅或俘获层。"
    },
    j: {
      name: "FN 隧穿电流 JFN",
      region: "下方 JFN-栅压曲线上的当前工作点。",
      explain: "JFN 是闪存写入/擦除速度的核心指标，同时也关联氧化层可靠性风险。"
    }
  },
  rtd: {
    barrierHeight: {
      name: "势垒高度 Vb",
      region: "双势垒量子阱中的左右势垒高度。",
      explain: "势垒高度影响电子耦合强度和透射概率。势垒过高时共振峰会变窄、通过电流减小。"
    },
    barrierWidth: {
      name: "势垒宽度 b",
      region: "双势垒结构中每个势垒的宽度。",
      explain: "势垒宽度越大，电子与阱内态耦合越弱，共振透射峰通常更尖锐但电流更小。"
    },
    wellWidth: {
      name: "量子阱宽度 w",
      region: "两个势垒之间的量子阱区域。",
      explain: "阱宽决定准束缚能级位置。w 改变会移动 E₁，从而改变共振条件。"
    },
    bias: {
      name: "外加偏压 V",
      region: "I-V 曲线横轴与能级对准/失配的控制量。",
      explain: "偏压改变发射极电子能量与阱内能级的相对位置，导致共振峰和负微分电阻。"
    },
    e1: {
      name: "阱内基态能级 E₁",
      region: "量子阱内虚线标出的准束缚能级。",
      explain: "当入射电子能量与 E₁ 对准时，电子可通过双势垒发生共振透射。"
    },
    current: {
      name: "相对电流 I",
      region: "共振隧穿二极管 I-V 曲线上的红色工作点。",
      explain: "电流随偏压先升后降的区域体现负微分电阻，是共振隧穿二极管的核心器件特征。"
    }
  }
};

const learningModeInfo = {
  basic: {
    label: "基础模式",
    summary: "高脚手架：给步骤、给全部提示，适合第一次接触该实验。"
  },
  inquiry: {
    label: "探究模式",
    summary: "中脚手架：必须先预测，再操作观察，最后提交解释。"
  },
  challenge: {
    label: "挑战模式",
    summary: "低脚手架：只给目标和标准，不给具体步骤，要求独立完成。"
  }
};

const learningTasks = {
  oneD: [
    {
      id: "oned_reduce_t",
      title: "降低透射率",
      goal: "通过调节参数让透射率 T 明显降低。",
      predictionQuestion: "增大势垒宽度 a 后，透射率 T 会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "减小",
      observe: "建议先记录当前 T，再把 a 从 1.2 调到 2.0 以上，观察 T 的变化。",
      hints: [
        "先关注势垒宽度 a。",
        "势垒越宽，波函数在势垒区域衰减越充分。",
        "如果变化不明显，继续增大 a，或提高 V₀。"
      ],
      check: ({ before, after, mode }) => after.T < before.T * (mode === "challenge" ? 0.25 : mode === "basic" ? 0.75 : 0.5),
      explanation: "当 E < V₀ 时，势垒宽度增大，波函数在势垒内衰减距离增加，因此透射率 T 通常降低。"
    },
    {
      id: "oned_visible_tunnel",
      title: "保持 E < V₀ 的明显透射",
      goal: "保持 E < V₀，同时找到仍存在明显透射的参数组合。",
      predictionQuestion: "在 E < V₀ 时，怎样更容易看到明显透射？",
      options: ["减小势垒宽度或降低势垒高度", "增大质量 m", "无限增大势垒宽度"],
      correctOption: "减小势垒宽度或降低势垒高度",
      observe: "保持 E 小于 V₀，尝试减小 a 或让 E 更接近 V₀，观察 T 是否仍为非零且可见。",
      hints: [
        "先确保 E < V₀。",
        "让 E 更接近 V₀ 会减小 κ。",
        "减小 a 可以缩短衰减距离。"
      ],
      check: ({ after, mode }) => after.E < after.V0 && after.T > (mode === "challenge" ? 1e-3 : mode === "basic" ? 1e-6 : 1e-5),
      explanation: "量子隧穿并不要求 E 超过 V₀。只要势垒不太宽、κ 不太大，波函数在势垒另一侧仍会保留可观察的振幅。"
    }
  ],
  stm: [
    {
      id: "stm_reduce_current",
      title: "让隧穿电流降低",
      goal: "通过调节参数让 STM 相对隧穿电流降到原来的约 1/5 或更低。",
      predictionQuestion: "增大探针-样品距离 d 后，隧穿电流会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "减小",
      observe: "记录当前 Irel，逐步增大 d，观察电流曲线上的红点位置。",
      hints: [
        "优先调节探针距离 d。",
        "电流近似满足 I∝exp(-2κd)。",
        "距离变化很小也可能导致电流数量级变化。"
      ],
      check: ({ before, after, mode }) => after.I < before.I * (mode === "challenge" ? 0.1 : mode === "basic" ? 0.35 : 0.2),
      explanation: "STM 电流对距离呈指数衰减。d 增大时，电子波函数在真空势垒中衰减更充分，Irel 显著降低。"
    },
    {
      id: "stm_compare_d_phi",
      title: "比较 d 与 φ 的影响",
      goal: "比较探针距离 d 和功函数 φ 对隧穿电流的影响。",
      predictionQuestion: "哪一个参数通常更容易造成 STM 电流的快速变化？",
      options: ["探针距离 d", "功函数 φ", "二者完全没有影响"],
      correctOption: "探针距离 d",
      observe: "分别改变 d 和 φ，比较 Irel 的变化幅度。",
      hints: [
        "d 在指数项中直接乘以 κ。",
        "φ 会先影响 κ，再影响指数衰减。",
        "可以先只改变一个参数，避免混淆。"
      ],
      check: ({ before, after }) => Math.abs(after.d - before.d) >= 0.5 || Math.abs(after.phi - before.phi) >= 1,
      explanation: "d 和 φ 都会影响隧穿电流，但 d 直接改变势垒穿越距离，常表现出非常强的指数敏感性。"
    }
  ],
  alpha: [
    {
      id: "alpha_energy_penetration",
      title: "提高 α 粒子能量",
      goal: "提高 α 粒子能量，观察隧穿穿透趋势如何变化。",
      predictionQuestion: "提高 α 粒子能量 Eα 后，穿透概率趋势会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "增大",
      observe: "提高 Eα，观察外转折点和禁阻区宽度的变化。",
      hints: [
        "Eα 越高，粒子越接近越过库仑势垒。",
        "外转折点 r₂ 会随 Eα 增大而减小。",
        "禁阻区变窄通常意味着更容易隧穿。"
      ],
      check: ({ before, after, mode }) => after.Ealpha > before.Ealpha && after.penetrability > before.penetrability * (mode === "challenge" ? 2 : 1.2),
      explanation: "Eα 增大时，外转折点向内移动，禁阻区宽度减小，WKB 穿透趋势增强。"
    },
    {
      id: "alpha_radius_width",
      title: "改变核半径 R",
      goal: "改变核半径 R，解释势垒宽度如何变化。",
      predictionQuestion: "增大核半径 R 后，禁阻区宽度 r₂-R 通常会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "减小",
      observe: "调节 R，观察核表面位置和禁阻区宽度。",
      hints: [
        "外转折点 r₂ 主要由 Zd 和 Eα 决定。",
        "禁阻区宽度约为 r₂-R。",
        "R 增大时，起点向外移动。"
      ],
      check: ({ before, after, mode }) => Math.abs(after.width - before.width) > (mode === "challenge" ? 1.5 : 0.5),
      explanation: "在 Zd 与 Eα 不变时，r₂ 基本不变；R 增大使禁阻区起点外移，因此 r₂-R 变小。"
    }
  ]
};

const announcer = document.getElementById("announcer");
const announcerTitle = document.getElementById("announcerTitle");
const announcerText = document.getElementById("announcerText");
let announcerTimer = null;

function $(selector) { return document.querySelector(selector); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmt(v, f = 2) { return f === 0 ? String(Math.round(v)) : Number(v).toFixed(f); }
function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (b - a) * i / Math.max(n - 1, 1));
}
function mapX(v, min, max, x, w) { return x + (v - min) / (max - min) * w; }
function mapY(v, min, max, y, h) { return y + h - (v - min) / (max - min) * h; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

const guestPages = new Set(["home", "oneD"]);
const extensionPages = new Set(["flash", "rtd"]);
const requiredCoreTasks = {
  oneD: "oned_reduce_t",
  stm: "stm_reduce_current",
  alpha: "alpha_energy_penetration"
};

function isAuthenticated() { return Boolean(state.authToken && state.authUser); }
function isAdmin() { return state.authUser?.role === "admin"; }
function defaultLearningProgress() {
  return { oneD: false, stm: false, alpha: false, flash: false, rtd: false };
}
function progressStorageKey() {
  const user = state.authUser?.username || "guest";
  return `qt_learning_progress_${user}`;
}
function coreProgressCount() {
  if (isAdmin()) return 3;
  return ["oneD", "alpha", "stm"].filter(module => state.learningProgress[module]).length;
}
function extensionsUnlocked() {
  if (isAdmin()) return true;
  return state.learningProgress.oneD && state.learningProgress.stm && state.learningProgress.alpha;
}
function loadLearningProgress() {
  try {
    state.learningProgress = { ...defaultLearningProgress(), ...JSON.parse(localStorage.getItem(progressStorageKey()) || "{}") };
  } catch {
    state.learningProgress = defaultLearningProgress();
  }
  updateUnlockState(false);
}
function mergeGuestProgressIntoUser() {
  if (!state.authUser) return;
  try {
    const guestProgress = { ...defaultLearningProgress(), ...JSON.parse(localStorage.getItem("qt_learning_progress_guest") || "{}") };
    ["oneD", "alpha", "stm"].forEach(module => {
      state.learningProgress[module] = Boolean(state.learningProgress[module] || guestProgress[module]);
    });
    updateUnlockState();
  } catch {
    updateUnlockState();
  }
}
function saveLearningProgress() {
  localStorage.setItem(progressStorageKey(), JSON.stringify(state.learningProgress));
}
function updateUnlockState(save = true) {
  const unlocked = extensionsUnlocked();
  state.learningProgress.flash = unlocked;
  state.learningProgress.rtd = unlocked;
  if (save) saveLearningProgress();
}
function moduleForElement(el) {
  return Object.keys(pages).find(module => module !== "home" && pages[module]?.contains(el)) || null;
}
function isRequiredCoreTask(module, taskId = state.activeTaskId) {
  return requiredCoreTasks[module] === taskId;
}
function pageLockReason(page) {
  if (!pages[page]) return "";
  if (!isAuthenticated() && !guestPages.has(page)) return "登录或注册后才能使用该模块。";
  if (extensionPages.has(page) && !extensionsUnlocked()) {
    return "闪存隧穿和共振隧穿暂未解锁。请先完成一维方势垒、α 衰变、STM 应用的核心任务。";
  }
  return "";
}
function pageRequiresAuth(page) { return !guestPages.has(page); }

function updateAuthUI() {
  const authed = isAuthenticated();
  const authStatus = $("#authStatus");
  const authOpenBtn = $("#authOpenBtn");
  const authLogoutBtn = $("#authLogoutBtn");
  if (authStatus) {
    authStatus.textContent = authed
      ? isAdmin()
        ? `管理员：${state.authUser.username}；全部模块已解锁`
        : `已登录：${state.authUser.username}；核心进度 ${coreProgressCount()}/3${extensionsUnlocked() ? "；拓展已解锁" : "；拓展未解锁"}`
      : "未登录：仅开放一维模型";
  }
  if (authOpenBtn) authOpenBtn.classList.toggle("hidden", authed);
  if (authLogoutBtn) authLogoutBtn.classList.toggle("hidden", !authed);
  document.querySelectorAll("[data-page]").forEach(el => {
    const locked = Boolean(pageLockReason(el.dataset.page));
    el.classList.toggle("locked", locked);
    const card = el.closest(".module-card");
    if (card) card.classList.toggle("locked", locked);
  });
  renderHomeProgress();
}

function setAuthMessage(message, ok = false) {
  const el = $("#authMessage");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("ok", Boolean(ok));
}

function showAuthModal(message = "") {
  $("#authModal")?.classList.remove("hidden");
  setAuthMessage(message);
  setTimeout(() => $("#authUsername")?.focus(), 0);
}

function closeAuthModal() {
  $("#authModal")?.classList.add("hidden");
  setAuthMessage("");
}

function setAuthMode(mode) {
  state.authMode = mode === "register" ? "register" : "login";
  document.querySelectorAll("[data-auth-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.authMode === state.authMode);
  });
  const password = $("#authPassword");
  if (password) password.autocomplete = state.authMode === "register" ? "new-password" : "current-password";
  setAuthMessage("");
}

async function submitAuth() {
  const username = $("#authUsername")?.value.trim();
  const password = $("#authPassword")?.value;
  if (!username || !password) {
    setAuthMessage("请输入用户名和密码。");
    return;
  }
  try {
    setAuthMessage("正在提交...", true);
    const res = await fetch(`/api/${state.authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "认证失败。");
    state.authToken = data.token;
    state.authUser = data.user;
    localStorage.setItem("qt_auth_token", state.authToken);
    loadLearningProgress();
    mergeGuestProgressIntoUser();
    closeAuthModal();
    updateAuthUI();
    const target = state.pendingPageAfterAuth;
    state.pendingPageAfterAuth = null;
    if (target) switchPage(target);
  } catch (err) {
    setAuthMessage(err.message || "无法连接后端服务，请确认后端已启动。");
  }
}

function logout() {
  localStorage.removeItem("qt_auth_token");
  state.authToken = "";
  state.authUser = null;
  loadLearningProgress();
  updateAuthUI();
  if (pageRequiresAuth(state.page)) switchPage("oneD");
}

async function initAuth() {
  if (!state.authToken) {
    loadLearningProgress();
    updateAuthUI();
    return;
  }
  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${state.authToken}` }
    });
    if (!res.ok) throw new Error("token expired");
    const data = await res.json();
    state.authUser = data.user;
  } catch {
    localStorage.removeItem("qt_auth_token");
    state.authToken = "";
    state.authUser = null;
  }
  loadLearningProgress();
  mergeGuestProgressIntoUser();
  updateAuthUI();
}

function oneDMetrics() {
  const p = state.oneD;
  const [T, k, kappa] = transmission(p.E, p.V0, p.a, p.m);
  return { ...p, T, R: 1 - T, k, kappa };
}

function stmMetrics() {
  const p = state.stm;
  const phiEffAvg = Math.max(p.phi - .5 * p.bias, .05);
  const kappa = .512 * Math.sqrt(phiEffAvg);
  const I = p.bias * Math.exp(-2 * kappa * p.d);
  return { ...p, phiEffAvg, kappa, I };
}

function alphaMetrics() {
  const p = state.alpha;
  const Za = 2, C = 1.44;
  const barrierR = C * p.Zd * Za / p.R;
  const r2 = C * p.Zd * Za / p.Ealpha;
  const width = Math.max(0, r2 - p.R);
  const penetrability = Math.exp(-0.16 * width * Math.sqrt(Math.max(barrierR - p.Ealpha, 0)));
  return { ...p, barrierR, r2, width, penetrability };
}

function moduleMetrics(module) {
  if (module === "oneD") return oneDMetrics();
  if (module === "stm") return stmMetrics();
  if (module === "alpha") return alphaMetrics();
  if (module === "flash") return { ...state.flash, ...flashCurrent(state.flash) };
  if (module === "rtd") return { ...state.rtd, ...rtdMetrics(state.rtd) };
  return {};
}

function metricSnapshotText(module, metrics) {
  if (module === "oneD") return `T=${metrics.T.toExponential(3)}, V₀=${metrics.V0.toFixed(1)}, a=${metrics.a.toFixed(2)}, E=${metrics.E.toFixed(1)}`;
  if (module === "stm") return `Irel=${metrics.I.toExponential(3)}, d=${metrics.d.toFixed(1)} Å, φ=${metrics.phi.toFixed(1)} eV`;
  if (module === "alpha") return `P≈${metrics.penetrability.toExponential(3)}, r₂-R=${metrics.width.toFixed(2)} fm, Eα=${metrics.Ealpha.toFixed(1)} MeV`;
  return "";
}

function moduleDisplayName(module) {
  return {
    oneD: "一维方势垒",
    stm: "STM 应用",
    alpha: "α 衰变",
    flash: "闪存隧穿",
    rtd: "共振隧穿"
  }[module] || module;
}

const aiModuleContext = {
  oneD: {
    name: "势垒透射助教",
    role: "一维方势垒量子隧穿教学助教",
    focus: "解释势垒高度 V0、宽度 a、粒子能量 E、质量 m、透射率 T、波函数衰减与三维波动图。",
    formulas: "E<V0 时 κ=√[2m(V0-E)]，势垒区波函数指数衰减，T 与 κa 强相关。"
  },
  stm: {
    name: "STM 探针助教",
    role: "扫描隧道显微镜 STM 教学助教",
    focus: "解释探针距离 d、功函数 φ、偏置电压 Vb、衰减系数 κ 与相对隧穿电流 Irel。",
    formulas: "κ≈0.512√φ，ψ(d)∝exp(-κd)，Irel∝Vb·exp(-2κd)。"
  },
  alpha: {
    name: "α 衰变隧穿助教",
    role: "α 衰变量子隧穿教学助教",
    focus: "解释库仑势垒、核半径 R、外转折点 r2、α 粒子能量 Eα 与穿透概率。",
    formulas: "V(r)=1.44ZdZα/r，r2=1.44ZdZα/Eα，禁阻区宽度约为 r2-R。"
  },
  flash: {
    name: "闪存隧穿助教",
    role: "闪存隧穿器件教学助教",
    focus: "解释控制栅电压、隧穿氧化层厚度、势垒高度、氧化层电场与 Fowler-Nordheim 电流。",
    formulas: "Eox≈Veff/tox，JFN∝Eox²exp[-BφB^(3/2)/Eox]。"
  },
  rtd: {
    name: "共振隧穿助教",
    role: "共振隧穿二极管教学助教",
    focus: "解释双势垒量子阱、阱宽、势垒宽度、共振能级、I-V 曲线和负微分电阻。",
    formulas: "E1≈π²ℏ²/(2m*w²)，T(E) 近似 Lorentz 共振峰，偏压改变能级对准。"
  }
};

const aiQuickPrompts = [
  ["explain", "解释当前图像"],
  ["hint", "提示下一步"],
  ["check", "检查我的解释"]
];

function progressOverviewHtml() {
  const coreModules = ["oneD", "alpha", "stm"];
  const rows = coreModules.map(module => {
    const done = isAdmin() || state.learningProgress[module];
    return `<span class="progress-pill ${done ? "done" : ""}">${moduleDisplayName(module)} ${done ? "✓" : "-"}</span>`;
  }).join("");
  return `
    <div class="unlock-progress">
      <strong>拓展应用解锁进度：${coreProgressCount()}/3</strong>
      <div class="progress-pills">${rows}</div>
      <p>${extensionsUnlocked() ? "已解锁：闪存隧穿、共振隧穿。" : "完成三个核心任务后解锁：闪存隧穿、共振隧穿。"}</p>
    </div>
  `;
}

function renderHomeProgress() {
  const percentEl = $("#homeProgressPercent");
  const barEl = $("#homeProgressBar");
  const stateEl = $("#homeProgressState");
  const listEl = $("#homeProgressList");
  if (!percentEl || !barEl || !stateEl || !listEl) return;
  const percent = Math.round(coreProgressCount() / 3 * 100);
  percentEl.textContent = `${percent}%`;
  barEl.style.width = `${percent}%`;
  stateEl.textContent = isAdmin()
    ? "管理员账号：已直接解锁全部模块。"
    : extensionsUnlocked()
    ? "拓展应用已解锁，可以进入闪存隧穿和共振隧穿。"
    : isAuthenticated()
      ? "完成三个核心任务后解锁拓展应用。"
      : "登录后开放 α 衰变、STM 应用与拓展解锁路径。";
  listEl.innerHTML = ["oneD", "alpha", "stm"].map(module => {
    const done = isAdmin() || state.learningProgress[module];
    return `<div class="home-progress-item ${done ? "done" : ""}"><span>${moduleDisplayName(module)}</span><span>${isAdmin() ? "管理员解锁" : done ? "已完成" : "待完成"}</span></div>`;
  }).join("");
}

function activeTaskFor(module = state.activeTaskModule) {
  return learningTasks[module]?.find(task => task.id === state.activeTaskId) || null;
}

function startLearningTask(module, taskId) {
  const task = learningTasks[module]?.find(item => item.id === taskId);
  if (!task) return;
  state.activeTaskModule = module;
  state.activeTaskId = taskId;
  state.prediction = null;
  state.predictionText = "";
  state.taskStep = state.learningMode === "basic" ? "observe" : "predict";
  state.hintLevel = state.learningMode === "basic" ? task.hints.length : 0;
  state.taskBaseline = moduleMetrics(module);
  state.taskPassed = false;
  state.taskFeedback = `已记录起始状态：${metricSnapshotText(module, state.taskBaseline)}`;
  state.taskExplanationText = "";
  renderLearningPanels();
}

function setLearningMode(mode) {
  if (!learningModeInfo[mode]) return;
  state.learningMode = mode;
  const task = activeTaskFor();
  if (task) {
    state.taskStep = mode === "basic" ? "observe" : "predict";
    state.hintLevel = mode === "basic" ? task.hints.length : 0;
    state.prediction = null;
    state.predictionText = "";
    state.taskBaseline = moduleMetrics(state.activeTaskModule);
    state.taskPassed = false;
    state.taskFeedback = `已切换到${learningModeInfo[mode].label}，并重新记录起始状态。`;
  }
  renderLearningPanels();
}

function choosePrediction(value) {
  state.prediction = value;
  state.taskFeedback = "";
  renderLearningPanels();
}

function submitPrediction() {
  const task = activeTaskFor();
  if (!task) return;
  if (state.learningMode === "challenge") {
    const text = $(`#learningPredictionText-${state.activeTaskModule}`)?.value.trim();
    if (!text) {
      state.taskFeedback = "挑战模式需要先写下你的预测。";
      renderLearningPanels();
      return;
    }
    state.predictionText = text;
    state.prediction = text;
  } else if (!state.prediction && state.learningMode !== "basic") {
    state.taskFeedback = "请先选择一个预测，再进入观察步骤。";
    renderLearningPanels();
    return;
  }
  state.taskStep = "observe";
  state.taskFeedback = state.learningMode === "challenge"
    ? "预测已记录。现在调节参数并观察图像与数值变化。"
    : state.learningMode === "basic" && !state.prediction
      ? "基础模式允许跳过预测。请按照推荐步骤调参观察。"
      : `预测已记录：${state.prediction}${state.prediction === task.correctOption ? "。方向正确。" : "。请通过仿真验证它是否成立。"}`;
  renderLearningPanels();
}

function showNextHint() {
  const task = activeTaskFor();
  if (!task) return;
  state.hintLevel = Math.min(task.hints.length, state.hintLevel + 1);
  renderLearningPanels();
}

function checkLearningTask() {
  const task = activeTaskFor();
  if (!task) return;
  if (state.taskStep === "predict" && state.learningMode !== "basic") {
    state.taskFeedback = "请先完成预测，再进行观察检查。";
    renderLearningPanels();
    return;
  }
  const before = state.taskBaseline || moduleMetrics(state.activeTaskModule);
  const after = moduleMetrics(state.activeTaskModule);
  const passed = task.check({ before, after, mode: state.learningMode });
  state.taskPassed = passed;
  state.taskFeedback = passed
    ? `任务达成。起始：${metricSnapshotText(state.activeTaskModule, before)}；当前：${metricSnapshotText(state.activeTaskModule, after)}。请提交一句解释以记录完成。`
    : `暂未达成。起始：${metricSnapshotText(state.activeTaskModule, before)}；当前：${metricSnapshotText(state.activeTaskModule, after)}。`;
  state.taskStep = passed ? "explain" : "observe";
  renderLearningPanels();
}

function completeCoreTaskIfReady() {
  const module = state.activeTaskModule;
  if (!isRequiredCoreTask(module) || !state.taskPassed) return false;
  state.learningProgress[module] = true;
  updateUnlockState();
  updateAuthUI();
  return true;
}

function submitTaskExplanation() {
  const text = $(`#learningExplainText-${state.activeTaskModule}`)?.value.trim();
  if (!text) {
    state.taskFeedback = "请先写一句观察解释。";
    renderLearningPanels();
    return;
  }
  if (!state.taskPassed) {
    state.taskFeedback = "请先通过“检查任务”，再提交解释记录完成。";
    renderLearningPanels();
    return;
  }
  state.taskExplanationText = text;
  state.taskStep = "done";
  const completed = completeCoreTaskIfReady();
  state.taskFeedback = completed
    ? `${moduleDisplayName(state.activeTaskModule)}核心任务已完成。当前核心进度 ${coreProgressCount()}/3${extensionsUnlocked() ? "，已解锁闪存隧穿和共振隧穿。" : "。"}`
    : "解释已提交。可以对照参考解释修正表述。";
  renderLearningPanels();
}

function showReferenceExplanation() {
  const task = activeTaskFor();
  if (!task) return;
  if (state.learningMode === "inquiry" && state.taskStep !== "done") {
    state.taskFeedback = "探究模式需要先通过检查并提交自己的解释，再查看参考解释。";
    renderLearningPanels();
    return;
  }
  if (state.learningMode === "challenge" && state.taskStep !== "done") {
    state.taskFeedback = "挑战模式只有在完成任务并提交解释后才开放参考解释。";
    renderLearningPanels();
    return;
  }
  if (state.learningMode === "basic") {
    state.taskFeedback = `参考解释：${task.explanation}`;
    renderLearningPanels();
    return;
  }
  state.taskStep = "done";
  state.taskFeedback = `参考解释：${task.explanation}`;
  renderLearningPanels();
}

function modeDetailHtml(modeKey) {
  const details = {
    basic: {
      title: "基础模式：跟随引导",
      items: ["预测可选", "默认展开全部提示", "可提前查看参考解释", "完成判定更宽松"]
    },
    inquiry: {
      title: "探究模式：预测-观察-解释",
      items: ["必须先提交预测", "提示按需逐步展开", "提交解释后显示参考解释", "完成判定标准"]
    },
    challenge: {
      title: "挑战模式：独立完成",
      items: ["使用文字预测", "隐藏具体操作提示", "完成后才显示参考解释", "完成判定更严格"]
    }
  };
  const detail = details[modeKey];
  return `
    <div class="mode-detail mode-${modeKey}">
      <strong>${detail.title}</strong>
      <div>${detail.items.map(item => `<span>${item}</span>`).join("")}</div>
    </div>
  `;
}

function taskStandardText(task, modeKey) {
  const standards = {
    oned_reduce_t: {
      basic: "完成标准：T_after < 0.75 × T_before",
      inquiry: "完成标准：T_after < 0.50 × T_before",
      challenge: "完成标准：T_after < 0.25 × T_before"
    },
    oned_visible_tunnel: {
      basic: "完成标准：保持 E < V₀，且 T > 1e-6",
      inquiry: "完成标准：保持 E < V₀，且 T > 1e-5",
      challenge: "完成标准：保持 E < V₀，且 T > 1e-3"
    },
    stm_reduce_current: {
      basic: "完成标准：I_after < 0.35 × I_before",
      inquiry: "完成标准：I_after < 0.20 × I_before",
      challenge: "完成标准：I_after < 0.10 × I_before"
    },
    stm_compare_d_phi: {
      basic: "完成标准：明显改变 d 或 φ，并说明哪个参数更敏感",
      inquiry: "完成标准：分别比较 d 与 φ 的影响，并提交解释",
      challenge: "完成标准：独立设计对照实验，比较 d 与 φ 的影响"
    },
    alpha_energy_penetration: {
      basic: "完成标准：提高 Eα 后，P 有可见增大",
      inquiry: "完成标准：提高 Eα 后，P 至少增大 20%",
      challenge: "完成标准：提高 Eα 后，P 至少增大 2 倍"
    },
    alpha_radius_width: {
      basic: "完成标准：改变 R 后，禁阻区宽度变化超过 0.5 fm",
      inquiry: "完成标准：改变 R 后，解释 r₂-R 的变化",
      challenge: "完成标准：改变 R 后，禁阻区宽度变化超过 1.5 fm"
    }
  };
  return standards[task.id]?.[modeKey] || "完成标准：根据当前任务目标和模式难度判定。";
}

function taskModeGuideHtml(task, modeKey) {
  if (modeKey === "basic") {
    return `
      <div class="mode-guide">
        <strong>推荐操作步骤</strong>
        <ol>
          <li>先观察起始状态：${metricSnapshotText(state.activeTaskModule, state.taskBaseline || moduleMetrics(state.activeTaskModule))}</li>
          <li>${task.hints[0] || "只改变一个关键参数，观察图像与数值变化。"}</li>
          <li>${task.hints[task.hints.length - 1] || "点击检查任务，确认是否达成目标。"}</li>
        </ol>
      </div>
    `;
  }
  if (modeKey === "challenge") {
    return `
      <div class="mode-guide challenge">
        <strong>挑战限制</strong>
        <p>系统只给目标和完成标准，不给具体操作步骤。请先写下你的参数调整思路，再独立完成观察与解释。</p>
      </div>
    `;
  }
  return `
    <div class="mode-guide inquiry">
      <strong>探究流程</strong>
      <p>先预测结果，再调参观察，最后用一句话解释“为什么会这样”。需要时可以逐步打开提示。</p>
    </div>
  `;
}

function renderLearningPanel(module) {
  const panel = document.getElementById(`learningPanel-${module}`);
  if (!panel) return;
  panel.className = `learning-panel mode-${state.learningMode}`;
  const tasks = learningTasks[module] || [];
  const task = state.activeTaskModule === module ? activeTaskFor(module) : null;
  const mode = learningModeInfo[state.learningMode];
  const modeButtons = Object.entries(learningModeInfo).map(([key, info]) =>
    `<button class="learning-mode-btn ${state.learningMode === key ? "active" : ""}" data-learning-action="mode" data-mode="${key}">${info.label}</button>`
  ).join("");
  const taskButtons = tasks.map(item => {
    const isCore = isRequiredCoreTask(module, item.id);
    const done = isCore && state.learningProgress[module];
    return `<button class="learning-task-btn ${task?.id === item.id ? "active" : ""} ${done ? "done" : ""}" data-learning-action="start" data-module="${module}" data-task-id="${item.id}">${item.title}${isCore ? " · 核心任务" : ""}${done ? " ✓" : ""}</button>`;
  }).join("");

  if (!task) {
    panel.innerHTML = `
      <div class="learning-head">
        <div>
          <h2>任务驱动探究学习</h2>
          <p>${mode.summary}</p>
        </div>
      </div>
      <div class="learning-modes">${modeButtons}</div>
      ${modeDetailHtml(state.learningMode)}
      ${progressOverviewHtml()}
      <div class="learning-section">
        <h3>选择任务卡</h3>
        <div class="learning-task-list">${taskButtons}</div>
      </div>
    `;
    return;
  }

  const stepLabels = [["predict", "预测"], ["observe", "观察"], ["explain", "解释"], ["done", "完成"]];
  const steps = stepLabels.map(([key, label]) => `<span class="learning-step ${state.taskStep === key ? "active" : ""}">${label}</span>`).join("");
  const predictionBlock = state.learningMode === "challenge"
    ? `<textarea id="learningPredictionText-${module}" class="learning-textarea" placeholder="写下你的预测和准备调整的参数">${escapeHtml(state.predictionText)}</textarea>`
    : `<div class="learning-options">${task.options.map(option => `<button class="learning-option-btn ${state.prediction === option ? "active" : ""}" data-learning-action="prediction" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>`;
  const hints = state.learningMode === "basic" ? task.hints : task.hints.slice(0, state.hintLevel);
  const hintBlock = state.learningMode === "challenge"
    ? `<div class="learning-feedback quiet">挑战模式隐藏具体操作提示。</div>`
    : hints.length ? `<ul class="learning-hints">${hints.map(hint => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>` : "";
  const canHint = state.learningMode !== "challenge" && state.hintLevel < task.hints.length;
  const canShowReference = state.learningMode === "basic" || state.taskStep === "done";
  const predictionTitle = state.learningMode === "basic" ? "1. 预测（可选）" : state.learningMode === "challenge" ? "1. 文字预测" : "1. 预测";
  const submitPredictionText = state.learningMode === "basic" ? "记录预测（可选）" : "提交预测";
  const checkText = state.learningMode === "basic" ? "按步骤观察并检查" : "检查任务";

  panel.innerHTML = `
    <div class="learning-head">
      <div>
        <h2>任务驱动探究学习</h2>
        <p>${mode.summary}</p>
      </div>
    </div>
    <div class="learning-modes">${modeButtons}</div>
    ${modeDetailHtml(state.learningMode)}
    ${progressOverviewHtml()}
    <div class="learning-section">
      <h3>任务卡</h3>
      <div class="learning-task-list">${taskButtons}</div>
      <p>状态：${isRequiredCoreTask(module, task.id) && state.learningProgress[module] ? "已完成" : "未完成"}</p>
      <p><strong>${task.title}</strong>：${task.goal}</p>
      <p>起始状态：${metricSnapshotText(module, state.taskBaseline || moduleMetrics(module))}</p>
      <p class="task-standard">${taskStandardText(task, state.learningMode)}</p>
      ${taskModeGuideHtml(task, state.learningMode)}
    </div>
    <div class="learning-section">
      <div class="learning-steps">${steps}</div>
      <h3>${predictionTitle}</h3>
      <p>${task.predictionQuestion}</p>
      ${predictionBlock}
      <h3>2. 观察</h3>
      <p>${task.observe}</p>
      <h3>3. 解释</h3>
      <textarea id="learningExplainText-${module}" class="learning-textarea" placeholder="用一句话解释你观察到的变化">${escapeHtml(state.taskExplanationText)}</textarea>
      ${hintBlock}
      <div class="learning-actions">
        <button class="learning-action-btn primary" data-learning-action="submit-prediction">${submitPredictionText}</button>
        <button class="learning-action-btn primary" data-learning-action="check">${checkText}</button>
        <button class="learning-action-btn" data-learning-action="submit-explanation">提交解释</button>
        ${canHint ? `<button class="learning-action-btn" data-learning-action="hint">显示提示</button>` : ""}
        ${canShowReference ? `<button class="learning-action-btn" data-learning-action="reference">查看参考解释</button>` : `<button class="learning-action-btn disabled" type="button">参考解释未开放</button>`}
      </div>
      ${state.taskFeedback ? `<div class="learning-feedback">${escapeHtml(state.taskFeedback)}</div>` : ""}
    </div>
  `;
}

function renderLearningPanels() {
  ["oneD", "alpha", "stm"].forEach(renderLearningPanel);
}

function moduleSummaryText(module) {
  const el = document.getElementById(`${module}Summary`);
  if (el?.textContent) return el.textContent.trim();
  if (module === "oneD") return $("#oneDExplain")?.textContent?.trim() || "";
  return "";
}

function aiContextPayload(module, query) {
  const task = activeTaskFor(module);
  const metrics = moduleMetrics(module);
  const context = aiModuleContext[module] || {};
  return {
    module,
    moduleTitle: moduleDisplayName(module),
    assistantRole: context.role || `${moduleDisplayName(module)}教学助教`,
    learningMode: state.learningMode,
    taskTitle: task?.title || "",
    taskGoal: task?.goal || "",
    taskStep: task ? state.taskStep : "",
    taskFeedback: state.taskFeedback || "",
    currentParams: JSON.stringify(state[module] || {}),
    currentMetrics: JSON.stringify(metrics),
    metricSnapshot: metricSnapshotText(module, metrics),
    pageSummary: moduleSummaryText(module),
    teachingFocus: context.focus || "",
    keyFormulas: context.formulas || "",
    instruction: [
      "请用中文回答，面向高中/大学初学者，解释要结合当前页面参数和仿真结果。",
      "优先给出物理原因，再给操作建议；不要编造页面中不存在的按钮或数据。",
      "如果学习模式是挑战模式，少给具体步骤，多用启发式追问。",
      "回答控制在 180 字以内，必要时用 2-3 个短点。"
    ].join("\n"),
    studentQuestion: query
  };
}

function defaultAiQuestion(module, type) {
  const task = activeTaskFor(module);
  const metrics = moduleMetrics(module);
  if (type === "hint") {
    return task
      ? `我正在做任务“${task.title}”，请根据当前参数给我一个下一步提示。`
      : `请根据当前${moduleDisplayName(module)}页面参数，给我一个可操作的探究建议。`;
  }
  if (type === "check") {
    return task
      ? `请检查我对任务“${task.title}”的理解是否正确，并指出我还应该观察什么。`
      : `请帮我检查当前仿真结果的物理解释是否合理。`;
  }
  return `请解释当前${moduleDisplayName(module)}图像和结果：${metricSnapshotText(module, metrics)}`;
}

function aiMessagesFor(module) {
  if (!state.ai.messages[module]) {
    const assistantName = aiModuleContext[module]?.name || "量子隧穿助教";
    state.ai.messages[module] = [{
      role: "assistant",
      text: `你好，我是${assistantName}。我会结合当前页面参数、仿真结果和学习任务来解释。可以点快捷问题，也可以直接提问。`
    }];
  }
  return state.ai.messages[module];
}

function renderAIPanel(module) {
  const panel = document.getElementById(`aiPanel-${module}`);
  if (!panel) return;
  const isLoading = state.ai.loadingModule === module;
  const assistantName = aiModuleContext[module]?.name || "量子隧穿助教";
  const messages = aiMessagesFor(module).slice(-4);
  const quickButtons = aiQuickPrompts.map(([type, label]) =>
    `<button class="ai-chip" data-ai-action="quick" data-ai-module="${module}" data-ai-type="${type}" ${isLoading ? "disabled" : ""}>${label}</button>`
  ).join("");
  const body = messages.map(item =>
    `<div class="ai-message ${item.role === "user" ? "user" : "assistant"}">${escapeHtml(item.text)}</div>`
  ).join("");
  panel.innerHTML = `
    <h2><span>AI</span>${assistantName}</h2>
    <p class="ai-note">${moduleDisplayName(module)} · 自动读取当前参数、结果和任务状态</p>
    <div class="ai-quick">${quickButtons}</div>
    <div class="ai-thread">${body}${isLoading ? `<div class="ai-message assistant loading">正在向${assistantName}提问...</div>` : ""}</div>
    <div class="ai-input-row">
      <textarea id="aiInput-${module}" class="ai-input" placeholder="向 AI 询问当前图像、参数变化或任务解释"></textarea>
      <button class="ai-send" data-ai-action="send" data-ai-module="${module}" ${isLoading ? "disabled" : ""}>发送</button>
    </div>
    <p class="ai-config-tip">提示：DeepSeek Key 配在 Dify 后台，本平台只需要 Dify App API Key。</p>
  `;
}

function renderAIPanels() {
  ["oneD", "alpha", "stm", "flash", "rtd"].forEach(renderAIPanel);
}

function normalizeDifyAnswer(data) {
  return data.answer || data.raw?.answer || data.message || data.error || "AI 暂时没有返回内容。";
}

async function askAI(module, query) {
  if (!isAuthenticated()) {
    showAuthModal("AI 助教需要登录后使用。");
    state.ai.messages[module] = aiMessagesFor(module).concat({
      role: "assistant",
      text: "AI 助教需要登录后使用，这样后端才能安全调用 Dify。"
    });
    renderAIPanel(module);
    return;
  }
  const text = String(query || "").trim();
  if (!text) return;
  state.ai.messages[module] = aiMessagesFor(module).concat({ role: "user", text });
  state.ai.loadingModule = module;
  renderAIPanel(module);
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({
        module,
        query: text,
        conversation_id: state.ai.conversations[module] || "",
        inputs: aiContextPayload(module, text)
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI 助教请求失败。");
    state.ai.conversations[module] = data.conversation_id || state.ai.conversations[module] || "";
    state.ai.messages[module] = aiMessagesFor(module).concat({ role: "assistant", text: normalizeDifyAnswer(data) });
  } catch (err) {
    state.ai.messages[module] = aiMessagesFor(module).concat({
      role: "assistant",
      text: err.message || "AI 助教暂时不可用，请稍后再试。"
    });
  } finally {
    state.ai.loadingModule = null;
    renderAIPanel(module);
  }
}

function switchPage(page) {
  if (!pages[page]) return;
  const lockReason = pageLockReason(page);
  if (lockReason) {
    if (!isAuthenticated() && pageRequiresAuth(page)) {
      state.pendingPageAfterAuth = page;
      showAuthModal(lockReason);
    } else {
      announceLockedPage(lockReason);
    }
    updateAuthUI();
    return;
  }
  Object.values(pages).forEach(el => el.classList.remove("active"));
  pages[page].classList.add("active");
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  state.page = page;
  drawAll();
  announce(page);
}

function announceLockedPage(message) {
  announcerTitle.textContent = "模块暂未解锁";
  announcerText.textContent = message;
  announcer.classList.remove("hidden");
  clearTimeout(announcerTimer);
  announcerTimer = setTimeout(() => announcer.classList.add("hidden"), 3200);
}

function homeQuickSearch() {
  const input = $("#homeQuickInput");
  const raw = input?.value.trim().toLowerCase() || "";
  const aliases = {
    "1": "oneD",
    "oned": "oneD",
    "one": "oneD",
    "一维": "oneD",
    "一维模型": "oneD",
    "stm": "stm",
    "扫描": "stm",
    "扫描隧道": "stm",
    "alpha": "alpha",
    "α": "alpha",
    "阿尔法": "alpha",
    "衰变": "alpha",
    "flash": "flash",
    "fn": "flash",
    "闪存": "flash",
    "rtd": "rtd",
    "共振": "rtd",
    "共振隧穿": "rtd",
    "二极管": "rtd"
  };
  const page = aliases[raw] || (raw.includes("stm") ? "stm" : raw.includes("rtd") ? "rtd" : raw.includes("flash") || raw.includes("闪存") ? "flash" : raw.includes("alpha") || raw.includes("衰变") ? "alpha" : raw.includes("一维") ? "oneD" : "oneD");
  switchPage(page);
}

function announcementFor(page) {
  const text = {
    home: ["欢迎回到主页面", "当前可选择一维模型、α 衰变、STM、闪存隧穿和共振隧穿二极管。"],
    oneD: ["欢迎来到一维量子隧穿页面", "可调参数包括势垒高度、势垒宽度、粒子质量、粒子能量和绘图范围。"],
    alpha: ["欢迎来到 α 粒子发射页面", "可观察库仑势垒、外转折点和 α 粒子波函数的隧穿衰减。"],
    stm: ["欢迎来到扫描隧道显微镜 STM 页面", "可调参数包括探针距离、材料功函数和偏置电压。"],
    flash: ["欢迎来到闪存隧穿页面", "可观察栅压、氧化层厚度和势垒高度对 Fowler-Nordheim 隧穿电流的影响。"],
    rtd: ["欢迎来到共振隧穿二极管页面", "可观察双势垒量子阱、共振透射峰和负微分电阻区。"]
  };
  return text[page] || text.home;
}

function announce(page) {
  if (page === "home" && state.initialHome) {
    state.initialHome = false;
    return;
  }
  const [title, text] = announcementFor(page);
  announcerTitle.textContent = title;
  announcerText.textContent = text;
  announcer.classList.remove("hidden");
  clearTimeout(announcerTimer);
  announcerTimer = setTimeout(() => announcer.classList.add("hidden"), 2200);
}

function makeControl(container, cfg, obj, key, onChange) {
  const row = document.createElement("div");
  row.className = "control-row";
  row.dataset.symbol = cfg.symbol || key;
  row.innerHTML = `
    <div class="control-icon">${cfg.icon}</div>
    <div class="control-label">${cfg.label}</div>
    <div class="readout"></div>
    <input type="number" step="${cfg.step}" min="${cfg.min}" max="${cfg.max}">
    <div class="unit">${cfg.unit || ""}</div>
    <div class="slider-wrap">
      <input type="range" step="${cfg.step}" min="${cfg.min}" max="${cfg.max}">
      <div class="range-labels"><span>${fmt(cfg.min, cfg.format)}</span><span>${fmt(cfg.max, cfg.format)}</span></div>
    </div>
  `;
  const readout = row.querySelector(".readout");
  const input = row.querySelector("input[type=number]");
  const range = row.querySelector("input[type=range]");

  const sync = (value = obj[key]) => {
    obj[key] = Number(value);
    readout.textContent = fmt(obj[key], cfg.format);
    input.value = obj[key];
    range.value = obj[key];
    const p = (obj[key] - cfg.min) / (cfg.max - cfg.min) * 100;
    range.style.setProperty("--progress", `${clamp(p, 0, 100)}%`);
  };
  controlSyncers.push(sync);
  sync(obj[key]);

  input.addEventListener("input", () => {
    sync(clamp(Number(input.value), cfg.min, cfg.max));
    onChange();
  });
  range.addEventListener("input", () => {
    sync(Number(range.value));
    onChange();
  });
  range.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    sync(clamp(obj[key] + dir * cfg.step, cfg.min, cfg.max));
    onChange();
  }, { passive: false });

  container.appendChild(row);
}

function refreshControls() { controlSyncers.forEach(sync => sync()); }
function resetModel(name) {
  Object.assign(state[name], defaults[name]);
  refreshControls();
  drawAll();
}

function activeOneDSymbol() {
  return activeLinkedSymbol("oneD");
}

function setOneDFocus(symbol, locked = false) {
  setLinkedFocus("oneD", symbol, locked);
}

function updateOneDLinkedUI(values = {}) {
  updateLinkedUI("oneD", values);
}

function activeLinkedSymbol(module) {
  return state.linkedFocusModule === module ? state.linkedFocusSymbol : null;
}

function drawLinkedModule(module) {
  if (module === "oneD") drawOneD();
  if (module === "alpha") drawAlpha();
  if (module === "stm") drawSTM();
  if (module === "flash") drawFlash();
  if (module === "rtd") drawRTD();
}

function setLinkedFocus(module, symbol, locked = false) {
  const infoSet = linkedSymbolInfo[module];
  if (!infoSet || (symbol && !infoSet[symbol])) return;
  if (locked && state.linkedFocusLocked && state.linkedFocusModule === module && state.linkedFocusSymbol === symbol) {
    state.linkedFocusModule = null;
    state.linkedFocusSymbol = null;
    state.linkedFocusLocked = false;
  } else {
    state.linkedFocusModule = symbol ? module : null;
    state.linkedFocusSymbol = symbol || null;
    state.linkedFocusLocked = Boolean(locked && symbol);
  }
  state.oneDFocus = state.linkedFocusModule === "oneD" ? state.linkedFocusSymbol : null;
  state.oneDFocusLocked = state.linkedFocusModule === "oneD" && state.linkedFocusLocked;
  updateLinkedUI(module);
  drawLinkedModule(module);
}

function linkedValueText(module, symbol, values) {
  const formatters = {
    oneD: {
      V0: v => `当前值：V₀ = ${v.V0.toFixed(2)} a.u.`,
      a: v => `当前值：a = ${v.a.toFixed(2)} a.u.`,
      E: v => `当前值：E = ${v.E.toFixed(2)} a.u.`,
      m: v => `当前值：m = ${v.m.toFixed(2)} a.u.`,
      kappa: v => `当前值：κ = ${(v.kappa ?? 0).toFixed(4)}`,
      T: v => `当前值：T = ${v.T.toExponential(3)}`,
      R: v => `当前值：R = ${(1 - v.T).toExponential(3)}`
    },
    stm: {
      d: v => `当前值：d = ${v.d.toFixed(1)} Å`,
      phi: v => `当前值：φ = ${v.phi.toFixed(1)} eV`,
      bias: v => `当前值：Vb = ${v.bias.toFixed(2)} V`,
      kappa: v => `当前值：κ = ${v.kappa.toFixed(3)} Å⁻¹`,
      I: v => `当前值：Irel = ${v.I.toExponential(3)}`
    },
    alpha: {
      Zd: v => `当前值：Zd = ${v.Zd.toFixed(0)}`,
      Ealpha: v => `当前值：Eα = ${v.Ealpha.toFixed(1)} MeV`,
      R: v => `当前值：R = ${v.R.toFixed(1)} fm`,
      r2: v => `当前值：r₂ = ${v.r2.toFixed(2)} fm`,
      P: v => `当前穿透趋势：P≈${v.penetrability.toExponential(3)}`
    },
    flash: {
      gateV: v => `当前值：Vg = ${v.gateV.toFixed(1)} V`,
      tox: v => `当前值：tox = ${v.tox.toFixed(1)} nm`,
      phi: v => `当前值：φB = ${v.phi.toFixed(1)} eV`,
      eox: v => `当前值：Eox = ${v.eox.toFixed(3)} V/nm`,
      j: v => `当前值：JFN = ${v.j.toExponential(3)} a.u.`
    },
    rtd: {
      barrierHeight: v => `当前值：Vb = ${v.barrierHeight.toFixed(2)} eV`,
      barrierWidth: v => `当前值：b = ${v.barrierWidth.toFixed(1)} nm`,
      wellWidth: v => `当前值：w = ${v.wellWidth.toFixed(1)} nm`,
      bias: v => `当前值：V = ${v.bias.toFixed(2)} V`,
      e1: v => `当前值：E₁ = ${v.e1.toFixed(3)} eV`,
      current: v => `当前值：I = ${v.current.toExponential(3)}`
    }
  };
  try {
    return formatters[module]?.[symbol]?.(values) || "";
  } catch {
    return "";
  }
}

function updateLinkedUI(module, values = moduleMetrics(module)) {
  const symbol = activeLinkedSymbol(module);
  const page = pages[module];
  if (!page) return;
  page.querySelectorAll("[data-symbol]").forEach(el => {
    el.classList.toggle("link-active", Boolean(symbol && el.dataset.symbol === symbol));
    el.classList.toggle("locked", Boolean(state.linkedFocusLocked && state.linkedFocusModule === module && el.dataset.symbol === symbol));
  });

  const infoBox = document.getElementById(`${module}LinkedInfo`);
  if (!infoBox) return;
  if (!symbol) {
    infoBox.innerHTML = "<strong>选择一个符号</strong><p>把鼠标移到参数、公式或符号按钮上，查看它在图像、公式、参数和解释中的对应关系。</p>";
    return;
  }

  const info = linkedSymbolInfo[module][symbol];
  const valueText = linkedValueText(module, symbol, values);

  infoBox.innerHTML = `
    <strong>${info.name}</strong>
    <p>${info.region}</p>
    <p>${info.explain}</p>
    ${valueText ? `<p class="linked-value">${valueText}</p>` : ""}
  `;
}

function saveCanvas(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

function setupControls() {
  [
    ["V0", { label: "势垒高度 V₀", min: 0.1, max: 20, step: 0.1, unit: "a.u.", icon: "V₀", format: 1 }],
    ["a", { label: "势垒宽度 a", min: 0.1, max: 5, step: 0.01, unit: "a.u.", icon: "a", format: 2 }],
    ["m", { label: "粒子质量 m", min: 0.1, max: 5, step: 0.01, unit: "a.u.", icon: "m", format: 2 }],
    ["E", { label: "粒子能量 E", min: 0.05, max: 20, step: 0.1, unit: "a.u.", icon: "E", format: 1 }]
  ].forEach(([key, cfg]) => makeControl($("#oneDControls"), cfg, state.oneD, key, drawOneD));

  [
    ["xmin", { label: "x 最小值", min: -10, max: 0, step: 0.1, unit: "", icon: "x₁", format: 1 }],
    ["xmax", { label: "x 最大值", min: 1, max: 10, step: 0.1, unit: "", icon: "x₂", format: 1 }],
    ["n", { label: "网格点数", min: 200, max: 2000, step: 100, unit: "", icon: "N", format: 0 }]
  ].forEach(([key, cfg]) => makeControl($("#rangeControls"), cfg, state.oneD, key, drawOneD));

  [
    ["Zd", { label: "子核电荷数 Zd", min: 50, max: 100, step: 1, unit: "", icon: "Z", format: 0 }],
    ["Ealpha", { label: "α 能量 Eα", min: 3, max: 12, step: 0.1, unit: "MeV", icon: "Eα", format: 1 }],
    ["R", { label: "核半径 R", min: 5, max: 12, step: 0.1, unit: "fm", icon: "R", format: 1 }],
    ["well", { label: "核内势阱", min: -60, max: 0, step: 1, unit: "MeV", icon: "V", format: 0 }]
  ].forEach(([key, cfg]) => makeControl($("#alphaControls"), cfg, state.alpha, key, drawAlpha));

  [
    ["d", { label: "探针距离 d", min: 2, max: 10, step: 0.1, unit: "Å", icon: "d", format: 1 }],
    ["phi", { label: "功函数 φ", min: 1, max: 8, step: 0.1, unit: "eV", icon: "φ", format: 1 }],
    ["bias", { label: "偏置电压 Vb", min: 0.01, max: 2, step: 0.01, unit: "V", icon: "Vb", format: 2 }]
  ].forEach(([key, cfg]) => makeControl($("#stmControls"), cfg, state.stm, key, drawSTM));

  [
    ["gateV", { label: "控制栅电压 Vg", min: 4, max: 20, step: 0.1, unit: "V", icon: "Vg", format: 1 }],
    ["tox", { label: "隧穿氧化层 tox", min: 4, max: 14, step: 0.1, unit: "nm", icon: "tox", format: 1 }],
    ["phi", { label: "Si/SiO₂ 势垒 φB", min: 2.2, max: 4.2, step: 0.1, unit: "eV", icon: "φB", format: 1 }],
    ["vth", { label: "阈值/平带修正", min: 0, max: 4, step: 0.1, unit: "V", icon: "Vth", format: 1 }]
  ].forEach(([key, cfg]) => makeControl($("#flashControls"), cfg, state.flash, key, drawFlash));

  [
    ["barrierHeight", { label: "势垒高度 Vb", min: 0.15, max: 0.8, step: 0.01, unit: "eV", icon: "Vb", format: 2 }],
    ["barrierWidth", { label: "单个势垒宽度", min: 0.8, max: 4, step: 0.1, unit: "nm", icon: "b", format: 1 }],
    ["wellWidth", { label: "量子阱宽度", min: 3, max: 10, step: 0.1, unit: "nm", icon: "w", format: 1 }],
    ["bias", { label: "外加偏压", min: 0, max: 0.8, step: 0.01, unit: "V", icon: "V", format: 2 }],
    ["mEff", { label: "有效质量 m*", min: 0.04, max: 0.2, step: 0.001, unit: "m₀", icon: "m*", format: 3 }]
  ].forEach(([key, cfg]) => makeControl($("#rtdControls"), cfg, state.rtd, key, drawRTD));
}

function plotFrame(ctx, x, y, w, h, title, xlabel, ylabel) {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#dbe5f2";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#12213f";
  ctx.font = "700 20px Microsoft YaHei UI";
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y - 14);
  ctx.font = "15px Microsoft YaHei UI";
  ctx.fillText(xlabel, x + w / 2, y + h + 36);
  ctx.save();
  ctx.translate(x - 46, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawGrid(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "#e3ebf6";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const gx = x + w * i / 6;
    const gy = y + h * i / 6;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.restore();
}

function drawAxisLabels(ctx, x, y, w, h, xticks, yticks, xMap, yMap, color = "#64748b") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "13px Microsoft YaHei UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  xticks.forEach(([value, label]) => ctx.fillText(label, xMap(value), y + h + 8));
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yticks.forEach(([value, label]) => ctx.fillText(label, x - 10, yMap(value)));
  ctx.restore();
}

function drawLegend(ctx, items, x, y) {
  ctx.save();
  ctx.font = "13px Microsoft YaHei UI";
  items.forEach(([label, color, dash], i) => {
    const ly = y + i * 22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash(dash ? [7, 6] : []);
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + 30, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#12213f";
    ctx.fillText(label, x + 38, ly + 4);
  });
  ctx.restore();
}

function transmission(E, V0, a, m) {
  const k = Math.sqrt(2 * m * Math.max(E, 1e-12));
  if (Math.abs(E - V0) < 1e-10) return [1 / (1 + (m * V0 * a * a) / 2), k, 0];
  if (E < V0) {
    const kappa = Math.sqrt(2 * m * (V0 - E));
    const sinh = Math.sinh(Math.min(kappa * a, 40));
    const denom = 1 + (V0 * V0 * sinh * sinh) / (4 * E * (V0 - E));
    return [1 / denom, k, kappa];
  }
  const q = Math.sqrt(2 * m * (E - V0));
  const denom = 1 + (V0 * V0 * Math.sin(q * a) ** 2) / (4 * E * (E - V0));
  return [1 / denom, k, 0];
}

function cAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function cSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function cMul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cScale(s, a) { return [s * a[0], s * a[1]]; }
function cDiv(a, b) {
  const d = b[0] * b[0] + b[1] * b[1] || 1e-30;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}
function cExpI(theta) { return [Math.cos(theta), Math.sin(theta)]; }
function cAbs2(a) { return a[0] * a[0] + a[1] * a[1]; }

function rectangularBarrierCoeffs(E, V0, a, m) {
  // ħ = 1。E < V0 时采用矩形势垒精确匹配解（入射振幅 A = 1）：
  // ψ_I = e^{ikx} + B e^{-ikx}
  // ψ_II = C e^{κx} + D e^{-κx}
  // ψ_III = F e^{ikx}
  // Δ = cosh(κa) + i (κ²-k²)/(2kκ) sinh(κa)
  const k = Math.sqrt(2 * m * Math.max(E, 1e-12));
  if (E < V0 - 1e-10) {
    const kappa = Math.sqrt(2 * m * (V0 - E));
    const ka = Math.min(kappa * a, 40);
    const sh = Math.sinh(ka);
    const ch = Math.cosh(ka);
    const delta = [ch, ((kappa * kappa - k * k) / (2 * k * kappa)) * sh];
    const F = cDiv(cExpI(-k * a), delta);
    const B = cDiv([0, -((k * k + kappa * kappa) / (2 * k * kappa)) * sh], delta);
    const C = cScale(0.5, cDiv(cMul([1, k / kappa], [Math.exp(-ka), 0]), delta));
    const D = cScale(0.5, cDiv(cMul([1, -k / kappa], [Math.exp(ka), 0]), delta));
    return { regime: "tunnel", k, kappa, q: 0, A: [1, 0], B, C, D, F, delta };
  }
  if (E > V0 + 1e-10) {
    const q = Math.sqrt(2 * m * (E - V0));
    const gamma = [k / Math.max(q, 1e-12), 0];
    const one = [1, 0];
    const rho = cMul(cExpI(2 * q * a), cDiv(cSub(one, gamma), cAdd(one, gamma)));
    const num = cSub(cMul(rho, cAdd(one, gamma)), cSub(one, gamma));
    const den = cSub(cAdd(one, gamma), cMul(rho, cSub(one, gamma)));
    const B = cDiv(num, den);
    const C = cScale(0.5, cAdd(cAdd(one, B), cMul(gamma, cSub(one, B))));
    const D = cScale(0.5, cSub(cAdd(one, B), cMul(gamma, cSub(one, B))));
    const F = cMul(cAdd(cMul(C, cExpI(q * a)), cMul(D, cExpI(-q * a))), cExpI(-k * a));
    return { regime: "over", k, kappa: 0, q, A: [1, 0], B, C, D, F };
  }
  const one = [1, 0];
  const ika = [0, k * a];
  const den = cSub([2, 0], ika);
  const C = cDiv(cScale(2, cSub(one, ika)), den);
  const D = cDiv(cMul([0, k], C), cSub(one, ika));
  const B = cSub(C, one);
  const F = cMul(cAdd(C, cScale(a, D)), cExpI(-k * a));
  return { regime: "equal", k, kappa: 0, q: 0, A: [1, 0], B, C, D, F };
}

function evalBarrierPsi(x, a, coeffs) {
  const { k, kappa, q, B, C, D, F, regime } = coeffs;
  if (x < 0) {
    return cAdd(cExpI(k * x), cMul(B, cExpI(-k * x)));
  }
  if (x <= a) {
    if (regime === "tunnel") {
      // 稳定写法：ψ_II(x) = F e^{ika} [cosh(κ(a-x)) - (ik/κ) sinh(κ(a-x))]
      // 与 C e^{κx}+D e^{-κx} 等价，避免 κa 较大时系数溢出。
      const u = Math.min(kappa * (a - x), 40);
      const bracket = [Math.cosh(u), -(k / kappa) * Math.sinh(u)];
      return cMul(cMul(F, cExpI(k * a)), bracket);
    }
    if (regime === "over") {
      return cAdd(cMul(C, cExpI(q * x)), cMul(D, cExpI(-q * x)));
    }
    return cAdd(C, cScale(x, D));
  }
  return cMul(F, cExpI(k * x));
}

function psiRealPart(psi, phase) {
  return psi[0] * Math.cos(phase) + psi[1] * Math.sin(phase);
}

function psiImagPart(psi, phase) {
  return psi[1] * Math.cos(phase) - psi[0] * Math.sin(phase);
}

function drawOneD() {
  const p = state.oneD;
  if (p.xmax <= p.xmin) p.xmax = p.xmin + 1;
  const canvas = $("#oneDCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [T, k, kappa] = transmission(p.E, p.V0, p.a, p.m);

  $("#oneDResults").innerHTML = [
    ["透射率 T", T.toExponential(6), "T"],
    ["反射率 R", (1 - T).toExponential(6), "R"],
    ["波数 k", k.toFixed(6), "m"],
    ["衰减系数 κ", (p.E < p.V0 ? kappa : 0).toFixed(6), "kappa"],
    ["T + R", "1.000000", "T"]
  ].map(([a, b, symbol]) => `<div class="metric" ${symbol ? `data-symbol="${symbol}"` : ""}><strong>${a}</strong><span>${b}</span></div>`).join("");
  updateOneDLinkedUI({ V0: p.V0, a: p.a, E: p.E, m: p.m, kappa: p.E < p.V0 ? kappa : 0, T });
  $("#oneDExplain").textContent = p.E < p.V0
    ? "当前属于量子隧穿区（E < V₀）。经典粒子不能穿过势垒，但波函数在势垒内指数衰减并在另一侧保留非零振幅。"
    : "当前 E ≥ V₀，粒子可以越过势垒；透射率仍会因为波的相干叠加出现振荡。";

  if (state.plotMode === "oneD3d") return drawOneD3D(ctx, p, T, k, kappa);
  if (state.plotMode === "oneDTR") return drawOneDTR(ctx, p, T);

  const top = { x: 96, y: 72, w: 790, h: 245 };
  const bottom = { x: 96, y: 432, w: 790, h: 235 };
  const xs = linspace(p.xmin, p.xmax, Math.max(200, Math.min(1600, Math.round(p.n))));
  const ymax = Math.max(p.V0, p.E) * 1.25;
  const focus = activeOneDSymbol();

  plotFrame(ctx, top.x, top.y, top.w, top.h, "势垒与粒子能量", "位置 x", "能量");
  drawGrid(ctx, top.x, top.y, top.w, top.h);
  const xMapTop = v => mapX(v, p.xmin, p.xmax, top.x, top.w);
  const yMapTop = v => mapY(v, 0, ymax, top.y, top.h);
  drawAxisLabels(ctx, top.x, top.y, top.w, top.h,
    [[p.xmin, p.xmin.toFixed(0)], [0, "0"], [p.a, p.a.toFixed(1)], [p.xmax, p.xmax.toFixed(0)]],
    [[0, "0"], [p.E, p.E.toFixed(1)], [p.V0, p.V0.toFixed(1)]],
    xMapTop, yMapTop
  );
  const topX0 = clamp(xMapTop(0), top.x, top.x + top.w);
  const topXa = clamp(xMapTop(p.a), top.x, top.x + top.w);
  if ((focus === "V0" || focus === "a") && topXa > topX0) {
    ctx.fillStyle = focus === "V0" ? "rgba(245, 158, 11, .24)" : "rgba(16, 185, 129, .18)";
    ctx.fillRect(topX0, yMapTop(p.V0), topXa - topX0, yMapTop(0) - yMapTop(p.V0));
    ctx.strokeStyle = focus === "V0" ? "#f59e0b" : "#10b981";
    ctx.lineWidth = 3;
    ctx.strokeRect(topX0, yMapTop(p.V0), topXa - topX0, yMapTop(0) - yMapTop(p.V0));
  }
  if (focus === "E") {
    ctx.strokeStyle = "#f59e0b";
    ctx.setLineDash([7, 5]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(top.x, yMapTop(p.E));
    ctx.lineTo(top.x + top.w, yMapTop(p.E));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.beginPath();
  xs.forEach((xv, i) => {
    const V = xv >= 0 && xv <= p.a ? p.V0 : 0;
    const px = xMapTop(xv), py = yMapTop(V);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
  ctx.strokeStyle = "#dc2626"; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(top.x, yMapTop(p.E)); ctx.lineTo(top.x + top.w, yMapTop(p.E)); ctx.stroke(); ctx.setLineDash([]);

  plotFrame(ctx, bottom.x, bottom.y, bottom.w, bottom.h, "波函数实部示意", "位置 x", "Re[ψ(x)]");
  drawGrid(ctx, bottom.x, bottom.y, bottom.w, bottom.h);
  const xMapBottom = v => mapX(v, p.xmin, p.xmax, bottom.x, bottom.w);
  const phase = state.heroPhase * TAU;
  const coeffs = rectangularBarrierCoeffs(p.E, p.V0, p.a, p.m);
  const psiValues = xs.map(xv => psiRealPart(evalBarrierPsi(xv, p.a, coeffs), phase));
  const observedLimit = Math.max(...psiValues.map(v => Math.abs(v)), 1.05);
  const yLimit = observedLimit < 3 ? Math.ceil(observedLimit * 12) / 10 : Math.ceil(observedLimit * 1.12);
  const yMapBottom = v => mapY(v, -yLimit, yLimit, bottom.y, bottom.h);
  const bx1 = clamp(xMapBottom(0), bottom.x, bottom.x + bottom.w);
  const bx2 = clamp(xMapBottom(p.a), bottom.x, bottom.x + bottom.w);
  ctx.fillStyle = "rgba(37,99,235,.12)";
  if (bx2 > bx1) ctx.fillRect(bx1, bottom.y, bx2 - bx1, bottom.h);
  if ((focus === "a" || focus === "kappa" || focus === "V0") && bx2 > bx1) {
    ctx.fillStyle = focus === "kappa" ? "rgba(245, 158, 11, .22)" : "rgba(16, 185, 129, .15)";
    ctx.fillRect(bx1, bottom.y, bx2 - bx1, bottom.h);
    ctx.strokeStyle = focus === "kappa" ? "#f59e0b" : "#10b981";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx1, bottom.y, bx2 - bx1, bottom.h);
  }
  if (focus === "T") {
    const tx = clamp(xMapBottom(p.a), bottom.x, bottom.x + bottom.w);
    ctx.fillStyle = "rgba(124, 58, 237, .14)";
    ctx.fillRect(tx, bottom.y, bottom.x + bottom.w - tx, bottom.h);
  }
  drawAxisLabels(ctx, bottom.x, bottom.y, bottom.w, bottom.h,
    [[p.xmin, p.xmin.toFixed(0)], [0, "0"], [p.a, p.a.toFixed(1)], [p.xmax, p.xmax.toFixed(0)]],
    [[-yLimit, (-yLimit).toFixed(1)], [0, "0"], [yLimit, yLimit.toFixed(1)]],
    xMapBottom, yMapBottom
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(bottom.x, bottom.y, bottom.w, bottom.h);
  ctx.clip();
  ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 4; ctx.beginPath();
  xs.forEach((xv, i) => {
    const px = xMapBottom(xv), py = yMapBottom(psiValues[i]);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}

function drawOneDTR(ctx, p, Tnow) {
  const area = { x: 96, y: 80, w: 790, h: 520 };
  const eMax = Math.max(p.V0 * 2, p.E * 1.2, 1);
  const eMin = 1e-4;
  const n = 500;
  const energies = linspace(eMin, eMax, n);
  const Ts = energies.map(E => transmission(E, p.V0, p.a, p.m)[0]);
  const Rs = Ts.map(T => 1 - T);
  const focus = activeOneDSymbol();
  const xMap = v => mapX(v, 0, eMax, area.x, area.w);
  const yMap = v => mapY(v, 0, 1, area.y, area.h);

  plotFrame(ctx, area.x, area.y, area.w, area.h, "透射率 T(E) 与反射率 R(E)", "能量 E", "概率");
  drawGrid(ctx, area.x, area.y, area.w, area.h);
  drawAxisLabels(ctx, area.x, area.y, area.w, area.h,
    [[0, "0"], [p.V0, `V₀=${p.V0.toFixed(1)}`], [p.E, `E=${p.E.toFixed(1)}`], [eMax, eMax.toFixed(1)]],
    [[0, "0"], [0.5, "0.5"], [1, "1"]],
    xMap, yMap
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();

  const drawCurve = (ys, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    energies.forEach((E, i) => {
      const px = xMap(E);
      const py = yMap(clamp(ys[i], 0, 1));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
  };

  const tWidth = focus === "T" ? 5.5 : 3.5;
  const rWidth = focus === "R" ? 5.5 : 3.5;
  drawCurve(Ts, "#2563eb", tWidth);
  drawCurve(Rs, "#f97316", rWidth);

  const xV0 = xMap(p.V0);
  ctx.strokeStyle = focus === "V0" ? "#f59e0b" : "#94a3b8";
  ctx.lineWidth = focus === "V0" ? 4 : 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(xV0, area.y);
  ctx.lineTo(xV0, area.y + area.h);
  ctx.stroke();
  ctx.setLineDash([]);

  const xE = xMap(clamp(p.E, 0, eMax));
  const yT = yMap(clamp(Tnow, 0, 1));
  const yR = yMap(clamp(1 - Tnow, 0, 1));
  ctx.strokeStyle = focus === "E" ? "#f59e0b" : "#dc2626";
  ctx.lineWidth = focus === "E" ? 4 : 2.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(xE, area.y);
  ctx.lineTo(xE, area.y + area.h);
  ctx.stroke();
  ctx.setLineDash([]);

  const drawPoint = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawPoint(xE, yT, "#2563eb");
  drawPoint(xE, yR, "#f97316");
  ctx.restore();

  drawLegend(ctx, [
    ["透射率 T(E)", "#2563eb", false],
    ["反射率 R(E)", "#f97316", false],
    ["当前能量 E", "#dc2626", true],
    ["势垒高度 V₀", "#94a3b8", true]
  ], area.x + area.w - 170, area.y + 18);

  ctx.save();
  ctx.fillStyle = "#334155";
  ctx.font = "13px Microsoft YaHei UI";
  ctx.textAlign = "left";
  ctx.fillText(`当前：T=${Tnow.toExponential(3)}, R=${(1 - Tnow).toExponential(3)}（V₀=${p.V0.toFixed(2)}, a=${p.a.toFixed(2)}, m=${p.m.toFixed(2)}）`, area.x, area.y + area.h + 58);
  ctx.restore();
}

function drawOneD3D(ctx, p, T, k, kappa) {
  const area = { x: 70, y: 70, w: 840, h: 600 };
  const phase = state.heroPhase * 8;
  const coeffs = rectangularBarrierCoeffs(p.E, p.V0, p.a, p.m);
  const ampR = Math.sqrt(cAbs2(coeffs.B));
  const ampT = Math.sqrt(cAbs2(coeffs.F));
  const focus = activeOneDSymbol();
  const xMin = -10;
  const xMax = Math.max(16, p.a + 16);
  const xMid = (xMin + xMax) / 2;
  const yMin = -1.55, yMax = 1.55, zMin = -1.55, zMax = 1.55;
  const centerX = area.x + area.w * 0.47;
  const centerY = area.y + area.h * 0.60;
  const sx = area.w * 0.73 / (xMax - xMin);
  const sy = 66;
  const sz = 126;
  const xSlope = 4.8;
  const ySlope = 38;

  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(area.x - 26, area.y - 42, area.w + 52, area.h + 78);
  ctx.fillStyle = "#12213f";
  ctx.font = "700 25px Microsoft YaHei UI";
  ctx.textAlign = "center";
  ctx.fillText("三维量子隧穿波动演示", area.x + area.w / 2, area.y - 20);

  function proj(x, y, z) {
    const dx = x - xMid;
    return [
      centerX + dx * sx + y * sy,
      centerY + dx * xSlope - y * ySlope - z * sz
    ];
  }
  function path3(points) {
    ctx.beginPath();
    points.forEach(([x, y, z], i) => {
      const [px, py] = proj(x, y, z);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
  }
  function line3(a, b, color = "#b7c0cc", width = 1.25, dash = []) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    path3([a, b]);
    ctx.stroke();
    ctx.restore();
  }
  function fillPlane(xValue) {
    const corners = [
      [xValue, yMin, zMin],
      [xValue, yMax, zMin],
      [xValue, yMax, zMax],
      [xValue, yMin, zMax]
    ];
    path3(corners);
    ctx.closePath();
    const barrierFocus = focus === "V0" || focus === "a" || focus === "kappa";
    ctx.fillStyle = barrierFocus ? "rgba(245, 158, 11, 0.25)" : "rgba(93, 64, 83, 0.16)";
    ctx.strokeStyle = barrierFocus ? "rgba(245, 158, 11, 0.78)" : "rgba(93, 64, 83, 0.28)";
    ctx.lineWidth = barrierFocus ? 2.5 : 1.5;
    ctx.fill();
    ctx.stroke();
  }
  function drawCurve(points, color, width = 3, dash = []) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dash);
    path3(points);
    ctx.stroke();
    ctx.restore();
  }

  // 3D grid box: x is the propagation direction, y is real part, z is imaginary part.
  ctx.save();
  const xticks = [-10, -5, 0, 5, 10, 15].filter(v => v >= xMin && v <= xMax);
  const yzTicks = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];
  xticks.forEach(x => {
    line3([x, yMin, zMin], [x, yMax, zMin], "#d4dbe6", 1);
    line3([x, yMax, zMin], [x, yMax, zMax], "#d4dbe6", 1);
  });
  yzTicks.forEach(y => line3([xMin, y, zMin], [xMax, y, zMin], "#e2e8f0", 1));
  yzTicks.forEach(z => line3([xMin, yMax, z], [xMax, yMax, z], "#e2e8f0", 1));
  [
    [[xMin, yMin, zMin], [xMax, yMin, zMin]],
    [[xMin, yMax, zMin], [xMax, yMax, zMin]],
    [[xMin, yMax, zMax], [xMax, yMax, zMax]],
    [[xMin, yMin, zMin], [xMin, yMax, zMin]],
    [[xMax, yMin, zMin], [xMax, yMax, zMin]],
    [[xMin, yMax, zMin], [xMin, yMax, zMax]],
    [[xMax, yMax, zMin], [xMax, yMax, zMax]]
  ].forEach(([a, b]) => line3(a, b, "#9aa4b2", 1.4));
  line3([xMin, 0, 0], [xMax, 0, 0], "#111827", 2);
  line3([xMin, yMin, 0], [xMin, yMax, 0], "#111827", 1.7);
  line3([xMin, 0, zMin], [xMin, 0, zMax], "#111827", 1.7);
  ctx.restore();

  fillPlane(0);
  fillPlane(p.a);

  const left = linspace(xMin, 0, 420);
  const barrier = linspace(0, p.a, 180);
  const right = linspace(p.a, xMax, 420);
  const wavePoint = x => {
    const psi = evalBarrierPsi(x, p.a, coeffs);
    return [x, psiRealPart(psi, phase) * 0.5, psiImagPart(psi, phase) * 0.5];
  };
  const incident = left.map(x => {
    const psi = cExpI(coeffs.k * x);
    return [x, psiRealPart(psi, phase), psiImagPart(psi, phase)];
  });
  const reflected = left.map(x => {
    const psi = cMul(coeffs.B, cExpI(-coeffs.k * x));
    return [x, psiRealPart(psi, phase), psiImagPart(psi, phase)];
  });
  const superposed = left.map(wavePoint);
  const inside = barrier.map(wavePoint);
  const transmitted = right.map(wavePoint);

  drawCurve(incident, "#1f77b4", focus === "E" ? 4.6 : 3.4);
  drawCurve(reflected, "#ff7f0e", 3.2);
  drawCurve(superposed, "#2ca02c", 2.5, [8, 6]);
  drawCurve(inside, "#d62728", focus === "kappa" ? 5 : 3.4);
  drawCurve(transmitted, "#8e63be", focus === "T" ? 5 : 3.4);

  ctx.fillStyle = "#111827";
  ctx.font = "16px Microsoft YaHei UI";
  ctx.textAlign = "center";
  const xLabel = proj(xMax + 0.8, 0, zMin);
  ctx.fillText("位置 x", xLabel[0], xLabel[1] + 30);
  const yLabel = proj(xMin, yMax + 0.34, 0);
  ctx.fillText("实部", yLabel[0] + 32, yLabel[1] + 10);
  const zLabel = proj(xMin, 0, zMax + 0.15);
  ctx.save();
  ctx.translate(zLabel[0] - 28, zLabel[1]);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("虚部", 0, 0);
  ctx.restore();

  drawLegend(ctx, [
    ["入射波", "#1f77b4"],
    ["反射波", "#ff7f0e"],
    ["叠加波", "#2ca02c", true],
    ["势垒区波", "#d62728"],
    ["透射波", "#8e63be"]
  ], area.x + area.w - 150, area.y + 10);
  ctx.restore();
}

function drawAlpha() {
  const p = state.alpha, canvas = $("#alphaCanvas"), ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const Za = 2, C = 1.44, barrierR = C * p.Zd * Za / p.R, r2 = C * p.Zd * Za / p.Ealpha;
  const focus = activeLinkedSymbol("alpha");
  const rMax = Math.max(45, Math.min(100, r2 * 1.25));
  const area = { x: 95, y: 82, w: 860, h: 520 };
  plotFrame(ctx, area.x, area.y, area.w, area.h, "α 粒子衰变中的量子隧穿", "r / fm", "势能 / MeV");
  drawGrid(ctx, area.x, area.y, area.w, area.h);
  const ymin = Math.min(p.well * 1.15, -5), ymax = Math.max(barrierR * 1.15, p.Ealpha * 1.3, 10);
  const xMap = r => mapX(r, 0, rMax, area.x, area.w);
  const yMap = v => mapY(v, ymin, ymax, area.y, area.h);
  drawAxisLabels(ctx, area.x, area.y, area.w, area.h,
    [[0, "0"], [p.R, `R=${p.R.toFixed(1)}`], [Math.min(r2, rMax), `r₂=${r2.toFixed(1)}`], [rMax, rMax.toFixed(0)]],
    [[p.well, p.well.toFixed(0)], [p.Ealpha, p.Ealpha.toFixed(1)], [barrierR, barrierR.toFixed(1)]],
    xMap, yMap
  );
  if (r2 > p.R) {
    ctx.beginPath();
    for (let i = 0; i < 500; i++) {
      const r = p.R + (Math.min(r2, rMax) - p.R) * i / 499;
      const V = C * p.Zd * Za / Math.max(r, 1e-9);
      i ? ctx.lineTo(xMap(r), yMap(V)) : ctx.moveTo(xMap(r), yMap(V));
    }
    for (let i = 499; i >= 0; i--) {
      const r = p.R + (Math.min(r2, rMax) - p.R) * i / 499;
      ctx.lineTo(xMap(r), yMap(p.Ealpha));
    }
    ctx.closePath();
    ctx.fillStyle = focus === "P" || focus === "r2" || focus === "Zd" ? "rgba(245, 158, 11, 0.24)" : "rgba(37, 99, 235, 0.16)";
    ctx.fill();
  }
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.beginPath();
  ctx.moveTo(xMap(.1), yMap(p.well)); ctx.lineTo(xMap(p.R), yMap(p.well)); ctx.stroke();
  ctx.strokeStyle = focus === "Zd" ? "#f59e0b" : "#1d4ed8"; ctx.lineWidth = focus === "Zd" ? 5 : 4; ctx.beginPath();
  for (let i = 0; i < 900; i++) {
    const r = p.R + (rMax - p.R) * i / 899;
    const V = C * p.Zd * Za / r;
    i ? ctx.lineTo(xMap(r), yMap(V)) : ctx.moveTo(xMap(r), yMap(V));
  }
  ctx.stroke();
  ctx.strokeStyle = focus === "Ealpha" ? "#f59e0b" : "#dc2626"; ctx.setLineDash([9, 7]); ctx.lineWidth = focus === "Ealpha" ? 5 : 2.5;
  ctx.beginPath(); ctx.moveTo(area.x, yMap(p.Ealpha)); ctx.lineTo(area.x + area.w, yMap(p.Ealpha)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = focus === "R" ? "#f59e0b" : "#0f766e"; ctx.lineWidth = focus === "R" ? 5 : 2; ctx.beginPath(); ctx.moveTo(xMap(p.R), area.y); ctx.lineTo(xMap(p.R), area.y + area.h); ctx.stroke();
  if (r2 > p.R && r2 < rMax) {
    ctx.strokeStyle = focus === "r2" ? "#f59e0b" : "#7c3aed"; ctx.lineWidth = focus === "r2" ? 5 : 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(xMap(r2), area.y); ctx.lineTo(xMap(r2), area.y + area.h); ctx.stroke(); ctx.setLineDash([]);
  }
  // 波函数曲线按可视化比例绘制：强调核内振荡、势垒内衰减和势垒外出射波的连续关系。
  const waveAmp = Math.max(1.8, 0.045 * (ymax - ymin));
  const rIn = linspace(0.2, p.R, 450);
  const kIn = 0.55 * Math.sqrt(Math.max(p.Ealpha - p.well, 1e-9));
  const kOut = 0.55 * Math.sqrt(Math.max(p.Ealpha, 1e-9));
  const phase = state.heroPhase * TAU;
  const kappaAt = r => Math.sqrt(Math.max(C * p.Zd * Za / Math.max(r, 1e-9) - p.Ealpha, 0));
  const kappaR = Math.max(kappaAt(p.R), .18);
  let barrierAction = 0;
  const boundaryOffset = waveAmp * Math.sin(kIn * p.R - phase);
  let barrierExitOffset = boundaryOffset;
  ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 3; ctx.beginPath();
  rIn.forEach((r, i) => {
    const psi = p.Ealpha + waveAmp * Math.sin(kIn * r - phase);
    i ? ctx.lineTo(xMap(r), yMap(psi)) : ctx.moveTo(xMap(r), yMap(psi));
  });
  ctx.stroke();

  if (r2 > p.R) {
    const rBar = linspace(p.R, Math.min(r2, rMax), 520);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    rBar.forEach((r, i) => {
      if (i > 0) {
        barrierAction += 0.2 * kappaAt(r) * (r - rBar[i - 1]);
      }
      // u₂(r) ∝ [κ(R)κ(r)]^(-1/2) exp[-∫κ(r')dr'] 的可视化形式。
      const matching = Math.sqrt(kappaR / Math.max(kappaAt(r), .18));
      const psiOffset = boundaryOffset * matching * Math.exp(-barrierAction);
      if (i === rBar.length - 1) barrierExitOffset = psiOffset;
      const psi = p.Ealpha + psiOffset;
      i ? ctx.lineTo(xMap(r), yMap(psi)) : ctx.moveTo(xMap(r), yMap(psi));
    });
    ctx.stroke();
  }

  const outgoingStart = Math.max(p.R, Math.min(r2, rMax));
  if (outgoingStart < rMax) {
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const rOut = linspace(outgoingStart, rMax, 420);
    const outgoingTarget = Math.sign(barrierExitOffset || boundaryOffset || 1) * Math.max(Math.abs(barrierExitOffset), waveAmp * .46);
    rOut.forEach((r, i) => {
      // 从 u₂(r₂) 的末值连续过渡到视觉放大的出射波，避免在 r₂ 处出现断点。
      const distance = r - outgoingStart;
      const envelope = barrierExitOffset + (outgoingTarget - barrierExitOffset) * (1 - Math.exp(-distance / 2.2));
      const psi = p.Ealpha + envelope * Math.cos(kOut * distance);
      i ? ctx.lineTo(xMap(r), yMap(psi)) : ctx.moveTo(xMap(r), yMap(psi));
    });
    ctx.stroke();
  }
  drawLegend(ctx, [
    ["库仑势垒", "#1d4ed8"],
    ["α 粒子能量", "#dc2626", true],
    ["核内 / 势垒外波函数", "#dc2626"],
    ["WKB 势垒内衰减（放大）", "#f97316"]
  ], area.x + area.w - 248, area.y + 28);
  const metrics = alphaMetrics();
  updateLinkedUI("alpha", metrics);
  $("#alphaSummary").textContent = `库仑势垒在核表面约 ${barrierR.toFixed(2)} MeV；外转折点 r₂≈${r2.toFixed(2)} fm；禁阻区宽度约 ${Math.max(0, r2 - p.R).toFixed(2)} fm。势垒内波函数按 WKB 匹配形式衰减；图中振幅按视觉比例放大，用于展示核内振荡、势垒内衰减和势垒外出射的趋势。`;
}

function drawSTM() {
  const p = state.stm, canvas = $("#stmCanvas"), ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const phiEffAvg = Math.max(p.phi - .5 * p.bias, .05);
  const kappa = .512 * Math.sqrt(phiEffAvg);
  const focus = activeLinkedSymbol("stm");
  const top = { x: 90, y: 78, w: 860, h: 210 };
  const transmissionPanel = { x: 90, y: 410, w: 860, h: 190 };
  const currentPanel = { x: 90, y: 730, w: 860, h: 190 };
  plotFrame(ctx, top.x, top.y, top.w, top.h, "STM：探针-真空势垒-样品与电子波函数", "x / Å", "势能 / eV");
  drawGrid(ctx, top.x, top.y, top.w, top.h);
  const xmin = -2, xmax = p.d + 2, ymax = p.phi * 1.45;
  const x0 = mapX(0, xmin, xmax, top.x, top.w);
  const xd = mapX(p.d, xmin, xmax, top.x, top.w);
  ctx.fillStyle = "rgba(15,118,110,.10)"; ctx.fillRect(top.x, top.y, x0 - top.x, top.h);
  ctx.fillStyle = "rgba(124,58,237,.12)"; ctx.fillRect(xd, top.y, top.x + top.w - xd, top.h);
  if (focus === "d" || focus === "kappa") {
    ctx.fillStyle = "rgba(245, 158, 11, .18)";
    ctx.fillRect(x0, top.y, xd - x0, top.h);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, top.y, xd - x0, top.h);
  }
  ctx.strokeStyle = focus === "phi" || focus === "bias" ? "#f59e0b" : "#2563eb"; ctx.lineWidth = focus === "phi" || focus === "bias" ? 5 : 4; ctx.beginPath();
  ctx.moveTo(top.x, mapY(0, -.4, ymax, top.y, top.h));
  ctx.lineTo(x0, mapY(0, -.4, ymax, top.y, top.h));
  ctx.lineTo(x0, mapY(p.phi, -.4, ymax, top.y, top.h));
  ctx.lineTo(xd, mapY(Math.max(p.phi - p.bias, .05), -.4, ymax, top.y, top.h));
  ctx.lineTo(xd, mapY(0, -.4, ymax, top.y, top.h));
  ctx.lineTo(top.x + top.w, mapY(0, -.4, ymax, top.y, top.h));
  ctx.stroke();
  const waveBase = 0.34 * p.phi;
  ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 3; ctx.beginPath();
  const points = linspace(xmin, xmax, 560);
  const phase = state.heroPhase * TAU;
  points.forEach((x, i) => {
    let amp = 0.65;
    if (x >= 0 && x <= p.d) amp *= Math.exp(-kappa * x);
    if (x > p.d) amp *= Math.exp(-kappa * p.d);
    const wave = waveBase + amp * Math.cos(2.2 * x - phase);
    const px = mapX(x, xmin, xmax, top.x, top.w);
    const py = mapY(wave, -.4, ymax, top.y, top.h);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
  // The normalized transmission makes the exponential T(d) relation visible
  // without losing the much smaller absolute current scale in the next panel.
  plotFrame(ctx, transmissionPanel.x, transmissionPanel.y, transmissionPanel.w, transmissionPanel.h, "透射趋势 T(d) 的指数衰减", "d / Å", "T(d) / T(2 Å)");
  drawGrid(ctx, transmissionPanel.x, transmissionPanel.y, transmissionPanel.w, transmissionPanel.h);
  const transmissionAtDistance = d => Math.exp(-2 * kappa * (d - 2));
  const transmissionNow = transmissionAtDistance(p.d);
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 400; i++) {
    const d = 2 + 8 * i / 399;
    const px = mapX(d, 2, 10, transmissionPanel.x, transmissionPanel.w);
    const py = mapY(transmissionAtDistance(d), 0, 1, transmissionPanel.y, transmissionPanel.h);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(mapX(p.d, 2, 10, transmissionPanel.x, transmissionPanel.w), mapY(transmissionNow, 0, 1, transmissionPanel.y, transmissionPanel.h), 6, 0, TAU);
  ctx.fill();
  if (focus === "d" || focus === "kappa" || focus === "phi") {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mapX(p.d, 2, 10, transmissionPanel.x, transmissionPanel.w), mapY(transmissionNow, 0, 1, transmissionPanel.y, transmissionPanel.h), 12, 0, TAU);
    ctx.stroke();
  }
  drawAxisLabels(ctx, transmissionPanel.x, transmissionPanel.y, transmissionPanel.w, transmissionPanel.h,
    [[2, "2"], [6, "6"], [10, "10"]],
    [[0, "0"], [.5, ".5"], [1, "1"]],
    d => mapX(d, 2, 10, transmissionPanel.x, transmissionPanel.w),
    value => mapY(value, 0, 1, transmissionPanel.y, transmissionPanel.h)
  );
  drawLegend(ctx, [["T(d) ∝ exp(-2κd)", "#0f766e"]], transmissionPanel.x + transmissionPanel.w - 190, transmissionPanel.y + 24);

  plotFrame(ctx, currentPanel.x, currentPanel.y, currentPanel.w, currentPanel.h, "相对隧穿电流 Irel(d)", "d / Å", "log₁₀(Irel)");
  drawGrid(ctx, currentPanel.x, currentPanel.y, currentPanel.w, currentPanel.h);
  const current = p.bias * Math.exp(-2 * kappa * p.d);
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.beginPath();
  for (let i = 0; i < 400; i++) {
    const d = 2 + 8 * i / 399;
    const I = Math.max(p.bias * Math.exp(-2 * kappa * d), 1e-10);
    const px = mapX(d, 2, 10, currentPanel.x, currentPanel.w);
    const py = mapY(Math.log10(I), -10, 0, currentPanel.y, currentPanel.h);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(mapX(p.d, 2, 10, currentPanel.x, currentPanel.w), mapY(Math.log10(Math.max(current, 1e-10)), -10, 0, currentPanel.y, currentPanel.h), 6, 0, TAU);
  ctx.fill();
  if (focus === "I" || focus === "d" || focus === "bias") {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mapX(p.d, 2, 10, currentPanel.x, currentPanel.w), mapY(Math.log10(Math.max(current, 1e-10)), -10, 0, currentPanel.y, currentPanel.h), 12, 0, TAU);
    ctx.stroke();
  }
  updateLinkedUI("stm", { ...p, kappa, I: current });
  $("#stmSummary").textContent = `有效 κ≈${kappa.toFixed(3)} Å⁻¹；当前归一化透射趋势 T(d)/T(2 Å)≈${transmissionNow.toExponential(3)}；当前相对电流 Irel≈${current.toExponential(3)}。距离每增加 1 Å，二者约变为原来的 ${Math.exp(-2 * kappa).toFixed(3)} 倍。`;
}

function flashCurrent(p, gateV = p.gateV) {
  const veff = Math.max(gateV - p.vth, 0.05);
  const eox = veff / p.tox;
  const exponent = -6.83 * Math.pow(p.phi, 1.5) / Math.max(eox, 0.02);
  const j = eox * eox * Math.exp(exponent);
  return { veff, eox, j, logJ: Math.log10(Math.max(j, 1e-30)) };
}

function drawFlash() {
  const p = state.flash, canvas = $("#flashCanvas"), ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const top = { x: 92, y: 80, w: 860, h: 260 }, bottom = { x: 92, y: 452, w: 860, h: 210 };
  const calc = flashCurrent(p);
  const focus = activeLinkedSymbol("flash");
  const vDrop = calc.veff;
  const yMin = -0.4, yMax = Math.max(p.phi * 1.28, vDrop * 0.45 + p.phi);
  const xMap = x => mapX(x, 0, p.tox, top.x, top.w);
  const yMap = e => mapY(e, yMin, yMax, top.y, top.h);

  plotFrame(ctx, top.x, top.y, top.w, top.h, "闪存写入/擦除：氧化层三角势垒与电子隧穿", "氧化层位置 x / nm", "电子势能 / eV");
  drawGrid(ctx, top.x, top.y, top.w, top.h);
  ctx.fillStyle = "rgba(245, 158, 11, 0.11)";
  ctx.fillRect(top.x, top.y, top.w, top.h);
  if (focus === "tox" || focus === "eox") {
    ctx.fillStyle = "rgba(245, 158, 11, .18)";
    ctx.fillRect(top.x, top.y, top.w, top.h);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.strokeRect(top.x, top.y, top.w, top.h);
  }
  ctx.fillStyle = "rgba(15, 118, 110, 0.10)";
  ctx.fillRect(top.x - 26, top.y, 26, top.h);
  ctx.fillStyle = "rgba(124, 58, 237, 0.10)";
  ctx.fillRect(top.x + top.w, top.y, 26, top.h);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xMap(0), yMap(p.phi));
  for (let i = 0; i <= 300; i++) {
    const x = p.tox * i / 300;
    const V = Math.max(p.phi - vDrop * x / p.tox, 0.04);
    ctx.lineTo(xMap(x), yMap(V));
  }
  ctx.lineTo(xMap(p.tox), yMap(0));
  ctx.lineTo(xMap(0), yMap(0));
  ctx.closePath();
  ctx.fillStyle = "rgba(37, 99, 235, 0.15)";
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = focus === "phi" || focus === "gateV" || focus === "eox" ? "#f59e0b" : "#2563eb"; ctx.lineWidth = focus === "phi" || focus === "gateV" || focus === "eox" ? 5 : 4; ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    const x = p.tox * i / 360;
    const V = Math.max(p.phi - vDrop * x / p.tox, 0.04);
    i ? ctx.lineTo(xMap(x), yMap(V)) : ctx.moveTo(xMap(x), yMap(V));
  }
  ctx.stroke();
  ctx.strokeStyle = "#dc2626"; ctx.setLineDash([9, 7]); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(top.x, yMap(0)); ctx.lineTo(top.x + top.w, yMap(0)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3; ctx.beginPath();
  let action = 0;
  for (let i = 0; i <= 430; i++) {
    const x = p.tox * i / 430;
    const V = Math.max(p.phi - vDrop * x / p.tox, 0);
    if (i > 0) action += 0.8 * Math.sqrt(Math.max(V, 0)) * (p.tox / 430);
    const amp = Math.exp(-action);
    const y = 0.22 + 0.52 * amp * Math.sin(3.1 * x + state.heroPhase * TAU);
    i ? ctx.lineTo(xMap(x), yMap(y)) : ctx.moveTo(xMap(x), yMap(y));
  }
  ctx.stroke();
  drawAxisLabels(ctx, top.x, top.y, top.w, top.h,
    [[0, "Si 沟道"], [p.tox, "浮栅/俘获层"]],
    [[0, "E"], [p.phi, `φB=${p.phi.toFixed(1)}`]],
    xMap, yMap
  );
  drawLegend(ctx, [["氧化层势垒", "#2563eb"], ["电子能量", "#dc2626", true], ["隧穿波函数", "#f59e0b"]], top.x + top.w - 180, top.y + 28);

  plotFrame(ctx, bottom.x, bottom.y, bottom.w, bottom.h, "Fowler-Nordheim 隧穿电流随栅压变化", "Vg / V", "log₁₀(JFN / a.u.)");
  drawGrid(ctx, bottom.x, bottom.y, bottom.w, bottom.h);
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.beginPath();
  for (let i = 0; i <= 420; i++) {
    const vg = 4 + 16 * i / 420;
    const c = flashCurrent(p, vg);
    const px = mapX(vg, 4, 20, bottom.x, bottom.w);
    const py = mapY(c.logJ, -30, 0, bottom.y, bottom.h);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  const px = mapX(p.gateV, 4, 20, bottom.x, bottom.w), py = mapY(calc.logJ, -30, 0, bottom.y, bottom.h);
  ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
  if (focus === "j" || focus === "gateV" || focus === "eox") {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, TAU);
    ctx.stroke();
  }
  updateLinkedUI("flash", { ...p, ...calc });
  $("#flashSummary").textContent = `有效氧化层电场 Eox≈${calc.eox.toFixed(3)} V/nm；当前 JFN≈${calc.j.toExponential(3)} a.u.。提高栅压或减小氧化层厚度会显著增加隧穿写入/擦除速率，但也会增加氧化层可靠性风险。`;
}

function rtdMetrics(p, bias = p.bias) {
  const e1 = 0.376 / (p.mEff * p.wellWidth * p.wellWidth);
  const er = e1 + 0.18 * p.barrierHeight - 0.48 * bias;
  const gamma = 0.012 + 0.055 * Math.exp(-1.65 * p.barrierWidth * Math.sqrt(Math.max(p.barrierHeight, 0.02) * p.mEff / 0.067));
  const align = Math.exp(-((er - 0.11) ** 2) / (2 * (0.075 ** 2)));
  const injection = Math.max(bias, 0.002);
  const current = injection * align * (0.45 + 0.55 * gamma / 0.067);
  return { e1, er, gamma, current, align };
}

function drawRTD() {
  const p = state.rtd, canvas = $("#rtdCanvas"), ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const top = { x: 92, y: 80, w: 860, h: 275 }, bottom = { x: 92, y: 464, w: 860, h: 198 };
  const totalW = 2 * p.barrierWidth + p.wellWidth;
  const met = rtdMetrics(p);
  const focus = activeLinkedSymbol("rtd");
  const xMap = x => mapX(x, 0, totalW, top.x, top.w);
  const yMap = e => mapY(e, -0.05, Math.max(p.barrierHeight * 1.3, met.e1 * 1.8, 0.55), top.y, top.h);

  plotFrame(ctx, top.x, top.y, top.w, top.h, "共振隧穿二极管：双势垒量子阱、共振能级与透射波", "生长方向 x / nm", "能量 / eV");
  drawGrid(ctx, top.x, top.y, top.w, top.h);
  ctx.fillStyle = "rgba(37, 99, 235, 0.13)";
  ctx.fillRect(xMap(0), yMap(p.barrierHeight), xMap(p.barrierWidth) - xMap(0), yMap(0) - yMap(p.barrierHeight));
  ctx.fillRect(xMap(p.barrierWidth + p.wellWidth), yMap(p.barrierHeight - p.bias * 0.18), xMap(totalW) - xMap(p.barrierWidth + p.wellWidth), yMap(0) - yMap(p.barrierHeight - p.bias * 0.18));
  if (focus === "barrierHeight" || focus === "barrierWidth") {
    ctx.fillStyle = "rgba(245, 158, 11, .20)";
    ctx.fillRect(xMap(0), yMap(p.barrierHeight), xMap(p.barrierWidth) - xMap(0), yMap(0) - yMap(p.barrierHeight));
    ctx.fillRect(xMap(p.barrierWidth + p.wellWidth), yMap(p.barrierHeight - p.bias * 0.18), xMap(totalW) - xMap(p.barrierWidth + p.wellWidth), yMap(0) - yMap(p.barrierHeight - p.bias * 0.18));
  }
  if (focus === "wellWidth" || focus === "e1") {
    ctx.fillStyle = "rgba(124, 58, 237, .16)";
    ctx.fillRect(xMap(p.barrierWidth), top.y, xMap(p.barrierWidth + p.wellWidth) - xMap(p.barrierWidth), top.h);
  }
  ctx.strokeStyle = focus === "barrierHeight" || focus === "barrierWidth" || focus === "bias" ? "#f59e0b" : "#2563eb"; ctx.lineWidth = focus === "barrierHeight" || focus === "barrierWidth" || focus === "bias" ? 5 : 4; ctx.beginPath();
  const potential = [
    [0, p.barrierHeight],
    [p.barrierWidth, p.barrierHeight],
    [p.barrierWidth, 0],
    [p.barrierWidth + p.wellWidth, 0],
    [p.barrierWidth + p.wellWidth, Math.max(p.barrierHeight - p.bias * 0.18, 0.08)],
    [totalW, Math.max(p.barrierHeight - p.bias * 0.18, 0.08)]
  ];
  potential.forEach(([x, e], i) => i ? ctx.lineTo(xMap(x), yMap(e)) : ctx.moveTo(xMap(x), yMap(e)));
  ctx.stroke();
  ctx.strokeStyle = focus === "e1" || focus === "wellWidth" ? "#f59e0b" : "#7c3aed"; ctx.setLineDash([8, 7]); ctx.lineWidth = focus === "e1" || focus === "wellWidth" ? 5 : 2.6;
  ctx.beginPath(); ctx.moveTo(xMap(p.barrierWidth), yMap(met.e1)); ctx.lineTo(xMap(p.barrierWidth + p.wellWidth), yMap(met.e1)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#dc2626"; ctx.setLineDash([9, 7]);
  ctx.beginPath(); ctx.moveTo(top.x, yMap(0.11)); ctx.lineTo(top.x + top.w, yMap(0.11 - p.bias * 0.25)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3; ctx.beginPath();
  const amp = 0.055 + 0.11 * met.align;
  for (let i = 0; i <= 520; i++) {
    const x = totalW * i / 520;
    let env = 1;
    if (x < p.barrierWidth) env = 0.35 + 0.65 * Math.exp(-1.2 * (p.barrierWidth - x));
    else if (x > p.barrierWidth + p.wellWidth) env = 0.3 + 0.7 * met.align;
    const e = met.e1 + amp * env * Math.sin(2.8 * x + state.heroPhase * TAU);
    i ? ctx.lineTo(xMap(x), yMap(e)) : ctx.moveTo(xMap(x), yMap(e));
  }
  ctx.stroke();
  drawAxisLabels(ctx, top.x, top.y, top.w, top.h,
    [[0, "发射极"], [p.barrierWidth, "势垒"], [p.barrierWidth + p.wellWidth / 2, "量子阱"], [totalW, "集电极"]],
    [[0, "0"], [met.e1, `E₁=${met.e1.toFixed(2)}`], [p.barrierHeight, `Vb=${p.barrierHeight.toFixed(2)}`]],
    xMap, yMap
  );
  drawLegend(ctx, [["双势垒势能", "#2563eb"], ["阱内准束缚能级", "#7c3aed", true], ["电子入射能量", "#dc2626", true], ["透射波示意", "#f59e0b"]], top.x + top.w - 190, top.y + 28);

  plotFrame(ctx, bottom.x, bottom.y, bottom.w, bottom.h, "共振隧穿二极管 I-V 曲线：共振峰与负微分电阻", "偏压 / V", "相对电流 / a.u.");
  drawGrid(ctx, bottom.x, bottom.y, bottom.w, bottom.h);
  const samples = linspace(0, 0.8, 420).map(v => [v, rtdMetrics(p, v).current]);
  const imax = Math.max(...samples.map(([, i]) => i), 0.01) * 1.12;
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.beginPath();
  samples.forEach(([v, cur], i) => {
    const px = mapX(v, 0, 0.8, bottom.x, bottom.w);
    const py = mapY(cur, 0, imax, bottom.y, bottom.h);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
  const peak = samples.reduce((a, b) => b[1] > a[1] ? b : a, samples[0]);
  ctx.fillStyle = "rgba(220, 38, 38, 0.13)";
  ctx.fillRect(mapX(peak[0], 0, 0.8, bottom.x, bottom.w), bottom.y, bottom.x + bottom.w - mapX(peak[0], 0, 0.8, bottom.x, bottom.w), bottom.h);
  ctx.fillStyle = "#dc2626";
  ctx.beginPath(); ctx.arc(mapX(p.bias, 0, 0.8, bottom.x, bottom.w), mapY(met.current, 0, imax, bottom.y, bottom.h), 6, 0, TAU); ctx.fill();
  if (focus === "current" || focus === "bias") {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mapX(p.bias, 0, 0.8, bottom.x, bottom.w), mapY(met.current, 0, imax, bottom.y, bottom.h), 12, 0, TAU);
    ctx.stroke();
  }
  updateLinkedUI("rtd", { ...p, ...met });
  $("#rtdSummary").textContent = `阱内基态能级 E₁≈${met.e1.toFixed(3)} eV；当前偏压下共振失配量约 ${(met.er - 0.11).toFixed(3)} eV；相对电流≈${met.current.toExponential(3)}。峰值右侧的阴影区域表示负微分电阻工作区。`;
}

function cardProject(x, y, z, cx, cy, scale, rot = 0.68) {
  const xr = x * Math.cos(rot) - z * Math.sin(rot);
  const zr = x * Math.sin(rot) + z * Math.cos(rot);
  return [cx + (xr - zr) * scale * 0.78, cy + (xr + zr) * scale * 0.38 - y * scale];
}

function drawCardPoly(ctx, points, fill, stroke = "rgba(255,255,255,.18)") {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawIsoGrid(ctx, cx, cy, scale, color = "rgba(125,211,252,.16)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    const a = cardProject(-4, 0, i, cx, cy, scale);
    const b = cardProject(4, 0, i, cx, cy, scale);
    const c = cardProject(i, 0, -3, cx, cy, scale);
    const d = cardProject(i, 0, 3, cx, cy, scale);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
  }
  ctx.restore();
}

function drawIsoBox(ctx, cx, cy, scale, x, z, w, d, h, fill) {
  const p000 = cardProject(x, 0, z, cx, cy, scale);
  const p100 = cardProject(x + w, 0, z, cx, cy, scale);
  const p110 = cardProject(x + w, 0, z + d, cx, cy, scale);
  const p010 = cardProject(x, 0, z + d, cx, cy, scale);
  const p001 = cardProject(x, h, z, cx, cy, scale);
  const p101 = cardProject(x + w, h, z, cx, cy, scale);
  const p111 = cardProject(x + w, h, z + d, cx, cy, scale);
  const p011 = cardProject(x, h, z + d, cx, cy, scale);
  drawCardPoly(ctx, [p001, p101, p111, p011], fill.top, "rgba(255,255,255,.35)");
  drawCardPoly(ctx, [p100, p110, p111, p101], fill.right, "rgba(255,255,255,.20)");
  drawCardPoly(ctx, [p000, p010, p011, p001], fill.left, "rgba(255,255,255,.18)");
}

function clearCardScene(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

function drawCardOneD(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  const cx = w * 0.50, cy = h * 0.68, s = Math.min(w, h) * 0.105;
  drawIsoGrid(ctx, cx, cy, s, "rgba(34,211,238,.16)");
  drawIsoBox(ctx, cx, cy, s, .45, -.9, 1.25, 1.75, 1.65, {
    top: "rgba(37,99,235,.22)",
    left: "rgba(14,165,233,.15)",
    right: "rgba(56,189,248,.12)"
  });
  ctx.save();
  ctx.lineWidth = 3;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#22d3ee";
  ctx.strokeStyle = "#22d3ee";
  ctx.beginPath();
  for (let i = 0; i <= 260; i++) {
    const u = i / 260;
    const x = -3.8 + u * 4.2;
    const y = 0.55 + Math.sin(u * 12 * TAU - t * 2.4) * 0.42;
    const z = Math.cos(u * 12 * TAU - t * 2.4) * 0.55;
    const p = cardProject(x, y, z, cx, cy, s);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.shadowColor = "#f472b6";
  ctx.strokeStyle = "#f472b6";
  ctx.beginPath();
  for (let i = 0; i <= 150; i++) {
    const u = i / 150;
    const x = 1.75 + u * 2.2;
    const y = 0.42 + Math.sin(u * 8 * TAU - t * 2.4) * 0.20;
    const z = Math.cos(u * 8 * TAU - t * 2.4) * 0.26;
    const p = cardProject(x, y, z, cx, cy, s);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCardSTM(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  const cx = w * 0.50, cy = h * 0.70, s = Math.min(w, h) * 0.11;
  drawIsoGrid(ctx, cx, cy, s, "rgba(94,234,212,.14)");
  drawIsoBox(ctx, cx, cy, s, -1.5, .65, 2.6, 1.25, .12, {
    top: "rgba(94,234,212,.34)",
    left: "rgba(15,118,110,.24)",
    right: "rgba(20,184,166,.18)"
  });
  const tipTop = cardProject(-.75, 3.6 + Math.sin(t * 1.7) * .18, -1.2, cx, cy, s);
  const tipMid = cardProject(.25, 1.35, -.22, cx, cy, s);
  const tipL = cardProject(-.25, 1.35, -.52, cx, cy, s);
  const tipR = cardProject(.65, 1.35, .08, cx, cy, s);
  drawCardPoly(ctx, [tipTop, tipL, tipMid], "rgba(204,251,241,.85)", "rgba(255,255,255,.45)");
  drawCardPoly(ctx, [tipTop, tipMid, tipR], "rgba(20,184,166,.72)", "rgba(255,255,255,.28)");
  for (let i = 0; i < 4; i++) {
    const u = (t * .8 + i * .22) % 1;
    const p = cardProject(.15 + Math.sin(i) * .2, 1.12 - u * 1.08, -.18 + u * .72, cx, cy, s);
    ctx.fillStyle = `rgba(204,251,241,${1 - u * .5})`;
    ctx.shadowColor = "#5eead4";
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 + u * 2, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawCardAlpha(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  const cx = w * 0.50, cy = h * 0.56, s = Math.min(w, h) * 0.12;
  ctx.save();
  ctx.strokeStyle = "rgba(221,214,254,.34)";
  ctx.lineWidth = 1.5;
  for (let r = 1.1; r <= 2.4; r += .55) {
    ctx.beginPath();
    for (let i = 0; i <= 220; i++) {
      const a = i / 220 * TAU;
      const p = cardProject(Math.cos(a) * r, Math.sin(a * .7 + t) * .22, Math.sin(a) * r, cx, cy, s);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
  const center = cardProject(0, .9, 0, cx, cy, s);
  const grad = ctx.createRadialGradient(center[0] - 10, center[1] - 12, 4, center[0], center[1], 42);
  grad.addColorStop(0, "#f5f3ff");
  grad.addColorStop(.45, "#8b5cf6");
  grad.addColorStop(1, "rgba(76,29,149,.35)");
  ctx.fillStyle = grad;
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(center[0], center[1], 30, 0, TAU); ctx.fill();
  const u = (t * .22) % 1;
  const alpha = cardProject(1.0 + u * 2.25, 1.08 + u * .85, .8 - u * 1.8, cx, cy, s);
  ctx.fillStyle = "#f5f3ff";
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(alpha[0], alpha[1], 7, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCardFlash(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  const cx = w * 0.50, cy = h * 0.72, s = Math.min(w, h) * 0.11;
  drawIsoGrid(ctx, cx, cy, s, "rgba(251,191,36,.12)");
  drawIsoBox(ctx, cx, cy, s, -1.7, -.2, 2.8, 1.25, .20, {
    top: "rgba(251,191,36,.26)",
    left: "rgba(180,83,9,.20)",
    right: "rgba(245,158,11,.18)"
  });
  drawIsoBox(ctx, cx, cy, s, -1.45, -.06, 2.3, .92, .72, {
    top: "rgba(251,191,36,.18)",
    left: "rgba(245,158,11,.16)",
    right: "rgba(251,191,36,.10)"
  });
  drawIsoBox(ctx, cx, cy, s, -1.2, .05, 1.85, .62, 1.38, {
    top: "rgba(255,255,255,.78)",
    left: "rgba(251,191,36,.30)",
    right: "rgba(245,158,11,.24)"
  });
  for (let i = 0; i < 3; i++) {
    const u = (t * .65 + i * .28) % 1;
    const p = cardProject(-.6 + i * .38, .35 + u * 1.75, .35 - u * .42, cx, cy, s);
    ctx.fillStyle = "#fff7ed";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 12;
    ctx.font = "700 13px Microsoft YaHei UI";
    ctx.fillText("e-", p[0], p[1]);
  }
  ctx.shadowBlur = 0;
}

function drawCardRTD(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  const cx = w * 0.50, cy = h * 0.70, s = Math.min(w, h) * 0.11;
  drawIsoGrid(ctx, cx, cy, s, "rgba(199,210,254,.14)");
  drawIsoBox(ctx, cx, cy, s, -1.9, -.52, .55, 1.2, 1.65, {
    top: "rgba(165,180,252,.78)",
    left: "rgba(79,70,229,.36)",
    right: "rgba(129,140,248,.28)"
  });
  drawIsoBox(ctx, cx, cy, s, 1.05, -.52, .55, 1.2, 1.65, {
    top: "rgba(165,180,252,.78)",
    left: "rgba(79,70,229,.36)",
    right: "rgba(129,140,248,.28)"
  });
  ctx.save();
  ctx.strokeStyle = "#fbbf24";
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  const a = cardProject(-1.55, 1.05 + Math.sin(t * 1.7) * .16, .15, cx, cy, s);
  const b = cardProject(1.60, 1.05 + Math.sin(t * 1.7) * .16, .15, cx, cy, s);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#c7d2fe";
  ctx.shadowColor = "#818cf8";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i <= 210; i++) {
    const u = i / 210;
    const x = -2.2 + u * 4.4;
    const y = .55 + Math.sin(u * 8 * TAU - t * 2.6) * .25;
    const z = .10 + Math.cos(u * 8 * TAU - t * 2.6) * .25;
    const p = cardProject(x, y, z, cx, cy, s);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHomeCardScenes() {
  document.querySelectorAll(".card-scene").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    const scene = canvas.dataset.scene;
    const t = state.heroPhase * TAU;
    if (scene === "oneD") drawCardOneD(ctx, canvas.width, canvas.height, t);
    if (scene === "stm") drawCardSTM(ctx, canvas.width, canvas.height, t);
    if (scene === "alpha") drawCardAlpha(ctx, canvas.width, canvas.height, t);
    if (scene === "flash") drawCardFlash(ctx, canvas.width, canvas.height, t);
    if (scene === "rtd") drawCardRTD(ctx, canvas.width, canvas.height, t);
  });
}

function drawCinemaBackdrop(ctx, w, h, accent = "#22d3ee", warm = "#f59e0b") {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(.48, "#06202a");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * .52, h * .44, 0, w * .52, h * .44, Math.max(w, h) * .42);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(.35, `${accent}18`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const warmGlow = ctx.createRadialGradient(w * .18, h * .70, 0, w * .18, h * .70, Math.max(w, h) * .26);
  warmGlow.addColorStop(0, `${warm}4a`);
  warmGlow.addColorStop(.38, `${warm}16`);
  warmGlow.addColorStop(1, "transparent");
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, .10)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlossSphere(ctx, x, y, r, base, hi = "#ffffff", shadow = "rgba(0,0,0,.45)") {
  const g = ctx.createRadialGradient(x - r * .36, y - r * .36, r * .08, x, y, r);
  g.addColorStop(0, hi);
  g.addColorStop(.22, base);
  g.addColorStop(1, shadow);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function drawHudPanels(ctx, w, h, accent = "#22d3ee") {
  ctx.save();
  ctx.strokeStyle = `${accent}55`;
  ctx.fillStyle = `${accent}18`;
  ctx.lineWidth = 1;
  const panels = [
    [w * .62, h * .12, w * .26, h * .18],
    [w * .60, h * .70, w * .30, h * .16]
  ];
  panels.forEach(([x, y, pw, ph], idx) => {
    ctx.strokeRect(x, y, pw, ph);
    ctx.beginPath();
    for (let i = 0; i <= 52; i++) {
      const u = i / 52;
      const px = x + u * pw;
      const py = y + ph * (.52 + Math.sin(u * TAU * (idx + 1.4)) * .24);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  });
  ctx.restore();
}

function drawCinematicAlpha(ctx, w, h, t, compact = false) {
  drawCinemaBackdrop(ctx, w, h, "#38bdf8", "#f97316");
  drawHudPanels(ctx, w, h, "#38bdf8");
  const cx = compact ? w * .48 : w * .34;
  const cy = compact ? h * .46 : h * .50;
  const radius = Math.min(w, h) * (compact ? .18 : .20);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(125, 211, 252, .82)";
  ctx.lineWidth = compact ? 1.3 : 2.1;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 18;
  for (let k = 0; k < 3; k++) {
    ctx.save();
    ctx.rotate(t * (.12 + k * .025) + k * 1.05);
    ctx.scale(1, .38 + k * .08);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (1.7 - k * .12), radius * (.92 + k * .08), 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const balls = compact ? 24 : 42;
  for (let i = 0; i < balls; i++) {
    const a = i * 2.399 + Math.sin(t * .45) * .1;
    const rr = radius * Math.sqrt((i + 2) / (balls + 2)) * .9;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * .82;
    const r = radius * (.16 + (i % 4) * .018);
    const red = i % 2 === 0;
    ctx.shadowColor = red ? "#fb7185" : "#38bdf8";
    ctx.shadowBlur = 12;
    drawGlossSphere(ctx, x, y, r, red ? "#dc2626" : "#0284c7", "#f8fafc");
  }
  ctx.shadowBlur = 0;

  const beamStartX = cx + radius * .82;
  const beamStartY = cy + radius * .22;
  const beamEndX = w * .96;
  const beamEndY = compact ? h * .55 : h * .50;
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const off = (i - 11) * (compact ? 2.2 : 3.4);
    const p = (Math.sin(t * 2 + i) + 1) * .5;
    ctx.strokeStyle = `rgba(251, 191, 36, ${.15 + p * .42})`;
    ctx.lineWidth = compact ? 1 : 1.7;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(beamStartX, beamStartY);
    ctx.bezierCurveTo(w * .56, beamStartY + off, w * .72, beamEndY + off * .38, beamEndX, beamEndY + off * .12);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const u = (t * .16 + i / 26) % 1;
    const x = beamStartX + (beamEndX - beamStartX) * u;
    const y = beamStartY + (beamEndY - beamStartY) * u + Math.sin(i * 1.8) * (compact ? 16 : 28) * (1 - u);
    ctx.fillStyle = `rgba(251, 191, 36, ${1 - u * .25})`;
    ctx.beginPath();
    ctx.arc(x, y, (compact ? 1.8 : 2.8) + Math.sin(i) * .8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawCinematicSTM(ctx, w, h, t, compact = false) {
  drawCinemaBackdrop(ctx, w, h, "#2dd4bf", "#22d3ee");
  drawHudPanels(ctx, w, h, "#2dd4bf");
  const baseY = h * .72;
  const cell = compact ? 14 : 18;
  ctx.save();
  ctx.translate(w * .08, baseY);
  ctx.scale(1, .36);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 16; col++) {
      const x = col * cell + (row % 2) * cell * .5;
      const y = row * cell;
      const z = Math.max(0, 1 - Math.hypot(x - w * .50, y - 52) / 180);
      ctx.shadowColor = "#2dd4bf";
      ctx.shadowBlur = 8 * z;
      drawGlossSphere(ctx, x, y, cell * (.31 + z * .13), z > .55 ? "#10b981" : "#475569", "#ccfbf1");
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(45, 212, 191, .92)";
  ctx.lineWidth = compact ? 1.8 : 3;
  ctx.shadowColor = "#2dd4bf";
  ctx.shadowBlur = 18;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      const x = w * .18 + u * w * .66;
      const y = baseY + Math.sin(u * 3.2 * TAU + t + k * .35) * (compact ? 5 : 9) - k * 7;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  const tipX = compact ? w * .55 : w * .70;
  const tipY = compact ? h * .16 : h * .08;
  ctx.save();
  ctx.translate(tipX, tipY + Math.sin(t * 1.4) * 4);
  ctx.rotate(-.24);
  const bodyW = compact ? 28 : 48;
  const bodyH = compact ? 84 : 132;
  const metal = ctx.createLinearGradient(-bodyW, 0, bodyW, 0);
  metal.addColorStop(0, "#e2e8f0");
  metal.addColorStop(.35, "#64748b");
  metal.addColorStop(.62, "#f8fafc");
  metal.addColorStop(1, "#0f172a");
  ctx.fillStyle = metal;
  ctx.shadowColor = "#5eead4";
  ctx.shadowBlur = 16;
  ctx.fillRect(-bodyW * .5, 0, bodyW, bodyH);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-bodyW * .64, bodyH * .52, bodyW * 1.28, bodyH * .18);
  ctx.beginPath();
  ctx.moveTo(-bodyW * .22, bodyH);
  ctx.lineTo(bodyW * .22, bodyH);
  ctx.lineTo(0, bodyH + (compact ? 78 : 118));
  ctx.closePath();
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();
  ctx.restore();

  const beamX = tipX + (compact ? -2 : -10);
  const beamY = tipY + (compact ? 170 : 250);
  const g = ctx.createRadialGradient(beamX, beamY, 0, beamX, beamY, compact ? 52 : 82);
  g.addColorStop(0, "rgba(204, 251, 241, .95)");
  g.addColorStop(.32, "rgba(45, 212, 191, .58)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(beamX - 100, beamY - 100, 200, 200);
}

function drawCardOneD(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  drawCinemaBackdrop(ctx, w, h, "#22d3ee", "#f97316");
  const cx = w * .50, cy = h * .64, s = Math.min(w, h) * .12;
  drawIsoGrid(ctx, cx, cy, s, "rgba(125, 211, 252, .18)");
  drawIsoBox(ctx, cx, cy, s, .18, -1.05, 1.35, 1.9, 1.8, {
    top: "rgba(56, 189, 248, .18)",
    left: "rgba(14, 165, 233, .18)",
    right: "rgba(59, 130, 246, .12)"
  });
  ctx.save();
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? "#f97316" : "#22d3ee";
    ctx.shadowColor = pass ? "#f97316" : "#22d3ee";
    ctx.shadowBlur = 20;
    ctx.lineWidth = pass ? 2.2 : 3.6;
    ctx.beginPath();
    const start = pass ? 1.55 : -3.8;
    const len = pass ? 2.25 : 4.0;
    const amp = pass ? .18 : .44;
    for (let i = 0; i <= 220; i++) {
      const u = i / 220;
      const x = start + u * len;
      const y = .55 + Math.sin(u * TAU * (pass ? 7 : 10) - t * 2.2) * amp;
      const z = Math.cos(u * TAU * (pass ? 7 : 10) - t * 2.2) * amp * 1.35;
      const p = cardProject(x, y, z, cx, cy, s);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCardSTM(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  drawCinematicSTM(ctx, w, h, t, w < 220);
}

function drawCardAlpha(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  drawCinematicAlpha(ctx, w, h, t, w < 220);
}

function drawCardFlash(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  drawCinemaBackdrop(ctx, w, h, "#f59e0b", "#22d3ee");
  const cx = w * .50, cy = h * .68, s = Math.min(w, h) * .13;
  drawIsoGrid(ctx, cx, cy, s, "rgba(251, 191, 36, .15)");
  drawIsoBox(ctx, cx, cy, s, -1.55, -.5, 3.1, 1.55, .18, {
    top: "rgba(251, 191, 36, .25)",
    left: "rgba(180, 83, 9, .25)",
    right: "rgba(245, 158, 11, .16)"
  });
  drawIsoBox(ctx, cx, cy, s, -1.1, -.18, 2.2, .9, .72, {
    top: "rgba(255, 255, 255, .72)",
    left: "rgba(251, 191, 36, .28)",
    right: "rgba(245, 158, 11, .22)"
  });
  drawIsoBox(ctx, cx, cy, s, -.72, -.02, 1.45, .55, 1.55, {
    top: "rgba(254, 243, 199, .82)",
    left: "rgba(245, 158, 11, .30)",
    right: "rgba(217, 119, 6, .25)"
  });
  ctx.save();
  ctx.strokeStyle = "rgba(251, 191, 36, .9)";
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 14;
  for (let i = 0; i < 7; i++) {
    const u = (t * .18 + i / 7) % 1;
    const a = cardProject(-1.3 + i * .42, .2 + u * 1.85, .35 - u * .72, cx, cy, s);
    const b = cardProject(-.9 + i * .28, .95 + u * .75, .15 - u * .25, cx, cy, s);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCardRTD(ctx, w, h, t) {
  clearCardScene(ctx, w, h);
  drawCinemaBackdrop(ctx, w, h, "#818cf8", "#22d3ee");
  const cx = w * .50, cy = h * .68, s = Math.min(w, h) * .13;
  drawIsoGrid(ctx, cx, cy, s, "rgba(199, 210, 254, .16)");
  drawIsoBox(ctx, cx, cy, s, -1.85, -.64, .55, 1.35, 1.72, {
    top: "rgba(199, 210, 254, .82)",
    left: "rgba(79, 70, 229, .42)",
    right: "rgba(129, 140, 248, .28)"
  });
  drawIsoBox(ctx, cx, cy, s, 1.05, -.64, .55, 1.35, 1.72, {
    top: "rgba(199, 210, 254, .82)",
    left: "rgba(79, 70, 229, .42)",
    right: "rgba(129, 140, 248, .28)"
  });
  ctx.save();
  ctx.strokeStyle = "#22d3ee";
  ctx.shadowColor = "#818cf8";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const u = i / 240;
    const x = -2.35 + u * 4.85;
    const amp = .18 + Math.exp(-Math.pow((u - .52) * 5, 2)) * .25;
    const y = .55 + Math.sin(u * TAU * 8 - t * 2.6) * amp;
    const z = .05 + Math.cos(u * TAU * 8 - t * 2.6) * amp;
    const p = cardProject(x, y, z, cx, cy, s);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = "#fbbf24";
  const a = cardProject(-1.55, 1.05 + Math.sin(t) * .12, .12, cx, cy, s);
  const b = cardProject(1.60, 1.05 + Math.sin(t) * .12, .12, cx, cy, s);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function drawHero() {
  const canvas = $("#heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#071a3d");
  g.addColorStop(.58, "#07142f");
  g.addColorStop(1, "#061329");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, .12)";
  ctx.lineWidth = 1;
  for (let x = 60; x < w - 40; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 38); ctx.lineTo(x, h - 62); ctx.stroke();
  }
  for (let y = 52; y < h - 62; y += 48) {
    ctx.beginPath(); ctx.moveTo(54, y); ctx.lineTo(w - 48, y); ctx.stroke();
  }

  const baseline = 210, bx1 = 380, bx2 = 505, phase = state.heroPhase;
  ctx.strokeStyle = "rgba(226, 232, 240, .85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(62, baseline);
  ctx.lineTo(w - 68, baseline);
  ctx.lineTo(w - 78, baseline - 6);
  ctx.moveTo(w - 68, baseline);
  ctx.lineTo(w - 78, baseline + 6);
  ctx.moveTo(62, baseline);
  ctx.lineTo(62, 78);
  ctx.lineTo(56, 88);
  ctx.moveTo(62, 78);
  ctx.lineTo(68, 88);
  ctx.stroke();

  ctx.fillStyle = "rgba(37, 99, 235, .28)";
  ctx.strokeStyle = "rgba(56, 189, 248, .75)";
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 2;
  ctx.fillRect(bx1, 78, bx2 - bx1, baseline - 78);
  ctx.strokeRect(bx1, 78, bx2 - bx1, baseline - 78);
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(226, 232, 240, .92)";
  ctx.font = "700 18px Microsoft YaHei UI";
  ctx.fillText("ψ(x,t)", 82, 74);
  ctx.font = "700 15px Microsoft YaHei UI";
  ctx.fillText("0", bx1 - 4, baseline + 24);
  ctx.fillText("a", bx2 - 4, baseline + 24);
  ctx.fillText("x", w - 56, baseline + 24);

  function drawWave(xa, xb, color, amp, decay = 0, frequency = .105) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 360; i++) {
      const x = xa + (xb - xa) * i / 359;
      const packetCenter = 150 + Math.sin(phase * TAU) * 18;
      const env = Math.exp(-(((x - packetCenter) / 116) ** 2)) * Math.exp(-Math.max(x - bx1, 0) * decay);
      const y = baseline - amp * env * Math.sin(x * frequency - phase * TAU * 1.8);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawWave(92, bx1, "#22d3ee", 50, 0, .12);
  drawWave(bx1, bx2, "#7dd3fc", 24, .018, .12);
  drawWave(bx2, w - 104, "#f97316", 13, .004, .18);
  ctx.restore();
}

function drawAll() {
  drawHero();
  drawHomeCardScenes();
  drawOneD();
  drawAlpha();
  drawSTM();
  drawFlash();
  drawRTD();
  renderAIPanels();
}

function loop() {
  state.heroPhase = (state.heroPhase + .01) % 1;
  drawHero();
  if (state.page === "home") drawHomeCardScenes();
  if (state.page === "oneD") drawOneD();
  if (state.page === "alpha") drawAlpha();
  if (state.page === "stm") drawSTM();
  if (state.page === "flash") drawFlash();
  if (state.page === "rtd") drawRTD();
  requestAnimationFrame(loop);
}

document.addEventListener("click", (e) => {
  const authModeTarget = e.target.closest("[data-auth-mode]");
  if (authModeTarget) {
    setAuthMode(authModeTarget.dataset.authMode);
    return;
  }

  const authTarget = e.target.closest("[data-auth-action]");
  if (authTarget) {
    const authAction = authTarget.dataset.authAction;
    if (authAction === "open") showAuthModal();
    if (authAction === "close") closeAuthModal();
    if (authAction === "submit") submitAuth();
    if (authAction === "logout") logout();
    return;
  }

  const learningTarget = e.target.closest("[data-learning-action]");
  if (learningTarget) {
    const learningAction = learningTarget.dataset.learningAction;
    if (learningAction === "mode") setLearningMode(learningTarget.dataset.mode);
    if (learningAction === "start") startLearningTask(learningTarget.dataset.module, learningTarget.dataset.taskId);
    if (learningAction === "prediction") choosePrediction(learningTarget.dataset.value);
    if (learningAction === "submit-prediction") submitPrediction();
    if (learningAction === "check") checkLearningTask();
    if (learningAction === "submit-explanation") submitTaskExplanation();
    if (learningAction === "hint") showNextHint();
    if (learningAction === "reference") showReferenceExplanation();
    return;
  }

  const aiTarget = e.target.closest("[data-ai-action]");
  if (aiTarget) {
    const module = aiTarget.dataset.aiModule;
    const aiAction = aiTarget.dataset.aiAction;
    if (aiAction === "quick") {
      askAI(module, defaultAiQuestion(module, aiTarget.dataset.aiType));
    }
    if (aiAction === "send") {
      const input = document.getElementById(`aiInput-${module}`);
      const query = input?.value.trim() || "";
      if (input) input.value = "";
      askAI(module, query);
    }
    return;
  }

  const symbolTarget = e.target.closest("[data-symbol]");
  if (symbolTarget) {
    const module = moduleForElement(symbolTarget);
    if (module) {
      if (e.target.closest("input")) return;
      setLinkedFocus(module, symbolTarget.dataset.symbol, true);
      return;
    }
  }

  const pageTarget = e.target.closest("[data-page]");
  const page = pageTarget?.dataset.page;
  if (page) switchPage(page);
  const plot = e.target.dataset.plot;
  if (plot) {
    state.plotMode = plot;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.plot === plot));
    drawOneD();
    return;
  }
  const action = e.target.dataset.action;
  if (action === "home-search") homeQuickSearch();
  if (action === "update-oneD") drawOneD();
  if (action === "reset-oneD") resetModel("oneD");
  if (action === "save-oneD") saveCanvas("oneDCanvas", "一维量子隧穿.png");
  if (action === "update-alpha") drawAlpha();
  if (action === "reset-alpha") resetModel("alpha");
  if (action === "save-alpha") saveCanvas("alphaCanvas", "alpha粒子发射.png");
  if (action === "update-stm") drawSTM();
  if (action === "reset-stm") resetModel("stm");
  if (action === "save-stm") saveCanvas("stmCanvas", "STM应用.png");
  if (action === "update-flash") drawFlash();
  if (action === "reset-flash") resetModel("flash");
  if (action === "save-flash") saveCanvas("flashCanvas", "闪存隧穿.png");
  if (action === "update-rtd") drawRTD();
  if (action === "reset-rtd") resetModel("rtd");
  if (action === "save-rtd") saveCanvas("rtdCanvas", "共振隧穿二极管.png");
});

document.addEventListener("mouseover", (e) => {
  if (state.linkedFocusLocked) return;
  const symbolTarget = e.target.closest("[data-symbol]");
  if (symbolTarget) {
    const module = moduleForElement(symbolTarget);
    if (module) setLinkedFocus(module, symbolTarget.dataset.symbol, false);
  }
});

document.addEventListener("mouseout", (e) => {
  if (state.linkedFocusLocked) return;
  const symbolTarget = e.target.closest("[data-symbol]");
  const module = symbolTarget ? moduleForElement(symbolTarget) : null;
  if (!symbolTarget || !module) return;
  const next = e.relatedTarget?.closest?.("[data-symbol]");
  if (next && moduleForElement(next) === module && next.dataset.symbol === symbolTarget.dataset.symbol) return;
  setLinkedFocus(module, null, false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target?.id === "homeQuickInput") {
    homeQuickSearch();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.target?.classList?.contains("ai-input")) {
    const module = e.target.id.replace("aiInput-", "");
    const query = e.target.value.trim();
    e.target.value = "";
    askAI(module, query);
  }
});

setupControls();
updateOneDLinkedUI();
setAuthMode("login");
initAuth();
startLearningTask("oneD", "oned_reduce_t");
drawAll();
loop();
