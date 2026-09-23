const db = require("../db");
const bcrypt = require("bcrypt");
const { logAction} = require("../logs")

class UserController{
    async createUser(req, res){
        const {name, email, pass, phone, role_id} = req.body
        try {
            const hash = await bcrypt.hash(pass, 10);
            const newPerson = await db.query("INSERT INTO users (full_name, email, password_hash, phone, role_id) values($1, $2, $3, $4, $5) RETURNING *", [name, email, hash, phone, role_id])
            res.json(newPerson.rows[0])
            
            await logAction({
                user_id: req.user?.user_id,
                action: 'create_user',
                entity_type: 'user',
                entity_id: newPerson.rows[0].user_id,
                details: `Создан пользователь "${name}"`,
              });
        } catch (error) {
            res.status(500).json({error: error.message});
        }
    }

    async getOneUser(req, res){
        const id = req.params.id
        try {
            const users = await db.query("SELECT * FROM users where user_id = $1", [id]);
            res.json(users.rows[0])
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    
    }

    async getUsers(req, res) {
        try {
          const result = await db.query(`
            SELECT u.user_id, u.full_name, u.email, u.phone, u.role_id,
                   r.name AS role
            FROM users u
            LEFT JOIN role r ON u.role_id = r.role_id
            ORDER BY u.user_id
          `);
          res.json(result.rows);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      }
      
      async updateUser(req, res) {
        const { id, name, email, phone, role_id } = req.body;
        try {
          const result = await db.query(`
            UPDATE users 
            SET full_name=$2, email=$3, phone=$4, role_id=$5
            WHERE user_id=$1
            RETURNING user_id, full_name, email, phone, role_id
          `, [id, name, email, phone || null, role_id]);
          res.json(result.rows[0]);

          await logAction({
            user_id: req.user?.user_id,
            action: 'update_user',
            entity_type: 'user',
            entity_id: id,
            details: `Изменён пользователь "${name}"`,
          });
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      }

    async deleteUser(req, res){
        const id = req.params.id
        try {
            const users = await db.query("DELETE FROM users where user_id = $1", [id]);
            res.json(users.rows[0])

            await logAction({
                user_id: req.user?.user_id,
                action: 'delete_user',
                entity_type: 'user',
                entity_id: id,
                details: `Удалён пользователь #${users.name}`,
              });
        } catch (error) {
            res.status(500).json({error: error.message})
        }
    }
}

module.exports = new UserController()
