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
  taskSamples: [],
  taskScore: null,
  taskStars: 0,
  taskRubric: null,
  taskProgress: {},
  authUser: null,
  authToken: localStorage.getItem("qt_auth_token") || "",
  authMode: "login",
  pendingPageAfterAuth: null,
  learningProgress: { oneD: false, stm: false, alpha: false, flash: false, rtd: false },
  learningArchive: {
    sessionId: null,
    module: null,
    startedAt: 0,
    sessionReady: null,
    snapshotTimers: {},
    dashboard: null,
    dashboardLoading: false
  },
  ai: { loadingModule: null, conversations: {}, messages: {} },
  tutor: {
    stage: "predict",
    failedChecks: 0,
    hintLevels: {},
    pendingParameterChanges: {},
    parameterTimers: {},
    lastProbeAt: {},
    summaries: {},
    requestInFlight: {}
  },
  principleIntro: {
    active: false,
    module: null,
    elapsed: 0,
    duration: 28,
    paused: false,
    animationFrame: 0,
    lastTimestamp: 0,
    chapterIndex: -1
  },
  videoLibrary: {
    items: [],
    loaded: false,
    loading: false,
    error: "",
    filterModule: "all",
    query: "",
    activeId: null
  },
  feedbackMailbox: {
    rating: 0,
    category: "other",
    module: "general",
    message: "",
    anonymous: false,
    submitting: false,
    status: ""
  },
  adminDashboard: {
    overview: null,
    feedback: [],
    loading: false,
    error: "",
    feedbackStatus: "all"
  },
  achievements: {
    items: [],
    newlyUnlocked: [],
    loaded: false
  },
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
  rtd: document.getElementById("rtd"),
  videos: document.getElementById("videos"),
  admin: document.getElementById("admin"),
  history: document.getElementById("history")
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

const legacyLearningTasks = {
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

const learningTasks = {
  oneD: [
    {
      id: "oned_tunneling_regimes",
      title: "1D-1 隧穿区间与经典禁区",
      type: "基础验证",
      level: 1,
      goal: "比较 E<V₀、E≈V₀、E>V₀ 三种情况下的透射率。",
      predictionQuestion: "当 E<V₀ 时，透射率是否仍然可能大于零？",
      options: ["可能大于零", "一定等于零", "无法判断"],
      correctOption: "可能大于零",
      observe: "固定 V₀、a、m，至少记录低于、接近和高于势垒的三种能量状态。",
      hints: [
        "先固定 V₀、a 和 m，只改变 E。",
        "E<V₀ 时注意势垒内的指数衰减。",
        "E>V₀ 后仍可能因干涉出现透射率振荡。"
      ],
      sampleKey: "E",
      minSamples: 3,
      keywords: ["波函数", "势垒", "透射", "经典"],
      check: ({ after, samples }) => {
        const values = uniqueTaskSamples(samples, "E", .05);
        const below = values.some(sample => sample.params.E < sample.params.V0 - .05);
        const above = values.some(sample => sample.params.E >= sample.params.V0);
        const passed = values.length >= 3 && below && above && after.T > 0;
        return {
          passed,
          evidenceScore: passed ? 3 : Math.min(2, values.length),
          details: `有效能量采样 ${values.length} 个；低于势垒 ${below ? "已覆盖" : "未覆盖"}；高于势垒 ${above ? "已覆盖" : "未覆盖"}。`
        };
      },
      explanation: "E<V₀ 时透射率通常非零，因为波函数会在势垒内指数衰减并在另一侧保留振幅；E>V₀ 后仍可能出现干涉振荡。"
    },
    {
      id: "oned_width_exponential",
      title: "1D-2 势垒宽度指数律",
      type: "定量分析",
      level: 2,
      goal: "固定 V₀、E、m，采集至少 5 个势垒宽度并验证 lnT 与 a 的线性关系。",
      predictionQuestion: "其他参数不变时，lnT 与势垒宽度 a 大致呈什么关系？",
      options: ["线性关系", "二次关系", "完全无关"],
      correctOption: "线性关系",
      observe: "只改变势垒宽度 a，至少采集 5 个点，检查 R² 和拟合斜率。",
      hints: [
        "保持 V₀、E、m 不变。",
        "拟合 lnT，而不是直接拟合 T。",
        "理论斜率约为 -2κ。"
      ],
      sampleKey: "a",
      minSamples: 5,
      keywords: ["lnT", "斜率", "κ", "指数"],
      check: ({ after, samples }) => {
        const series = uniqueTaskSamples(stableSeries(samples, ["V0", "E", "m"], "a", .03), "a", .03);
        const fit = linearFit(series.map(sample => [sample.params.a, Math.log(Math.max(sample.metrics.T, 1e-300))]));
        const expected = after.E < after.V0 ? -2 * after.kappa : 0;
        const slopeError = expected ? Math.abs((fit.slope - expected) / expected) : 1;
        const passed = series.length >= 5 && fit.r2 >= .95 && expected < 0 && slopeError <= .2;
        return {
          passed,
          evidenceScore: passed ? 3 : fit.r2 >= .8 ? 2 : series.length >= 3 ? 1 : 0,
          details: `有效宽度 ${series.length} 个；R²=${fit.r2.toFixed(4)}；拟合斜率=${fit.slope.toFixed(4)}；理论斜率=${expected.toFixed(4)}；误差=${(slopeError * 100).toFixed(1)}%。`
        };
      },
      explanation: "E<V₀ 时 T≈exp(-2κa)，因此 lnT 与势垒宽度近似线性，斜率接近 -2κ。"
    },
    {
      id: "oned_inverse_design",
      title: "1D-3 多参数反向设计",
      type: "反向设计",
      level: 3,
      goal: "设计参数使透射率接近 1×10⁻⁶，并解释参数选择。",
      predictionQuestion: "要降低透射率到约 10⁻⁶，应优先调整哪些参数？",
      options: ["增大 a 或提高 V₀", "增大 E", "减小 m"],
      correctOption: "增大 a 或提高 V₀",
      observe: "至少尝试 3 组参数，把 T 调整到目标数量级附近。",
      hints: [
        "先判断目标是降低透射率。",
        "κ 和 a 都进入指数衰减。",
        "尽量一次只改变一个主要变量。"
      ],
      sampleKey: "composite",
      minSamples: 3,
      keywords: ["目标", "参数", "κ", "指数"],
      check: ({ after, samples }) => {
        const target = 1e-6;
        const error = Math.abs(Math.log10(Math.max(after.T, 1e-300) / target));
        const passed = error <= .3 && samples.length >= 3;
        return {
          passed,
          evidenceScore: passed ? 3 : error <= .6 ? 2 : samples.length >= 3 ? 1 : 0,
          details: `当前 T=${after.T.toExponential(4)}；目标 T≈1.0000e-6；对数误差 ${error.toFixed(3)} decades。`
        };
      },
      explanation: "反向设计需要综合调整 κ 与势垒宽度 a，从而改变指数衰减的强度和距离。"
    }
  ],
  stm: [
    {
      id: "stm_distance_current",
      title: "STM-1 距离与隧穿电流",
      type: "基础验证",
      level: 1,
      goal: "采集至少 5 个探针距离，验证电流随距离快速下降。",
      predictionQuestion: "增大探针-样品距离 d 后，隧穿电流会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "减小",
      observe: "保持 φ 和 Vb 不变，只改变 d，至少记录 5 个点。",
      hints: [
        "保持功函数和偏压不变。",
        "电流近似满足 I∝exp(-2κd)。",
        "至少覆盖约 1 Å 的距离变化。"
      ],
      sampleKey: "d",
      minSamples: 5,
      keywords: ["指数", "距离", "衰减", "波函数"],
      check: ({ samples }) => {
        const series = uniqueTaskSamples(stableSeries(samples, ["phi", "bias"], "d", .05), "d", .05)
          .sort((a, b) => a.params.d - b.params.d);
        const ratio = series.length ? series[0].metrics.I / Math.max(series[series.length - 1].metrics.I, 1e-30) : 1;
        const monotonic = series.every((sample, index) => index === 0 || sample.metrics.I <= series[index - 1].metrics.I * 1.05);
        const passed = series.length >= 5 && ratio >= 5 && monotonic;
        return {
          passed,
          evidenceScore: passed ? 3 : series.length >= 3 ? 1 : 0,
          details: `有效距离 ${series.length} 个；最大电流比 ${ratio.toFixed(2)} 倍；单调下降：${monotonic ? "是" : "否"}。`
        };
      },
      explanation: "STM 电流对距离呈指数衰减，电子波函数在真空势垒中的衰减导致电流快速下降。"
    },
    {
      id: "stm_exponential_fit",
      title: "STM-2 指数关系定量拟合",
      type: "定量分析",
      level: 2,
      goal: "采集至少 7 个距离点，拟合 log₁₀(I)-d 并比较理论斜率。",
      predictionQuestion: "log₁₀(I) 与探针距离 d 应呈什么关系？",
      options: ["线性关系", "二次关系", "对数关系"],
      correctOption: "线性关系",
      observe: "固定 φ、Vb，只改变 d，至少采集 7 个点并检查 R² 和斜率误差。",
      hints: [
        "固定 φ 和 Vb。",
        "I∝exp(-2κd)，所以 log₁₀I 对 d 是线性的。",
        "理论斜率为 -2κ/ln10。"
      ],
      sampleKey: "d",
      minSamples: 7,
      keywords: ["拟合", "斜率", "κ", "log"],
      check: ({ after, samples }) => {
        const series = uniqueTaskSamples(stableSeries(samples, ["phi", "bias"], "d", .05), "d", .05)
          .sort((a, b) => a.params.d - b.params.d);
        const fit = linearFit(series.map(sample => [sample.params.d, Math.log10(Math.max(sample.metrics.I, 1e-300))]));
        const expected = -2 * after.kappa / Math.LN10;
        const slopeError = expected ? Math.abs((fit.slope - expected) / expected) : 1;
        const passed = series.length >= 7 && fit.r2 >= .95 && slopeError <= .2;
        return {
          passed,
          evidenceScore: passed ? 3 : fit.r2 >= .8 ? 2 : series.length >= 4 ? 1 : 0,
          details: `有效距离 ${series.length} 个；R²=${fit.r2.toFixed(4)}；拟合斜率=${fit.slope.toFixed(4)}；理论斜率=${expected.toFixed(4)}；误差=${(slopeError * 100).toFixed(1)}%。`
        };
      },
      explanation: "log₁₀I 与 d 近似线性，斜率由衰减系数 κ 决定。"
    },
    {
      id: "stm_constant_current_design",
      title: "STM-3 恒流工作点设计",
      type: "综合设计",
      level: 3,
      goal: "设计参数使相对电流落在 10⁻³ 到 10⁻²，并保持明显的距离灵敏度。",
      predictionQuestion: "要获得适中电流和较高距离灵敏度，应选择怎样的 d 与 φ？",
      options: ["较小 d 和适中 φ", "极大 d 和极高 φ", "d 与 φ 都无关"],
      correctOption: "较小 d 和适中 φ",
      observe: "至少尝试 3 组参数，比较 d 增大 0.2 Å 后的电流变化。",
      hints: [
        "先确定目标电流范围。",
        "距离增大时电流按 exp(-2κd) 下降。",
        "灵敏度过高可能使可测电流范围过小。"
      ],
      sampleKey: "composite",
      minSamples: 3,
      keywords: ["恒流", "灵敏度", "电流", "距离"],
      check: ({ after, samples }) => {
        const inRange = after.I >= 1e-3 && after.I <= 1e-2;
        const later = samples.find(sample => sample.params.d >= after.d + .15);
        const sensitivity = later ? later.metrics.I / Math.max(after.I, 1e-30) : 1;
        const passed = inRange && samples.length >= 3 && sensitivity <= .65;
        return {
          passed,
          evidenceScore: passed ? 3 : inRange ? 2 : samples.length >= 3 ? 1 : 0,
          details: `当前 I=${after.I.toExponential(3)}；目标区间 1e-3～1e-2；距离增加后的电流比 ${sensitivity.toFixed(3)}。`
        };
      },
      explanation: "STM 工作点需要在可测电流和距离灵敏度之间平衡。"
    }
  ],
  alpha: [
    {
      id: "alpha_barrier_geometry",
      title: "α-1 势垒几何与转折点",
      type: "基础验证",
      level: 1,
      goal: "通过至少三组参数理解核表面、外转折点和禁阻区宽度。",
      predictionQuestion: "禁阻区宽度主要由哪两个量决定？",
      options: ["R 和 r₂", "m 和 E", "T 和 R"],
      correctOption: "R 和 r₂",
      observe: "比较至少 3 组 Eα 或 R，记录 R、r₂ 和 r₂-R。",
      hints: [
        "区分核半径 R 和外转折点 r₂。",
        "禁阻区宽度约为 r₂-R。",
        "Eα 改变会影响外转折点位置。"
      ],
      sampleKey: "composite",
      minSamples: 3,
      keywords: ["核半径", "转折点", "禁阻区", "库仑势垒"],
      check: ({ after, samples }) => {
        const passed = samples.length >= 3 && after.r2 > after.R && after.width > 0;
        return {
          passed,
          evidenceScore: passed ? 3 : Math.min(2, samples.length),
          details: `R=${after.R.toFixed(2)} fm；r₂=${after.r2.toFixed(2)} fm；禁阻区宽度=${after.width.toFixed(2)} fm。`
        };
      },
      explanation: "核表面在外半径 R，经典外转折点在 r₂，两者之间是量子隧穿禁阻区。"
    },
    {
      id: "alpha_energy_relation",
      title: "α-2 能量与库仑势垒关系",
      type: "定量分析",
      level: 2,
      goal: "扫描至少 5 个 Eα，验证禁阻区减小与穿透概率增大的趋势。",
      predictionQuestion: "提高 α 粒子能量 Eα 后，穿透概率趋势会如何变化？",
      options: ["增大", "减小", "基本不变"],
      correctOption: "增大",
      observe: "固定 Zd、R，至少采集 5 个 Eα 点，记录 r₂-R 和 P。",
      hints: [
        "固定 Zd 和 R。",
        "Eα 越高，外转折点 r₂ 通常越小。",
        "同时比较禁阻区宽度和 P。"
      ],
      sampleKey: "Ealpha",
      minSamples: 5,
      keywords: ["能量", "禁阻区", "穿透概率", "库仑势垒"],
      check: ({ samples }) => {
        const series = uniqueTaskSamples(stableSeries(samples, ["Zd", "R"], "Ealpha", .05), "Ealpha", .05)
          .sort((a, b) => a.params.Ealpha - b.params.Ealpha);
        const penetrationMonotonic = series.every((sample, index) => index === 0 || sample.metrics.penetrability >= series[index - 1].metrics.penetrability * .95);
        const widthMonotonic = series.every((sample, index) => index === 0 || sample.metrics.width <= series[index - 1].metrics.width * 1.05);
        const passed = series.length >= 5 && penetrationMonotonic && widthMonotonic;
        return {
          passed,
          evidenceScore: passed ? 3 : series.length >= 3 ? 1 : 0,
          details: `有效能量 ${series.length} 个；穿透概率单调上升：${penetrationMonotonic ? "是" : "否"}；禁阻区单调减小：${widthMonotonic ? "是" : "否"}。`
        };
      },
      explanation: "Eα 增大使库仑势垒外转折点内移，禁阻区变窄，穿透概率增大。"
    },
    {
      id: "alpha_inverse_model",
      title: "α-3 穿透概率反向设计",
      type: "反向设计",
      level: 3,
      goal: "设计参数使穿透概率接近 1×10⁻⁵，并分析模型局限。",
      predictionQuestion: "要增大低能 α 粒子的穿透概率，应优先调整 Eα 还是 R？",
      options: ["优先提高 Eα", "只增大 R", "完全不改变参数"],
      correctOption: "优先提高 Eα",
      observe: "至少尝试 4 组参数，使 P 接近目标数量级。",
      hints: [
        "先判断当前 P 与目标的差距。",
        "Eα 和 R 都会改变禁阻区宽度。",
        "WKB 是近似模型，真实衰变还涉及预形成概率。"
      ],
      sampleKey: "composite",
      minSamples: 4,
      keywords: ["WKB", "预形成", "穿透概率", "半衰期"],
      check: ({ after, samples }) => {
        const target = 1e-5;
        const error = Math.abs(Math.log10(Math.max(after.penetrability, 1e-300) / target));
        const passed = error <= .3 && samples.length >= 4;
        return {
          passed,
          evidenceScore: passed ? 3 : error <= .6 ? 2 : samples.length >= 3 ? 1 : 0,
          details: `当前 P=${after.penetrability.toExponential(4)}；目标 P≈1.0000e-5；对数误差 ${error.toFixed(3)} decades。`
        };
      },
      explanation: "反向设计通过改变禁阻区宽度实现目标穿透概率；真实 α 衰变还应考虑预形成概率和更严格的量子模型。"
    }
  ]
};

function uniqueTaskSamples(samples, key, tolerance = .01) {
  const unique = [];
  (samples || []).forEach(sample => {
    const isComposite = key === "composite";
    const value = isComposite ? JSON.stringify(sample.params) : Number(sample.params?.[key]);
    if (!isComposite && !Number.isFinite(value)) return;
    const duplicate = unique.some(existing => {
      if (key === "composite") return existing.signature === value;
      return Math.abs(existing.value - value) <= tolerance;
    });
    if (!duplicate) unique.push({ value, signature: value, sample });
  });
  return unique.map(item => item.sample);
}

function stableSeries(samples, fixedKeys, variableKey, tolerance = .03) {
  const source = uniqueTaskSamples(samples, variableKey, tolerance);
  if (!source.length) return [];
  const reference = source[source.length - 1];
  const stable = source.filter(sample => fixedKeys.every(key => {
    const expected = Number(reference.params?.[key]);
    const actual = Number(sample.params?.[key]);
    return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
  }));
  return uniqueTaskSamples(stable, variableKey, tolerance);
}

function linearFit(points) {
  const values = (points || []).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (values.length < 2) return { slope: 0, intercept: values[0]?.[1] || 0, r2: 0, count: values.length };
  const meanX = values.reduce((sum, [x]) => sum + x, 0) / values.length;
  const meanY = values.reduce((sum, [, y]) => sum + y, 0) / values.length;
  let numerator = 0;
  let denominator = 0;
  values.forEach(([x, y]) => {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  });
  const slope = denominator ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  let ssResidual = 0;
  let ssTotal = 0;
  values.forEach(([x, y]) => {
    ssResidual += (y - (slope * x + intercept)) ** 2;
    ssTotal += (y - meanY) ** 2;
  });
  return {
    slope,
    intercept,
    r2: ssTotal > 1e-15 ? Math.max(0, 1 - ssResidual / ssTotal) : 1,
    count: values.length
  };
}

function taskSamplesFor(module = state.activeTaskModule) {
  const task = activeTaskFor(module);
  if (!task) return [];
  return state.taskSamples.filter(sample => sample.module === module && sample.taskId === task.id);
}

function taskSampleCount(task) {
  const samples = taskSamplesFor();
  if (!task) return 0;
  if (task.sampleKey === "composite") return samples.length;
  const tolerance = task.sampleKey === "Ealpha" ? .05 : .03;
  return uniqueTaskSamples(samples, task.sampleKey, tolerance).length;
}

function taskExplanationScore(task, explanation) {
  const text = String(explanation || "").trim();
  if (text.length < 8) return 0;
  const keywordHits = (task.keywords || []).filter(keyword => text.toLowerCase().includes(keyword.toLowerCase())).length;
  if (text.length >= 28 && keywordHits >= 2) return 3;
  if (text.length >= 16 && keywordHits >= 1) return 2;
  return 1;
}

function computeTaskScore(task, result, predictionCorrect, explanation) {
  const sampleCount = taskSampleCount(task);
  const predictionScore = predictionCorrect ? 3 : 0;
  const sampleTarget = task.minSamples || 3;
  const designScore = sampleCount >= sampleTarget ? 3 : sampleCount >= Math.ceil(sampleTarget * .6) ? 2 : sampleCount >= 2 ? 1 : 0;
  const evidenceScore = clamp(Number(result?.evidenceScore) || 0, 0, 3);
  const explanationScore = taskExplanationScore(task, explanation);
  const hintPenalty = state.hintLevel >= 3 ? 2 : state.hintLevel >= 2 ? 1 : 0;
  const total = clamp(predictionScore + designScore + evidenceScore + explanationScore - hintPenalty, 0, 12);
  const stars = !result?.passed ? 0 : total >= 11 ? 3 : total >= 9 ? 2 : 1;
  return {
    total,
    stars,
    parts: {
      prediction: predictionScore,
      design: designScore,
      evidence: evidenceScore,
      explanation: explanationScore,
      hintPenalty
    }
  };
}

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
function unmapX(px, min, max, x, w) { return min + (px - x) / w * (max - min); }
function unmapY(py, min, max, y, h) { return min + (y + h - py) / h * (max - min); }
function insideArea(px, py, area) {
  return px >= area.x && px <= area.x + area.w && py >= area.y && py <= area.y + area.h;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

const guestPages = new Set(["home", "oneD", "videos"]);
const extensionPages = new Set(["flash", "rtd"]);
const requiredCoreTasks = {
  oneD: "oned_tunneling_regimes",
  stm: "stm_distance_current",
  alpha: "alpha_barrier_geometry"
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
function taskProgressStorageKey() {
  const user = state.authUser?.username || "guest";
  return `qt_task_progress_${user}`;
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
    state.taskProgress = JSON.parse(localStorage.getItem(taskProgressStorageKey()) || "{}") || {};
  } catch {
    state.learningProgress = defaultLearningProgress();
    state.taskProgress = {};
  }
  updateUnlockState(false);
}
function saveTaskProgress() {
  try {
    localStorage.setItem(taskProgressStorageKey(), JSON.stringify(state.taskProgress));
  } catch {
    // Local progress persistence is optional.
  }
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
  if (page === "admin" && !isAdmin()) return "只有管理员可以进入教学管理页面。";
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
      : "未登录：开放首页、一维模型和科普视频";
  }
  if (authOpenBtn) authOpenBtn.classList.toggle("hidden", authed);
  if (authLogoutBtn) authLogoutBtn.classList.toggle("hidden", !authed);
  document.getElementById("adminNav")?.classList.toggle("hidden", !isAdmin());
  document.querySelectorAll("[data-page]").forEach(el => {
    const locked = Boolean(pageLockReason(el.dataset.page));
    el.classList.toggle("locked", locked);
    const card = el.closest(".module-card");
    if (card) card.classList.toggle("locked", locked);
  });
  renderHomeProgress();
  renderFeedbackMailbox();
  renderHomeAchievementSummary();
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
    if (simulationModules.has(state.page)) startLearningSession(state.page);
    const target = state.pendingPageAfterAuth;
    state.pendingPageAfterAuth = null;
    if (target) {
      switchPage(target);
    } else if (simulationModules.has(state.page)) {
      maybePlayPrincipleIntro(state.page);
    }
  } catch (err) {
    setAuthMessage(err.message || "无法连接后端服务，请确认后端已启动。");
  }
}

function logout() {
  finishLearningSession();
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
  if (state.authUser) {
    void syncTaskProgressFromServer();
    void syncAchievementsForHome();
  }
}

async function syncAchievementsForHome() {
  if (!isAuthenticated()) return;
  try {
    const data = await learningRequest("/api/achievements");
    state.achievements.items = data?.achievements || [];
    state.achievements.newlyUnlocked = data?.newlyUnlocked || [];
    state.achievements.loaded = true;
    renderHomeAchievementSummary();
  } catch {
    renderHomeAchievementSummary();
  }
}

async function syncTaskProgressFromServer() {
  if (!isAuthenticated()) return;
  try {
    const data = await learningRequest("/api/learning/dashboard");
    const completed = (data.tasks || []).filter(item => item.status === "completed");
    completed.forEach(item => {
      const previous = state.taskProgress[item.task_id];
      state.taskProgress[item.task_id] = {
        score: Math.max(Number(previous?.score) || 0, Number(item.score) || 0),
        stars: Math.max(Number(previous?.stars) || 0, Number(item.stars) || 0),
        completedAt: item.created_at || previous?.completedAt || null
      };
    });
    ["oneD", "alpha", "stm"].forEach(module => {
      const foundation = learningTasks[module]?.find(task => isRequiredCoreTask(module, task.id));
      if (foundation && state.taskProgress[foundation.id]) state.learningProgress[module] = true;
    });
    saveTaskProgress();
    saveLearningProgress();
    updateUnlockState(false);
    updateAuthUI();
  } catch {
    // Keep local progress when dashboard data is unavailable.
  }
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
  if (module === "flash") return `JFN=${metrics.j.toExponential(3)}, Eox=${metrics.eox.toFixed(3)} V/nm, Vg=${metrics.gateV.toFixed(1)} V`;
  if (module === "rtd") return `I=${metrics.current.toExponential(3)}, E₁=${metrics.e1.toFixed(3)} eV, V=${metrics.bias.toFixed(2)} V`;
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

const simulationModules = new Set(["oneD", "alpha", "stm", "flash", "rtd"]);
const canvasModuleMap = {
  oneDCanvas: "oneD",
  alphaCanvas: "alpha",
  stmCanvas: "stm",
  flashCanvas: "flash",
  rtdCanvas: "rtd"
};
const canvasViewConfigs = {
  oneDCanvas: { module: "oneD" },
  alphaCanvas: { module: "alpha" },
  stmCanvas: { module: "stm" },
  flashCanvas: { module: "flash" },
  rtdCanvas: { module: "rtd" }
};
const canvasViewControllers = new Map();
const canvasSurfaceControllers = new WeakMap();
let activeCanvasView = null;
let activeCanvasMode = "fixed";

function isAnalysisView() {
  return activeCanvasMode === "zoom" && (activeCanvasView?.zoom || 1) >= 1.25;
}

function preferredCanvasMode() {
  try {
    return localStorage.getItem("qt_canvas_view_mode") === "zoom" ? "zoom" : "fixed";
  } catch {
    return "fixed";
  }
}

function setupCanvasViews() {
  Object.entries(canvasViewConfigs).forEach(([canvasId, config]) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas.closest(".canvas-view")) return;

    const baseWidth = canvas.width;
    const baseHeight = canvas.height;
    const root = document.createElement("div");
    root.className = "canvas-view";
    root.dataset.canvasId = canvasId;
    root.dataset.mode = preferredCanvasMode();

    const toolbar = document.createElement("div");
    toolbar.className = "canvas-toolbar";
    toolbar.innerHTML = `
      <div class="view-mode-switch" role="group" aria-label="图像显示模式">
        <button type="button" class="${root.dataset.mode === "fixed" ? "active" : ""}" data-view-mode="fixed">固定视图</button>
        <button type="button" class="${root.dataset.mode === "zoom" ? "active" : ""}" data-view-mode="zoom">自由缩放</button>
      </div>`;

    const frame = document.createElement("div");
    frame.className = "canvas-frame";
    const readout = document.createElement("div");
    readout.className = "canvas-readout hidden";
    readout.setAttribute("role", "status");
    readout.setAttribute("aria-live", "polite");

    canvas.parentNode.insertBefore(root, canvas);
    root.append(toolbar, frame);
    frame.append(canvas, readout);
    canvas.style.touchAction = root.dataset.mode === "zoom" ? "none" : "auto";
    canvas.setAttribute("aria-label", `${moduleDisplayName(config.module)}交互图像，可缩放、平移并悬停读数`);

    const controller = {
      canvasId,
      module: config.module,
      display: canvas,
      root,
      frame,
      readout,
      baseWidth,
      baseHeight,
      surface: null,
      surfaceScale: 1,
      cssWidth: baseWidth,
      cssHeight: baseHeight,
      zoom: 1,
      panX: 0,
      panY: 0,
      mode: root.dataset.mode,
      hitTest: null,
      drag: null
    };
    canvasViewControllers.set(canvasId, controller);
    frame.addEventListener("pointerleave", () => readout.classList.add("hidden"));
  });
}

function beginCanvasView(canvasId) {
  const controller = canvasViewControllers.get(canvasId);
  const display = controller?.display || document.getElementById(canvasId);
  if (!controller || !display) {
    const fallback = display || document.createElement("canvas");
    return { canvas: fallback, ctx: fallback.getContext("2d"), container: controller, controller: null };
  }

  const frame = controller.frame;
  const isFullscreen = document.fullscreenElement === controller.root;
  let cssWidth;
  let cssHeight;
  if (isFullscreen && !controller.compact) {
    const availableWidth = Math.max(320, frame.clientWidth - 28);
    const availableHeight = Math.max(240, frame.clientHeight - 28);
    const fit = Math.min(availableWidth / controller.baseWidth, availableHeight / controller.baseHeight);
    cssWidth = controller.baseWidth * fit;
    cssHeight = controller.baseHeight * fit;
  } else {
    cssWidth = Math.max(280, frame.clientWidth || controller.baseWidth);
    cssHeight = cssWidth * controller.baseHeight / controller.baseWidth;
  }

  display.style.width = `${Math.round(cssWidth)}px`;
  display.style.height = `${Math.round(cssHeight)}px`;
  display.style.aspectRatio = `${controller.baseWidth} / ${controller.baseHeight}`;
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
  const displayWidth = Math.max(1, Math.round(cssWidth * pixelRatio));
  const displayHeight = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (display.width !== displayWidth || display.height !== displayHeight) {
    display.width = displayWidth;
    display.height = displayHeight;
  }

  const fitScale = Math.max(1, controller.cssWidth / controller.baseWidth);
  const surfaceScale = clamp(pixelRatio * Math.max(fitScale, Math.max(1, controller.zoom)), 1, 3);
  const surfaceWidth = Math.max(1, Math.round(controller.baseWidth * surfaceScale));
  const surfaceHeight = Math.max(1, Math.round(controller.baseHeight * surfaceScale));
  if (!controller.surface) controller.surface = document.createElement("canvas");
  if (controller.surface.width !== surfaceWidth || controller.surface.height !== surfaceHeight) {
    controller.surface.width = surfaceWidth;
    controller.surface.height = surfaceHeight;
  }
  controller.surfaceScale = surfaceScale;
  controller.cssWidth = cssWidth;
  controller.cssHeight = cssHeight;
  controller.pixelRatio = displayWidth / cssWidth;
  controller.mode = controller.root?.dataset.mode || controller.mode;
  activeCanvasView = controller;
  activeCanvasMode = controller.mode;
  canvasSurfaceControllers.set(controller.surface, controller);

  const ctx = controller.surface.getContext("2d");
  ctx.setTransform(surfaceScale, 0, 0, surfaceScale, 0, 0);
  ctx.clearRect(0, 0, controller.baseWidth, controller.baseHeight);
  return {
    canvas: controller.surface,
    ctx,
    controller,
    width: controller.baseWidth,
    height: controller.baseHeight
  };
}

function finishCanvasView(surface) {
  const controller = canvasSurfaceControllers.get(surface);
  if (!controller) return;
  const display = controller.display;
  const output = display.getContext("2d");
  const fitX = display.width / Math.max(1, surface.width);
  const fitY = display.height / Math.max(1, surface.height);
  output.setTransform(1, 0, 0, 1, 0, 0);
  output.clearRect(0, 0, display.width, display.height);
  output.save();
  output.translate(controller.panX * controller.pixelRatio, controller.panY * controller.pixelRatio);
  output.scale(fitX * controller.zoom, fitY * controller.zoom);
  output.imageSmoothingEnabled = true;
  output.imageSmoothingQuality = "high";
  output.drawImage(surface, 0, 0);
  output.restore();
}

function registerCanvasHitTest(surface, hitTest) {
  const controller = canvasSurfaceControllers.get(surface);
  if (controller) controller.hitTest = hitTest;
}

function canvasReadoutItems(result) {
  if (!result) return [];
  const items = Array.isArray(result) ? result : result.items;
  return Array.isArray(items) ? items.filter(item => item && item.label != null && item.value != null) : [];
}

function formatCanvasReadoutValue(item) {
  if (typeof item.value === "number") {
    const absolute = Math.abs(item.value);
    if (absolute !== 0 && (absolute < 1e-3 || absolute >= 1e5)) return item.value.toExponential(4);
    return item.value.toFixed(item.digits ?? 4).replace(/\.?0+$/, "");
  }
  return String(item.value);
}

function updateCanvasReadout(controller, event, result) {
  if (!controller?.readout) return;
  const items = canvasReadoutItems(result);
  if (!items.length) {
    controller.readout.classList.add("hidden");
    return;
  }
  controller.readout.innerHTML = items.map(item => `
    <div class="canvas-readout-row">
      <span>${escapeHtml(item.label)}</span>
      <strong${item.color ? ` style="color:${escapeHtml(item.color)}"` : ""}>${escapeHtml(formatCanvasReadoutValue(item))}${item.unit ? ` ${escapeHtml(item.unit)}` : ""}</strong>
    </div>`).join("");
  controller.readout.classList.remove("hidden");

  const frameRect = controller.frame.getBoundingClientRect();
  const readoutRect = controller.readout.getBoundingClientRect();
  let left = event.clientX - frameRect.left + 16;
  let top = event.clientY - frameRect.top + 16;
  if (left + readoutRect.width > frameRect.width - 8) left = event.clientX - frameRect.left - readoutRect.width - 16;
  if (top + readoutRect.height > frameRect.height - 8) top = event.clientY - frameRect.top - readoutRect.height - 16;
  controller.readout.style.left = `${Math.max(8, left)}px`;
  controller.readout.style.top = `${Math.max(8, top)}px`;
}

function canvasPointerPosition(controller, event) {
  const rect = controller.display.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const cssX = (event.clientX - rect.left) * controller.cssWidth / rect.width;
  const cssY = (event.clientY - rect.top) * controller.cssHeight / rect.height;
  const fit = controller.cssWidth / controller.surface.width;
  return {
    cssX,
    cssY,
    x: (cssX - controller.panX) / Math.max(1e-9, controller.zoom * fit),
    y: (cssY - controller.panY) / Math.max(1e-9, controller.zoom * fit)
  };
}

function clampCanvasPan(controller) {
  const maxX = controller.cssWidth * Math.max(0, controller.zoom - 1) / 2 + controller.cssWidth * .08;
  const maxY = controller.cssHeight * Math.max(0, controller.zoom - 1) / 2 + controller.cssHeight * .08;
  controller.panX = clamp(controller.panX, -maxX, maxX);
  controller.panY = clamp(controller.panY, -maxY, maxY);
}

function setCanvasZoom(controller, nextZoom, anchor = null) {
  if (!controller) return;
  const zoom = clamp(nextZoom, 1, 6);
  const cssX = anchor?.cssX ?? controller.cssWidth / 2;
  const cssY = anchor?.cssY ?? controller.cssHeight / 2;
  const fit = controller.cssWidth / controller.surface.width;
  const surfaceX = (cssX - controller.panX) / Math.max(1e-9, controller.zoom * fit);
  const surfaceY = (cssY - controller.panY) / Math.max(1e-9, controller.zoom * fit);
  controller.zoom = zoom;
  controller.panX = cssX - zoom * fit * surfaceX;
  controller.panY = cssY - zoom * fit * surfaceY;
  if (zoom === 1) {
    controller.panX = 0;
    controller.panY = 0;
  }
  clampCanvasPan(controller);
}

function redrawCanvasById(canvasId) {
  if (canvasId === "oneDCanvas") drawOneD();
  if (canvasId === "alphaCanvas") drawAlpha();
  if (canvasId === "stmCanvas") drawSTM();
  if (canvasId === "flashCanvas") drawFlash();
  if (canvasId === "rtdCanvas") drawRTD();
}

function setCanvasViewMode(mode) {
  if (!["fixed", "zoom"].includes(mode)) return;
  try {
    localStorage.setItem("qt_canvas_view_mode", mode);
  } catch {
    // Mode persistence is optional.
  }
  canvasViewControllers.forEach(controller => {
    controller.mode = mode;
    controller.root.dataset.mode = mode;
    controller.zoom = 1;
    controller.panX = 0;
    controller.panY = 0;
    controller.drag = null;
    controller.frame.classList.remove("is-dragging");
    controller.display.style.touchAction = mode === "zoom" ? "none" : "auto";
    redrawCanvasById(controller.canvasId);
  });
  document.querySelectorAll("[data-view-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.viewMode === mode);
  });
}

const principleIntroConfigs = {
  oneD: {
    title: "一维方势垒：波包的反射与透射",
    subtitle: "量子隧穿：粒子能量低于势垒，仍有概率穿过",
    accent: "#22d3ee",
    duration: 25,
    chapters: [
      { at: 0, title: "波包接近" },
      { at: .28, title: "碰撞与分裂" },
      { at: .58, title: "反射与穿透" },
      { at: .82, title: "结果解释" }
    ],
    draw: drawIntroOneD
  },
  alpha: {
    title: "α 衰变：低概率穿出库仑势垒",
    subtitle: "α 粒子被库仑势垒束缚，依靠量子隧穿逃离原子核",
    accent: "#f97316",
    duration: 32,
    chapters: [
      { at: 0, title: "核内束缚" },
      { at: .34, title: "撞击库仑势垒" },
      { at: .58, title: "量子隧穿" },
      { at: .82, title: "穿透概率" }
    ],
    draw: drawIntroAlpha
  },
  stm: {
    title: "STM：距离改变，隧穿电流骤变",
    subtitle: "隧穿电流对探针-样品间距极其敏感，实现原子级成像",
    accent: "#14b8a6",
    duration: 28,
    chapters: [
      { at: 0, title: "探针靠近样品" },
      { at: .3, title: "电子穿过真空" },
      { at: .58, title: "电流指数敏感" },
      { at: .82, title: "形成表面图" }
    ],
    draw: drawIntroSTM
  },
  flash: {
    title: "闪存隧穿：栅压控制电子写入",
    subtitle: "利用 Fowler-Nordheim 隧穿实现电荷存储，是闪存读写基础",
    accent: "#f59e0b",
    duration: 35,
    chapters: [
      { at: 0, title: "建立控制栅电场" },
      { at: .3, title: "势垒被拉斜" },
      { at: .58, title: "电子隧穿" },
      { at: .82, title: "写入与擦除" }
    ],
    draw: drawIntroFlash
  },
  rtd: {
    title: "共振隧穿：能级对齐时形成透射峰",
    subtitle: "能量匹配时发生共振隧穿，并形成负微分电阻效应",
    accent: "#8b5cf6",
    duration: 30,
    chapters: [
      { at: 0, title: "进入双势垒" },
      { at: .3, title: "能级失配" },
      { at: .56, title: "共振对齐" },
      { at: .82, title: "电流峰与下降" }
    ],
    draw: drawIntroRTD
  }
};

function principleSeenStorageKey() {
  const username = state.authUser?.username || "guest";
  return `qt_principle_intro_seen_${username}`;
}

function principleSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(principleSeenStorageKey()) || "{}") || {};
  } catch {
    return {};
  }
}

function markPrincipleSeen(module) {
  const seen = principleSeenMap();
  seen[module] = Date.now();
  try {
    localStorage.setItem(principleSeenStorageKey(), JSON.stringify(seen));
  } catch {
    // Local storage is optional; the animation still works without persistence.
  }
}

function setupPrincipleIntro() {
  if (document.getElementById("principleIntroModal")) return;
  const modal = document.createElement("div");
  modal.id = "principleIntroModal";
  modal.className = "principle-intro-modal hidden";
  modal.innerHTML = `
    <div class="principle-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="principleIntroTitle">
      <header class="principle-intro-header">
        <div>
          <span>原理引导</span>
          <h2 id="principleIntroTitle"></h2>
          <p id="principleIntroSubtitle"></p>
        </div>
        <button type="button" class="principle-intro-skip" data-principle-action="skip">跳过</button>
      </header>
      <div class="principle-intro-stage">
        <canvas id="principleIntroCanvas" width="1100" height="600"></canvas>
        <div class="principle-intro-caption">
          <span id="principleChapterIndex">01</span>
          <strong id="principleChapterText"></strong>
        </div>
      </div>
      <footer class="principle-intro-footer">
        <div class="principle-progress-wrap">
          <div class="principle-progress"><span id="principleProgressBar"></span></div>
          <div id="principleChapterTrack" class="principle-chapter-track"></div>
        </div>
        <div class="principle-intro-controls">
          <button type="button" data-principle-action="pause" id="principlePauseButton">暂停</button>
          <button type="button" data-principle-action="replay">重新播放</button>
          <button type="button" data-principle-action="skip">跳过动画</button>
        </div>
      </footer>
    </div>`;
  document.body.appendChild(modal);

  ["oneD", "alpha", "stm", "flash", "rtd"].forEach(module => {
    const row = document.querySelector(`#${module} .module-control-stack .action-row`);
    if (!row || row.querySelector(`[data-action="principle-intro"][data-module="${module}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outline-btn small principle-replay-button";
    button.dataset.action = "principle-intro";
    button.dataset.module = module;
    button.textContent = "重看原理动画";
    row.appendChild(button);
  });
}

function maybePlayPrincipleIntro(module) {
  if (!principleIntroConfigs[module]) return;
  if (principleSeenMap()[module]) return;
  playPrincipleIntro(module);
}

function chapterForIntro(config, elapsed) {
  const normalized = clamp(elapsed / config.duration, 0, 1);
  let index = 0;
  config.chapters.forEach((chapter, chapterIndex) => {
    if (normalized >= chapter.at) index = chapterIndex;
  });
  return index;
}

function playPrincipleIntro(module) {
  const config = principleIntroConfigs[module];
  const modal = document.getElementById("principleIntroModal");
  if (!config || !modal) return;
  cancelAnimationFrame(state.principleIntro.animationFrame);
  state.principleIntro.active = true;
  state.principleIntro.module = module;
  state.principleIntro.elapsed = 0;
  state.principleIntro.duration = config.duration;
  state.principleIntro.paused = false;
  state.principleIntro.lastTimestamp = 0;
  state.principleIntro.chapterIndex = -1;
  document.getElementById("principleIntroTitle").textContent = config.title;
  document.getElementById("principleIntroSubtitle").textContent = config.subtitle;
  document.getElementById("principlePauseButton").textContent = "暂停";
  document.getElementById("principleChapterTrack").innerHTML = config.chapters.map((chapter, index) =>
    `<span data-chapter="${index}">${String(index + 1).padStart(2, "0")} ${escapeHtml(chapter.title)}</span>`
  ).join("");
  modal.classList.remove("hidden", "closing");
  document.body.classList.add("principle-intro-open");
  state.principleIntro.animationFrame = requestAnimationFrame(principleIntroLoop);
}

function finishPrincipleIntro() {
  const modal = document.getElementById("principleIntroModal");
  const module = state.principleIntro.module;
  if (!state.principleIntro.active || !modal) return;
  cancelAnimationFrame(state.principleIntro.animationFrame);
  state.principleIntro.active = false;
  state.principleIntro.animationFrame = 0;
  if (module) markPrincipleSeen(module);
  modal.classList.add("closing");
  document.body.classList.remove("principle-intro-open");
  setTimeout(() => modal.classList.add("hidden"), 260);
}

function togglePrinciplePause() {
  if (!state.principleIntro.active) return;
  state.principleIntro.paused = !state.principleIntro.paused;
  state.principleIntro.lastTimestamp = 0;
  document.getElementById("principlePauseButton").textContent = state.principleIntro.paused ? "继续" : "暂停";
}

function principleIntroLoop(timestamp) {
  const intro = state.principleIntro;
  const config = principleIntroConfigs[intro.module];
  if (!intro.active || !config) return;
  if (!intro.lastTimestamp) intro.lastTimestamp = timestamp;
  const delta = Math.min(.08, Math.max(0, (timestamp - intro.lastTimestamp) / 1000));
  intro.lastTimestamp = timestamp;
  if (!intro.paused) intro.elapsed = Math.min(config.duration, intro.elapsed + delta);
  renderPrincipleIntroFrame(config, intro.elapsed);
  if (intro.elapsed >= config.duration) {
    finishPrincipleIntro();
    return;
  }
  intro.animationFrame = requestAnimationFrame(principleIntroLoop);
}

function renderPrincipleIntroFrame(config, elapsed) {
  const canvas = document.getElementById("principleIntroCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(640, rect.width || 1100);
  const cssHeight = Math.max(360, rect.height || 600);
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
  const width = Math.round(cssWidth * pixelRatio);
  const height = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  drawPrincipleBackground(ctx, cssWidth, cssHeight, config.accent);
  config.draw(ctx, cssWidth, cssHeight, clamp(elapsed / config.duration, 0, 1), elapsed);

  const chapterIndex = chapterForIntro(config, elapsed);
  if (chapterIndex !== state.principleIntro.chapterIndex) {
    state.principleIntro.chapterIndex = chapterIndex;
    document.getElementById("principleChapterIndex").textContent = String(chapterIndex + 1).padStart(2, "0");
    document.getElementById("principleChapterText").textContent = config.chapters[chapterIndex].title;
    document.querySelectorAll("#principleChapterTrack [data-chapter]").forEach((item, index) => {
      item.classList.toggle("active", index === chapterIndex);
      item.classList.toggle("done", index < chapterIndex);
    });
  }
  document.getElementById("principleProgressBar").style.width = `${elapsed / config.duration * 100}%`;
}

function lerpNumber(start, end, amount) {
  return start + (end - start) * clamp(amount, 0, 1);
}

function smoothIntro(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function drawPrincipleBackground(ctx, w, h, accent) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#081426");
  gradient.addColorStop(.55, "#0c2038");
  gradient.addColorStop(1, "#111a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = .18;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += 54) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(w * .18, h * .16, 0, w * .18, h * .16, w * .55);
  glow.addColorStop(0, `${accent}38`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawIntroLabel(ctx, text, x, y, color = "#e2e8f0", size = 18, align = "left") {
  ctx.save();
  ctx.font = `800 ${size}px Microsoft YaHei UI`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawIntroParticle(ctx, x, y, radius, color, glow = true) {
  ctx.save();
  if (glow) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.8);
    gradient.addColorStop(0, `${color}ee`);
    gradient.addColorStop(.36, `${color}66`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.8, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawIntroTrail(ctx, fromX, fromY, toX, toY, color, alpha = .45) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, color);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

function drawIntroSparks(ctx, x, y, time, color, count = 8) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = i / count * TAU + time * 1.7;
    const distance = 18 + (i % 3) * 13 + Math.sin(time * 9 + i * 2.1) * 7;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    ctx.globalAlpha = .35 + .55 * (0.5 + 0.5 * Math.sin(time * 11 + i));
    ctx.beginPath();
    ctx.arc(px, py, 2.2 + i % 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawIntroWavePacket(ctx, center, y, width, amplitude, color, phase = 0) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = .92;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i <= 180; i++) {
    const x = center - width * 2.2 + width * 4.4 * i / 180;
    const envelope = Math.exp(-((x - center) ** 2) / (2 * width * width));
    const value = y - amplitude * envelope * Math.sin((x - center) * .11 + phase);
    i ? ctx.lineTo(x, value) : ctx.moveTo(x, value);
  }
  ctx.stroke();
  ctx.restore();
}

function drawIntroOneD(ctx, w, h, t) {
  const baseline = h * .72;
  const barrierX1 = w * .51;
  const barrierX2 = w * .62;
  const barrierTop = h * .33;
  const axisLeft = w * .06;
  const axisRight = w * .94;
  drawIntroLabel(ctx, "量子隧穿：粒子能量低于势垒仍有概率穿过", axisLeft, h * .12, "#e2e8f0", 20);
  ctx.strokeStyle = "rgba(226,232,240,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(axisLeft, baseline); ctx.lineTo(axisRight, baseline); ctx.stroke();
  ctx.fillStyle = "rgba(226,232,240,.92)";
  ctx.fillRect(barrierX1, barrierTop, barrierX2 - barrierX1, baseline - barrierTop);
  ctx.strokeStyle = "#020617";
  ctx.lineWidth = 4;
  ctx.strokeRect(barrierX1, barrierTop, barrierX2 - barrierX1, baseline - barrierTop);
  ctx.setLineDash([8, 7]);
  ctx.strokeStyle = "#f97316";
  ctx.beginPath(); ctx.moveTo(axisLeft, h * .48); ctx.lineTo(axisRight, h * .48); ctx.stroke();
  ctx.setLineDash([]);
  drawIntroLabel(ctx, "粒子能量 E", axisRight - 22, h * .43, "#fb923c", 20, "right");
  drawIntroLabel(ctx, "势垒高度 V₀", barrierX2 + 16, barrierTop + 15, "#0f172a", 19);

  const approach = smoothIntro(t / .34);
  const split = smoothIntro((t - .34) / .3);
  const centerIncoming = lerpNumber(w * .14, barrierX1 - 18, approach);
  if (t < .43) {
    drawIntroTrail(ctx, Math.max(axisLeft, centerIncoming - 120), baseline, centerIncoming, baseline, "#22d3ee", .5);
    drawIntroWavePacket(ctx, centerIncoming, baseline, 29, h * .12, "#22d3ee", t * 12);
  } else {
    const reflectCenter = lerpNumber(barrierX1 - 14, w * .16, split);
    const transmitCenter = lerpNumber(barrierX2 + 12, w * .88, split);
    drawIntroTrail(ctx, barrierX1, baseline, reflectCenter, baseline, "#f97316", .42);
    drawIntroTrail(ctx, barrierX2, baseline, transmitCenter, baseline, "#a78bfa", .42);
    drawIntroWavePacket(ctx, reflectCenter, baseline, 25, h * .09 * (1 - split * .28), "#f97316", -t * 12);
    drawIntroWavePacket(ctx, transmitCenter, baseline, 23, h * .062 * (1 - split * .16), "#a78bfa", t * 12);
  }
  if (t > .32 && t < .62) {
    const collision = Math.sin((t - .32) / .3 * Math.PI);
    ctx.save();
    ctx.globalAlpha = collision * .7;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc((barrierX1 + barrierX2) / 2, h * .52, 24 + collision * 35, 0, TAU); ctx.stroke();
    ctx.restore();
    drawIntroSparks(ctx, (barrierX1 + barrierX2) / 2, h * .52, t * 14, "#e0f2fe", 11);
  }
  if (t > .62) {
    const reveal = smoothIntro((t - .62) / .26);
    ctx.globalAlpha = reveal;
    drawIntroLabel(ctx, "反射波", w * .16, h * .25, "#fb923c", 22, "center");
    drawIntroLabel(ctx, "透射波", w * .87, h * .25, "#c4b5fd", 22, "center");
    ctx.globalAlpha = 1;
  }
}

function drawIntroAlpha(ctx, w, h, t) {
  const base = h * .76;
  const nucleusX = w * .22;
  const nucleusY = h * .59;
  const barrierEnd = w * .72;
  ctx.strokeStyle = "rgba(226,232,240,.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * .07, base); ctx.lineTo(w * .94, base); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = lerpNumber(nucleusX + 24, barrierEnd, i / 240);
    const potential = Math.min(h * .5, (w * .22) / Math.max(x - nucleusX, 24) * h * .3);
    const y = base - potential;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "rgba(249,115,22,.13)";
  ctx.beginPath();
  ctx.moveTo(nucleusX + 24, base);
  for (let i = 0; i <= 200; i++) {
    const x = lerpNumber(nucleusX + 24, barrierEnd, i / 200);
    const potential = Math.min(h * .5, (w * .22) / Math.max(x - nucleusX, 24) * h * .3);
    ctx.lineTo(x, base - potential);
  }
  ctx.lineTo(barrierEnd, base); ctx.closePath(); ctx.fill();
  const nucleusGlow = ctx.createRadialGradient(nucleusX, nucleusY, 0, nucleusX, nucleusY, 100);
  nucleusGlow.addColorStop(0, "rgba(251,191,36,.78)");
  nucleusGlow.addColorStop(.45, "rgba(239,68,68,.28)");
  nucleusGlow.addColorStop(1, "transparent");
  ctx.fillStyle = nucleusGlow;
  ctx.beginPath(); ctx.arc(nucleusX, nucleusY, 100, 0, TAU); ctx.fill();
  drawIntroParticle(ctx, nucleusX, nucleusY, 55, "#ef4444");
  const nucleonOffsets = [[-23, -12], [0, -25], [23, -10], [-18, 18], [7, 19], [27, 17]];
  nucleonOffsets.forEach(([dx, dy], index) => {
    drawIntroParticle(ctx, nucleusX + dx, nucleusY + dy, 10, index % 2 ? "#fca5a5" : "#fb923c", false);
  });
  drawIntroLabel(ctx, "原子核", nucleusX, nucleusY + 88, "#fecaca", 18, "center");

  let particleX;
  let particleY;
  let alpha = 1;
  if (t < .48) {
    const bouncePhase = t / .48 * TAU * 3;
    const impact = Math.abs(Math.sin(bouncePhase));
    particleX = nucleusX + impact * 31;
    particleY = nucleusY + Math.cos(bouncePhase * 1.7) * 14;
    const impactStrength = Math.max(0, 1 - Math.abs(Math.sin(bouncePhase)));
    if (impactStrength > .65) {
      ctx.save();
      ctx.globalAlpha = (impactStrength - .65) / .35 * .65;
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(nucleusX + 34, nucleusY, 25, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.restore();
    }
    drawIntroLabel(ctx, `撞击 ${Math.min(3, Math.floor(t / .16) + 1)} / 3`, nucleusX, h * .25, "#fde68a", 20, "center");
  } else if (t < .68) {
    const tunnel = smoothIntro((t - .48) / .2);
    particleX = lerpNumber(nucleusX + 26, w * .62, tunnel);
    particleY = nucleusY - Math.sin(tunnel * Math.PI) * h * .17;
    alpha = lerpNumber(1, .34, tunnel);
  } else {
    const escape = smoothIntro((t - .68) / .32);
    particleX = lerpNumber(w * .62, w * .9, escape);
    particleY = nucleusY - h * .12 - Math.sin(escape * Math.PI) * h * .1;
    alpha = lerpNumber(.34, 1, escape);
  }
  drawIntroTrail(ctx, nucleusX + 18, nucleusY, particleX, particleY, "#facc15", .36);
  ctx.globalAlpha = alpha;
  drawIntroParticle(ctx, particleX, particleY, 13, "#facc15");
  ctx.globalAlpha = 1;
  if (t > .48 && t < .82) {
    drawIntroSparks(ctx, particleX, particleY, t * 10, "#fde68a", 7);
  }
  if (t > .48 && t < .82) {
    ctx.save();
    ctx.strokeStyle = "rgba(250,204,21,.55)";
    ctx.lineWidth = 4;
    ctx.setLineDash([7, 8]);
    ctx.beginPath(); ctx.moveTo(nucleusX + 20, nucleusY); ctx.lineTo(particleX, particleY); ctx.stroke();
    ctx.restore();
  }
  if (t > .78) {
    ctx.globalAlpha = smoothIntro((t - .78) / .22);
    drawIntroLabel(ctx, "隧穿成功", w * .77, h * .26, "#fde68a", 22, "center");
    drawIntroLabel(ctx, "隧穿概率极低", w * .77, h * .33, "#fbbf24", 17, "center");
    ctx.globalAlpha = 1;
  }
}

function drawIntroSTM(ctx, w, h, t) {
  const sampleLeft = w * .08;
  const sampleRight = w * .67;
  const sampleBaseY = h * .79;
  const scanProgress = smoothIntro((t - .06) / .84);
  const scanX = lerpNumber(sampleLeft + 24, sampleRight - 24, scanProgress);
  const surfaceHeightAt = x => {
    const normalized = (x - sampleLeft) / Math.max(1, sampleRight - sampleLeft);
    return 18 + 22 * (0.5 + 0.5 * Math.sin(normalized * Math.PI * 5.2 + .8));
  };
  drawIntroLabel(ctx, "隧穿电流对探针-样品间距极其敏感，实现原子级成像", sampleLeft, h * .1, "#e2e8f0", 19);
  ctx.fillStyle = "rgba(30,41,59,.86)";
  ctx.beginPath();
  ctx.moveTo(sampleLeft, h);
  ctx.lineTo(sampleLeft, sampleBaseY);
  for (let i = 0; i <= 120; i++) {
    const x = lerpNumber(sampleLeft, sampleRight, i / 120);
    ctx.lineTo(x, sampleBaseY - surfaceHeightAt(x));
  }
  ctx.lineTo(sampleRight, h);
  ctx.closePath(); ctx.fill();

  const topAtoms = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const x = sampleLeft + 28 + col * (sampleRight - sampleLeft - 52) / 8 + (row % 2) * 18;
      const y = sampleBaseY - surfaceHeightAt(x) + row * 31 + 7;
      topAtoms.push([x, y]);
      drawIntroParticle(ctx, x, y, row === 0 ? 15 : 12, row === 0 ? "#38bdf8" : "#64748b", row === 0);
    }
  }
  drawIntroLabel(ctx, "样品原子", sampleLeft + 6, sampleBaseY + 78, "#bae6fd", 18);

  const surfaceY = sampleBaseY - surfaceHeightAt(scanX);
  const gap = lerpNumber(70, 18, Math.sin(scanProgress * Math.PI));
  const tipY = surfaceY - gap;
  ctx.fillStyle = "rgba(20,184,166,.18)";
  ctx.beginPath();
  ctx.moveTo(scanX - w * .12, 0);
  ctx.lineTo(scanX + w * .12, 0);
  ctx.lineTo(scanX + 14, tipY - 28);
  ctx.lineTo(scanX, tipY);
  ctx.lineTo(scanX - 14, tipY - 28);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#5eead4";
  ctx.lineWidth = 3;
  ctx.stroke();
  drawIntroLabel(ctx, "金属探针", scanX, 42, "#99f6e4", 20, "center");
  drawIntroTrail(ctx, scanX, tipY + 18, scanX, surfaceY - 14, "#facc15", .42);

  const current = clamp(Math.exp(-gap / 22), 0, 1);
  const electronCount = Math.round(3 + current * 12);
  for (let i = 0; i < electronCount; i++) {
    const progress = (t * 2.2 + i / electronCount) % 1;
    const x = scanX + Math.sin(i * 2.3) * 13;
    const y = lerpNumber(tipY + 8, surfaceY - 10, progress);
    drawIntroParticle(ctx, x, y, 4 + current * 1.2, "#facc15", false);
  }
  drawIntroSparks(ctx, scanX, surfaceY - 14, t * 14, "#5eead4", 8);
  drawIntroLabel(ctx, "真空势垒", scanX + 24, (tipY + surfaceY) / 2, "#5eead4", 16);

  ctx.fillStyle = "rgba(15,23,42,.82)";
  ctx.fillRect(w * .72, h * .16, w * .22, h * .68);
  ctx.strokeStyle = "rgba(148,163,184,.4)";
  ctx.strokeRect(w * .72, h * .16, w * .22, h * .68);
  drawIntroLabel(ctx, "隧穿电流", w * .74, h * .2, "#cbd5e1", 17);
  ctx.fillStyle = "rgba(148,163,184,.15)";
  ctx.fillRect(w * .74, h * .25, w * .17, 14);
  ctx.fillStyle = current > .58 ? "#22d3ee" : "#f59e0b";
  ctx.fillRect(w * .74, h * .25, w * .17 * current, 14);
  drawIntroLabel(ctx, `I = ${current.toFixed(2)}`, w * .74, h * .31, current > .58 ? "#67e8f9" : "#fbbf24", 17);

  const mapX = w * .74;
  const mapY = h * .43;
  const mapW = w * .17;
  const mapH = h * .28;
  ctx.fillStyle = "rgba(8,47,73,.72)";
  ctx.fillRect(mapX, mapY, mapW, mapH);
  const cols = 16;
  const rows = 8;
  const revealed = Math.floor(scanProgress * cols);
  for (let col = 0; col < revealed; col++) {
    const sampleColumnX = lerpNumber(sampleLeft, sampleRight, col / Math.max(1, cols - 1));
    const height = surfaceHeightAt(sampleColumnX);
    for (let row = 0; row < rows; row++) {
      const value = clamp(1 - Math.abs(height - row * 4.5) / 28, .12, .95);
      ctx.fillStyle = `rgba(34,211,238,${.18 + value * .74})`;
      ctx.fillRect(mapX + 6 + col * (mapW - 12) / cols, mapY + 7 + row * (mapH - 14) / rows, Math.max(4, (mapW - 14) / cols - 2), Math.max(4, (mapH - 16) / rows - 2));
    }
  }
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2;
  ctx.strokeRect(mapX, mapY, mapW, mapH);
  drawIntroLabel(ctx, "原子形貌成像", mapX, mapY - 18, "#7dd3fc", 17);
}

function drawIntroFlash(ctx, w, h, t) {
  const left = w * .16;
  const right = w * .84;
  const writePhase = t < .5;
  const localT = writePhase ? t / .5 : (t - .5) / .5;
  const controlGate = { y: h * .13, h: h * .1 };
  const oxide = { y: h * .27, h: h * .22 };
  const floatingGate = { y: h * .53, h: h * .1 };
  const substrate = { y: h * .67, h: h * .17 };
  const drawLayer = (layer, fill, stroke) => {
    ctx.fillStyle = fill;
    ctx.fillRect(left, layer.y, right - left, layer.h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(left, layer.y, right - left, layer.h);
  };
  drawLayer(controlGate, "rgba(37,99,235,.3)", "#60a5fa");
  drawLayer(oxide, "rgba(245,158,11,.14)", "#fbbf24");
  drawLayer(floatingGate, "rgba(124,58,237,.26)", "#c4b5fd");
  drawLayer(substrate, "rgba(100,116,139,.34)", "#94a3b8");
  drawIntroLabel(ctx, "控制栅", (left + right) / 2, controlGate.y + controlGate.h / 2, "#bfdbfe", 18, "center");
  drawIntroLabel(ctx, "二氧化硅势垒", (left + right) / 2, oxide.y + 22, "#fde68a", 18, "center");
  drawIntroLabel(ctx, "浮栅", (left + right) / 2, floatingGate.y + floatingGate.h / 2, "#ddd6fe", 18, "center");
  drawIntroLabel(ctx, "硅衬底", (left + right) / 2, substrate.y + substrate.h / 2, "#cbd5e1", 18, "center");
  drawIntroLabel(ctx, writePhase ? "写入阶段：栅压拉斜势垒，电子进入浮栅" : "擦除阶段：反向电压使电子返回衬底", w * .06, h * .07, writePhase ? "#67e8f9" : "#c4b5fd", 21);

  const slopeDirection = writePhase ? -1 : 1;
  const slope = 38 + 72 * smoothIntro(localT);
  const barrierLeftY = oxide.y + oxide.h * .72 + slopeDirection * slope * .35;
  const barrierRightY = oxide.y + oxide.h * .72 - slopeDirection * slope * .65;
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(left, barrierLeftY);
  ctx.lineTo(right, barrierRightY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(251,191,36,.22)";
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.strokeStyle = "#38bdf8";
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(left, writePhase ? substrate.y + 16 : floatingGate.y + floatingGate.h - 12);
  ctx.lineTo(right, writePhase ? substrate.y + 16 : floatingGate.y + floatingGate.h - 12);
  ctx.stroke();
  ctx.setLineDash([]);
  drawIntroLabel(ctx, "电子波函数", left - 12, h * .62, "#7dd3fc", 17, "right");

  const progress = smoothIntro(localT);
  const electronX = (left + right) / 2 + Math.sin(localT * TAU * 1.5) * 22;
  const electronY = writePhase
    ? lerpNumber(substrate.y + 18, floatingGate.y + floatingGate.h - 18, progress)
    : lerpNumber(floatingGate.y + floatingGate.h - 18, substrate.y + 18, progress);
  drawIntroTrail(
    ctx,
    electronX,
    writePhase ? substrate.y + 18 : floatingGate.y + floatingGate.h - 18,
    electronX,
    electronY,
    "#facc15",
    .52
  );
  drawIntroWavePacket(ctx, electronX, electronY, 16, 11, "rgba(250,204,21,.8)", t * 18);
  drawIntroParticle(ctx, electronX, electronY, 7, "#facc15");

  const storedCharge = writePhase ? progress : 1 - progress;
  for (let i = 0; i < 7; i++) {
    const chargeX = left + 70 + i * (right - left - 140) / 6;
    const chargeY = floatingGate.y + floatingGate.h / 2 + Math.sin(i * 1.6) * 8;
    ctx.globalAlpha = storedCharge * .88;
    drawIntroParticle(ctx, chargeX, chargeY, 5, "#c4b5fd", false);
  }
  ctx.globalAlpha = 1;
  const voltage = writePhase ? lerpNumber(2, 12, smoothIntro(localT)) : lerpNumber(-2, -12, smoothIntro(localT));
  drawIntroLabel(ctx, `栅压 Vg = ${voltage.toFixed(1)} V`, w * .06, h * .18, writePhase ? "#67e8f9" : "#c4b5fd", 19);
  drawIntroLabel(ctx, writePhase ? "Fowler-Nordheim 隧穿写入" : "反向隧穿擦除", w * .94, h * .18, "#f8fafc", 19, "right");
}

function drawIntroRTD(ctx, w, h, t) {
  const baseline = h * .61;
  const barrierH = h * .31;
  const barrier1X = w * .34;
  const barrier2X = w * .57;
  const barrierW = w * .06;
  const wellCenter = (barrier1X + barrierW + barrier2X) / 2;
  const levelNorm = .54;
  const levelY = baseline - h * (.14 + levelNorm * .2);
  const resonance = Math.exp(-((t - levelNorm) ** 2) / .012);
  const energyY = baseline - h * (.14 + t * .2);
  drawIntroLabel(ctx, "电子能量扫描：匹配阱内能级时出现透射峰", w * .07, h * .1, "#e2e8f0", 20);
  ctx.strokeStyle = "rgba(226,232,240,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * .07, baseline); ctx.lineTo(w * .94, baseline); ctx.stroke();
  ctx.fillStyle = "rgba(139,92,246,.32)";
  ctx.fillRect(barrier1X, baseline - barrierH, barrierW, barrierH);
  ctx.fillRect(barrier2X, baseline - barrierH, barrierW, barrierH);
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 3;
  ctx.strokeRect(barrier1X, baseline - barrierH, barrierW, barrierH);
  ctx.strokeRect(barrier2X, baseline - barrierH, barrierW, barrierH);
  drawIntroLabel(ctx, "双势垒", barrier1X + barrierW / 2, baseline + 26, "#c4b5fd", 16, "center");
  drawIntroLabel(ctx, "双势垒", barrier2X + barrierW / 2, baseline + 26, "#c4b5fd", 16, "center");
  drawIntroLabel(ctx, "量子阱", wellCenter, baseline + 26, "#ddd6fe", 17, "center");
  ctx.strokeStyle = resonance > .65 ? "#22d3ee" : "#f97316";
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 7]);
  ctx.beginPath(); ctx.moveTo(w * .08, energyY); ctx.lineTo(w * .92, energyY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(barrier1X + barrierW, levelY); ctx.lineTo(barrier2X, levelY); ctx.stroke();
  drawIntroLabel(ctx, "量子阱能级", wellCenter, levelY - 28, "#ddd6fe", 18, "center");
  drawIntroLabel(ctx, resonance > .62 ? "能级对齐" : "能级失配", w * .76, h * .16, resonance > .62 ? "#67e8f9" : "#fb923c", 21, "center");
  drawIntroLabel(ctx, `扫描能量 E = ${t.toFixed(2)} E₀`, w * .08, energyY - 20, "#7dd3fc", 18);

  const incidentCenter = lerpNumber(w * .1, barrier1X - 20, smoothIntro(t / .5));
  drawIntroTrail(ctx, w * .07, baseline, incidentCenter, baseline, "#22d3ee", .45);
  drawIntroWavePacket(ctx, incidentCenter, baseline, 25, h * .075, "#22d3ee", t * 13);
  if (resonance > .32) {
    const transmission = resonance;
    ctx.save();
    ctx.strokeStyle = `rgba(103,232,249,${.62 * resonance})`;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const radius = 25 + i * 30 + (t * 80) % 30;
      ctx.beginPath();
      ctx.arc(wellCenter, levelY, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    const transmittedCenter = lerpNumber(barrier2X + barrierW, w * .86, smoothIntro((t - .42) / .45));
    drawIntroWavePacket(ctx, transmittedCenter, baseline, 22, h * .07 * transmission, "#c4b5fd", t * 14);
    drawIntroLabel(ctx, "透射波", w * .87, h * .27, "#c4b5fd", 18, "center");
  } else {
    const reflectedCenter = lerpNumber(barrier1X - 20, w * .13, smoothIntro(t / .65));
    drawIntroWavePacket(ctx, reflectedCenter, baseline, 22, h * .05, "#fb923c", -t * 12);
    drawIntroLabel(ctx, "反射波", w * .13, h * .27, "#fb923c", 18, "center");
  }
  const graphX = w * .7, graphY = h * .66, graphW = w * .24, graphH = h * .21;
  ctx.fillStyle = "rgba(15,23,42,.72)";
  ctx.fillRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = "rgba(148,163,184,.35)";
  ctx.strokeRect(graphX, graphY, graphW, graphH);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 180; i++) {
    const normalized = i / 180;
    const current = Math.exp(-((normalized - levelNorm) ** 2) / .004) + .08;
    const x = graphX + normalized * graphW;
    const y = graphY + graphH - current * graphH * .78;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  const cursorX = graphX + clamp(t, 0, 1) * graphW;
  const cursorY = graphY + graphH - (resonance + .08) * graphH * .78;
  ctx.fillStyle = resonance > .65 ? "#22d3ee" : "#f97316";
  ctx.beginPath(); ctx.arc(cursorX, cursorY, 6, 0, TAU); ctx.fill();
  drawIntroLabel(ctx, "透射系数 T(E)", graphX, graphY - 18, "#7dd3fc", 16);
  drawIntroLabel(ctx, "透射峰", graphX + graphW * levelNorm, graphY - 18, "#c4b5fd", 16, "center");
  if (t > levelNorm + .18) {
    drawIntroLabel(ctx, "峰值后电流下降", graphX + graphW * .76, graphY + graphH - 18, "#fb923c", 16, "center");
  }
}

function createLearningSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `qt-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

function moduleForModelObject(obj) {
  return [...simulationModules].find(module => state[module] === obj) || null;
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  if (seconds < 60) return `${Math.round(seconds)} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

function formatHistoryDate(value) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

async function learningRequest(path, { method = "GET", body, token = state.authToken, keepalive = false } = {}) {
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "学习记录保存失败。");
  return data;
}

function startLearningSession(module) {
  if (!isAuthenticated() || !simulationModules.has(module)) return;
  const archive = state.learningArchive;
  if (archive.sessionId && archive.module === module) return;
  if (archive.sessionId) finishLearningSession();

  const sessionId = createLearningSessionId();
  archive.sessionId = sessionId;
  archive.module = module;
  archive.startedAt = Date.now();
  archive.sessionReady = learningRequest("/api/learning/sessions", {
    method: "POST",
    body: { sessionId, module }
  }).catch(() => null);

  void archive.sessionReady.then(() => trackLearningEvent(module, "module_opened", {
    metrics: metricSnapshotText(module, moduleMetrics(module))
  }));
}

function finishLearningSession() {
  const archive = state.learningArchive;
  if (!archive.sessionId) return;

  Object.values(archive.snapshotTimers).forEach(timer => clearTimeout(timer));
  archive.snapshotTimers = {};

  const sessionId = archive.sessionId;
  const durationSeconds = Math.round((Date.now() - archive.startedAt) / 1000);
  if (state.taskStep === "done" && state.activeTaskModule === archive.module) {
    void requestTutorSummary(archive.module, "session_finished");
  }
  const token = state.authToken;
  const sessionReady = archive.sessionReady;
  archive.sessionId = null;
  archive.module = null;
  archive.startedAt = 0;
  archive.sessionReady = null;

  void Promise.resolve(sessionReady)
    .catch(() => null)
    .then(() => learningRequest(`/api/learning/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      body: { durationSeconds },
      token,
      keepalive: true
    }))
    .catch(() => null);
}

function trackLearningEvent(module, eventType, payload = {}) {
  if (!isAuthenticated() || !simulationModules.has(module)) return Promise.resolve(null);
  const archive = state.learningArchive;
  const sessionId = archive.module === module ? archive.sessionId : null;
  const sessionReady = archive.module === module ? archive.sessionReady : null;
  return Promise.resolve(sessionReady)
    .catch(() => null)
    .then(() => learningRequest("/api/learning/events", {
      method: "POST",
      body: { module, sessionId, eventType, payload }
    }))
    .catch(() => null);
}

function saveLearningSnapshot(module, reason = "parameter_update", imageData = null) {
  if (!isAuthenticated() || !simulationModules.has(module)) return Promise.resolve(null);
  const archive = state.learningArchive;
  const sessionId = archive.module === module ? archive.sessionId : null;
  const sessionReady = archive.module === module ? archive.sessionReady : null;
  return Promise.resolve(sessionReady)
    .catch(() => null)
    .then(() => learningRequest("/api/learning/snapshots", {
      method: "POST",
      body: {
        module,
        sessionId,
        reason,
        parameters: { ...state[module] },
        metrics: moduleMetrics(module),
        imageData
      }
    }))
    .catch(() => null);
}

function recordTaskSample(module) {
  if (!simulationModules.has(module) || module !== state.activeTaskModule) return;
  const task = activeTaskFor(module);
  if (!task || state.taskStep === "done") return;
  const sample = {
    module,
    taskId: task.id,
    timestamp: Date.now(),
    params: { ...state[module] },
    metrics: moduleMetrics(module)
  };
  const signature = JSON.stringify({
    params: sample.params,
    metrics: sample.metrics
  });
  const previous = state.taskSamples[state.taskSamples.length - 1];
  if (previous && previous.signature === signature) return;
  sample.signature = signature;
  state.taskSamples.push(sample);
  if (state.taskSamples.length > 50) state.taskSamples.shift();
  renderLearningPanels();
}

function queueLearningSnapshot(module) {
  recordTaskSample(module);
  if (!isAuthenticated() || !simulationModules.has(module)) return;
  const timers = state.learningArchive.snapshotTimers;
  clearTimeout(timers[module]);
  timers[module] = setTimeout(() => {
    delete timers[module];
    void trackLearningEvent(module, "parameters_adjusted", {
      metrics: metricSnapshotText(module, moduleMetrics(module))
    });
    void saveLearningSnapshot(module);
  }, 900);
}

function recordTaskAttempt(status) {
  const task = activeTaskFor();
  const module = state.activeTaskModule;
  if (!task || !isAuthenticated()) return Promise.resolve(null);
  const archive = state.learningArchive;
  const sessionId = archive.module === module ? archive.sessionId : null;
  const sessionReady = archive.module === module ? archive.sessionReady : null;
  return Promise.resolve(sessionReady)
    .catch(() => null)
    .then(() => learningRequest("/api/learning/tasks", {
      method: "POST",
      body: {
        module,
        sessionId,
        taskId: task.id,
        learningMode: state.learningMode,
        prediction: state.predictionText || state.prediction || "",
        explanation: state.taskExplanationText || "",
        status,
        baselineMetrics: state.taskBaseline || moduleMetrics(module),
        finalMetrics: moduleMetrics(module),
        score: Number.isFinite(state.taskScore) ? state.taskScore : 0,
        stars: state.taskStars || 0,
        taskType: task.type || "",
        sampleCount: taskSampleCount(task),
        evidence: state.taskRubric || {}
      }
    }))
    .catch(() => null);
}

function eventLabel(eventType) {
  return {
    module_opened: "进入学习模块",
    parameters_adjusted: "调整实验参数",
    model_reset: "恢复默认参数",
    image_saved: "保存实验图像",
    task_started: "开始学习任务",
    prediction_submitted: "提交学习预测",
    task_checked: "检查任务结果",
    task_completed: "完成学习任务"
  }[eventType] || "学习活动";
}

function taskDisplayName(taskId) {
  for (const tasks of Object.values(learningTasks)) {
    const task = tasks.find(item => item.id === taskId);
    if (task) return task.title;
  }
  return taskId || "学习任务";
}

function learningProgressMapHtml(data) {
  const completed = new Map((data.tasks || [])
    .filter(item => item.status === "completed")
    .map(item => [item.task_id, item]));
  const moduleSessions = new Map((data.modules || []).map(item => [item.module, Number(item.session_count) || 0]));
  const coreGroups = ["oneD", "alpha", "stm"].map(module => {
    const nodes = (learningTasks[module] || []).map(task => {
      const record = completed.get(task.id);
      const done = Boolean(record);
      const stars = Number(record?.stars) || 0;
      return `
        <button type="button" class="progress-map-node ${done ? "done" : "available"}" data-page="${module}">
          <span>${escapeHtml(task.type)}</span>
          <strong>${escapeHtml(task.title)}</strong>
          <small>${done ? `${Number(record.score) || 0}/12 · ${stars || 1} 星` : `需要 ${task.minSamples || 3} 组证据`}</small>
        </button>`;
    }).join("");
    return `
      <section class="progress-map-group">
        <h3>${moduleDisplayName(module)}</h3>
        <div class="progress-map-nodes">${nodes}</div>
      </section>`;
  }).join("");
  const extensionNodes = ["flash", "rtd"].map(module => {
    const sessions = moduleSessions.get(module) || 0;
    const done = sessions > 0;
    return `
      <button type="button" class="progress-map-node extension ${done ? "done" : "available"}" data-page="${module}">
        <span>课外拓展</span>
        <strong>${moduleDisplayName(module)}</strong>
        <small>${done ? `已体验 ${sessions} 次` : "自由探索"}</small>
      </button>`;
  }).join("");
  return `
    <div class="progress-map">
      <div class="progress-map-main">${coreGroups}</div>
      <div class="progress-map-extension">
        <h3>拓展分支</h3>
        <div class="progress-map-nodes">${extensionNodes}</div>
      </div>
    </div>`;
}

function achievementsHtml(achievementData) {
  const items = achievementData?.achievements || [];
  if (!items.length) return `<p class="history-empty">完成任务后，这里会显示成就进度。</p>`;
  return `<div class="achievement-grid">${items.map(item => {
    const unlocked = item.status === "unlocked";
    const current = Number(item.progress_current) || 0;
    const target = Number(item.progress_target) || 1;
    return `
      <article class="achievement-card ${unlocked ? "unlocked" : ""} rarity-${escapeHtml(item.rarity)}">
        <div class="achievement-icon">${escapeHtml(item.icon)}</div>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <span>${unlocked ? "已解锁" : `${Math.min(current, target)}/${target}`}</span>
        </div>
      </article>`;
  }).join("")}</div>`;
}

function historyDashboardHtml(data, achievementData = {}) {
  const modulesByKey = new Map((data.modules || []).map(item => [item.module, item]));
  const completedTaskIds = new Set((data.tasks || [])
    .filter(item => item.status === "completed")
    .map(item => item.task_id));
  const completedCore = Object.values(requiredCoreTasks).filter(taskId => completedTaskIds.has(taskId)).length;
  const moduleRows = [...simulationModules].map(module => {
    const record = modulesByKey.get(module) || {};
    const sessions = Number(record.session_count) || 0;
    const time = formatDuration(record.total_seconds);
    const lastActive = record.last_active_at ? `最近：${formatHistoryDate(record.last_active_at)}` : "尚未学习";
    return `
      <div class="history-module-row">
        <div>
          <strong>${moduleDisplayName(module)}</strong>
          <span>${sessions ? `${sessions} 次学习 · ${time}` : "尚无学习记录"}</span>
        </div>
        <div class="history-module-actions">
          <small>${lastActive}</small>
          <button class="outline-btn small" data-page="${module}">继续学习</button>
        </div>
      </div>
    `;
  }).join("");

  const events = (data.events || []).map(item => ({
    module: item.module,
    text: eventLabel(item.event_type),
    createdAt: item.created_at
  }));
  const taskItems = (data.tasks || []).slice(0, 10).map(item => ({
    module: item.module,
    text: item.status === "completed"
      ? `完成任务：${taskDisplayName(item.task_id)}（${Number(item.score) || 0}/12，${Number(item.stars) || 1} 星）`
      : `任务进行中：${taskDisplayName(item.task_id)}`,
    createdAt: item.created_at
  }));
  const snapshotItems = (data.snapshots || []).map(item => ({
    module: item.module,
    text: item.image_path ? "保存实验图像" : "保存实验参数快照",
    createdAt: item.created_at
  }));
  const timeline = [...events, ...taskItems, ...snapshotItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const timelineHtml = timeline.length
    ? timeline.map(item => `
      <li>
        <span class="history-dot"></span>
        <div><strong>${escapeHtml(eventLabel(item.text) === "学习活动" ? item.text : item.text)}</strong><p>${moduleDisplayName(item.module)} · ${formatHistoryDate(item.createdAt)}</p></div>
      </li>
    `).join("")
    : `<p class="history-empty">从任意仿真模块开始学习后，这里会形成你的学习时间线。</p>`;

  const snapshotHtml = (data.snapshots || []).length
    ? data.snapshots.slice(0, 5).map(item => {
      const metrics = typeof item.metrics === "string" ? (() => {
        try { return JSON.parse(item.metrics); } catch { return {}; }
      })() : (item.metrics || {});
      return `<li><strong>${moduleDisplayName(item.module)}</strong><span>${item.image_path ? "已保存图像" : "参数快照"} · ${escapeHtml(metricSnapshotText(item.module, metrics) || item.reason)}</span><small>${formatHistoryDate(item.created_at)}</small></li>`;
    }).join("")
    : `<p class="history-empty">保存参数或点击“保存当前图”后，会在这里保留实验关键结果。</p>`;
  const aiHtml = (data.aiConversations || []).length
    ? data.aiConversations.slice(0, 4).map(item => `<li><strong>${moduleDisplayName(item.module)}</strong><span>${escapeHtml(item.question)}</span><small>${formatHistoryDate(item.created_at)}</small></li>`).join("")
    : `<p class="history-empty">向模块中的 AI 助教提问后，问题与回答会自动归档。</p>`;
  const summaryHtml = (data.learningSummaries || []).length
    ? data.learningSummaries.slice(0, 3).map(item => `
      <article class="history-summary-card">
        <div><strong>${moduleDisplayName(item.module)}</strong><small>${formatHistoryDate(item.created_at)}</small></div>
        <p>${escapeHtml(item.summary_text || item.phenomenon || "实验小结已生成。")}</p>
      </article>
    `).join("")
    : `<p class="history-empty">完成实验解释后，AI 教学伙伴会自动生成现象、原因、掌握情况和复习建议。</p>`;
  const masteryHtml = (data.mastery || []).length
    ? data.mastery.map(item => {
      const score = clamp(Number(item.mastery_score) || 0, 0, 100);
      return `
        <div class="history-mastery-row">
          <div><strong>${escapeHtml(item.knowledge_point)}</strong><span>${moduleDisplayName(item.module)} · 尝试 ${Number(item.attempts) || 0} 次 · 提示 ${Number(item.hint_count) || 0} 次</span></div>
          <div class="history-mastery-meter"><span style="width:${score}%"></span></div>
          <b>${Math.round(score)}%</b>
        </div>
      `;
    }).join("")
    : `<p class="history-empty">完成学习任务后，这里会形成知识点掌握度。</p>`;
  const recommendation = data.recommendations?.[0]?.text || "从一维方势垒开始，完成一次预测、观察和解释。";

  return `
    <div class="history-shell">
      <header class="history-header">
        <div>
          <p>个人学习档案</p>
          <h1>${escapeHtml(state.authUser?.username || "同学")}的量子隧穿学习记录</h1>
          <span>把实验过程、任务成果和 AI 交流沉淀为可回看的学习轨迹。</span>
        </div>
        <button class="outline-btn small history-refresh" data-action="history-refresh">刷新记录</button>
      </header>
      <section class="history-stat-grid">
        <div class="history-stat"><span>累计学习</span><strong>${formatDuration(data.summary?.total_seconds)}</strong></div>
        <div class="history-stat"><span>学习会话</span><strong>${Number(data.summary?.session_count) || 0} 次</strong></div>
        <div class="history-stat"><span>核心任务</span><strong>${completedCore}/3</strong></div>
        <div class="history-stat"><span>最近学习</span><strong class="history-date">${formatHistoryDate(data.summary?.last_active_at)}</strong></div>
      </section>
      <div class="history-grid">
        <section class="history-section history-modules">
          <div class="history-section-title"><h2>模块进度</h2><span>五个仿真模块</span></div>
          ${moduleRows}
        </section>
        <section class="history-section">
          <div class="history-section-title"><h2>下一步建议</h2><span>学习路径</span></div>
          <p class="history-recommendation">${escapeHtml(recommendation)}</p>
          <div class="history-section-title history-subtitle"><h2>近期动态</h2></div>
          <ul class="history-timeline">${timelineHtml}</ul>
        </section>
        <section class="history-section">
          <div class="history-section-title"><h2>实验快照</h2><span>最近保存</span></div>
          <ul class="history-record-list">${snapshotHtml}</ul>
        </section>
        <section class="history-section">
          <div class="history-section-title"><h2>AI 学习摘要</h2><span>最近问答</span></div>
          <ul class="history-record-list">${aiHtml}</ul>
        </section>
        <section class="history-section history-tutor-result">
          <div class="history-section-title"><h2>实验小结与掌握度</h2><span>教学伙伴生成</span></div>
          <div class="history-summary-list">${summaryHtml}</div>
          <div class="history-mastery-list">${masteryHtml}</div>
        </section>
        <section class="history-section history-map-section">
          <div class="history-section-title"><h2>核心探究进度地图</h2><span>3 个核心模块 × 3 个任务</span></div>
          ${learningProgressMapHtml(data)}
        </section>
        <section class="history-section history-achievement-section">
          <div class="history-section-title"><h2>成就系统</h2><span>${(achievementData.achievements || []).filter(item => item.status === "unlocked").length} 项已解锁</span></div>
          ${achievementsHtml(achievementData)}
        </section>
      </div>
    </div>
  `;
}

async function renderLearningDashboard() {
  const root = $("#learningDashboard");
  if (!root || !isAuthenticated()) return;
  state.learningArchive.dashboardLoading = true;
  root.innerHTML = `<div class="history-shell"><div class="history-loading">正在整理你的学习档案...</div></div>`;
  try {
    const [data, achievementData] = await Promise.all([
      learningRequest("/api/learning/dashboard"),
      learningRequest("/api/achievements")
    ]);
    state.learningArchive.dashboard = data;
    state.achievements.items = achievementData?.achievements || [];
    state.achievements.newlyUnlocked = achievementData?.newlyUnlocked || [];
    state.achievements.loaded = true;
    renderHomeAchievementSummary();
    root.innerHTML = historyDashboardHtml(data, achievementData);
  } catch (error) {
    root.innerHTML = `
      <div class="history-shell">
        <div class="history-error">
          <strong>学习档案暂时无法加载</strong>
          <p>${escapeHtml(error.message || "请确认 MySQL 服务和后端已正常启动。")}</p>
          <button class="outline-btn small history-refresh" data-action="history-refresh">重新加载</button>
        </div>
      </div>
    `;
  } finally {
    state.learningArchive.dashboardLoading = false;
  }
}

const videoModuleLabels = {
  all: "全部视频",
  general: "综合科普",
  oneD: "一维方势垒",
  alpha: "α 衰变",
  stm: "STM",
  flash: "闪存隧穿",
  rtd: "共振隧穿"
};

function formatVideoDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function videoSeenMap() {
  try {
    return JSON.parse(localStorage.getItem("qt_video_views") || "{}") || {};
  } catch {
    return {};
  }
}

function markVideoSeen(videoId) {
  const seen = videoSeenMap();
  seen[videoId] = Date.now();
  try {
    localStorage.setItem("qt_video_views", JSON.stringify(seen));
  } catch {
    // Viewing history is optional.
  }
}

function videoModules(item) {
  const modules = Array.isArray(item.modules) && item.modules.length
    ? item.modules
    : [item.module || "general"];
  return [...new Set(modules.filter(module => videoModuleLabels[module]))];
}

function videoModuleText(item) {
  return videoModules(item).map(module => videoModuleLabels[module] || "综合科普").join(" · ");
}

function filteredVideoItems() {
  const query = state.videoLibrary.query.trim().toLowerCase();
  return state.videoLibrary.items.filter(item => {
    const modules = videoModules(item);
    const moduleMatch = state.videoLibrary.filterModule === "all"
      || modules.includes(state.videoLibrary.filterModule);
    const text = [item.title, item.description, item.author, item.sourceLabel, ...(item.tags || [])]
      .join(" ")
      .toLowerCase();
    return moduleMatch && (!query || text.includes(query));
  });
}

function videoCardHtml(item, featured = false) {
  const watched = Boolean(videoSeenMap()[item.id]);
  const simulationModules = videoModules(item).filter(module => module !== "general");
  return `
    <article class="video-card ${featured ? "featured" : ""}">
      <button type="button" class="video-cover-button" data-video-action="open" data-video-id="${escapeHtml(item.id)}" aria-label="播放 ${escapeHtml(item.title)}">
        <img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <span class="video-duration">${formatVideoDuration(item.durationSeconds)}</span>
        <span class="video-source">${escapeHtml(item.sourceLabel || "本地精选")}</span>
        ${watched ? `<span class="video-watched">已观看</span>` : ""}
      </button>
      <div class="video-card-body">
        <div class="video-card-meta">
          <span>${escapeHtml(videoModuleText(item))}</span>
          <small>${escapeHtml(item.author || "来源待补充")}</small>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description)}</p>
        <div class="video-tags">${(item.tags || []).slice(0, 3).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="video-card-actions">
          <button type="button" class="primary-btn" data-video-action="open" data-video-id="${escapeHtml(item.id)}">播放视频</button>
          ${simulationModules.map(module => `<button type="button" class="outline-btn small" data-video-module="${escapeHtml(module)}">进入${escapeHtml(videoModuleLabels[module])}</button>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderVideoLibrary() {
  const root = document.getElementById("videoLibrary");
  if (!root) return;
  if (state.videoLibrary.loading && !state.videoLibrary.items.length) {
    root.innerHTML = `<div class="video-shell"><div class="video-loading">正在整理视频资料...</div></div>`;
    return;
  }
  if (state.videoLibrary.error && !state.videoLibrary.items.length) {
    root.innerHTML = `
      <div class="video-shell">
        <div class="video-loading video-error">
          <strong>视频资料暂时无法加载</strong>
          <span>${escapeHtml(state.videoLibrary.error)}</span>
          <button type="button" class="outline-btn small" data-video-action="retry">重新加载</button>
        </div>
      </div>`;
    return;
  }

  const items = filteredVideoItems();
  const featured = state.videoLibrary.items.find(item => item.featured) || state.videoLibrary.items[0];
  const showFeatured = featured && state.videoLibrary.filterModule === "all" && !state.videoLibrary.query.trim();
  const gridItems = showFeatured ? items.filter(item => item.id !== featured.id) : items;
  const filters = Object.entries(videoModuleLabels).map(([key, label]) =>
    `<button type="button" class="${state.videoLibrary.filterModule === key ? "active" : ""}" data-video-filter="${key}">${label}</button>`
  ).join("");
  const grid = gridItems.length
    ? gridItems.map(item => videoCardHtml(item)).join("")
    : `<div class="video-empty">没有找到符合条件的视频。</div>`;

  root.innerHTML = `
    <div class="video-shell">
      <header class="video-hero">
        <div>
          <p>科普视频库</p>
          <h1>从视频走进量子隧穿</h1>
          <span>精选本地视频，与五个仿真模块相互补充。</span>
        </div>
        <div class="video-hero-stat">
          <strong>${state.videoLibrary.items.length}</strong>
          <span>个精选视频</span>
        </div>
      </header>
      ${showFeatured ? `
        <section class="video-featured-section">
          <div class="video-section-title"><h2>精选推荐</h2><span>建议优先观看</span></div>
          ${videoCardHtml(featured, true)}
        </section>` : ""}
      <section class="video-library-section">
        <div class="video-library-toolbar">
          <div class="video-filter-row">${filters}</div>
          <label class="video-search">
            <span>搜索视频</span>
            <input id="videoSearch" type="search" value="${escapeHtml(state.videoLibrary.query)}" placeholder="搜索标题、知识点或标签">
          </label>
        </div>
        <div class="video-grid">${grid}</div>
      </section>
    </div>`;
}

async function loadVideoLibrary(force = false) {
  if (state.videoLibrary.loaded && !force) {
    renderVideoLibrary();
    return;
  }
  state.videoLibrary.loading = true;
  state.videoLibrary.error = "";
  renderVideoLibrary();
  try {
    const response = await fetch("./media/videos.json", { cache: force ? "no-store" : "default" });
    if (!response.ok) throw new Error(`视频资料请求失败（${response.status}）。`);
    const data = await response.json();
    state.videoLibrary.items = Array.isArray(data.items) ? data.items : [];
    state.videoLibrary.loaded = true;
  } catch (error) {
    state.videoLibrary.error = error.message || "视频资料格式错误。";
  } finally {
    state.videoLibrary.loading = false;
    renderVideoLibrary();
  }
}

function openVideoModal(videoId) {
  const item = state.videoLibrary.items.find(video => video.id === videoId);
  const modal = document.getElementById("videoModal");
  const player = document.getElementById("videoPlayer");
  const detail = document.getElementById("videoModalDetail");
  if (!item || !modal || !player || !detail) return;
  state.videoLibrary.activeId = item.id;
  const simulationModules = videoModules(item).filter(module => module !== "general");
  markVideoSeen(item.id);
  player.src = item.file;
  player.poster = item.cover;
  player.load();
  detail.innerHTML = `
    <div class="video-modal-heading">
      <div>
        <span>${escapeHtml(item.sourceLabel || "本地精选")} · ${formatVideoDuration(item.durationSeconds)}</span>
        <h2 id="videoModalTitle">${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.author || "来源信息待补充")}</p>
      </div>
      <button type="button" class="outline-btn small" data-video-action="close">关闭</button>
    </div>
    <p class="video-modal-description">${escapeHtml(item.description)}</p>
    <div class="video-tags">${(item.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="video-modal-actions">
      ${simulationModules.map(module => `<button type="button" class="primary-btn" data-video-module="${escapeHtml(module)}">进入${escapeHtml(videoModuleLabels[module])}</button>`).join("")}
      ${item.sourceUrl ? `<a class="outline-btn small" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原始来源</a>` : `<span class="video-source-pending">原始来源信息待补充</span>`}
    </div>`;
  modal.classList.remove("hidden");
  document.body.classList.add("video-modal-open");
  void player.play().catch(() => null);
  renderVideoLibrary();
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  const player = document.getElementById("videoPlayer");
  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.removeAttribute("poster");
    player.load();
  }
  state.videoLibrary.activeId = null;
  modal?.classList.add("hidden");
  document.body.classList.remove("video-modal-open");
  renderVideoLibrary();
}

const feedbackModuleLabels = {
  general: "综合反馈",
  oneD: "一维方势垒",
  alpha: "α 衰变",
  stm: "STM",
  flash: "闪存隧穿",
  rtd: "共振隧穿"
};

const feedbackCategoryLabels = {
  teaching: "教学建议",
  usability: "使用问题",
  content: "内容错误",
  feature: "功能建议",
  other: "其他"
};

function renderFeedbackMailbox() {
  const root = document.getElementById("feedbackMailbox");
  if (!root) return;
  if (isAdmin()) {
    root.innerHTML = `
      <div class="home-now-icon feedback-mail-icon">✉</div>
      <div>
        <strong>反馈信箱</strong>
        <p>查看学生学习进度与评价反馈</p>
        <button type="button" class="feedback-widget-button" data-feedback-action="admin">进入教学管理</button>
      </div>`;
    return;
  }
  if (!isAuthenticated()) {
    root.innerHTML = `
      <div class="home-now-icon feedback-mail-icon">✉</div>
      <div>
        <strong>学习反馈信箱</strong>
        <p>登录后可以提交使用感受和改进建议</p>
        <button type="button" class="feedback-widget-button" data-feedback-action="login">登录后反馈</button>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="home-now-icon feedback-mail-icon">✉</div>
    <div>
      <strong>学习反馈信箱</strong>
      <p>你的评价会直接送到教师端</p>
      <button type="button" class="feedback-widget-button" data-feedback-action="open">填写反馈</button>
    </div>`;
}

function renderFeedbackForm() {
  const content = document.getElementById("feedbackFormContent");
  if (!content) return;
  const feedback = state.feedbackMailbox;
  content.innerHTML = `
    <div class="feedback-form-heading">
      <span>学习反馈</span>
      <h2 id="feedbackModalTitle">把使用感受告诉老师</h2>
      <p>反馈会连同学习模块和时间一起提交，匿名选项只影响教师端显示。</p>
    </div>
    <div class="feedback-form-grid">
      <div class="feedback-field">
        <label>总体评分</label>
        <div class="feedback-rating">
          ${[1, 2, 3, 4, 5].map(value => `<button type="button" class="${feedback.rating >= value ? "active" : ""}" data-feedback-rating="${value}" aria-label="${value} 星">★</button>`).join("")}
        </div>
      </div>
      <label class="feedback-field">
        <span>关联模块</span>
        <select id="feedbackModule">
          ${Object.entries(feedbackModuleLabels).map(([key, label]) => `<option value="${key}" ${feedback.module === key ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <label class="feedback-field">
        <span>反馈类型</span>
        <select id="feedbackCategory">
          ${Object.entries(feedbackCategoryLabels).map(([key, label]) => `<option value="${key}" ${feedback.category === key ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
      <label class="feedback-field feedback-message-field">
        <span>反馈内容</span>
        <textarea id="feedbackMessage" maxlength="1200" placeholder="哪些内容有帮助？哪里还不清楚？你希望平台增加什么？">${escapeHtml(feedback.message)}</textarea>
      </label>
      <label class="feedback-anonymous">
        <input id="feedbackAnonymous" type="checkbox" ${feedback.anonymous ? "checked" : ""}>
        <span>匿名提交</span>
      </label>
    </div>
    <div class="feedback-form-actions">
      <span id="feedbackStatus" class="feedback-status">${escapeHtml(feedback.status)}</span>
      <button type="button" class="outline-btn small" data-feedback-action="close">取消</button>
      <button type="button" class="primary-btn" data-feedback-action="submit" ${feedback.submitting ? "disabled" : ""}>${feedback.submitting ? "正在提交..." : "提交反馈"}</button>
    </div>`;
}

function openFeedbackModal() {
  if (!isAuthenticated()) {
    showAuthModal("登录后可以提交学习反馈。");
    return;
  }
  state.feedbackMailbox.status = "";
  const content = document.getElementById("feedbackFormContent");
  if (content) {
    content.querySelectorAll("[data-feedback-rating]").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.feedbackRating) <= state.feedbackMailbox.rating);
    });
  } else {
    renderFeedbackForm();
  }
  renderFeedbackForm();
  document.getElementById("feedbackModal")?.classList.remove("hidden");
  document.body.classList.add("feedback-modal-open");
}

function closeFeedbackModal() {
  document.getElementById("feedbackModal")?.classList.add("hidden");
  document.body.classList.remove("feedback-modal-open");
}

async function submitFeedback() {
  const feedback = state.feedbackMailbox;
  if (!isAuthenticated()) {
    closeFeedbackModal();
    showAuthModal("登录后可以提交学习反馈。");
    return;
  }
  if (!feedback.rating) {
    feedback.status = "请先选择总体评分。";
    renderFeedbackForm();
    return;
  }
  if (!feedback.message.trim()) {
    feedback.status = "请填写反馈内容。";
    renderFeedbackForm();
    return;
  }
  feedback.submitting = true;
  feedback.status = "正在提交...";
  renderFeedbackForm();
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify({
        module: feedback.module,
        category: feedback.category,
        rating: feedback.rating,
        message: feedback.message,
        isAnonymous: feedback.anonymous
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "反馈提交失败。");
    feedback.rating = 0;
    feedback.category = "other";
    feedback.module = "general";
    feedback.message = "";
    feedback.anonymous = false;
    feedback.status = "反馈已送达，感谢你的建议。";
  } catch (error) {
    feedback.status = error.message || "反馈提交失败。";
  } finally {
    feedback.submitting = false;
    renderFeedbackForm();
    renderFeedbackMailbox();
  }
}

function adminMetricCard(label, value, note = "") {
  return `<div class="admin-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

function adminDashboardHtml(overview, feedback) {
  const metrics = overview?.metrics || {};
  const modules = overview?.modules || [];
  const users = overview?.users || [];
  const taskStats = overview?.taskStats || [];
  const moduleRows = modules.length
    ? modules.map(item => `
      <div class="admin-module-row">
        <strong>${escapeHtml(moduleDisplayName(item.module))}</strong>
        <span>${Number(item.users) || 0} 人</span>
        <span>${Number(item.sessions) || 0} 次</span>
        <span>${formatDuration(item.total_seconds)}</span>
      </div>`).join("")
    : `<p class="admin-empty">暂无模块使用记录。</p>`;
  const userRows = users.length
    ? users.map(user => {
      const completedTaskNames = String(user.completed_task_ids || "")
        .split(",")
        .filter(Boolean)
        .map(taskDisplayName)
        .join("、");
      return `
      <tr>
        <td><strong>${escapeHtml(user.username)}</strong><small>${formatHistoryDate(user.last_active_at)}</small></td>
        <td>${formatDuration(user.total_seconds)}</td>
        <td>${Number(user.core_tasks) || 0}/3</td>
        <td>${Number(user.completed_tasks) || 0}</td>
        <td>${Number(user.three_star_tasks) || 0}</td>
        <td>${Number(user.average_task_score || 0).toFixed(1)}/12</td>
        <td>${Number(user.mastery_score || 0).toFixed(1)}%</td>
        <td>${Number(user.ai_count) || 0}</td>
        <td>${Number(user.summary_count) || 0}</td>
        <td class="admin-task-list-cell">${escapeHtml(completedTaskNames || "暂无")}</td>
      </tr>`;
    }).join("")
    : `<tr><td colspan="10">暂无普通用户学习记录。</td></tr>`;
  const taskRows = taskStats.length
    ? taskStats.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.title || item.task_id)}</strong><small>${escapeHtml(moduleDisplayName(item.module))}</small></td>
        <td>${Number(item.users) || 0}</td>
        <td>${Number(item.attempts) || 0}</td>
        <td>${(Number(item.completionRate || 0) * 100).toFixed(1)}%</td>
        <td>${Number(item.average_score || 0).toFixed(1)}/12</td>
        <td>${Number(item.average_stars || 0).toFixed(1)}</td>
        <td>${Number(item.average_samples || 0).toFixed(1)}</td>
        <td>${Number(item.three_star_count) || 0}</td>
      </tr>`).join("")
    : `<tr><td colspan="8">暂无核心任务记录。</td></tr>`;
  const statusLabels = { new: "未处理", read: "已查看", resolved: "已处理" };
  const feedbackRows = feedback.length
    ? feedback.map(item => `
      <article class="admin-feedback-card status-${escapeHtml(item.status)}">
        <div class="admin-feedback-head">
          <div>
            <strong>${escapeHtml(item.display_name || "匿名用户")}</strong>
            <span>${escapeHtml(feedbackModuleLabels[item.module] || moduleDisplayName(item.module))} · ${escapeHtml(feedbackCategoryLabels[item.category] || "其他")} · ${formatHistoryDate(item.created_at)}</span>
          </div>
          <div class="admin-feedback-rating">${"★".repeat(Number(item.rating) || 0)}<span>${"☆".repeat(Math.max(0, 5 - (Number(item.rating) || 0)))}</span></div>
        </div>
        <p>${escapeHtml(item.message)}</p>
        ${item.admin_note ? `<div class="admin-feedback-note">处理备注：${escapeHtml(item.admin_note)}</div>` : ""}
        <div class="admin-feedback-actions">
          <span class="feedback-status-pill">${statusLabels[item.status] || item.status}</span>
          <button type="button" data-feedback-action="status" data-feedback-id="${Number(item.id)}" data-status="read">标记已查看</button>
          <button type="button" data-feedback-action="status" data-feedback-id="${Number(item.id)}" data-status="resolved">标记已处理</button>
        </div>
      </article>`).join("")
    : `<p class="admin-empty">当前筛选条件下没有反馈。</p>`;

  return `
    <div class="admin-shell">
      <header class="admin-header">
        <div>
          <p>教学管理</p>
          <h1>学生学习进度与评价反馈</h1>
          <span>汇总普通用户的使用情况，反馈内容仅管理员可见。</span>
        </div>
        <button type="button" class="outline-btn small" data-feedback-action="refresh">刷新数据</button>
      </header>
      <section class="admin-metric-grid">
        ${adminMetricCard("普通用户", `${Number(metrics.students) || 0} 人`)}
        ${adminMetricCard("近 7 天活跃", `${Number(metrics.activeUsers) || 0} 人`)}
        ${adminMetricCard("累计学习", formatDuration(metrics.totalSeconds))}
        ${adminMetricCard("完成任务", `${Number(metrics.completedTasks) || 0} 次`, `证据达标 ${Number(metrics.evidenceQualified) || 0} 次`)}
        ${adminMetricCard("平均任务得分", `${Number(metrics.averageTaskScore || 0).toFixed(1)}/12`)}
        ${adminMetricCard("平均任务星级", `${Number(metrics.averageTaskStars || 0).toFixed(2)}`)}
        ${adminMetricCard("已解锁成就", `${Number(metrics.unlockedAchievements) || 0} 次`, `${Number(metrics.achievementUsers) || 0} 人拥有成就`)}
        ${adminMetricCard("平均评分", `${Number(metrics.averageRating || 0).toFixed(1)} / 5`, `${Number(metrics.newFeedback) || 0} 条未处理`)}
      </section>
      <section class="admin-section admin-task-section">
        <div class="admin-section-title"><h2>核心任务统计</h2><span>9 个正式探究任务</span></div>
        <div class="admin-table-wrap">
          <table class="admin-task-table">
            <thead><tr><th>任务</th><th>人数</th><th>尝试</th><th>通过率</th><th>平均分</th><th>平均星级</th><th>平均采样</th><th>三星次数</th></tr></thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </section>
      <div class="admin-layout">
        <section class="admin-section">
          <div class="admin-section-title"><h2>模块使用情况</h2><span>按学习会话汇总</span></div>
          <div class="admin-module-list">${moduleRows}</div>
        </section>
        <section class="admin-section">
          <div class="admin-section-title"><h2>反馈信箱</h2><span>${feedback.length} 条反馈</span></div>
          <div class="admin-feedback-filter">
            ${["all", "new", "read", "resolved"].map(status => `<button type="button" class="${state.adminDashboard.feedbackStatus === status ? "active" : ""}" data-feedback-status-filter="${status}">${status === "all" ? "全部" : statusLabels[status]}</button>`).join("")}
          </div>
          <div class="admin-feedback-list">${feedbackRows}</div>
        </section>
      </div>
      <section class="admin-section admin-users-section">
        <div class="admin-section-title"><h2>学生学习进度</h2><span>${users.length} 个普通用户</span></div>
        <div class="admin-table-wrap">
          <table class="admin-user-table">
            <thead><tr><th>用户</th><th>学习时长</th><th>核心任务</th><th>完成任务</th><th>三星任务</th><th>平均分</th><th>掌握度</th><th>AI 对话</th><th>实验小结</th><th>已完成任务</th></tr></thead>
            <tbody>${userRows}</tbody>
          </table>
        </div>
      </section>
    </div>`;
}

async function renderAdminDashboard() {
  const root = document.getElementById("adminDashboard");
  if (!root || !isAdmin()) return;
  state.adminDashboard.loading = true;
  root.innerHTML = `<div class="admin-shell"><div class="admin-loading">正在汇总教学数据...</div></div>`;
  try {
    const status = state.adminDashboard.feedbackStatus;
    const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
    const [overviewResponse, feedbackResponse] = await Promise.all([
      fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${state.authToken}` } }),
      fetch(`/api/admin/feedback${query}`, { headers: { Authorization: `Bearer ${state.authToken}` } })
    ]);
    const overview = await overviewResponse.json().catch(() => ({}));
    const feedbackData = await feedbackResponse.json().catch(() => ({}));
    if (!overviewResponse.ok) throw new Error(overview.error || "教学数据加载失败。");
    if (!feedbackResponse.ok) throw new Error(feedbackData.error || "反馈加载失败。");
    state.adminDashboard.overview = overview;
    state.adminDashboard.feedback = feedbackData.feedback || [];
    state.adminDashboard.error = "";
    root.innerHTML = adminDashboardHtml(overview, state.adminDashboard.feedback);
  } catch (error) {
    state.adminDashboard.error = error.message || "教学数据加载失败。";
    root.innerHTML = `<div class="admin-shell"><div class="admin-loading admin-error"><strong>教学管理暂时无法加载</strong><span>${escapeHtml(state.adminDashboard.error)}</span><button type="button" class="outline-btn small" data-feedback-action="refresh">重新加载</button></div></div>`;
  } finally {
    state.adminDashboard.loading = false;
  }
}

async function updateFeedbackStatus(feedbackId, status) {
  if (!isAdmin() || !feedbackId || !["read", "resolved"].includes(status)) return;
  const response = await fetch(`/api/admin/feedback/${encodeURIComponent(feedbackId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.authToken}`
    },
    body: JSON.stringify({ status })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    window.alert(data.error || "反馈状态更新失败。");
    return;
  }
  await renderAdminDashboard();
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
  ["hint", "下一层提示"],
  ["check", "检查我的解释"],
  ["summary", "生成实验小结"]
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
  const mapEl = $("#homeProgressMap");
  const summaryEl = $("#homeMapSummary");
  const stateEl = $("#homeProgressState");
  if (!mapEl || !summaryEl || !stateEl) return;
  const coreModules = ["oneD", "alpha", "stm"];
  let completedCount = 0;
  const moduleNodes = coreModules.map(module => {
    const tasks = learningTasks[module] || [];
    const nodes = tasks.map(task => {
      const progress = isAdmin()
        ? { score: 12, stars: 3 }
        : state.taskProgress[task.id];
      if (progress) completedCount++;
      return `<span class="home-map-task ${progress ? "done" : ""}" title="${escapeHtml(task.title)}">${progress ? "✓" : "•"}</span>`;
    }).join("");
    const complete = tasks.every(task => isAdmin() || state.taskProgress[task.id]);
    return `<button type="button" class="home-map-module ${complete ? "done" : ""}" data-page="${module}"><strong>${moduleDisplayName(module)}</strong><span>${nodes}</span></button>`;
  }).join("");
  const totalTasks = coreModules.reduce((sum, module) => sum + (learningTasks[module]?.length || 0), 0);
  const displayCount = isAdmin() ? totalTasks : completedCount;
  summaryEl.textContent = `${displayCount} / ${totalTasks}`;
  const extensions = ["flash", "rtd"].map(module => `<button type="button" class="home-map-extension ${isAdmin() || extensionsUnlocked() ? "available" : "locked"}" data-page="${module}">${moduleDisplayName(module)}</button>`).join("");
  mapEl.innerHTML = `
    <div class="home-map-core">${moduleNodes}</div>
    <div class="home-map-link"><span></span><b>核心完成后解锁</b><span></span></div>
    <div class="home-map-extensions">${extensions}</div>`;
  stateEl.textContent = isAdmin()
    ? "管理员账号：已直接解锁全部模块。"
    : `${displayCount}/${totalTasks} 个核心任务已完成。${extensionsUnlocked() ? "拓展分支已解锁。" : "完成三个模块各自的基础任务后解锁拓展分支。"}`;
}

function renderHomeAchievementSummary() {
  const root = document.getElementById("homeAchievementSummary");
  if (!root) return;
  const total = state.achievements.items.length || 17;
  const unlockedItems = state.achievements.items
    .filter(item => item.status === "unlocked")
    .sort((a, b) => new Date(b.unlocked_at || 0) - new Date(a.unlocked_at || 0));
  const count = isAdmin() ? total : unlockedItems.length;
  const recent = unlockedItems.slice(0, 2);
  const recentText = recent.length
    ? recent.map(item => item.title).join("、")
    : "完成任务后解锁第一枚成就";
  root.innerHTML = `
    <div class="home-achievement-head">
      <div>
        <span>成就进度</span>
        <strong>${count} / ${total}</strong>
      </div>
      <button type="button" data-page="history">查看全部成就</button>
    </div>
    <div class="home-achievement-track"><span style="width:${total ? clamp(count / total * 100, 0, 100) : 0}%"></span></div>
    <p>${isAdmin() ? "管理员账号：全部成就已展示。" : recentText}</p>`;
}

function activeTaskFor(module = state.activeTaskModule) {
  return learningTasks[module]?.find(task => task.id === state.activeTaskId) || null;
}

const tutorStageOrder = ["predict", "observe", "explain", "reflect", "done"];
const tutorStageLabels = {
  predict: "预测",
  observe: "操作与观察",
  explain: "解释",
  reflect: "反思",
  done: "已完成"
};
const tutorParameterInfo = {
  oneD: {
    V0: { label: "势垒高度 V₀", effect: "透射率 T 会怎样变化" },
    a: { label: "势垒宽度 a", effect: "透射率 T 会怎样变化" },
    m: { label: "粒子质量 m", effect: "波函数衰减和透射率会怎样变化" },
    E: { label: "粒子能量 E", effect: "透射率 T 会怎样变化" }
  },
  stm: {
    d: { label: "探针距离 d", effect: "隧穿电流 Irel 会怎样变化" },
    phi: { label: "功函数 φ", effect: "衰减系数和电流会怎样变化" },
    bias: { label: "偏置电压 Vb", effect: "隧穿电流会怎样变化" }
  },
  alpha: {
    Zd: { label: "子核电荷数 Zd", effect: "库仑势垒和穿透概率会怎样变化" },
    Ealpha: { label: "α 粒子能量 Eα", effect: "外转折点和穿透概率会怎样变化" },
    R: { label: "核半径 R", effect: "禁阻区宽度和穿透概率会怎样变化" },
    well: { label: "核内势阱", effect: "核内波函数和穿透趋势会怎样变化" }
  },
  flash: {
    gateV: { label: "控制栅电压 Vg", effect: "氧化层电场和隧穿电流会怎样变化" },
    tox: { label: "氧化层厚度 tox", effect: "隧穿距离和电流会怎样变化" },
    phi: { label: "势垒高度 φB", effect: "Fowler-Nordheim 电流会怎样变化" },
    vth: { label: "阈值修正 Vth", effect: "有效电场和电流会怎样变化" }
  },
  rtd: {
    barrierHeight: { label: "势垒高度 Vb", effect: "共振线宽和电流会怎样变化" },
    barrierWidth: { label: "势垒宽度 b", effect: "共振透射峰会怎样变化" },
    wellWidth: { label: "量子阱宽度 w", effect: "共振能级会怎样变化" },
    bias: { label: "外加偏压 V", effect: "能级对齐和电流会怎样变化" },
    mEff: { label: "有效质量 m*", effect: "阱内能级和共振位置会怎样变化" }
  }
};

function tutorTaskKey(module = state.activeTaskModule, taskId = state.activeTaskId) {
  return `${module}:${taskId || "free"}`;
}

function tutorStageLabel() {
  return tutorStageLabels[state.tutor.stage] || "探究";
}

function setTutorStage(stage) {
  if (!tutorStageOrder.includes(stage)) return;
  state.tutor.stage = stage;
}

function pushTutorMessage(module, item) {
  const message = {
    role: item.role || "assistant",
    text: String(item.text || "").trim(),
    kind: item.kind || "tutor"
  };
  if (!message.text) return;
  state.ai.messages[module] = aiMessagesFor(module).concat(message).slice(-16);
  renderAIPanel(module);
}

function resetTutorForTask(module, task) {
  if (!task) return;
  const key = tutorTaskKey(module, task.id);
  clearTimeout(state.tutor.parameterTimers[module]);
  delete state.tutor.parameterTimers[module];
  state.tutor.pendingParameterChanges[module] = null;
  state.tutor.lastProbeAt[module] = 0;
  state.tutor.failedChecks = 0;
  state.tutor.hintLevels[key] = state.learningMode === "basic" ? task.hints.length : 0;
  setTutorStage(state.learningMode === "basic" ? "observe" : "predict");
  state.ai.conversations[module] = "";
  state.ai.messages[module] = [{
    role: "assistant",
    kind: state.learningMode === "basic" ? "observe_prompt" : "prediction_prompt",
    text: state.learningMode === "basic"
      ? `我们开始“${task.title}”。先按推荐步骤操作，每次只改变一个关键参数，并比较调整前后的结果。`
      : `我们开始“${task.title}”。先不要急着调参数，请先回答：${task.predictionQuestion}`
  }];
  renderAIPanel(module);
}

function tutorContextFor(module) {
  const task = state.activeTaskModule === module ? activeTaskFor(module) : null;
  return {
    module,
    sessionId: state.learningArchive.module === module ? state.learningArchive.sessionId : null,
    taskId: task?.id || "",
    taskTitle: task?.title || "",
    taskGoal: task?.goal || "",
    taskType: task?.type || "",
    sampleCount: task ? taskSampleCount(task) : 0,
    sampleTarget: task?.minSamples || 0,
    score: Number.isFinite(state.taskScore) ? state.taskScore : null,
    stars: state.taskStars || 0,
    taskFeedback: state.taskFeedback || "",
    predictionQuestion: task?.predictionQuestion || "",
    prediction: state.predictionText || state.prediction || "",
    plotSummary: moduleSummaryText(module),
    plotMode: state.plotMode,
    learningMode: state.learningMode,
    learningStage: state.tutor.stage,
    taskStep: task ? state.taskStep : "",
    hintLevel: state.tutor.hintLevels[tutorTaskKey(module, task?.id)] || state.hintLevel || 0,
    currentMetrics: moduleMetrics(module),
    conversation_id: state.ai.conversations[module] || ""
  };
}

function tutorLocalFallback(module, eventType, responseType, context = {}) {
  const task = activeTaskFor(module);
  const parameterLabel = context.parameterLabel || "关键参数";
  const direction = context.direction === "decrease" ? "减小" : "增大";
  if (responseType === "probe") {
    return `你刚刚${direction}了${parameterLabel}。先预测${context.expectedEffect || "结果会怎样变化"}，再观察图像和数值。`;
  }
  if (responseType === "feedback") {
    const evidence = context.sampleTarget
      ? `当前有效采样 ${context.sampleCount || 0}/${context.sampleTarget}。`
      : "";
    return context.passed
      ? `${evidence}任务已经达成。请用一句话说明参数变化为什么会导致当前结果。`
      : `${evidence}暂时还没有达到目标。先检查控制变量、采样数量或目标误差，再继续调整。`;
  }
  if (responseType === "summary") {
    return `本次${moduleDisplayName(module)}实验已完成。请回看起始值、最终值和参数变化，并把最关键的一条因果关系写入解释。`;
  }
  if (responseType === "prediction_prompt") {
    return task ? `先不要操作，请预测：${task.predictionQuestion}` : "请先提出一个可验证的预测。";
  }
  if (responseType === "observe_prompt") {
    return "预测已记录。现在一次只改变一个关键参数，并观察结果是否支持你的预测。";
  }
  return "先预测，再操作，随后用仿真结果修正你的解释。";
}

async function requestTutorEvent(module, eventType, responseType, context = {}) {
  const payload = {
    ...tutorContextFor(module),
    ...context,
    eventType,
    responseType
  };
  const fallback = tutorLocalFallback(module, eventType, responseType, payload);
  if (!isAuthenticated()) {
    pushTutorMessage(module, { role: "assistant", text: fallback, kind: responseType });
    return { answer: fallback, source: "local" };
  }
  if (state.tutor.requestInFlight[module]) return null;
  state.tutor.requestInFlight[module] = true;
  state.ai.loadingModule = module;
  renderAIPanel(module);
  try {
    const res = await fetch("/api/tutor/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.authToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "教学伙伴暂时不可用。");
    state.ai.conversations[module] = data.conversation_id || state.ai.conversations[module] || "";
    pushTutorMessage(module, {
      role: "assistant",
      text: normalizeDifyAnswer(data) || fallback,
      kind: responseType
    });
    if (responseType === "summary") {
      state.tutor.summaries[tutorTaskKey(module)] = data.summary || {};
      setTutorStage("done");
    } else if (responseType === "feedback" && payload.passed) {
      setTutorStage("explain");
    } else if (responseType === "observe_prompt") {
      setTutorStage("observe");
    }
    return data;
  } catch {
    pushTutorMessage(module, { role: "assistant", text: fallback, kind: responseType });
    return { answer: fallback, source: "local" };
  } finally {
    state.tutor.requestInFlight[module] = false;
    state.ai.loadingModule = null;
    renderAIPanel(module);
  }
}

function queueTutorParameterProbe(module, key, beforeValue, afterValue, config, beforeMetrics) {
  const info = tutorParameterInfo[module]?.[key];
  if (!info || module !== state.activeTaskModule || !isAuthenticated()) return;
  const difference = Number(afterValue) - Number(beforeValue);
  const threshold = Math.max(Number(config.step || 0) * 2, Math.abs(Number(beforeValue)) * .01);
  if (Math.abs(difference) < threshold) return;

  const pending = state.tutor.pendingParameterChanges[module] || {
    beforeMetrics: beforeMetrics || moduleMetrics(module),
    changes: {}
  };
  pending.changes[key] = {
    label: info.label,
    effect: info.effect,
    direction: difference >= 0 ? "increase" : "decrease",
    before: Number(beforeValue),
    after: Number(afterValue)
  };
  state.tutor.pendingParameterChanges[module] = pending;
  clearTimeout(state.tutor.parameterTimers[module]);
  const lastProbeAt = state.tutor.lastProbeAt[module] || 0;
  const elapsed = lastProbeAt ? Date.now() - lastProbeAt : Infinity;
  const delay = lastProbeAt ? Math.max(1500, 8000 - elapsed) : 1500;
  state.tutor.parameterTimers[module] = setTimeout(() => {
    const latest = state.tutor.pendingParameterChanges[module];
    state.tutor.pendingParameterChanges[module] = null;
    if (!latest) return;
    const changes = Object.values(latest.changes);
    if (!changes.length) return;
    state.tutor.lastProbeAt[module] = Date.now();
    const first = changes[0];
    const labels = changes.map(change => change.label).join("、");
    void requestTutorEvent(module, "parameter_changed", "probe", {
      parameterLabel: labels,
      direction: first.direction,
      expectedEffect: first.effect,
      beforeMetrics: latest.beforeMetrics,
      afterMetrics: moduleMetrics(module),
      context: { parameterDelta: latest.changes }
    });
  }, delay);
}

function hintTextForLevel(module, task, level) {
  if (level <= 2) return task.hints[level - 1] || "";
  return `操作路径：${task.observe} 物理原因：${task.explanation}`;
}

function requestTutorSummary(module, eventType = "task_completed") {
  const task = activeTaskFor(module);
  if (!task) return Promise.resolve(null);
  const key = tutorTaskKey(module, task.id);
  if (state.tutor.summaries[key]) return Promise.resolve(state.tutor.summaries[key]);
  const before = state.taskBaseline || moduleMetrics(module);
  const after = moduleMetrics(module);
  setTutorStage("reflect");
  return requestTutorEvent(module, eventType, "summary", {
    taskId: task.id,
    taskTitle: task.title,
    taskGoal: task.goal,
    passed: state.taskPassed,
    predictionCorrect: state.predictionText
      ? state.taskPassed
      : state.prediction === task.correctOption,
    explanation: state.taskExplanationText,
    referenceExplanation: task.explanation,
    hintLevel: state.tutor.hintLevels[key] || state.hintLevel || 0,
    beforeMetrics: { ...before, snapshot: metricSnapshotText(module, before) },
    afterMetrics: { ...after, snapshot: metricSnapshotText(module, after) }
  });
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
  state.taskSamples = [];
  state.taskScore = null;
  state.taskStars = 0;
  state.taskRubric = null;
  recordTaskSample(module);
  resetTutorForTask(module, task);
  void trackLearningEvent(module, "task_started", {
    taskId,
    learningMode: state.learningMode,
    baseline: metricSnapshotText(module, state.taskBaseline)
  });
  void recordTaskAttempt("in_progress");
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
    state.taskSamples = [];
    state.taskScore = null;
    state.taskStars = 0;
    state.taskRubric = null;
    recordTaskSample(state.activeTaskModule);
    resetTutorForTask(state.activeTaskModule, task);
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
  void trackLearningEvent(state.activeTaskModule, "prediction_submitted", {
    taskId: task.id,
    prediction: state.predictionText || state.prediction || ""
  });
  void recordTaskAttempt("prediction_submitted");
  pushTutorMessage(state.activeTaskModule, {
    role: "user",
    text: `我的预测：${state.predictionText || state.prediction || "已提交"}`
  });
  void requestTutorEvent(state.activeTaskModule, "prediction_submitted", "observe_prompt", {
    prediction: state.predictionText || state.prediction || ""
  });
  renderLearningPanels();
}

function showNextHint() {
  const task = activeTaskFor();
  if (!task) return;
  state.hintLevel = Math.min(task.hints.length, state.hintLevel + 1);
  const key = tutorTaskKey(state.activeTaskModule, task.id);
  state.tutor.hintLevels[key] = state.hintLevel;
  const text = hintTextForLevel(state.activeTaskModule, task, state.hintLevel);
  pushTutorMessage(state.activeTaskModule, {
    role: "assistant",
    kind: "hint",
    text: `第 ${state.hintLevel} 层引导${state.hintLevel === 3 ? "（完整思路）" : ""}：${text}`
  });
  void trackLearningEvent(state.activeTaskModule, "hint_requested", {
    taskId: task.id,
    level: state.hintLevel
  });
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
  const samples = taskSamplesFor();
  const result = task.check({ before, after, samples, mode: state.learningMode });
  const passed = Boolean(result?.passed);
  const predictionCorrect = state.predictionText
    ? passed
    : state.prediction === task.correctOption;
  const score = computeTaskScore(task, result, predictionCorrect, state.taskExplanationText);
  state.taskPassed = passed;
  state.taskScore = score.total;
  state.taskStars = score.stars;
  state.taskRubric = score;
  state.tutor.failedChecks = passed ? 0 : state.tutor.failedChecks + 1;
  setTutorStage(passed ? "explain" : "observe");
  state.taskFeedback = passed
    ? `任务达成。${result?.details || ""} 当前评分 ${score.total}/12，暂定 ${score.stars} 星。请提交解释以完成最终评分。`
    : `暂未达成。${result?.details || ""} 当前证据评分 ${score.total}/12，请继续补足采样、控制变量或目标误差。`;
  state.taskStep = passed ? "explain" : "observe";
  void trackLearningEvent(state.activeTaskModule, "task_checked", {
    taskId: task.id,
    passed,
    current: metricSnapshotText(state.activeTaskModule, after),
    sampleCount: taskSampleCount(task),
    evidence: result?.details || "",
    score: score.total,
    stars: score.stars
  });
  void recordTaskAttempt(passed ? "passed" : "in_progress");
  pushTutorMessage(state.activeTaskModule, {
    role: "user",
    text: `我已完成一次检查：${passed ? "达到目标" : "暂未达到目标"}`
  });
  void requestTutorEvent(state.activeTaskModule, "task_checked", "feedback", {
    taskId: task.id,
    passed,
    predictionCorrect,
    prediction: state.predictionText || state.prediction || "",
    taskType: task.type,
    sampleCount: taskSampleCount(task),
    score: score.total,
    stars: score.stars,
    evidenceDetails: result?.details || "",
    beforeMetrics: { ...before, snapshot: metricSnapshotText(state.activeTaskModule, before) },
    afterMetrics: { ...after, snapshot: metricSnapshotText(state.activeTaskModule, after) }
  });
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
  const task = activeTaskFor();
  const result = task?.check({
    before: state.taskBaseline || moduleMetrics(state.activeTaskModule),
    after: moduleMetrics(state.activeTaskModule),
    samples: taskSamplesFor(),
    mode: state.learningMode
  }) || { passed: state.taskPassed, evidenceScore: state.taskRubric?.parts?.evidence || 0 };
  const predictionCorrect = state.predictionText
    ? state.taskPassed
    : state.prediction === task?.correctOption;
  const score = computeTaskScore(task, result, predictionCorrect, text);
  state.taskScore = score.total;
  state.taskStars = score.stars;
  state.taskRubric = score;
  state.taskProgress[task.id] = {
    score: score.total,
    stars: score.stars,
    completedAt: new Date().toISOString()
  };
  saveTaskProgress();
  state.taskStep = "done";
  setTutorStage("reflect");
  const completed = completeCoreTaskIfReady();
  state.taskFeedback = completed
    ? `${moduleDisplayName(state.activeTaskModule)}核心任务已完成。最终评分 ${score.total}/12，获得 ${score.stars} 星。当前核心进度 ${coreProgressCount()}/3${extensionsUnlocked() ? "，已解锁闪存隧穿和共振隧穿。" : "。"}`
    : `解释已提交。最终评分 ${score.total}/12，获得 ${score.stars} 星。可以对照参考解释修正表述。`;
  void trackLearningEvent(state.activeTaskModule, "task_completed", {
    taskId: activeTaskFor()?.id,
    explanation: text,
    score: score.total,
    stars: score.stars,
    rubric: score.parts,
    sampleCount: taskSampleCount(task)
  });
  void recordTaskAttempt("completed").then(result => {
    (result?.unlockedAchievements || []).forEach(achievement => {
      pushTutorMessage(state.activeTaskModule, {
        role: "assistant",
        kind: "summary",
        text: `成就解锁：${achievement.title}。${achievement.description}`
      });
    });
    void syncAchievementsForHome();
  });
  void requestTutorSummary(state.activeTaskModule, "task_completed");
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
    oned_tunneling_regimes: "完成标准：覆盖 E<V₀、E≈V₀、E>V₀ 三类能量并提交解释。",
    oned_width_exponential: "完成标准：至少 5 个宽度采样，lnT-a 的 R²≥0.95，斜率误差≤20%。",
    oned_inverse_design: "完成标准：使 |log₁₀(T/T目标)|≤0.3，并完成至少 3 组采样。",
    alpha_barrier_geometry: "完成标准：比较至少 3 组参数，正确说明 R、r₂ 和禁阻区宽度。",
    alpha_energy_relation: "完成标准：至少 5 个 Eα 采样，验证 P 增大且禁阻区减小。",
    alpha_inverse_model: "完成标准：使 |log₁₀(P/P目标)|≤0.3，并分析 WKB 局限。",
    stm_distance_current: "完成标准：至少 5 个距离采样，电流下降至少 5 倍且保持单调。",
    stm_exponential_fit: "完成标准：至少 7 个距离采样，log₁₀I-d 的 R²≥0.95，斜率误差≤20%。",
    stm_constant_current_design: "完成标准：电流落在 1e-3～1e-2，且距离增加后电流明显下降。"
  };
  return standards[task.id] || `完成标准：至少采集 ${task.minSamples || 3} 组有效证据并提交物理原因。`;
}

function taskModeGuideHtml(task, modeKey) {
  if (modeKey === "basic") {
    return `
      <div class="mode-guide">
        <strong>推荐操作步骤</strong>
        <ol>
          <li>先观察起始状态：${metricSnapshotText(state.activeTaskModule, state.taskBaseline || moduleMetrics(state.activeTaskModule))}</li>
          <li>${escapeHtml(task.hints[0] || "只改变一个关键参数，观察图像与数值变化。")}</li>
          <li>${escapeHtml(task.hints[task.hints.length - 1] || "点击检查任务，确认是否达成目标。")}</li>
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
    return `<button class="learning-task-btn ${task?.id === item.id ? "active" : ""} ${done ? "done" : ""}" data-learning-action="start" data-module="${module}" data-task-id="${item.id}"><span>${escapeHtml(item.type || "探究任务")}</span>${escapeHtml(item.title)}${isCore ? " · 核心任务" : ""}${done ? " ✓" : ""}</button>`;
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
  const sampleCount = taskSampleCount(task);
  const sampleTarget = task.minSamples || 3;
  const scoreText = Number.isFinite(state.taskScore)
    ? `当前评分：${state.taskScore}/12 · ${state.taskStars} 星`
    : "尚未评分";

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
      <p><strong>${escapeHtml(task.title)}</strong>：${escapeHtml(task.goal)}</p>
      <p>任务类型：${escapeHtml(task.type || "探究任务")} · 证据采样：${sampleCount}/${sampleTarget} · ${scoreText}</p>
      <p>起始状态：${metricSnapshotText(module, state.taskBaseline || moduleMetrics(module))}</p>
      <p class="task-standard">${escapeHtml(taskStandardText(task, state.learningMode))}</p>
      ${taskModeGuideHtml(task, state.learningMode)}
    </div>
    <div class="learning-section">
      <div class="learning-steps">${steps}</div>
      <h3>${predictionTitle}</h3>
      <p>${escapeHtml(task.predictionQuestion)}</p>
      ${predictionBlock}
      <h3>2. 观察</h3>
      <p>${escapeHtml(task.observe)}</p>
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
  const tutorState = tutorContextFor(module);
  return {
    module,
    sessionId: tutorState.sessionId,
    taskId: task?.id || "",
    moduleTitle: moduleDisplayName(module),
    assistantRole: context.role || `${moduleDisplayName(module)}教学助教`,
    learningMode: state.learningMode,
    learningStage: state.tutor.stage,
    taskTitle: task?.title || "",
    taskGoal: task?.goal || "",
    taskType: task?.type || "",
    taskStep: task ? state.taskStep : "",
    taskFeedback: state.taskFeedback || "",
    sampleCount: task ? taskSampleCount(task) : 0,
    sampleTarget: task?.minSamples || 0,
    taskScore: Number.isFinite(state.taskScore) ? state.taskScore : null,
    taskStars: state.taskStars || 0,
    rubric: state.taskRubric ? JSON.stringify(state.taskRubric.parts) : "",
    currentParams: JSON.stringify(state[module] || {}),
    currentMetrics: JSON.stringify(metrics),
    metricSnapshot: metricSnapshotText(module, metrics),
    pageSummary: moduleSummaryText(module),
    teachingFocus: context.focus || "",
    keyFormulas: context.formulas || "",
    helpLevel: tutorState.hintLevel,
    allowedAnswerLevel: state.tutor.stage === "predict" ? "只提问，不公布结论" : `允许第 ${tutorState.hintLevel} 层提示`,
    instruction: [
      "请用中文回答，面向高中/大学初学者，解释要结合当前页面参数和仿真结果。",
      "优先给出物理原因，再给操作建议；不要编造页面中不存在的按钮或数据。",
      `任务类型是“${task?.type || "自由探究"}”，证据采样进度为 ${task ? taskSampleCount(task) : 0}/${task?.minSamples || 0}。`,
      "如果任务要求拟合、误差、控制变量或目标设计，必须围绕这些证据要求反馈。",
      "不要只根据最终一次参数状态判断学生是否完成，优先检查采样数量、拟合质量和控制变量。",
      `当前教学阶段是“${tutorStageLabel()}”，请遵循该阶段的引导方式。`,
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
  if (type === "summary") {
    return task
      ? `请根据我的参数、结果和解释，为任务“${task.title}”生成实验小结。`
      : `请根据当前${moduleDisplayName(module)}实验记录生成学习小结。`;
  }
  return `请解释当前${moduleDisplayName(module)}图像和结果：${metricSnapshotText(module, metrics)}`;
}

function aiMessagesFor(module) {
  if (!state.ai.messages[module]) {
    const assistantName = aiModuleContext[module]?.name || "量子隧穿助教";
    state.ai.messages[module] = [{
      role: "assistant",
      kind: "prediction_prompt",
      text: `你好，我是${assistantName}，会作为教学伙伴陪你完成“预测、操作、观察、解释、反思”。我会先根据当前任务提问，再结合参数和结果给出反馈。`
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
    `<div class="ai-message ${item.role === "user" ? "user" : "assistant"} kind-${escapeHtml(item.kind || "tutor")}">${escapeHtml(item.text)}</div>`
  ).join("");
  const stageTrack = tutorStageOrder.slice(0, 4).map(stage => {
    const activeIndex = tutorStageOrder.indexOf(state.tutor.stage);
    const index = tutorStageOrder.indexOf(stage);
    return `<span class="${index <= activeIndex ? "active" : ""}">${tutorStageLabels[stage]}</span>`;
  }).join("");
  panel.innerHTML = `
    <h2><span>AI</span>教学伙伴 · ${assistantName}</h2>
    <p class="ai-note">${moduleDisplayName(module)} · 当前阶段：${tutorStageLabel()} · 自动读取参数、结果和任务状态</p>
    <div class="ai-stage-track">${stageTrack}</div>
    <div class="ai-quick">${quickButtons}</div>
    <div class="ai-thread">${body}${isLoading ? `<div class="ai-message assistant loading">教学伙伴正在结合当前过程思考...</div>` : ""}</div>
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
  const answer = data.answer || data.raw?.answer || data.message || data.error || "AI 暂时没有返回内容。";
  return String(answer)
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim() || "AI 暂时没有返回内容。";
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
  state.ai.messages[module] = aiMessagesFor(module).concat({ role: "user", text, kind: "question" });
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
    state.ai.messages[module] = aiMessagesFor(module).concat({
      role: "assistant",
      text: normalizeDifyAnswer(data),
      kind: "chat"
    });
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
  if (page !== "videos" && state.videoLibrary.activeId) closeVideoModal();
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
  const previousPage = state.page;
  if (previousPage !== page && simulationModules.has(previousPage)) {
    finishLearningSession();
  }
  Object.values(pages).forEach(el => el.classList.remove("active"));
  pages[page].classList.add("active");
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
  state.page = page;
  if (previousPage !== page && simulationModules.has(page)) {
    startLearningSession(page);
  }
  drawAll();
  if (simulationModules.has(page)) maybePlayPrincipleIntro(page);
  if (page === "videos") void loadVideoLibrary();
  if (page === "admin") void renderAdminDashboard();
  if (page === "history") void renderLearningDashboard();
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
    "二极管": "rtd",
    "视频": "videos",
    "科普": "videos",
    "科普视频": "videos",
    "管理": "admin",
    "教学管理": "admin",
    "反馈": "admin"
  };
  const page = aliases[raw] || (raw.includes("视频") || raw.includes("科普") ? "videos" : raw.includes("管理") || raw.includes("反馈") ? "admin" : raw.includes("stm") ? "stm" : raw.includes("rtd") ? "rtd" : raw.includes("flash") || raw.includes("闪存") ? "flash" : raw.includes("alpha") || raw.includes("衰变") ? "alpha" : raw.includes("一维") ? "oneD" : "oneD");
  switchPage(page);
}

function announcementFor(page) {
  const text = {
    home: ["欢迎回到主页面", "可选择五个仿真模块，或进入科普视频库观看相关视频。"],
    oneD: ["欢迎来到一维量子隧穿页面", "可调参数包括势垒高度、势垒宽度、粒子质量、粒子能量和绘图范围。"],
    alpha: ["欢迎来到 α 粒子发射页面", "可观察库仑势垒、外转折点和 α 粒子波函数的隧穿衰减。"],
    stm: ["欢迎来到扫描隧道显微镜 STM 页面", "可调参数包括探针距离、材料功函数和偏置电压。"],
    flash: ["欢迎来到闪存隧穿页面", "可观察栅压、氧化层厚度和势垒高度对 Fowler-Nordheim 隧穿电流的影响。"],
    rtd: ["欢迎来到共振隧穿二极管页面", "可观察双势垒量子阱、共振透射峰和负微分电阻区。"],
    videos: ["欢迎来到科普视频库", "这里收录与量子隧穿相关的本地精选视频，可按模块筛选并进入对应仿真。"],
    admin: ["教学管理", "这里汇总普通用户的学习进度、模块使用情况和评价反馈。"],
    history: ["我的学习档案", "这里汇总你的学习时长、实验快照、任务记录和 AI 问答。"]
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
    const beforeValue = obj[key];
    const beforeMetrics = moduleMetrics(moduleForModelObject(obj));
    sync(clamp(Number(input.value), cfg.min, cfg.max));
    onChange();
    const module = moduleForModelObject(obj);
    queueLearningSnapshot(module);
    queueTutorParameterProbe(module, key, beforeValue, obj[key], cfg, beforeMetrics);
  });
  range.addEventListener("input", () => {
    const beforeValue = obj[key];
    const beforeMetrics = moduleMetrics(moduleForModelObject(obj));
    sync(Number(range.value));
    onChange();
    const module = moduleForModelObject(obj);
    queueLearningSnapshot(module);
    queueTutorParameterProbe(module, key, beforeValue, obj[key], cfg, beforeMetrics);
  });
  range.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const beforeValue = obj[key];
    const beforeMetrics = moduleMetrics(moduleForModelObject(obj));
    sync(clamp(obj[key] + dir * cfg.step, cfg.min, cfg.max));
    onChange();
    const module = moduleForModelObject(obj);
    queueLearningSnapshot(module);
    queueTutorParameterProbe(module, key, beforeValue, obj[key], cfg, beforeMetrics);
  }, { passive: false });

  container.appendChild(row);
}

function refreshControls() { controlSyncers.forEach(sync => sync()); }
function resetModel(name) {
  Object.assign(state[name], defaults[name]);
  refreshControls();
  drawAll();
  void trackLearningEvent(name, "model_reset", {
    metrics: metricSnapshotText(name, moduleMetrics(name))
  });
  void saveLearningSnapshot(name, "model_reset");
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
  if (!canvas) return;
  const imageData = canvas.toDataURL("image/png");
  const module = canvasModuleMap[canvasId];
  if (module) {
    void trackLearningEvent(module, "image_saved", {
      metrics: metricSnapshotText(module, moduleMetrics(module))
    });
    void saveLearningSnapshot(module, "image_saved", imageData);
  }
  const link = document.createElement("a");
  link.href = imageData;
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

function plotFrame(ctx, x, y, w, h, title, xlabel, ylabel, ylabelOffset = 46) {
  const analysis = isAnalysisView();
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = analysis ? "#c9d6e6" : "#dbe5f2";
  ctx.lineWidth = analysis ? 1.4 : 1.2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#12213f";
  ctx.font = `700 ${analysis ? 22 : 23}px Microsoft YaHei UI`;
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y - 14);
  ctx.font = `${analysis ? 16 : 17}px Microsoft YaHei UI`;
  ctx.fillText(xlabel, x + w / 2, y + h + 36);
  ctx.save();
  ctx.translate(x - ylabelOffset, y + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawGrid(ctx, x, y, w, h) {
  ctx.save();
  const divisions = isAnalysisView() ? 10 : 5;
  ctx.strokeStyle = isAnalysisView() ? "#dce6f3" : "#e3ebf6";
  ctx.lineWidth = isAnalysisView() ? .9 : 1;
  for (let i = 1; i < divisions; i++) {
    const gx = x + w * i / divisions;
    const gy = y + h * i / divisions;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.restore();
}

function drawAxisLabels(ctx, x, y, w, h, xticks, yticks, xMap, yMap, color = "#64748b") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "16px Microsoft YaHei UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.2;
  xticks.forEach(([value, label]) => {
    const px = xMap(value);
    ctx.beginPath(); ctx.moveTo(px, y + h); ctx.lineTo(px, y + h + 7); ctx.stroke();
    ctx.fillText(label, px, y + h + 10);
  });
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yticks.forEach(([value, label]) => {
    const py = yMap(value);
    ctx.beginPath(); ctx.moveTo(x - 7, py); ctx.lineTo(x, py); ctx.stroke();
    ctx.fillText(label, x - 11, py);
  });
  ctx.restore();
}

function drawLegend(ctx, items, x, y) {
  ctx.save();
  ctx.font = `${isAnalysisView() ? 15 : 16}px Microsoft YaHei UI`;
  items.forEach(([label, color, dash], i) => {
    const ly = y + i * (isAnalysisView() ? 24 : 27);
    ctx.strokeStyle = color;
    ctx.lineWidth = isAnalysisView() ? 3 : 3.5;
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

function drawSideLegendPanel(ctx, items, x, y, width, title = "图例") {
  const rowStep = isAnalysisView() ? 24 : 27;
  const height = 44 + items.length * rowStep;
  ctx.save();
  ctx.fillStyle = "rgba(248, 251, 255, .96)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#d7e3f1";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "#28436d";
  ctx.font = "800 15px Microsoft YaHei UI";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + 12, y + 20);
  drawLegend(ctx, items, x + 12, y + 42);
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
  const { canvas, ctx } = beginCanvasView("oneDCanvas");
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

  if (state.plotMode === "oneD3d") {
    drawOneD3D(ctx, p, T, k, kappa);
    finishCanvasView(canvas);
    return;
  }
  if (state.plotMode === "oneDTR") {
    drawOneDTR(ctx, p, T);
    finishCanvasView(canvas);
    return;
  }

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
  registerCanvasHitTest(canvas, (px, py) => {
    if (insideArea(px, py, top)) {
      const x = unmapX(px, p.xmin, p.xmax, top.x, top.w);
      const potential = x >= 0 && x <= p.a ? p.V0 : 0;
      return [
        { label: "位置 x", value: x, digits: 4 },
        { label: "势能 V(x)", value: potential, digits: 4, color: "#2563eb" },
        { label: "粒子能量 E", value: p.E, digits: 4, color: "#dc2626" },
        { label: "透射率 T", value: T, color: "#7c3aed" }
      ];
    }
    if (insideArea(px, py, bottom)) {
      const x = unmapX(px, p.xmin, p.xmax, bottom.x, bottom.w);
      const psi = evalBarrierPsi(x, p.a, coeffs);
      return [
        { label: "位置 x", value: x, digits: 4 },
        { label: "Re[ψ(x)]", value: psiRealPart(psi, phase), digits: 4, color: "#dc2626" },
        { label: "|ψ(x)|²", value: cAbs2(psi), digits: 4, color: "#f97316" },
        { label: "透射率 T", value: T, color: "#7c3aed" },
        { label: "反射率 R", value: 1 - T, color: "#2563eb" }
      ];
    }
    return null;
  });
  finishCanvasView(canvas);
  return;
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
  registerCanvasHitTest(ctx.canvas, (px, py) => {
    if (!insideArea(px, py, area)) return null;
    const energy = clamp(unmapX(px, 0, eMax, area.x, area.w), 0, eMax);
    const [transmissionAtEnergy] = transmission(energy, p.V0, p.a, p.m);
    return [
      { label: "能量 E", value: energy, digits: 4 },
      { label: "透射率 T(E)", value: transmissionAtEnergy, color: "#2563eb" },
      { label: "反射率 R(E)", value: 1 - transmissionAtEnergy, color: "#f97316" },
      { label: "当前 T", value: Tnow, color: "#dc2626" }
    ];
  });
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
  registerCanvasHitTest(ctx.canvas, (px, py) => {
    if (!insideArea(px, py, area)) return null;
    const projectedX = xMin + clamp((px - area.x) / area.w, 0, 1) * (xMax - xMin);
    const psi = evalBarrierPsi(projectedX, p.a, coeffs);
    return [
      { label: "投影位置 x", value: projectedX, digits: 3 },
      { label: "Re[ψ]", value: psiRealPart(psi, phase), digits: 4, color: "#2ca02c" },
      { label: "Im[ψ]", value: psiImagPart(psi, phase), digits: 4, color: "#8e63be" },
      { label: "透射率 T", value: T, color: "#7c3aed" },
      { label: "衰减系数 κ", value: p.E < p.V0 ? kappa : 0, color: "#f97316" }
    ];
  });
}

function drawAlpha() {
  const p = state.alpha;
  const { canvas, ctx } = beginCanvasView("alphaCanvas");
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
    isAnalysisView()
      ? [[0, "0"], [p.R, `R=${p.R.toFixed(1)}`], [(p.R + Math.min(r2, rMax)) / 2, `${((p.R + Math.min(r2, rMax)) / 2).toFixed(1)}`], [Math.min(r2, rMax), `r₂=${r2.toFixed(1)}`], [rMax, rMax.toFixed(0)]]
      : [[0, "0"], [p.R, `R=${p.R.toFixed(1)}`], [Math.min(r2, rMax), `r₂=${r2.toFixed(1)}`], [rMax, rMax.toFixed(0)]],
    isAnalysisView()
      ? [[p.well, p.well.toFixed(0)], [0, "0"], [p.Ealpha, p.Ealpha.toFixed(1)], [barrierR, barrierR.toFixed(1)], [ymax, ymax.toFixed(1)]]
      : [[p.well, p.well.toFixed(0)], [p.Ealpha, p.Ealpha.toFixed(1)], [barrierR, barrierR.toFixed(1)]],
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
  registerCanvasHitTest(canvas, (px, py) => {
    if (!insideArea(px, py, area)) return null;
    const r = clamp(unmapX(px, 0, rMax, area.x, area.w), 0.01, rMax);
    const potential = C * p.Zd * Za / r;
    let wave;
    if (r <= p.R) {
      wave = p.Ealpha + waveAmp * Math.sin(kIn * r - phase);
    } else if (r2 > p.R && r <= Math.min(r2, rMax)) {
      let action = 0;
      const steps = 80;
      for (let i = 1; i <= steps; i++) {
        const previous = p.R + (r - p.R) * (i - 1) / steps;
        const current = p.R + (r - p.R) * i / steps;
        action += 0.2 * kappaAt(current) * (current - previous);
      }
      const matching = Math.sqrt(kappaR / Math.max(kappaAt(r), .18));
      wave = p.Ealpha + boundaryOffset * matching * Math.exp(-action);
    } else {
      const outgoingStart = Math.max(p.R, Math.min(r2, rMax));
      const distance = Math.max(0, r - outgoingStart);
      const outgoingTarget = Math.sign(barrierExitOffset || boundaryOffset || 1) * Math.max(Math.abs(barrierExitOffset), waveAmp * .46);
      const envelope = barrierExitOffset + (outgoingTarget - barrierExitOffset) * (1 - Math.exp(-distance / 2.2));
      wave = p.Ealpha + envelope * Math.cos(kOut * distance);
    }
    return [
      { label: "半径 r", value: r, digits: 3, unit: "fm" },
      { label: "库仑势 V(r)", value: potential, digits: 4, unit: "MeV", color: "#2563eb" },
      { label: "α 能量 Eα", value: p.Ealpha, digits: 3, unit: "MeV", color: "#dc2626" },
      { label: "波函数显示值", value: wave, digits: 4, color: "#f97316" },
      { label: "WKB 穿透概率", value: metrics.penetrability, color: "#7c3aed" }
    ];
  });
  finishCanvasView(canvas);
}

function drawSTM() {
  const p = state.stm;
  const { canvas, ctx } = beginCanvasView("stmCanvas");
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
  drawAxisLabels(ctx, currentPanel.x, currentPanel.y, currentPanel.w, currentPanel.h,
    isAnalysisView() ? [[2, "2"], [4, "4"], [6, "6"], [8, "8"], [10, "10"]] : [[2, "2"], [6, "6"], [10, "10"]],
    isAnalysisView() ? [[-10, "-10"], [-7.5, "-7.5"], [-5, "-5"], [-2.5, "-2.5"], [0, "0"]] : [[-10, "-10"], [-5, "-5"], [0, "0"]],
    d => mapX(d, 2, 10, currentPanel.x, currentPanel.w),
    value => mapY(value, -10, 0, currentPanel.y, currentPanel.h)
  );
  updateLinkedUI("stm", { ...p, kappa, I: current });
  $("#stmSummary").textContent = `有效 κ≈${kappa.toFixed(3)} Å⁻¹；当前归一化透射趋势 T(d)/T(2 Å)≈${transmissionNow.toExponential(3)}；当前相对电流 Irel≈${current.toExponential(3)}。距离每增加 1 Å，二者约变为原来的 ${Math.exp(-2 * kappa).toFixed(3)} 倍。`;
  registerCanvasHitTest(canvas, (px, py) => {
    if (insideArea(px, py, top)) {
      const x = clamp(unmapX(px, xmin, xmax, top.x, top.w), xmin, xmax);
      const potential = x < 0 ? 0 : x <= p.d ? p.phi : Math.max(p.phi - p.bias, .05);
      let amp = .65;
      if (x >= 0 && x <= p.d) amp *= Math.exp(-kappa * x);
      if (x > p.d) amp *= Math.exp(-kappa * p.d);
      const wave = waveBase + amp * Math.cos(2.2 * x - phase);
      return [
        { label: "位置 x", value: x, digits: 3, unit: "Å" },
        { label: "势能 V(x)", value: potential, digits: 4, unit: "eV", color: "#2563eb" },
        { label: "波函数显示值", value: wave, digits: 4, color: "#dc2626" },
        { label: "衰减系数 κ", value: kappa, digits: 4, unit: "Å⁻¹", color: "#f97316" }
      ];
    }
    if (insideArea(px, py, transmissionPanel)) {
      const distance = clamp(unmapX(px, 2, 10, transmissionPanel.x, transmissionPanel.w), 2, 10);
      const value = transmissionAtDistance(distance);
      return [
        { label: "探针距离 d", value: distance, digits: 3, unit: "Å" },
        { label: "归一化透射", value, color: "#0f766e" },
        { label: "当前距离", value: p.d, digits: 3, unit: "Å", color: "#dc2626" }
      ];
    }
    if (insideArea(px, py, currentPanel)) {
      const distance = clamp(unmapX(px, 2, 10, currentPanel.x, currentPanel.w), 2, 10);
      const value = p.bias * Math.exp(-2 * kappa * distance);
      return [
        { label: "探针距离 d", value: distance, digits: 3, unit: "Å" },
        { label: "相对电流 Irel", value, color: "#2563eb" },
        { label: "log₁₀(Irel)", value: Math.log10(Math.max(value, 1e-30)), digits: 4, color: "#7c3aed" }
      ];
    }
    return null;
  });
  finishCanvasView(canvas);
}

function flashCurrent(p, gateV = p.gateV) {
  const veff = Math.max(gateV - p.vth, 0.05);
  const eox = veff / p.tox;
  const exponent = -6.83 * Math.pow(p.phi, 1.5) / Math.max(eox, 0.02);
  const j = eox * eox * Math.exp(exponent);
  return { veff, eox, j, logJ: Math.log10(Math.max(j, 1e-30)) };
}

function drawFlash() {
  const p = state.flash;
  const { canvas, ctx } = beginCanvasView("flashCanvas");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const top = { x: 145, y: 100, w: 705, h: 230 };
  const bottom = { x: 145, y: 430, w: 705, h: 190 };
  const legend = { x: 870, y: 110, w: 150 };
  const calc = flashCurrent(p);
  const focus = activeLinkedSymbol("flash");
  const vDrop = calc.veff;
  const yMin = -0.4, yMax = Math.max(p.phi * 1.28, vDrop * 0.45 + p.phi);
  const xMap = x => mapX(x, 0, p.tox, top.x, top.w);
  const yMap = e => mapY(e, yMin, yMax, top.y, top.h);

  plotFrame(ctx, top.x, top.y, top.w, top.h, "闪存写入/擦除：氧化层三角势垒与电子隧穿", "氧化层位置 x / nm", "电子势能 / eV", 90);
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
    [[0, "Si 衬底"], [p.tox, "浮栅"]],
    [[0, "E"], [p.phi, `φB=${p.phi.toFixed(1)}`]],
    xMap, yMap
  );
  drawSideLegendPanel(ctx, [
    ["氧化层势垒", "#2563eb"],
    ["电子能量", "#dc2626", true],
    ["隧穿波函数", "#f59e0b"]
  ], legend.x, legend.y, legend.w);

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
  drawAxisLabels(ctx, bottom.x, bottom.y, bottom.w, bottom.h,
    isAnalysisView() ? [[4, "4"], [8, "8"], [12, "12"], [16, "16"], [20, "20"]] : [[4, "4"], [12, "12"], [20, "20"]],
    isAnalysisView() ? [[-30, "-30"], [-20, "-20"], [-10, "-10"], [0, "0"]] : [[-30, "-30"], [-15, "-15"], [0, "0"]],
    vg => mapX(vg, 4, 20, bottom.x, bottom.w),
    value => mapY(value, -30, 0, bottom.y, bottom.h)
  );
  updateLinkedUI("flash", { ...p, ...calc });
  $("#flashSummary").textContent = `有效氧化层电场 Eox≈${calc.eox.toFixed(3)} V/nm；当前 JFN≈${calc.j.toExponential(3)} a.u.。提高栅压或减小氧化层厚度会显著增加隧穿写入/擦除速率，但也会增加氧化层可靠性风险。`;
  registerCanvasHitTest(canvas, (hitX, hitY) => {
    if (insideArea(hitX, hitY, top)) {
      const x = clamp(unmapX(hitX, 0, p.tox, top.x, top.w), 0, p.tox);
      const potential = Math.max(p.phi - vDrop * x / p.tox, .04);
      return [
        { label: "氧化层位置 x", value: x, digits: 3, unit: "nm" },
        { label: "势垒 V(x)", value: potential, digits: 4, unit: "eV", color: "#2563eb" },
        { label: "氧化层电场 Eox", value: calc.eox, digits: 4, unit: "V/nm", color: "#f97316" },
        { label: "隧穿电流 JFN", value: calc.j, color: "#dc2626" }
      ];
    }
    if (insideArea(hitX, hitY, bottom)) {
      const gateVoltage = clamp(unmapX(hitX, 4, 20, bottom.x, bottom.w), 4, 20);
      const sampled = flashCurrent(p, gateVoltage);
      return [
        { label: "控制栅电压 Vg", value: gateVoltage, digits: 3, unit: "V" },
        { label: "log₁₀(JFN)", value: sampled.logJ, digits: 4, color: "#2563eb" },
        { label: "JFN", value: sampled.j, color: "#dc2626" },
        { label: "有效电场 Eox", value: sampled.eox, digits: 4, unit: "V/nm", color: "#f97316" }
      ];
    }
    return null;
  });
  finishCanvasView(canvas);
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
  const p = state.rtd;
  const { canvas, ctx } = beginCanvasView("rtdCanvas");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const top = { x: 145, y: 100, w: 705, h: 245 };
  const bottom = { x: 145, y: 440, w: 705, h: 180 };
  const legend = { x: 870, y: 110, w: 150 };
  const totalW = 2 * p.barrierWidth + p.wellWidth;
  const met = rtdMetrics(p);
  const focus = activeLinkedSymbol("rtd");
  const xMap = x => mapX(x, 0, totalW, top.x, top.w);
  const yMap = e => mapY(e, -0.05, Math.max(p.barrierHeight * 1.3, met.e1 * 1.8, 0.55), top.y, top.h);

  plotFrame(ctx, top.x, top.y, top.w, top.h, "共振隧穿二极管：双势垒量子阱、共振能级与透射波", "生长方向 x / nm", "能量 / eV", 90);
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
    [
      [0, "发射极"],
      [p.barrierWidth / 2, "势垒 1"],
      [p.barrierWidth + p.wellWidth / 2, "量子阱"],
      [p.barrierWidth + p.wellWidth + p.barrierWidth / 2, "势垒 2"],
      [totalW, "集电极"]
    ],
    [[0, "0"], [met.e1, `E₁=${met.e1.toFixed(2)}`], [p.barrierHeight, `Vb=${p.barrierHeight.toFixed(2)}`]],
    xMap, yMap
  );
  drawSideLegendPanel(ctx, [
    ["双势垒势能", "#2563eb"],
    ["阱内能级", "#7c3aed", true],
    ["入射能量", "#dc2626", true],
    ["透射波", "#f59e0b"]
  ], legend.x, legend.y, legend.w);

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
  drawAxisLabels(ctx, bottom.x, bottom.y, bottom.w, bottom.h,
    isAnalysisView() ? [[0, "0"], [0.2, "0.2"], [0.4, "0.4"], [0.6, "0.6"], [0.8, "0.8"]] : [[0, "0"], [0.4, "0.4"], [0.8, "0.8"]],
    isAnalysisView() ? [[0, "0"], [imax / 2, (imax / 2).toPrecision(2)], [imax, imax.toPrecision(2)]] : [[0, "0"], [imax, imax.toPrecision(2)]],
    v => mapX(v, 0, .8, bottom.x, bottom.w),
    value => mapY(value, 0, imax, bottom.y, bottom.h)
  );
  updateLinkedUI("rtd", { ...p, ...met });
  $("#rtdSummary").textContent = `阱内基态能级 E₁≈${met.e1.toFixed(3)} eV；当前偏压下共振失配量约 ${(met.er - 0.11).toFixed(3)} eV；相对电流≈${met.current.toExponential(3)}。峰值右侧的阴影区域表示负微分电阻工作区。`;
  registerCanvasHitTest(canvas, (px, py) => {
    if (insideArea(px, py, top)) {
      const x = clamp(unmapX(px, 0, totalW, top.x, top.w), 0, totalW);
      let potential = 0;
      if (x <= p.barrierWidth) potential = p.barrierHeight;
      else if (x >= p.barrierWidth + p.wellWidth) potential = Math.max(p.barrierHeight - p.bias * .18, .08);
      return [
        { label: "生长方向 x", value: x, digits: 3, unit: "nm" },
        { label: "双势垒势能", value: potential, digits: 4, unit: "eV", color: "#2563eb" },
        { label: "阱内能级 E₁", value: met.e1, digits: 4, unit: "eV", color: "#7c3aed" },
        { label: "共振对齐度", value: met.align, color: "#f59e0b" }
      ];
    }
    if (insideArea(px, py, bottom)) {
      const bias = clamp(unmapX(px, 0, .8, bottom.x, bottom.w), 0, .8);
      const sampled = rtdMetrics(p, bias);
      return [
        { label: "偏压 V", value: bias, digits: 3, unit: "V" },
        { label: "相对电流 I", value: sampled.current, color: "#2563eb" },
        { label: "共振对齐度", value: sampled.align, color: "#f59e0b" },
        { label: "共振线宽 Γ", value: sampled.gamma, digits: 4, color: "#7c3aed" }
      ];
    }
    return null;
  });
  finishCanvasView(canvas);
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
  if (e.target?.id === "feedbackModal") {
    closeFeedbackModal();
    return;
  }

  const feedbackRatingTarget = e.target.closest("[data-feedback-rating]");
  if (feedbackRatingTarget) {
    state.feedbackMailbox.rating = Number(feedbackRatingTarget.dataset.feedbackRating) || 0;
    state.feedbackMailbox.status = "";
    renderFeedbackForm();
    return;
  }

  const feedbackStatusTarget = e.target.closest("[data-feedback-status-filter]");
  if (feedbackStatusTarget) {
    state.adminDashboard.feedbackStatus = feedbackStatusTarget.dataset.feedbackStatusFilter || "all";
    void renderAdminDashboard();
    return;
  }

  const feedbackActionTarget = e.target.closest("[data-feedback-action]");
  if (feedbackActionTarget) {
    const action = feedbackActionTarget.dataset.feedbackAction;
    if (action === "open") openFeedbackModal();
    if (action === "login") showAuthModal("登录后可以提交学习反馈。");
    if (action === "admin") switchPage("admin");
    if (action === "close") closeFeedbackModal();
    if (action === "submit") void submitFeedback();
    if (action === "refresh") void renderAdminDashboard();
    if (action === "status") {
      void updateFeedbackStatus(
        Number(feedbackActionTarget.dataset.feedbackId),
        feedbackActionTarget.dataset.status
      );
    }
    return;
  }

  if (e.target?.id === "videoModal") {
    closeVideoModal();
    return;
  }

  const videoActionTarget = e.target.closest("[data-video-action]");
  if (videoActionTarget) {
    const action = videoActionTarget.dataset.videoAction;
    if (action === "open") openVideoModal(videoActionTarget.dataset.videoId);
    if (action === "close") closeVideoModal();
    if (action === "retry") void loadVideoLibrary(true);
    return;
  }

  const videoFilterTarget = e.target.closest("[data-video-filter]");
  if (videoFilterTarget) {
    state.videoLibrary.filterModule = videoFilterTarget.dataset.videoFilter || "all";
    renderVideoLibrary();
    return;
  }

  const videoModuleTarget = e.target.closest("[data-video-module]");
  if (videoModuleTarget) {
    closeVideoModal();
    switchPage(videoModuleTarget.dataset.videoModule);
    return;
  }

  const introActionTarget = e.target.closest("[data-principle-action]");
  if (introActionTarget) {
    const action = introActionTarget.dataset.principleAction;
    if (action === "pause") togglePrinciplePause();
    if (action === "replay") {
      const module = state.principleIntro.module;
      if (module) playPrincipleIntro(module);
    }
    if (action === "skip") finishPrincipleIntro();
    return;
  }

  const introReplayTarget = e.target.closest("[data-action=principle-intro]");
  if (introReplayTarget) {
    playPrincipleIntro(introReplayTarget.dataset.module);
    return;
  }

  const viewModeTarget = e.target.closest("[data-view-mode]");
  if (viewModeTarget) {
    setCanvasViewMode(viewModeTarget.dataset.viewMode);
    return;
  }

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
      const type = aiTarget.dataset.aiType;
      if (type === "hint" && module === state.activeTaskModule && activeTaskFor(module)) {
        if (state.hintLevel >= activeTaskFor(module).hints.length) {
          pushTutorMessage(module, {
            role: "assistant",
            kind: "hint",
            text: "三层提示已经全部展开。现在请回到任务检查，用自己的话比较起始值和当前值。"
          });
        } else {
          showNextHint();
        }
      } else if (type === "summary") {
        void requestTutorSummary(module, "session_finished");
      } else {
        askAI(module, defaultAiQuestion(module, type));
      }
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
  if (action === "history-refresh") void renderLearningDashboard();
  if (action === "update-oneD") {
    drawOneD();
    queueLearningSnapshot("oneD");
  }
  if (action === "reset-oneD") resetModel("oneD");
  if (action === "save-oneD") saveCanvas("oneDCanvas", "一维量子隧穿.png");
  if (action === "update-alpha") {
    drawAlpha();
    queueLearningSnapshot("alpha");
  }
  if (action === "reset-alpha") resetModel("alpha");
  if (action === "save-alpha") saveCanvas("alphaCanvas", "alpha粒子发射.png");
  if (action === "update-stm") {
    drawSTM();
    queueLearningSnapshot("stm");
  }
  if (action === "reset-stm") resetModel("stm");
  if (action === "save-stm") saveCanvas("stmCanvas", "STM应用.png");
  if (action === "update-flash") {
    drawFlash();
    queueLearningSnapshot("flash");
  }
  if (action === "reset-flash") resetModel("flash");
  if (action === "save-flash") saveCanvas("flashCanvas", "闪存隧穿.png");
  if (action === "update-rtd") {
    drawRTD();
    queueLearningSnapshot("rtd");
  }
  if (action === "reset-rtd") resetModel("rtd");
  if (action === "save-rtd") saveCanvas("rtdCanvas", "共振隧穿二极管.png");
});

document.addEventListener("wheel", (e) => {
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (!controller?.surface) return;
  if (controller.mode !== "zoom") return;
  e.preventDefault();
  const anchor = canvasPointerPosition(controller, e);
  const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * controller.cssHeight : e.deltaY;
  const factor = Math.exp(-delta * 0.0015);
  setCanvasZoom(controller, controller.zoom * factor, anchor);
  redrawCanvasById(controller.canvasId);
}, { passive: false });

document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !e.isPrimary) return;
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (!controller || controller.mode !== "zoom") return;
  controller.drag = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
  frame.setPointerCapture?.(e.pointerId);
  controller.readout?.classList.add("hidden");
  frame.classList.add("is-dragging");
});

document.addEventListener("dblclick", (e) => {
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (!controller || controller.mode !== "zoom") return;
  controller.zoom = 1;
  controller.panX = 0;
  controller.panY = 0;
  redrawCanvasById(controller.canvasId);
});

document.addEventListener("pointermove", (e) => {
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (!controller) return;

  if (controller.drag?.pointerId === e.pointerId) {
    const dx = e.clientX - controller.drag.lastX;
    const dy = e.clientY - controller.drag.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 1) controller.drag.moved = true;
    controller.drag.lastX = e.clientX;
    controller.drag.lastY = e.clientY;
    controller.panX += dx;
    controller.panY += dy;
    clampCanvasPan(controller);
    redrawCanvasById(controller.canvasId);
    return;
  }

  const position = canvasPointerPosition(controller, e);
  if (!position || !controller.hitTest) {
    controller.readout?.classList.add("hidden");
    return;
  }
  const result = controller.hitTest(position.x, position.y);
  updateCanvasReadout(controller, e, result);
});

document.addEventListener("pointerup", (e) => {
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (!controller?.drag || controller.drag.pointerId !== e.pointerId) return;
  frame.releasePointerCapture?.(e.pointerId);
  controller.drag = null;
  frame.classList.remove("is-dragging");
});

document.addEventListener("pointercancel", (e) => {
  const frame = e.target.closest(".canvas-frame");
  if (!frame) return;
  const controller = canvasViewControllers.get(frame.closest("[data-canvas-id]")?.dataset.canvasId);
  if (controller?.drag?.pointerId === e.pointerId) {
    controller.drag = null;
    frame.classList.remove("is-dragging");
  }
});

document.addEventListener("fullscreenchange", () => {
  Object.keys(canvasViewConfigs).forEach(redrawCanvasById);
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
  if (e.key === "Escape" && !document.getElementById("feedbackModal")?.classList.contains("hidden")) {
    closeFeedbackModal();
    return;
  }
  if (e.key === "Escape" && state.videoLibrary.activeId) {
    closeVideoModal();
    return;
  }
  if (state.principleIntro.active && e.key === "Escape") {
    finishPrincipleIntro();
    return;
  }
  if (state.principleIntro.active && e.key === " " && !e.target?.closest?.("input, textarea, button")) {
    e.preventDefault();
    togglePrinciplePause();
    return;
  }
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

document.addEventListener("input", (e) => {
  if (e.target?.id === "feedbackMessage") {
    state.feedbackMailbox.message = e.target.value || "";
    return;
  }
  if (e.target?.id !== "videoSearch") return;
  state.videoLibrary.query = e.target.value || "";
  const cursor = e.target.selectionStart;
  renderVideoLibrary();
  const nextInput = document.getElementById("videoSearch");
  if (nextInput) {
    nextInput.focus();
    nextInput.setSelectionRange(cursor, cursor);
  }
});

document.addEventListener("change", (e) => {
  if (e.target?.id === "feedbackModule") state.feedbackMailbox.module = e.target.value;
  if (e.target?.id === "feedbackCategory") state.feedbackMailbox.category = e.target.value;
  if (e.target?.id === "feedbackAnonymous") state.feedbackMailbox.anonymous = e.target.checked;
});

window.addEventListener("pagehide", () => finishLearningSession());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    finishLearningSession();
  } else if (isAuthenticated() && simulationModules.has(state.page) && !state.learningArchive.sessionId) {
    startLearningSession(state.page);
  }
});

setupPrincipleIntro();
setupCanvasViews();
setupControls();
updateOneDLinkedUI();
renderFeedbackMailbox();
setAuthMode("login");
initAuth();
startLearningTask("oneD", "oned_tunneling_regimes");
drawAll();
loop();
