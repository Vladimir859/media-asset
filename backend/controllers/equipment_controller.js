const db = require("../db");
const {logAction} = require("../logs")

class equipmentController{
    async createEquip(req, res){
        try {
            const {name, inventory_number, description, status_id, location_id, user_id} = req.body
            console.log(name, inventory_number, description, status_id, location_id, user_id)
            const newEquip = await db.query("INSERT INTO equipment (name, inventory_number, description, status_id, location_id, user_id) values($1, $2, $3, $4, $5, $6) RETURNING *", [name, inventory_number, description, status_id, location_id, user_id])        
            const newEquipData = newEquip.rows[0]
            res.json(newEquipData)
            
            await logAction({
                user_id: req.user?.user_id,
                action: 'create_equipment',
                entity_type: 'equipment',
                entity_id: newEquipData.equipment_id,
                details: `Создана запись оборудования "${newEquipData.name}"`,
            })

        } catch (error) {
            console.error("create error", error)
            res.status(500).json({
                error: error.message
            })
        }
    }

    async getEquip(req,res){
        const equip = await db.query("SELECT * FROM equipment")
        res.json(equip.rows)
    }

    async getOneEquip(req, res){
        const id = req.params.id;
        const equip = await db.query("SELECT * FROM equipment where equipment_id = $1", [id])
        res.json(equip.rows[0])
    }

    async updateEquip(req, res){
        const {id, name, inv_num, description, status_id, loc_id, user_id} = req.body
        const updateEquip = await db.query("UPDATE equipment set name = $2, inventory_number = $3, description = $4, status_id = $5, location_id = $6, user_id = $7 where equipment_id = $1 RETURNING *", [id, name, inv_num, description, status_id, loc_id, user_id])
        res.json(updateEquip.rows[0])
    }

    async deleteEquip(req,res){
        try {
            const id = req.params.id;
            const deleted = await db.query("DELETE FROM equipment where equipment_id = $1 RETURNING *", [id])
            const equipment = deleted.rows[0]
            console.log(equipment)
            await logAction({
                user_id: req.user?.user_id,
                action: 'delete_equipment',
                entity_type: 'equipment',
                entity_id: equipment.equipment_id,
                details: `Удалено оборудование "${equipment.name}"`,
        })

            res.json(equipment)
        } catch (error) {
            console.error("delete error", error),
            res.status(500).json({
                error: error.message
            })
        }
        
    }

    async getAvaibleEquip(req, res){
        const result = await db.query("SELECT * FROM equipment where status_id = 1")
        res.json(result.rows);
    }
}

module.exports = new equipmentController()