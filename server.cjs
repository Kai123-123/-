
require("dotenv").config();
                                 const fs = require("fs");
                                 const path = require("path");
                                 const express = require("express");
                                 const bcrypt = require("bcryptjs");
                                 const jwt = require("jsonwebtoken");

                                 function loadLocalEnv() {
                                   const envPath = path.join(__dirname, ".env");
                                   if (!fs.existsSync(envPath)) return;
                                   const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
                                   for (const line of lines) {
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
                                 const MODULE_DIFY_ENV = {
                                   oneD: "DIFY_API_KEY_ONED",
                                   stm: "DIFY_API_KEY_STM",
                                   alpha: "DIFY_API_KEY_ALPHA",
                                   flash: "DIFY_API_KEY_FLASH",
                                   rtd: "DIFY_API_KEY_RTD"
                                 };

                                 function ensureStore() {
                                   if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
                                   if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
                                 }

                                 function readUsers() {
                                   ensureStore();
                                   return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
                                 }

                                 function writeUsers(users) {
                                   ensureStore();
                                   fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
                                 }

                                 function publicUser(user) {
                                   return { username: user.username, role: user.role || "student", createdAt: user.createdAt };
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

                                 function authMiddleware(req, res, next) {
                                   const header = req.headers.authorization || "";
                                   const token = header.startsWith("Bearer ") ? header.slice(7) : "";
                                   if (!token) return res.status(401).json({ error: "未登录。" });
                                   try {
                                     req.auth = jwt.verify(token, JWT_SECRET);
                                     next();
                                   } catch {
                                     res.status(401).json({ error: "登录已过期，请重新登录。" });
                                   }
                                 }

                                 app.use(express.json({ limit: "64kb" }));

                                 async function ensureAdminUser() {
                                   const users = readUsers();
                                   const existing = users.find(user => user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase());
                                   if (existing) {
                                     if (existing.role !== "admin") {
                                       existing.role = "admin";
                                       writeUsers(users);
                                     }
                                     return;
                                   }
                                   users.push({
                                     username: ADMIN_USERNAME,
                                     role: "admin",
                                     passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
                                     createdAt: new Date().toISOString()
                                   });
                                   writeUsers(users);
                                 }

                                 app.post("/api/register", async (req, res) => {
                                   const username = String(req.body.username || "").trim();
                                   const password = req.body.password;
                                   const invalid = validateInput(username, password);
                                   if (invalid) return res.status(400).json({ error: invalid });

                                   const users = readUsers();
                                   if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
                                     return res.status(409).json({ error: "该用户名已被注册。" });
                                   }

                                   const user = {
                                     username,
                                     role: "student",
                                     passwordHash: await bcrypt.hash(password, 10),
                                     createdAt: new Date().toISOString()
                                   };
                                   users.push(user);
                                   writeUsers(users);
                                   res.json({ token: signUser(user), user: publicUser(user) });
                                 });

                                 app.post("/api/login", async (req, res) => {
                                   const username = String(req.body.username || "").trim();
                                   const password = req.body.password || "";
                                   const users = readUsers();
                                   const user = users.find(item => item.username.toLowerCase() === username.toLowerCase());
                                   if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
                                     return res.status(401).json({ error: "用户名或密码不正确。" });
                                   }
                                   res.json({ token: signUser(user), user: publicUser(user) });
                                 });

                                 app.get("/api/me", authMiddleware, (req, res) => {
                                   const users = readUsers();
                                   const user = users.find(item => item.username === req.auth.username);
                                   if (!user) return res.status(401).json({ error: "用户不存在。" });
                                   res.json({ user: publicUser(user) });
                                 });

                                 function difyKeyForModule(module) {
                                   const specificEnv = MODULE_DIFY_ENV[module];
                                   return (specificEnv && process.env[specificEnv]) || process.env.DIFY_API_KEY || "";
                                 }

                                 function trimForPrompt(value, maxLength = 14000) {
                                   const text = typeof value === "string" ? value : JSON.stringify(value ?? {});
                                   return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
                                 }
                             async function parseDifyStream(response) {
                               if (!response.body) {
                                 throw new Error("Dify 没有返回响应流");
                               }

                               const reader = response.body.getReader();
                               const decoder = new TextDecoder("utf-8");

                               let buffer = "";
                               let agentAnswer = "";
                               let normalAnswer = "";
                               let returnedConversationId = "";
                               let messageId = "";

                               function processLine(line) {
                                 const trimmed = line.trim();

                                 if (!trimmed.startsWith("data:")) {
                                   return;
                                 }

                                 const jsonText = trimmed.slice(5).trim();

                                 if (!jsonText || jsonText === "[DONE]") {
                                   return;
                                 }

                                 let data;

                                 try {
                                   data = JSON.parse(jsonText);
                                 } catch {
                                   console.warn("无法解析 Dify 数据：", jsonText);
                                   return;
                                 }

                                 if (data.conversation_id) {
                                   returnedConversationId = data.conversation_id;
                                 }

                                 if (data.message_id) {
                                   messageId = data.message_id;
                                 }

                                 if (data.event === "agent_message") {
                                   agentAnswer += data.answer || "";
                                 }

                                 if (data.event === "message") {
                                   normalAnswer += data.answer || "";
                                 }

                                 if (data.event === "error") {
                                   throw new Error(
                                     data.message || data.code || "Dify 流式响应发生错误"
                                   );
                                 }
                               }

                               while (true) {
                                 const { value, done } = await reader.read();

                                 if (value) {
                                   buffer += decoder.decode(value, { stream: !done });
                                 }

                                 const lines = buffer.split(/\r?\n/);
                                 buffer = lines.pop() || "";

                                 for (const line of lines) {
                                   processLine(line);
                                 }

                                 if (done) {
                                   break;
                                 }
                               }

                               if (buffer.trim()) {
                                 processLine(buffer);
                               }

                               return {
                                 answer: agentAnswer || normalAnswer || "AI 助教没有返回文本回答。",
                                 conversation_id: returnedConversationId,
                                 message_id: messageId
                               };
                             }

                                 app.post("/api/ai/chat", authMiddleware, async (req, res) => {
                                   const module = String(req.body.module || "").trim();
                                   const query = String(req.body.query || "").trim();
                                   const conversationId = String(req.body.conversation_id || "").trim();
                                   if (!query) return res.status(400).json({ error: "请输入要询问 AI 助教的问题。" });
                                   if (!MODULE_DIFY_ENV[module]) return res.status(400).json({ error: "未知模块，无法选择对应 AI 助教。" });

                                   const apiKey = difyKeyForModule(module);
                                   if (!apiKey) {
                                     const envName = MODULE_DIFY_ENV[module];
                                     return res.status(503).json({
                                       error: `尚未配置 Dify API Key。请在 web-vue/.env 中设置 ${envName}=你的Dify应用Key，或设置 DIFY_API_KEY 作为通用助手 Key。`
                                     });
                                   }

                                   try {
                                     const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
                                       method: "POST",
                                       headers: {
                                         Authorization: `Bearer ${apiKey}`,
                                         "Content-Type": "application/json"
                                       },
                                       body: JSON.stringify({
                                         inputs: req.body.inputs || {},
                                         query: trimForPrompt(query, 4000),
                                         response_mode: "streaming",
        conversation_id: conversationId,
        user: req.auth.username
      })
    });
    if (!response.ok) {
      const errorText = await response.text();

      console.error("Dify API 请求失败：", errorText);

      return res.status(response.status).json({
        error: "Dify API 请求失败",
        details: errorText
      });
    }

    const result = await parseDifyStream(response);

    return res.json(result);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { answer: text };
    }
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || data.error || "Dify 助教请求失败。",
        detail: data
      });
    }
    res.json({
      answer: data.answer || data.data?.answer || "",
      conversation_id: data.conversation_id || conversationId || "",
      raw: data
    });
  } catch (err) {
    res.status(502).json({ error: `无法连接 Dify：${err.message}` });
  }
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

ensureAdminUser().then(() => {
  app.listen(PORT, () => {
    console.log(`Quantum tunneling platform backend: http://127.0.0.1:${PORT}`);
    console.log(`Default admin account: ${ADMIN_USERNAME}`);
  });
}).catch(err => {
  console.error("Failed to initialize admin account:", err);
  process.exit(1);
});
