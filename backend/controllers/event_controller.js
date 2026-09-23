const db = require("../db");
const {logAction} = require("../logs");

// Вычисляет статус мероприятия по времени
// finished — если status_id указан и это "завершено", или event_end уже прошло
// active   — event_start уже наступил, event_end ещё не прошёл (или не указан)
// planned  — event_start ещё не наступил
function computeStatus(row) {
  if (row.is_finished) return 'finished';
  const now   = Date.now();
  const start = row.event_start ? new Date(row.event_start).getTime() : null;
  const end   = row.event_end   ? new Date(row.event_end).getTime()   : null;
  if (end && end < now) return 'finished';
  if (start && start <= now) return 'active';
  return 'planned';
}

class EventController {

  async getEvents(req, res) {
    try {
      const result = await db.query(`
        SELECT
          e.event_id,
          e.name,
          e.description,
          e.comment,
          e.event_start,
          e.event_end,
          e.event_time,
          e.status_id,
          l.name        AS location,
          u.full_name   AS responsible,
          -- флаг: мероприятие явно завершено через кнопку
          (s.name = 'finished') AS is_finished
        FROM event e
        LEFT JOIN status   s ON e.status_id = s.status_id
        LEFT JOIN location l ON e.location_id = l.location_id
        LEFT JOIN users    u ON e.user_id     = u.user_id
        ORDER BY e.event_start DESC
      `);

      const rows = result.rows.map(r => ({
        ...r,
        status: computeStatus(r),
      }));

      res.json(rows);
    } catch (err) {
      console.error("getEvents:", err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async getOneEvent(req, res) {
    try {
      const { id } = req.params;

      const eventRes = await db.query(`
        SELECT
          e.event_id,
          e.name,
          e.description,
          e.comment,
          e.event_start,
          e.event_end,
          e.event_time,
          e.status_id,
          e.location_id,
          e.user_id,
          l.name        AS location,
          u.full_name   AS responsible,
          u.email       AS responsible_email,
          u.phone       AS responsible_phone,
          (s.name = 'finished') AS is_finished
        FROM event e
        LEFT JOIN status   s ON e.status_id = s.status_id
        LEFT JOIN location l ON e.location_id = l.location_id
        LEFT JOIN users    u ON e.user_id     = u.user_id
        WHERE e.event_id = $1
      `, [id]);

      if (eventRes.rows.length === 0)
        return res.status(404).json({ error: "Мероприятие не найдено" });

      const event = {
        ...eventRes.rows[0],
        status: computeStatus(eventRes.rows[0]),
      };

      const equipRes = await db.query(`
        SELECT
          eq.equipment_id,
          eq.name,
          eq.inventory_number,
          eq.description,
          s.name AS status
        FROM event_equipment ee
        JOIN equipment eq ON ee.equipment_id = eq.equipment_id
        LEFT JOIN status s ON eq.status_id = s.status_id
        WHERE ee.event_id = $1
      `, [id]);

      res.json({ ...event, equipment: equipRes.rows });
    } catch (err) {
      console.error("getOneEvent:", err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async createEvent(req, res) {
    const client = await db.connect();
    try {
      const {
        name, description, comment,
        user_id, location_id,
        event_start, event_end,
        equipment_ids = []
      } = req.body;

      await client.query("BEGIN");

      const eventRes = await client.query(`
        INSERT INTO event
          (name, description, comment, user_id, location_id,
           event_start, event_end, event_time)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
        RETURNING *
      `, [name, description, comment, user_id, location_id,
          event_start, event_end]);

      const event = eventRes.rows[0];

      if (equipment_ids.length > 0) {
        const statusRes = await client.query(
          "SELECT status_id FROM status WHERE name = 'in_use' LIMIT 1"
        );
        const inUseStatusId = statusRes.rows[0]?.status_id;

        for (const eq_id of equipment_ids) {
          await client.query(
            "INSERT INTO event_equipment (event_id, equipment_id) VALUES ($1,$2)",
            [event.event_id, eq_id]
          );
          if (inUseStatusId) {
            await client.query(
              "UPDATE equipment SET status_id=$1 WHERE equipment_id=$2",
              [inUseStatusId, eq_id]
            );
          }
        }
      }

      await client.query("COMMIT");
      await logAction({
        user_id: req.user?.user_id,
        action: 'create_event',
        entity_type: 'event',
        entity_id: event.event_id,
        details: `Создано мероприятие "${name}"`,
      });

      res.status(201).json(event);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("createEvent:", err.message);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  async finishEvent(req, res) {
    const client = await db.connect();
    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // Получаем или создаём статус 'finished' для мероприятий
      let finishedRes = await client.query(
        "SELECT status_id FROM status WHERE name = 'finished' LIMIT 1"
      );
      let finishedStatusId = finishedRes.rows[0]?.status_id;

      // Если статуса finished нет — создаём
      if (!finishedStatusId) {
        const ins = await client.query(
          "INSERT INTO status (name) VALUES ('finished') RETURNING status_id"
        );
        finishedStatusId = ins.rows[0].status_id;
      }

      // Переводим оборудование в available
      const availRes = await client.query(
        "SELECT status_id FROM status WHERE name = 'available' LIMIT 1"
      );
      const availableStatusId = availRes.rows[0]?.status_id;

      if (availableStatusId) {
        await client.query(`
          UPDATE equipment SET status_id = $1
          WHERE equipment_id IN (
            SELECT equipment_id FROM event_equipment WHERE event_id = $2
          )
        `, [availableStatusId, id]);
      }

      // Завершаем мероприятие
      const eventRes = await client.query(`
        UPDATE event
        SET status_id = $1, event_end = COALESCE(event_end, NOW())
        WHERE event_id = $2
        RETURNING *
      `, [finishedStatusId, id]);

      await client.query("COMMIT");
      await logAction({
        user_id: req.user?.user_id,
        action: 'finish_event',
        entity_type: 'event',
        entity_id: id,
        details: `Мероприятие завершено`,
      });

      res.json(eventRes.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("finishEvent:", err.message);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  async updateEvent(req, res) {
    try {
      const {
        event_id, name, description, comment,
        user_id, location_id, status_id,
        event_start, event_end
      } = req.body;

      const result = await db.query(`
        UPDATE event
        SET name=$2, description=$3, comment=$4,
            user_id=$5, location_id=$6, status_id=$7,
            event_start=$8, event_end=$9
        WHERE event_id=$1
        RETURNING *
      `, [event_id, name, description, comment,
          user_id, location_id, status_id,
          event_start, event_end]);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("updateEvent:", err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM event_equipment WHERE event_id=$1", [id]);
      await db.query("DELETE FROM event WHERE event_id=$1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("deleteEvent:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new EventController();