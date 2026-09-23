// controllers/auth_controller.js — вход, выход, текущий пользователь

const db     = require("../db");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const { SECRET } = require("../middleware/auth");

const COOKIE_OPTIONS = {
  httpOnly: true,       // JS не имеет доступа — защита от XSS
  sameSite: "lax",   // защита от CSRF
  maxAge: 8 * 60 * 60 * 1000, // 8 часов
  // secure: true,      // раскомментировать когда будет HTTPS
};

class AuthController {

  // POST /api/auth/login
  async login(req, res) {
    const { email, password } = req.body;
    

    if (!email || !password) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    try {
      const result = await db.query(`
        SELECT u.user_id, u.full_name, u.email, u.password_hash,
               r.name AS role
        FROM users u
        LEFT JOIN role r ON u.role_id = r.role_id
        WHERE u.email = $1
      `, [email.trim().toLowerCase()]);

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      // Проверяем пароль — поддерживаем и plain text и bcrypt хеш
      let passwordValid = false;
      if (user.password_hash.startsWith("$2")) {
        // bcrypt хеш
        passwordValid = await bcrypt.compare(password, user.password_hash);
      } else {
        // plain text (для существующих пользователей)
        // после первого входа хешируем и сохраняем
        passwordValid = password === user.password_hash;
        if (passwordValid) {
          const hash = await bcrypt.hash(password, 10);
          await db.query(
            "UPDATE users SET password_hash = $1 WHERE user_id = $2",
            [hash, user.user_id]
          );
        }
      }

      if (!passwordValid) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      // Генерируем JWT
      const token = jwt.sign(
        { user_id: user.user_id, role: user.role, email: user.email },
        SECRET,
        { expiresIn: "8h" }
      );

      // Кладём в httpOnly cookie
      res.cookie("token", token, COOKIE_OPTIONS);

      res.json({
        user_id:   user.user_id,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role,
      });
    } catch (err) {
      console.error("login:", err.message);
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/auth/logout
  logout(req, res) {
    res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
    res.json({ success: true });
  }

  // GET /api/auth/me — кто сейчас залогинен
  async me(req, res) {
    try {
      const result = await db.query(`
        SELECT u.user_id, u.full_name, u.email, u.phone,
               r.name AS role
        FROM users u
        LEFT JOIN role r ON u.role_id = r.role_id
        WHERE u.user_id = $1
      `, [req.user.user_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();