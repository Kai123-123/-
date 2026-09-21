require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { DatabaseSync } = require("node:sqlite");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "quantum-tunnel-local-dev-secret";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const DIFY_BASE_URL = (process.env.DIFY_BASE_URL || "https://api.dify.ai/v1").replace(/\/+$/, "");
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SQLITE_FILE = path.join(DATA_DIR, process.env.SQLITE_FILE || "quantum_tunneling_platform.sqlite");
const MODULES = new Set(["oneD", "stm", "alpha", "flash", "rtd"]);
const MODULE_DIFY_ENV = {
  oneD: "DIFY_API_KEY_ONED",
  stm: "DIFY_API_KEY_STM",
  alpha: "DIFY_API_KEY_ALPHA",
  flash: "DIFY_API_KEY_FLASH",
  rtd: "DIFY_API_KEY_RTD"
};

let pool = null;
let databaseError = null;

class SqlitePool {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.function("FIELD", { varargs: true }, (val, ...args) => {
      const idx = args.indexOf(val);
      return idx === -1 ? args.length + 1 : idx + 1;
    });
    this.db.function("GREATEST", { varargs: true }, (...args) => Math.max(...args.map(Number)));
    this.db.function("LEAST", { varargs: true }, (...args) => Math.min(...args.map(Number)));
  }

  normalize(sql) {
    let normalized = String(sql)
      .replace(/CURRENT_TIMESTAMP\(3\)/gi, "CURRENT_TIMESTAMP")
      .replace(/DATE_SUB\(NOW\(\), INTERVAL 7 DAY\)/gi, "datetime('now', '-7 day')")
      .replace(/GROUP_CONCAT\(DISTINCT t\.task_id ORDER BY t\.task_id\)/gi, "GROUP_CONCAT(DISTINCT t.task_id)");
    if (/^\s*CREATE TABLE/i.test(normalized)) {
      normalized = normalized
        .replace(/id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,/gi, "id INTEGER NOT NULL,")
        .replace(/\s+UNIQUE KEY\s+\w+\s*\(([^)]+)\)/gi, " UNIQUE ($1)")
        .replace(/^\s*KEY\s+[^\n]+,?\s*$/gim, "")
        .replace(/^\s*CONSTRAINT\s+[^\n]+,?\s*$/gim, "")
        .replace(/\s+ENGINE=\w+\s+DEFAULT CHARSET=\w+\s+COLLATE=\w+/gi, "")
        .replace(/\b(BIGINT|INT|TINYINT|DECIMAL|VARCHAR|CHAR|DATETIME|JSON)\s+UNSIGNED\b/gi, "$1")
        .replace(/\b(BIGINT|INT|TINYINT|DECIMAL|VARCHAR|CHAR|DATETIME)\((\d+)\)/gi, "$1")
        .replace(/,\s*\)/g, ")");
    }
    return normalized
  }

  exec(sql) {
    this.db.exec(this.normalize(sql));
  }

  async query(sql, params = []) {
    return this.run(sql, params);
  }

  async execute(sql, params = []) {
    return this.run(sql, params);
  }

  run(sql, params = []) {
    const normalized = this.normalize(sql);
    const statement = this.db.prepare(normalized);
    const values = params.map(value => value instanceof Date ? value.toISOString() : value);
    if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(normalized)) {
      return [statement.all(...values)];
    }
    const result = statement.run(...values);
    return [{ affectedRows: result.changes, insertId: Number(result.lastInsertRowid || 0) }];
  }

  close() {
    this.db.close();
  }
}

function ensureLocalDirectories() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

function readLegacyUsers() {
  ensureLocalDirectories();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function initializeDatabase() {
  ensureLocalDirectories();
  pool = new SqlitePool(SQLITE_FILE);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(32) NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'student',
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY users_username_unique (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id CHAR(36) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      module VARCHAR(16) NOT NULL,
      started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      last_active_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      ended_at DATETIME(3) NULL,
      duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      PRIMARY KEY (id),
      KEY learning_sessions_user_started (user_id, started_at),
      KEY learning_sessions_module_started (module, started_at),
      CONSTRAINT learning_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      session_id CHAR(36) NULL,
      module VARCHAR(16) NOT NULL,
      event_type VARCHAR(48) NOT NULL,
      payload JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY learning_events_user_created (user_id, created_at),
      KEY learning_events_module_created (module, created_at),
      CONSTRAINT learning_events_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT learning_events_session_fk FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiment_snapshots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      session_id CHAR(36) NULL,
      module VARCHAR(16) NOT NULL,
      reason VARCHAR(48) NOT NULL,
      parameters JSON NOT NULL,
      metrics JSON NOT NULL,
      image_path VARCHAR(255) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY experiment_snapshots_user_module_created (user_id, module, created_at),
      CONSTRAINT experiment_snapshots_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT experiment_snapshots_session_fk FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      session_id CHAR(36) NULL,
      module VARCHAR(16) NOT NULL,
      task_id VARCHAR(64) NOT NULL,
      learning_mode VARCHAR(16) NOT NULL,
      prediction TEXT NULL,
      explanation TEXT NULL,
      status VARCHAR(16) NOT NULL,
      baseline_metrics JSON NULL,
      final_metrics JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY task_attempts_user_module_created (user_id, module, created_at),
      CONSTRAINT task_attempts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT task_attempts_session_fk FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      module VARCHAR(16) NOT NULL,
      conversation_id VARCHAR(128) NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY ai_conversations_user_module_created (user_id, module, created_at),
      CONSTRAINT ai_conversations_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_summaries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      session_id CHAR(36) NULL,
      module VARCHAR(16) NOT NULL,
      task_id VARCHAR(64) NULL,
      phenomenon TEXT NULL,
      cause TEXT NULL,
      mastery TEXT NULL,
      review_advice TEXT NULL,
      summary_text TEXT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY learning_summaries_user_module_created (user_id, module, created_at),
      KEY learning_summaries_session (session_id),
      CONSTRAINT learning_summaries_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT learning_summaries_session_fk FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS knowledge_mastery (
      user_id BIGINT UNSIGNED NOT NULL,
      module VARCHAR(16) NOT NULL,
      knowledge_point VARCHAR(64) NOT NULL,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      correct_attempts INT UNSIGNED NOT NULL DEFAULT 0,
      hint_count INT UNSIGNED NOT NULL DEFAULT 0,
      mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (user_id, module, knowledge_point),
      CONSTRAINT knowledge_mastery_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      module VARCHAR(16) NOT NULL DEFAULT 'general',
      category VARCHAR(32) NOT NULL DEFAULT 'other',
      rating TINYINT UNSIGNED NOT NULL,
      message TEXT NOT NULL,
      is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'new',
      admin_note TEXT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY user_feedback_status_created (status, created_at),
      KEY user_feedback_user_created (user_id, created_at),
      CONSTRAINT user_feedback_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(64) NOT NULL,
      title VARCHAR(80) NOT NULL,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(24) NOT NULL,
      icon VARCHAR(16) NOT NULL DEFAULT '★',
      rarity VARCHAR(16) NOT NULL DEFAULT 'bronze',
      criteria_type VARCHAR(32) NOT NULL,
      criteria_key VARCHAR(255) NULL,
      target_value INT UNSIGNED NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY achievements_code_unique (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id BIGINT UNSIGNED NOT NULL,
      achievement_id BIGINT UNSIGNED NOT NULL,
      progress_current INT UNSIGNED NOT NULL DEFAULT 0,
      progress_target INT UNSIGNED NOT NULL DEFAULT 1,
      status VARCHAR(16) NOT NULL DEFAULT 'in_progress',
      unlocked_at DATETIME(3) NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (user_id, achievement_id),
      CONSTRAINT user_achievements_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT user_achievements_achievement_fk FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureAiConversationColumns();
  await ensureTaskAttemptColumns();
  await ensureAchievementColumns();
  await seedAchievements();

  await migrateLegacyUsers();
  await ensureAdminUser();
}

async function ensureAiConversationColumns() {
  const columns = [
    ["session_id", "CHAR(36) NULL"],
    ["task_id", "VARCHAR(64) NULL"],
    ["stage", "VARCHAR(24) NULL"],
    ["trigger_type", "VARCHAR(48) NULL"],
    ["response_type", "VARCHAR(24) NULL"],
    ["help_level", "TINYINT UNSIGNED NOT NULL DEFAULT 0"],
    ["context_json", "JSON NULL"],
    ["student_feedback", "VARCHAR(16) NULL"]
  ];
  for (const [column, definition] of columns) {
    const [rows] = await pool.execute("PRAGMA table_info(ai_conversations)");
    if (!rows.some(row => row.name === column)) {
      await pool.query(`ALTER TABLE ai_conversations ADD COLUMN \`${column}\` ${definition}`);
    }
  }
}

async function ensureTaskAttemptColumns() {
  const columns = [
    ["score", "INT UNSIGNED NOT NULL DEFAULT 0"],
    ["stars", "TINYINT UNSIGNED NOT NULL DEFAULT 0"],
    ["task_type", "VARCHAR(32) NULL"],
    ["sample_count", "INT UNSIGNED NOT NULL DEFAULT 0"],
    ["evidence_json", "JSON NULL"]
  ];
  for (const [column, definition] of columns) {
    const [rows] = await pool.execute("PRAGMA table_info(task_attempts)");
    if (!rows.some(row => row.name === column)) {
      await pool.query(`ALTER TABLE task_attempts ADD COLUMN \`${column}\` ${definition}`);
    }
  }
}

async function ensureAchievementColumns() {
  // SQLite does not require a separate MODIFY COLUMN migration here.
}

const achievementSeeds = [
  ["first_prediction", "第一次预测", "提交第一个有效学习预测。", "core", "◇", "bronze", "event_count", "prediction_submitted", 1, 10],
  ["oned_foundation", "波包观察者", "完成一维隧穿区间任务。", "core", "ψ", "bronze", "task_completed", "oned_tunneling_regimes", 1, 20],
  ["oned_exponential", "指数律验证者", "完成一维势垒宽度指数律任务。", "core", "e", "silver", "task_completed", "oned_width_exponential", 1, 30],
  ["oned_designer", "势垒设计师", "完成一维多参数反向设计。", "core", "◈", "gold", "task_completed", "oned_inverse_design", 1, 40],
  ["alpha_foundation", "势垒几何分析员", "完成 α 衰变势垒几何任务。", "core", "α", "bronze", "task_completed", "alpha_barrier_geometry", 1, 50],
  ["alpha_quantitative", "核衰变定量研究者", "完成 α 能量与库仑势垒关系任务。", "core", "E", "silver", "task_completed", "alpha_energy_relation", 1, 60],
  ["alpha_designer", "α 穿透设计师", "完成 α 穿透概率反向设计。", "core", "P", "gold", "task_completed", "alpha_inverse_model", 1, 70],
  ["stm_foundation", "电流距离观察员", "完成 STM 距离与隧穿电流任务。", "core", "d", "bronze", "task_completed", "stm_distance_current", 1, 80],
  ["stm_fit", "纳米尺度拟合者", "完成 STM 指数关系定量拟合。", "core", "R²", "silver", "task_completed", "stm_exponential_fit", 1, 90],
  ["stm_designer", "原子表面设计者", "完成 STM 恒流工作点设计。", "core", "◎", "gold", "task_completed", "stm_constant_current_design", 1, 100],
  ["quantitative_researcher", "定量研究者", "完成 3 个定量或反向设计任务。", "core", "Σ", "gold", "task_group_count", "oned_width_exponential,stm_exponential_fit,alpha_energy_relation,oned_inverse_design,alpha_inverse_model,stm_constant_current_design", 3, 110],
  ["all_core_tasks", "九项探究完成者", "完成全部 9 个核心任务。", "core", "9", "gold", "task_count", null, 9, 120],
  ["three_star_researcher", "三星研究者", "获得 3 个三星核心任务。", "core", "★★★", "gold", "task_star_count", null, 3, 130],
  ["flash_explorer", "闪存探索者", "进入并体验闪存隧穿模块。", "extension", "F", "bronze", "module_session_count", "flash", 1, 200],
  ["flash_observer", "闪存观察员", "在闪存模块记录至少 2 个参数状态。", "extension", "I", "silver", "module_snapshot_count", "flash", 2, 210],
  ["rtd_explorer", "共振探索者", "进入并体验共振隧穿模块。", "extension", "R", "bronze", "module_session_count", "rtd", 1, 220],
  ["rtd_observer", "负微分电阻观察员", "在 RTD 模块记录至少 2 个参数状态。", "extension", "N", "silver", "module_snapshot_count", "rtd", 2, 230]
];

async function seedAchievements() {
  for (const item of achievementSeeds) {
    await pool.execute(
      `INSERT INTO achievements
        (code, title, description, category, icon, rarity, criteria_type, criteria_key, target_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        icon = excluded.icon,
        rarity = excluded.rarity,
        criteria_type = excluded.criteria_type,
        criteria_key = excluded.criteria_key,
        target_value = excluded.target_value,
        sort_order = excluded.sort_order,
        is_active = 1`,
      item
    );
  }
}

async function migrateLegacyUsers() {
  for (const user of readLegacyUsers()) {
    if (!user?.username || !user?.passwordHash) continue;
    await pool.execute(
      `INSERT INTO users (username, role, password_hash, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET role = excluded.role, password_hash = excluded.password_hash`,
      [user.username, user.role || "student", user.passwordHash, user.createdAt ? new Date(user.createdAt) : new Date()]
    );
  }
}

async function ensureAdminUser() {
  const [rows] = await pool.execute("SELECT id FROM users WHERE username = ? LIMIT 1", [ADMIN_USERNAME]);
  if (rows.length) {
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [rows[0].id]);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.execute(
    "INSERT INTO users (username, role, password_hash) VALUES (?, 'admin', ?)",
    [ADMIN_USERNAME, passwordHash]
  );
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role || "student",
    createdAt: user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at
  };
}

function signUser(user) {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "7d" });
}

function validateInput(username, password) {
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,32}$/.test(username || "")) {
    return "用户名需为 3-32 位，可包含中文、字母、数字或下划线。";
  }
  if (typeof password !== "string" || password.length < 6) {
    return "密码至少需要 6 位。";
  }
  return "";
}

function trimText(value, maxLength = 4000) {
  return String(value || "").trim().slice(0, maxLength);
}

function safeJson(value, fallback = {}) {
  try {
    const serialized = JSON.stringify(value ?? fallback);
    return serialized.length > 14000 ? JSON.stringify({ truncated: true }) : serialized;
  } catch {
    return JSON.stringify(fallback);
  }
}

function validModule(module) {
  return MODULES.has(module);
}

async function findUser(username) {
  if (!pool) {
    const legacyUser = readLegacyUsers().find(item => item?.username === username);
    if (!legacyUser) return null;
    return {
      id: null,
      username: legacyUser.username,
      role: legacyUser.role || "student",
      password_hash: legacyUser.passwordHash,
      created_at: legacyUser.createdAt || null
    };
  }
  const [rows] = await pool.execute(
    "SELECT id, username, role, password_hash, created_at FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "未登录。" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    req.authUser = await findUser(req.auth.username);
    if (!req.authUser) return res.status(401).json({ error: "用户不存在，请重新登录。" });
    next();
  } catch {
    res.status(401).json({ error: "登录已过期，请重新登录。" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.authUser?.role !== "admin") {
    return res.status(403).json({ error: "只有管理员可以访问教学管理数据。" });
  }
  next();
}

function databaseMiddleware(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: "学习档案数据库尚未连接。",
      detail: databaseError?.message || "请检查 SQLite 数据库文件和 data 目录权限后重启服务。"
    });
  }
  next();
}

async function currentUser(req) {
  return req.authUser || findUser(req.auth.username);
}

function parsePngDataUrl(value) {
  const match = String(value || "").match(/^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  return buffer.length && buffer.length <= 3 * 1024 * 1024 ? buffer : null;
}

function sessionIdFrom(value) {
  const id = trimText(value, 36);
  return /^[A-Za-z0-9-]{16,36}$/.test(id) ? id : null;
}

app.use(express.json({ limit: "4mb" }));

app.post("/api/register", async (req, res) => {
  const username = trimText(req.body.username, 32);
  const password = req.body.password;
  const invalid = validateInput(username, password);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    if (pool) {
      await pool.execute(
        "INSERT INTO users (username, role, password_hash) VALUES (?, 'student', ?)",
        [username, passwordHash]
      );
    } else {
      const users = readLegacyUsers();
      if (users.some(item => item?.username === username)) {
        return res.status(409).json({ error: "该用户名已被注册。" });
      }
      users.push({
        username,
        role: "student",
        passwordHash,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    }
    const user = await findUser(username);
    res.json({ token: signUser(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "该用户名已被注册。" });
    }
    res.status(500).json({ error: "注册失败，请稍后重试。" });
  }
});

app.post("/api/login", async (req, res) => {
  const username = trimText(req.body.username, 32);
  const password = String(req.body.password || "");
  const user = await findUser(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "用户名或密码不正确。" });
  }
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "用户不存在。" });
  res.json({ user: publicUser(user) });
});

app.post("/api/learning/sessions", databaseMiddleware, authMiddleware, async (req, res) => {
  const module = trimText(req.body.module, 16);
  const sessionId = sessionIdFrom(req.body.sessionId);
  if (!validModule(module) || !sessionId) {
    return res.status(400).json({ error: "学习会话参数无效。" });
  }
  const user = await currentUser(req);
  await pool.execute(
    `INSERT INTO learning_sessions (id, user_id, module)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       module = excluded.module,
       last_active_at = CURRENT_TIMESTAMP(3),
       ended_at = NULL,
       status = 'active'`,
    [sessionId, user.id, module]
  );
  res.json({ sessionId, module });
});

app.patch("/api/learning/sessions/:sessionId", databaseMiddleware, authMiddleware, async (req, res) => {
  const sessionId = sessionIdFrom(req.params.sessionId);
  const durationSeconds = Math.max(0, Math.min(Number(req.body.durationSeconds) || 0, 24 * 60 * 60));
  if (!sessionId) return res.status(400).json({ error: "学习会话标识无效。" });
  const user = await currentUser(req);
  const [result] = await pool.execute(
    `UPDATE learning_sessions
     SET duration_seconds = GREATEST(duration_seconds, ?),
         ended_at = CURRENT_TIMESTAMP(3),
         last_active_at = CURRENT_TIMESTAMP(3),
         status = 'completed'
     WHERE id = ? AND user_id = ?`,
    [Math.round(durationSeconds), sessionId, user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "未找到学习会话。" });
  res.json({ ok: true });
});

app.post("/api/learning/events", databaseMiddleware, authMiddleware, async (req, res) => {
  const module = trimText(req.body.module, 16);
  const eventType = trimText(req.body.eventType, 48);
  const sessionId = sessionIdFrom(req.body.sessionId);
  if (!validModule(module) || !eventType) {
    return res.status(400).json({ error: "学习事件参数无效。" });
  }
  const user = await currentUser(req);
  await pool.execute(
    "INSERT INTO learning_events (user_id, session_id, module, event_type, payload) VALUES (?, ?, ?, ?, ?)",
    [user.id, sessionId, module, eventType, safeJson(req.body.payload)]
  );
  res.status(201).json({ ok: true });
});

app.post("/api/learning/snapshots", databaseMiddleware, authMiddleware, async (req, res) => {
  const module = trimText(req.body.module, 16);
  const reason = trimText(req.body.reason, 48) || "parameter_update";
  const sessionId = sessionIdFrom(req.body.sessionId);
  if (!validModule(module)) return res.status(400).json({ error: "实验模块无效。" });

  const user = await currentUser(req);
  let imagePath = null;
  const image = parsePngDataUrl(req.body.imageData);
  if (req.body.imageData && !image) {
    return res.status(400).json({ error: "图片必须是 3MB 以内的 PNG 数据。" });
  }
  if (image) {
    const filename = `${user.id}-${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    imagePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(imagePath, image);
  }

  const [result] = await pool.execute(
    `INSERT INTO experiment_snapshots
      (user_id, session_id, module, reason, parameters, metrics, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      sessionId,
      module,
      reason,
      safeJson(req.body.parameters),
      safeJson(req.body.metrics),
      imagePath ? path.basename(imagePath) : null
    ]
  );
  res.status(201).json({ id: result.insertId, hasImage: Boolean(imagePath) });
});

app.post("/api/learning/tasks", databaseMiddleware, authMiddleware, async (req, res) => {
  const module = trimText(req.body.module, 16);
  const taskId = trimText(req.body.taskId, 64);
  const learningMode = trimText(req.body.learningMode, 16) || "inquiry";
  const status = trimText(req.body.status, 16) || "in_progress";
  const sessionId = sessionIdFrom(req.body.sessionId);
  if (!validModule(module) || !taskId) return res.status(400).json({ error: "学习任务参数无效。" });

  const user = await currentUser(req);
  await pool.execute(
    `INSERT INTO task_attempts
      (user_id, session_id, module, task_id, learning_mode, prediction, explanation, status,
       baseline_metrics, final_metrics, score, stars, task_type, sample_count, evidence_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      sessionId,
      module,
      taskId,
      learningMode,
      trimText(req.body.prediction, 2000) || null,
      trimText(req.body.explanation, 4000) || null,
      status,
      safeJson(req.body.baselineMetrics),
      safeJson(req.body.finalMetrics),
      clampNumber(Number(req.body.score) || 0, 0, 12),
      clampNumber(Number(req.body.stars) || 0, 0, 3),
      trimText(req.body.taskType, 32) || null,
      clampNumber(Number(req.body.sampleCount) || 0, 0, 10000),
      safeJson(req.body.evidence || {})
    ]
  );
  const unlockedAchievements = status === "completed"
    ? await evaluateAchievements(user)
    : [];
  res.status(201).json({ ok: true, unlockedAchievements });
});

app.get("/api/learning/dashboard", databaseMiddleware, authMiddleware, async (req, res) => {
  const user = await currentUser(req);
  const [summaryRows] = await pool.execute(
    `SELECT COUNT(*) AS session_count,
            COALESCE(SUM(duration_seconds), 0) AS total_seconds,
            MAX(last_active_at) AS last_active_at
     FROM learning_sessions WHERE user_id = ?`,
    [user.id]
  );
  const [moduleRows] = await pool.execute(
    `SELECT module, COUNT(*) AS session_count, COALESCE(SUM(duration_seconds), 0) AS total_seconds,
            MAX(last_active_at) AS last_active_at
     FROM learning_sessions WHERE user_id = ?
     GROUP BY module`,
    [user.id]
  );
  const [taskRows] = await pool.execute(
    `SELECT module, task_id, status, score, stars, created_at
     FROM task_attempts WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user.id]
  );
  const [snapshotRows] = await pool.execute(
    `SELECT id, module, reason, parameters, metrics, image_path, created_at
     FROM experiment_snapshots WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 10`,
    [user.id]
  );
  const [eventRows] = await pool.execute(
    `SELECT module, event_type, payload, created_at
     FROM learning_events WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 30`,
    [user.id]
  );
  const [aiRows] = await pool.execute(
    `SELECT module, question, answer, created_at
     FROM ai_conversations WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [user.id]
  );
  const [learningSummaryRows] = await pool.execute(
    `SELECT module, task_id, phenomenon, cause, mastery, review_advice, summary_text, created_at
     FROM learning_summaries WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [user.id]
  );
  const [masteryRows] = await pool.execute(
    `SELECT module, knowledge_point, attempts, correct_attempts, hint_count, mastery_score, updated_at
     FROM knowledge_mastery WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [user.id]
  );

  const completedTasks = new Set(taskRows.filter(row => row.status === "completed").map(row => row.task_id));
  const coreTasks = [
    ["oneD", "oned_tunneling_regimes", "一维方势垒：隧穿区间与经典禁区"],
    ["alpha", "alpha_barrier_geometry", "α 衰变：势垒几何与转折点"],
    ["stm", "stm_distance_current", "STM：距离与隧穿电流"]
  ];
  const nextTask = coreTasks.find(([, taskId]) => !completedTasks.has(taskId));
  const recommendations = nextTask
    ? [{ module: nextTask[0], text: `建议继续完成核心任务“${nextTask[2]}”。` }]
    : [{ module: "flash", text: "核心任务已完成，建议进入闪存隧穿或共振隧穿模块。"}];
  const taskProgress = {};
  taskRows.forEach(row => {
    const previous = taskProgress[row.task_id] || { status: "in_progress", score: 0, stars: 0, attempts: 0 };
    taskProgress[row.task_id] = {
      status: previous.status === "completed" || row.status === "completed" ? "completed" : row.status,
      score: Math.max(previous.score, Number(row.score) || 0),
      stars: Math.max(previous.stars, Number(row.stars) || 0),
      attempts: previous.attempts + 1,
      updated_at: previous.updated_at || row.created_at
    };
  });

  res.json({
    summary: summaryRows[0],
    modules: moduleRows,
    tasks: taskRows.slice(0, 100),
    snapshots: snapshotRows,
    events: eventRows,
    aiConversations: aiRows,
    learningSummaries: learningSummaryRows,
    mastery: masteryRows,
    taskProgress,
    recommendations
  });
});

app.get("/api/learning/snapshots/:id/image", databaseMiddleware, authMiddleware, async (req, res) => {
  const snapshotId = Number(req.params.id);
  if (!Number.isSafeInteger(snapshotId) || snapshotId < 1) return res.status(400).json({ error: "图片标识无效。" });
  const user = await currentUser(req);
  const [rows] = await pool.execute(
    "SELECT image_path FROM experiment_snapshots WHERE id = ? AND user_id = ? LIMIT 1",
    [snapshotId, user.id]
  );
  const filename = rows[0]?.image_path;
  if (!filename) return res.status(404).json({ error: "未找到图片。" });
  const filePath = path.join(UPLOADS_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "图片文件不存在。" });
  res.type("png").sendFile(filePath);
});

function difyKeyForModule(module) {
  const specificEnv = MODULE_DIFY_ENV[module];
  return (specificEnv && process.env[specificEnv]) || process.env.DIFY_API_KEY || "";
}

async function parseDifyStream(response) {
  if (!response.body) throw new Error("Dify 没有返回响应流");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let agentAnswer = "";
  let normalAnswer = "";
  let returnedConversationId = "";

  function processLine(line) {
    const jsonText = line.trim().replace(/^data:\s*/, "");
    if (!jsonText || jsonText === "[DONE]") return;
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return;
    }
    if (data.conversation_id) returnedConversationId = data.conversation_id;
    if (data.event === "agent_message") agentAnswer += data.answer || "";
    if (data.event === "message") normalAnswer += data.answer || "";
    if (data.event === "error") throw new Error(data.message || data.code || "Dify 流式响应发生错误");
  }

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(processLine);
    if (done) break;
  }
  if (buffer.trim()) processLine(buffer);
  return {
    answer: agentAnswer || normalAnswer || "AI 助教没有返回文本回答。",
    conversation_id: returnedConversationId
  };
}

function cleanDifyAnswer(value) {
  return String(value || "")
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function callDifyAgent({ module, query, inputs, conversationId, username }) {
  const apiKey = difyKeyForModule(module);
  if (!apiKey) {
    const error = new Error("尚未配置该模块的 Dify API Key。");
    error.code = "DIFY_KEY_MISSING";
    throw error;
  }
  const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: inputs || {},
      query,
      response_mode: "streaming",
      conversation_id: conversationId || "",
      user: username
    }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) {
    const error = new Error(`Dify API 请求失败（${response.status}）。`);
    error.code = "DIFY_REQUEST_FAILED";
    throw error;
  }
  const result = await parseDifyStream(response);
  result.answer = cleanDifyAnswer(result.answer) || "AI 教学伙伴暂时没有返回有效内容。";
  return result;
}

async function saveAiConversation({ user, module, conversationId, question, answer, metadata = {} }) {
  await pool.execute(
    `INSERT INTO ai_conversations
      (user_id, module, conversation_id, question, answer, session_id, task_id, stage,
       trigger_type, response_type, help_level, context_json, student_feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      module,
      conversationId || null,
      question,
      answer,
      metadata.sessionId || null,
      metadata.taskId || null,
      metadata.stage || null,
      metadata.triggerType || null,
      metadata.responseType || null,
      Number(metadata.helpLevel) || 0,
      JSON.stringify(metadata.context || {}),
      metadata.studentFeedback || null
    ]
  );
}

app.post("/api/ai/chat", databaseMiddleware, authMiddleware, async (req, res) => {
  const module = trimText(req.body.module, 16);
  const query = trimText(req.body.query, 4000);
  const conversationId = trimText(req.body.conversation_id, 128);
  if (!query) return res.status(400).json({ error: "请输入要询问 AI 助教的问题。" });
  if (!validModule(module)) return res.status(400).json({ error: "未知模块，无法选择对应 AI 助教。" });

  try {
    const result = await callDifyAgent({
      module,
      query,
      inputs: req.body.inputs || {},
      conversationId,
      username: req.auth.username
    });
    const user = await currentUser(req);
    const inputs = req.body.inputs || {};
    await saveAiConversation({
      user,
      module,
      conversationId: result.conversation_id || conversationId,
      question: query,
      answer: result.answer,
      metadata: {
        sessionId: inputs.sessionId,
        taskId: inputs.taskId,
        stage: inputs.learningStage || inputs.taskStep,
        triggerType: "student_question",
        responseType: "chat",
        helpLevel: inputs.helpLevel,
        context: inputs
      }
    });
    res.json(result);
  } catch (error) {
    if (error.code === "DIFY_KEY_MISSING") {
      return res.status(503).json({ error: error.message });
    }
    res.status(502).json({ error: `无法连接 Dify：${error.message}` });
  }
});

const tutorModuleNames = {
  oneD: "一维方势垒",
  stm: "STM 应用",
  alpha: "α 衰变",
  flash: "闪存隧穿",
  rtd: "共振隧穿"
};

const tutorKnowledgePoints = {
  oneD: "势垒宽度与透射率",
  stm: "距离对隧穿电流的影响",
  alpha: "α 能量与库仑势垒",
  flash: "栅压与 Fowler-Nordheim 隧穿",
  rtd: "共振能级与负微分电阻"
};

const learningTaskLabels = {
  oned_tunneling_regimes: "1D-1 隧穿区间与经典禁区",
  oned_width_exponential: "1D-2 势垒宽度指数律",
  oned_inverse_design: "1D-3 多参数反向设计",
  alpha_barrier_geometry: "α-1 势垒几何与转折点",
  alpha_energy_relation: "α-2 能量与库仑势垒关系",
  alpha_inverse_model: "α-3 穿透概率反向设计",
  stm_distance_current: "STM-1 距离与隧穿电流",
  stm_exponential_fit: "STM-2 指数关系定量拟合",
  stm_constant_current_design: "STM-3 恒流工作点设计"
};

function tutorFallbackMessage(payload) {
  const responseType = payload.responseType;
  const taskTitle = trimText(payload.taskTitle, 120);
  const predictionQuestion = trimText(payload.predictionQuestion, 500);
  const parameterLabel = trimText(payload.parameterLabel, 80);
  const direction = payload.direction === "decrease" ? "减小" : payload.direction === "increase" ? "增大" : "调整";
  const expectedEffect = trimText(payload.expectedEffect, 240);
  const beforeMetrics = payload.beforeMetrics || {};
  const afterMetrics = payload.afterMetrics || {};
  const passed = Boolean(payload.passed);
  const predictionCorrect = Boolean(payload.predictionCorrect);
  const hintText = trimText(payload.hintText, 1000);
  const hintLevel = clampNumber(Number(payload.hintLevel) || 0, 0, 3);

  if (responseType === "prediction_prompt") {
    return `先不要急着操作。${predictionQuestion || `请预测${taskTitle || "这次实验"}的结果，并说明你的理由。`}`;
  }
  if (responseType === "probe") {
    return `你刚刚${direction}了${parameterLabel || "一个关键参数"}。先预测结果会怎样变化${expectedEffect ? `，重点观察${expectedEffect}` : ""}。`;
  }
  if (responseType === "observe_prompt") {
    return "预测已经记录。现在一次只改变一个关键参数，观察图像和数值是否朝你的预测方向发展。";
  }
  if (responseType === "hint") {
    return hintText || `这是第 ${Math.max(1, hintLevel)} 层提示：先比较调整前后的关键数值，再判断变化是否符合指数规律。`;
  }
  if (responseType === "feedback") {
    if (passed && predictionCorrect) {
      return "任务已经达成，而且你的预测方向正确。请用一句话解释参数变化为什么会导致这个结果。";
    }
    if (passed) {
      return "任务已经达成，但预测与最终结果不完全一致。请比较起始值、当前值和变化方向，找出预测偏差的来源。";
    }
    return `当前还没有达到目标。起始状态是 ${JSON.stringify(beforeMetrics)}，当前状态是 ${JSON.stringify(afterMetrics)}。先只调整一个关键参数，并观察它是否让结果持续向目标靠近。`;
  }
  return "先根据当前参数提出一个可验证的预测，再调整一个变量并观察结果。";
}

function tutorQueryFor(payload) {
  const moduleName = tutorModuleNames[payload.module] || payload.module;
  const common = [
    `模块：${moduleName}`,
    `学习阶段：${trimText(payload.learningStage, 40) || trimText(payload.taskStep, 40)}`,
    `任务：${trimText(payload.taskTitle, 160)}`,
    `任务目标：${trimText(payload.taskGoal, 500)}`,
    `任务类型：${trimText(payload.taskType, 60) || "自由探究"}`,
    `证据采样：${Number(payload.sampleCount) || 0}/${Number(payload.sampleTarget) || 0}`,
    `当前评分：${payload.score == null ? "未评分" : `${Number(payload.score)}/12`}`,
    `当前星级：${Number(payload.stars) || 0}`,
    `任务反馈：${trimText(payload.taskFeedback, 800)}`,
    `学生预测：${trimText(payload.prediction, 500) || "未提交"}`,
    `调整参数：${trimText(payload.parameterLabel, 80)}`,
    `调整方向：${payload.direction || "unknown"}`,
    `调整前结果：${JSON.stringify(payload.beforeMetrics || {})}`,
    `调整后结果：${JSON.stringify(payload.afterMetrics || {})}`,
    `当前结果：${JSON.stringify(payload.currentMetrics || {})}`,
    `图像与物理解释摘要：${trimText(payload.plotSummary, 1200) || "无"}`
  ].join("\n");

  if (payload.responseType === "probe") {
    return `${common}

请像教学导师一样回应。不要直接说出答案，只根据参数变化提出一个简短的预测问题或观察提醒。控制在 90 字以内。`;
  }
  if (payload.responseType === "prediction_prompt") {
    return `${common}

请用一句话引导学生先提出预测和理由，不要提前解释结论。控制在 70 字以内。`;
  }
  if (payload.responseType === "feedback") {
    return `${common}
学生已点击检查任务，判定结果：${payload.passed ? "达成" : "未达成"}。
预测是否正确：${payload.predictionCorrect ? "正确" : "不正确"}。
请依次指出现象、证据是否充分、物理原因和下一步行动。未达成时不要直接给完整答案，先用认知冲突引导，控制在 180 字以内。`;
  }
  if (payload.responseType === "hint") {
    return `${common}
当前请求第 ${Number(payload.hintLevel) || 1} 层提示。
候选提示：${trimText(payload.hintText, 1000)}
请保留提示层级：第 1 层只给方向，第 2 层给物理关系，第 3 层才给完整操作思路。控制在 120 字以内。`;
  }
  if (payload.responseType === "summary") {
    return `${common}
学生已提交解释：${trimText(payload.explanation, 1000)}
请生成实验小结，严格按要求分成“主要现象”“物理原因”“掌握情况”“复习建议”四部分，每部分一句话。不要编造数据。`;
  }
  return `${common}

请以${moduleName}教学伙伴的身份，引导学生在预测、操作、观察、解释和反思之间继续前进。控制在 140 字以内。`;
}

function buildSummaryComponents(payload) {
  const beforeMetrics = payload.beforeMetrics || {};
  const afterMetrics = payload.afterMetrics || {};
  const passed = Boolean(payload.passed);
  const predictionCorrect = Boolean(payload.predictionCorrect);
  const hintLevel = clampNumber(Number(payload.hintLevel) || 0, 0, 3);
  const phenomenon = `起始结果：${beforeMetrics.snapshot || JSON.stringify(beforeMetrics)}；当前结果：${afterMetrics.snapshot || JSON.stringify(afterMetrics)}。`;
  const cause = trimText(payload.referenceExplanation, 1000)
    || "参数改变会改变波函数在禁阻区的衰减程度，因此透射概率或隧穿电流随之变化。";
  const mastery = passed && predictionCorrect && hintLevel <= 1
    ? "预测与实验结果一致，能够在少量提示下完成任务，当前掌握情况较好。"
    : passed
      ? "任务已经完成，但预测或解释仍需结合参数与结果进一步校准。"
      : "任务尚未完成，建议先验证关键参数对结果的单调影响。";
  const reviewAdvice = hintLevel >= 2
    ? "复习指数衰减关系，并重新完成一次“只改变一个变量”的对照观察。"
    : "复习关键公式，并尝试把本次现象推广到另一个参数变化。";
  return { phenomenon, cause, mastery, reviewAdvice };
}

function summaryTextFromComponents(components) {
  return [
    `主要现象：${components.phenomenon}`,
    `物理原因：${components.cause}`,
    `掌握情况：${components.mastery}`,
    `复习建议：${components.reviewAdvice}`
  ].join("\n");
}

async function updateKnowledgeMastery(user, payload, components) {
  const module = payload.module;
  const knowledgePoint = tutorKnowledgePoints[module] || "量子隧穿基础";
  const hintLevel = clampNumber(Number(payload.hintLevel) || 0, 0, 3);
  const correct = Boolean(payload.passed && payload.predictionCorrect);
  const [rows] = await pool.execute(
    `SELECT attempts, correct_attempts, hint_count, mastery_score
     FROM knowledge_mastery
     WHERE user_id = ? AND module = ? AND knowledge_point = ?
     LIMIT 1`,
    [user.id, module, knowledgePoint]
  );
  const previous = rows[0] || { attempts: 0, correct_attempts: 0, hint_count: 0, mastery_score: 0 };
  const attempts = Number(previous.attempts) + 1;
  const correctAttempts = Number(previous.correct_attempts) + (correct ? 1 : 0);
  const hintCount = Number(previous.hint_count) + hintLevel;
  const sessionScore = clampNumber(
    70 + (payload.passed ? 20 : 0) + (correct ? 10 : 0) - hintLevel * 8,
    0,
    100
  );
  const masteryScore = (
    Number(previous.mastery_score || 0) * Number(previous.attempts || 0) + sessionScore
  ) / attempts;
  await pool.execute(
    `INSERT INTO knowledge_mastery
      (user_id, module, knowledge_point, attempts, correct_attempts, hint_count, mastery_score)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, module, knowledge_point) DO UPDATE SET
      attempts = excluded.attempts,
      correct_attempts = excluded.correct_attempts,
      hint_count = excluded.hint_count,
      mastery_score = excluded.mastery_score,
      updated_at = CURRENT_TIMESTAMP`,
    [user.id, module, knowledgePoint, attempts, correctAttempts, hintCount, masteryScore.toFixed(2)]
  );
  return {
    knowledgePoint,
    attempts,
    correctAttempts,
    hintCount,
    masteryScore: Number(masteryScore.toFixed(2)),
    text: components.mastery
  };
}

app.post("/api/tutor/events", databaseMiddleware, authMiddleware, async (req, res) => {
  const allowedEvents = new Set([
    "module_opened",
    "prediction_submitted",
    "parameter_changed",
    "task_checked",
    "task_completed",
    "hint_requested",
    "session_finished"
  ]);
  const allowedResponses = new Set([
    "prediction_prompt",
    "probe",
    "observe_prompt",
    "feedback",
    "hint",
    "summary",
    "reflection"
  ]);
  const module = trimText(req.body.module, 16);
  const eventType = trimText(req.body.eventType, 48);
  const responseType = trimText(req.body.responseType, 24) || "reflection";
  if (!validModule(module)) return res.status(400).json({ error: "未知模块。" });
  if (!allowedEvents.has(eventType)) return res.status(400).json({ error: "未知教学事件。" });
  if (!allowedResponses.has(responseType)) return res.status(400).json({ error: "未知教学响应类型。" });

  const payload = {
    ...req.body,
    module,
    eventType,
    responseType,
    learningStage: trimText(req.body.learningStage, 40),
    taskStep: trimText(req.body.taskStep, 40),
    taskId: trimText(req.body.taskId, 64),
    taskTitle: trimText(req.body.taskTitle, 160),
    taskGoal: trimText(req.body.taskGoal, 800),
    prediction: trimText(req.body.prediction, 800),
    explanation: trimText(req.body.explanation, 1600),
    referenceExplanation: trimText(req.body.referenceExplanation, 1600),
    parameterLabel: trimText(req.body.parameterLabel, 80),
    expectedEffect: trimText(req.body.expectedEffect, 240),
    hintText: trimText(req.body.hintText, 1200),
    plotSummary: trimText(req.body.plotSummary, 1200),
    context: req.body.context || {}
  };
  const user = await currentUser(req);
  const fallback = tutorFallbackMessage(payload);
  let result = { answer: fallback, conversation_id: trimText(req.body.conversation_id, 128) };
  let source = "template";

  try {
    result = await callDifyAgent({
      module,
      query: tutorQueryFor(payload),
      inputs: {
        responseType,
        learningStage: payload.learningStage,
        taskId: payload.taskId,
        taskTitle: payload.taskTitle,
        taskGoal: payload.taskGoal,
        prediction: payload.prediction,
        parameterDelta: JSON.stringify(payload.context.parameterDelta || {}),
        metricsBefore: JSON.stringify(payload.beforeMetrics || {}),
        metricsAfter: JSON.stringify(payload.afterMetrics || {}),
        currentMetrics: JSON.stringify(payload.currentMetrics || {}),
        allowedAnswerLevel: String(payload.hintLevel || 0),
        studentQuestion: ""
      },
      conversationId: req.body.conversation_id,
      username: req.auth.username
    });
    source = "dify";
  } catch {
    result = { answer: fallback, conversation_id: req.body.conversation_id || "" };
  }

  let summary = null;
  let mastery = null;
  if (responseType === "summary" || eventType === "task_completed" || eventType === "session_finished") {
    summary = buildSummaryComponents(payload);
    const summaryText = `主要现象：${summary.phenomenon}\n物理原因：${summary.cause}\n掌握情况：${summary.mastery}\n复习建议：${summary.reviewAdvice}`;
    if (source === "dify" && result.answer) result.answer = result.answer;
    else result.answer = summaryText;
    await pool.execute(
      `INSERT INTO learning_summaries
        (user_id, session_id, module, task_id, phenomenon, cause, mastery, review_advice, summary_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        trimText(req.body.sessionId, 36) || null,
        module,
        payload.taskId || null,
        summary.phenomenon,
        summary.cause,
        summary.mastery,
        summary.reviewAdvice,
        result.answer || summaryText
      ]
    );
    mastery = await updateKnowledgeMastery(user, payload, summary);
  }

  await saveAiConversation({
    user,
    module,
    conversationId: result.conversation_id,
    question: `[${eventType}] ${payload.taskTitle || tutorModuleNames[module] || module}`,
    answer: result.answer,
    metadata: {
      sessionId: payload.sessionId,
      taskId: payload.taskId,
      stage: payload.learningStage || payload.taskStep,
      triggerType: eventType,
      responseType,
      helpLevel: payload.hintLevel,
      context: payload.context,
      studentFeedback: payload.studentFeedback
    }
  });

  res.json({
    answer: result.answer,
    message: result.answer,
    conversation_id: result.conversation_id || "",
    source,
    stage: payload.learningStage || payload.taskStep || "",
    help_level: Number(payload.hintLevel) || 0,
    summary,
    mastery
  });
});

app.post("/api/feedback", databaseMiddleware, authMiddleware, async (req, res) => {
  const allowedModules = new Set(["general", "oneD", "alpha", "stm", "flash", "rtd"]);
  const allowedCategories = new Set(["teaching", "usability", "content", "feature", "other"]);
  const module = allowedModules.has(req.body.module) ? req.body.module : "general";
  const category = allowedCategories.has(req.body.category) ? req.body.category : "other";
  const rating = clampNumber(Math.round(Number(req.body.rating)), 1, 5);
  const message = trimText(req.body.message, 1200);
  if (!message) return res.status(400).json({ error: "请填写反馈内容。" });
  const user = await currentUser(req);
  const [result] = await pool.execute(
    `INSERT INTO user_feedback
      (user_id, module, category, rating, message, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, module, category, rating, message, req.body.isAnonymous ? 1 : 0]
  );
  res.status(201).json({ ok: true, id: result.insertId });
});

app.get("/api/feedback/mine", databaseMiddleware, authMiddleware, async (req, res) => {
  const user = await currentUser(req);
  const [rows] = await pool.execute(
    `SELECT id, module, category, rating, message, is_anonymous, status, admin_note, created_at, updated_at
     FROM user_feedback
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 30`,
    [user.id]
  );
  res.json({ feedback: rows });
});

async function evaluateAchievements(user) {
  const [taskRows] = await pool.execute(
    `SELECT task_id, MAX(score) AS score, MAX(stars) AS stars
     FROM task_attempts
     WHERE user_id = ? AND status = 'completed'
     GROUP BY task_id`,
    [user.id]
  );
  const [eventRows] = await pool.execute(
    `SELECT event_type, COUNT(*) AS count
     FROM learning_events
     WHERE user_id = ?
     GROUP BY event_type`,
    [user.id]
  );
  const [sessionRows] = await pool.execute(
    `SELECT module, COUNT(*) AS count
     FROM learning_sessions
     WHERE user_id = ?
     GROUP BY module`,
    [user.id]
  );
  const [snapshotRows] = await pool.execute(
    `SELECT module, COUNT(*) AS count
     FROM experiment_snapshots
     WHERE user_id = ?
     GROUP BY module`,
    [user.id]
  );
  const [achievements] = await pool.query(
    "SELECT * FROM achievements WHERE is_active = 1 ORDER BY sort_order, id"
  );
  const [existingRows] = await pool.execute(
    "SELECT achievement_id, status, progress_current, progress_target, unlocked_at FROM user_achievements WHERE user_id = ?",
    [user.id]
  );
  const completedTasks = new Map(taskRows.map(row => [row.task_id, row]));
  const eventCounts = new Map(eventRows.map(row => [row.event_type, Number(row.count) || 0]));
  const sessionCounts = new Map(sessionRows.map(row => [row.module, Number(row.count) || 0]));
  const snapshotCounts = new Map(snapshotRows.map(row => [row.module, Number(row.count) || 0]));
  const existing = new Map(existingRows.map(row => [Number(row.achievement_id), row]));
  const newlyUnlocked = [];

  for (const achievement of achievements) {
    const target = Number(achievement.target_value) || 1;
    const key = achievement.criteria_key || "";
    let progress = 0;
    if (achievement.criteria_type === "task_completed") {
      progress = completedTasks.has(key) ? 1 : 0;
    } else if (achievement.criteria_type === "task_group_count") {
      progress = key.split(",").filter(taskId => completedTasks.has(taskId)).length;
    } else if (achievement.criteria_type === "task_count") {
      progress = completedTasks.size;
    } else if (achievement.criteria_type === "task_star_count") {
      progress = taskRows.filter(row => Number(row.stars) >= 3).length;
    } else if (achievement.criteria_type === "event_count") {
      progress = eventCounts.get(key) || 0;
    } else if (achievement.criteria_type === "module_session_count") {
      progress = sessionCounts.get(key) || 0;
    } else if (achievement.criteria_type === "module_snapshot_count") {
      progress = snapshotCounts.get(key) || 0;
    }
    const status = progress >= target ? "unlocked" : "in_progress";
    const wasUnlocked = existing.get(Number(achievement.id))?.status === "unlocked";
    await pool.execute(
      `INSERT INTO user_achievements
        (user_id, achievement_id, progress_current, progress_target, status, unlocked_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, achievement_id) DO UPDATE SET
        progress_current = MAX(user_achievements.progress_current, excluded.progress_current),
        progress_target = excluded.progress_target,
        status = CASE WHEN user_achievements.status = 'unlocked' THEN 'unlocked' ELSE excluded.status END,
        unlocked_at = CASE WHEN user_achievements.status = 'unlocked' THEN user_achievements.unlocked_at ELSE excluded.unlocked_at END,
        updated_at = CURRENT_TIMESTAMP`,
      [
        user.id,
        achievement.id,
        Math.min(progress, target),
        target,
        status,
        status === "unlocked" ? new Date() : null
      ]
    );
    if (status === "unlocked" && !wasUnlocked) {
      newlyUnlocked.push({
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rarity: achievement.rarity
      });
    }
  }
  return newlyUnlocked;
}

app.get("/api/achievements", databaseMiddleware, authMiddleware, async (req, res) => {
  const user = await currentUser(req);
  const unlocked = await evaluateAchievements(user);
  const [rows] = await pool.execute(
    `SELECT a.id, a.code, a.title, a.description, a.category, a.icon, a.rarity,
            a.criteria_type, a.criteria_key, a.target_value,
            COALESCE(ua.progress_current, 0) AS progress_current,
            COALESCE(ua.progress_target, a.target_value) AS progress_target,
            COALESCE(ua.status, 'in_progress') AS status,
            ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua
       ON ua.achievement_id = a.id AND ua.user_id = ?
     WHERE a.is_active = 1
     ORDER BY a.sort_order, a.id`,
    [user.id]
  );
  res.json({
    achievements: rows,
    unlocked: unlocked.length,
    newlyUnlocked: unlocked
  });
});

app.get("/api/admin/overview", databaseMiddleware, authMiddleware, adminMiddleware, async (req, res) => {
  const [[studentCount]] = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE role <> 'admin'"
  );
  const [[activeUsers]] = await pool.query(
    "SELECT COUNT(DISTINCT user_id) AS count FROM learning_sessions WHERE last_active_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
  );
  const [[sessionStats]] = await pool.query(
    `SELECT COUNT(*) AS sessions,
            COUNT(DISTINCT s.user_id) AS learners,
            COALESCE(SUM(s.duration_seconds), 0) AS total_seconds
     FROM learning_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE u.role <> 'admin'`
  );
  const [[taskStats]] = await pool.query(
    `SELECT COUNT(*) AS attempts,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.user_id END) AS completed_users
     FROM task_attempts t
     JOIN users u ON u.id = t.user_id
     WHERE u.role <> 'admin'`
  );
  const [[taskQualityStats]] = await pool.query(
    `SELECT COALESCE(AVG(t.score), 0) AS average_score,
            COALESCE(AVG(t.stars), 0) AS average_stars,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_attempts,
            SUM(CASE WHEN t.status = 'completed' AND t.sample_count >= 5 THEN 1 ELSE 0 END) AS evidence_qualified
     FROM task_attempts t
     JOIN users u ON u.id = t.user_id
     WHERE u.role <> 'admin'`
  );
  const [taskRows] = await pool.query(
    `SELECT t.task_id,
            t.module,
            COUNT(*) AS attempts,
            COUNT(DISTINCT t.user_id) AS users,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
            COALESCE(AVG(t.score), 0) AS average_score,
            COALESCE(AVG(t.stars), 0) AS average_stars,
            COALESCE(AVG(t.sample_count), 0) AS average_samples,
            SUM(CASE WHEN t.status = 'completed' AND t.stars >= 3 THEN 1 ELSE 0 END) AS three_star_count
     FROM task_attempts t
     JOIN users u ON u.id = t.user_id
     WHERE u.role <> 'admin'
     GROUP BY t.task_id, t.module
     ORDER BY t.module, t.task_id`
  );
  const [[achievementStats]] = await pool.query(
    `SELECT COUNT(*) AS unlocked,
            COUNT(DISTINCT ua.user_id) AS users,
            SUM(CASE WHEN a.category = 'extension' THEN 1 ELSE 0 END) AS extension_unlocked
     FROM user_achievements ua
     JOIN users u ON u.id = ua.user_id
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE u.role <> 'admin' AND ua.status = 'unlocked'`
  );
  const [[aiStats]] = await pool.query(
    `SELECT COUNT(*) AS conversations,
            COUNT(DISTINCT a.user_id) AS users
     FROM ai_conversations a
     JOIN users u ON u.id = a.user_id
     WHERE u.role <> 'admin'`
  );
  const [[feedbackStats]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
            COALESCE(AVG(rating), 0) AS average_rating
     FROM user_feedback`
  );
  const [moduleRows] = await pool.query(
    `SELECT s.module,
            COUNT(DISTINCT s.user_id) AS users,
            COUNT(*) AS sessions,
            COALESCE(SUM(s.duration_seconds), 0) AS total_seconds,
            (SELECT COUNT(DISTINCT t.user_id)
             FROM task_attempts t
             WHERE t.module = s.module AND t.status = 'completed') AS completed_users
     FROM learning_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE u.role <> 'admin'
     GROUP BY s.module
     ORDER BY sessions DESC`
  );
  const [userRows] = await pool.query(
    `SELECT u.id,
            u.username,
            u.created_at,
            (SELECT COUNT(*) FROM learning_sessions s WHERE s.user_id = u.id) AS session_count,
            COALESCE((SELECT SUM(s.duration_seconds) FROM learning_sessions s WHERE s.user_id = u.id), 0) AS total_seconds,
            (SELECT COUNT(DISTINCT t.task_id) FROM task_attempts t WHERE t.user_id = u.id AND t.status = 'completed') AS completed_tasks,
            COALESCE((SELECT GROUP_CONCAT(DISTINCT t.task_id ORDER BY t.task_id) FROM task_attempts t WHERE t.user_id = u.id AND t.status = 'completed'), '') AS completed_task_ids,
            (SELECT COUNT(DISTINCT t.module) FROM task_attempts t WHERE t.user_id = u.id AND t.status = 'completed') AS completed_modules,
            (SELECT COUNT(*) FROM task_attempts t WHERE t.user_id = u.id AND t.status = 'completed' AND t.stars >= 3) AS three_star_tasks,
            COALESCE((SELECT AVG(t.score) FROM task_attempts t WHERE t.user_id = u.id AND t.status = 'completed'), 0) AS average_task_score,
            (SELECT COUNT(DISTINCT t.task_id)
             FROM task_attempts t
             WHERE t.user_id = u.id
               AND t.status = 'completed'
               AND t.task_id IN ('oned_tunneling_regimes', 'alpha_barrier_geometry', 'stm_distance_current')) AS core_tasks,
            COALESCE((SELECT AVG(k.mastery_score) FROM knowledge_mastery k WHERE k.user_id = u.id), 0) AS mastery_score,
            (SELECT MAX(s.last_active_at) FROM learning_sessions s WHERE s.user_id = u.id) AS last_active_at,
            (SELECT COUNT(*) FROM ai_conversations a WHERE a.user_id = u.id) AS ai_count,
            (SELECT COUNT(*) FROM learning_summaries ls WHERE ls.user_id = u.id) AS summary_count
     FROM users u
     WHERE u.role <> 'admin'
     ORDER BY last_active_at DESC, u.created_at DESC`
  );
  res.json({
    metrics: {
      students: Number(studentCount.count) || 0,
      activeUsers: Number(activeUsers.count) || 0,
      sessions: Number(sessionStats.sessions) || 0,
      learners: Number(sessionStats.learners) || 0,
      totalSeconds: Number(sessionStats.total_seconds) || 0,
      taskAttempts: Number(taskStats.attempts) || 0,
      completedTasks: Number(taskStats.completed) || 0,
      completedTaskUsers: Number(taskStats.completed_users) || 0,
      averageTaskScore: Number(taskQualityStats.average_score) || 0,
      averageTaskStars: Number(taskQualityStats.average_stars) || 0,
      evidenceQualified: Number(taskQualityStats.evidence_qualified) || 0,
      aiConversations: Number(aiStats.conversations) || 0,
      aiUsers: Number(aiStats.users) || 0,
      feedbackCount: Number(feedbackStats.total) || 0,
      newFeedback: Number(feedbackStats.new_count) || 0,
      averageRating: Number(feedbackStats.average_rating) || 0,
      unlockedAchievements: Number(achievementStats.unlocked) || 0,
      achievementUsers: Number(achievementStats.users) || 0,
      extensionAchievements: Number(achievementStats.extension_unlocked) || 0
    },
    modules: moduleRows,
    taskStats: taskRows.map(row => ({
      ...row,
      title: learningTaskLabels[row.task_id] || row.task_id,
      completionRate: Number(row.attempts) ? Number(row.completed) / Number(row.attempts) : 0
    })),
    users: userRows
  });
});

app.get("/api/admin/feedback", databaseMiddleware, authMiddleware, adminMiddleware, async (req, res) => {
  const status = trimText(req.query.status, 16);
  const allowedStatuses = new Set(["new", "read", "resolved"]);
  const where = allowedStatuses.has(status) ? "WHERE f.status = ?" : "";
  const params = allowedStatuses.has(status) ? [status] : [];
  const [rows] = await pool.execute(
    `SELECT f.id, f.module, f.category, f.rating, f.message, f.is_anonymous, f.status,
            f.admin_note, f.created_at, f.updated_at,
            CASE WHEN f.is_anonymous = 1 THEN '匿名用户' ELSE u.username END AS display_name
     FROM user_feedback f
     JOIN users u ON u.id = f.user_id
     ${where}
     ORDER BY CASE f.status WHEN 'new' THEN 1 WHEN 'read' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END, f.created_at DESC
     LIMIT 100`,
    params
  );
  res.json({ feedback: rows });
});

app.patch("/api/admin/feedback/:id", databaseMiddleware, authMiddleware, adminMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const allowedStatuses = new Set(["new", "read", "resolved"]);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "反馈编号无效。" });
  if (!allowedStatuses.has(req.body.status)) return res.status(400).json({ error: "反馈状态无效。" });
  const adminNote = trimText(req.body.adminNote, 2000) || null;
  const [result] = await pool.execute(
    `UPDATE user_feedback
     SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [req.body.status, adminNote, id]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "未找到这条反馈。" });
  res.json({ ok: true });
});

const distDir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => res.sendFile(path.join(distDir, "index.html")));
} else {
  app.use(express.static(publicDir));
  app.use((req, res) => {
    if (req.path === "/") return res.redirect("/legacy/index.html");
    res.status(404).send("Not found");
  });
}

initializeDatabase()
  .then(() => console.log(`SQLite learning archive ready: ${SQLITE_FILE}`))
  .catch(error => {
    databaseError = error;
    console.error("SQLite initialization failed:", error.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Quantum tunneling platform backend: http://127.0.0.1:${PORT}`);
    });
  });
