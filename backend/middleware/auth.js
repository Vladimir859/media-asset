// middleware/auth.js — проверка JWT и ролей

const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "change_this_secret_in_production";

/**
 * Проверяет JWT из httpOnly cookie.
 * Кладёт данные пользователя в req.user = { user_id, role, email }
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  console.log("куки", res.cookies)
  if (!token) {
    return res.status(401).json({ error: "Не авторизован" });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Токен недействителен или истёк" });
  }
}

/**
 * Фабрика middleware для проверки роли.
 * Использование: requireRole("admin") или requireRole("admin", "manager")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, SECRET };