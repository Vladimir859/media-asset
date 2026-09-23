const db = require("../db")

class locationController{
  async getLocations(req, res) {
    try {
      const result = await db.query("SELECT * FROM location ORDER BY name")
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  async getOneLocation(req, res) {
    try {
      const result = await db.query(
        "SELECT * FROM location WHERE location_id = $1", [req.params.id]
      )
      if (result.rows.length === 0) return res.status(404).json({ error: "Not found" })
      res.json(result.rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  async createLocation(req, res) {
    try {
      const { name, description } = req.body
      const result = await db.query(
        "INSERT INTO location (name, description) VALUES ($1, $2) RETURNING *",
        [name, description]
      )
      res.status(201).json(result.rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  async updateLocation(req, res) {
    try {
      const { location_id, name, description } = req.body
      const result = await db.query(
        "UPDATE location SET name=$2, description=$3 WHERE location_id=$1 RETURNING *",
        [location_id, name, description]
      )
      res.json(result.rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  async deleteLocation(req, res) {
    try {
      await db.query("DELETE FROM location WHERE location_id=$1", [req.params.id])
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }
}

module.exports = new locationController()