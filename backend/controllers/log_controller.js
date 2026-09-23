const db = require("../db");

class LogController {
  async getLogs(req, res) {
    try {
      const result = await db.query(`
        SELECT
          l.log_id,
          l.user_id,
          l.action,
          l.entity_type,
          l.entity_id,
          l.details,
          l.create_at,
          u.full_name AS user_name
        FROM logs l
        LEFT JOIN users u ON l.user_id = u.user_id
        ORDER BY l.create_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("getLogs:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new LogController();