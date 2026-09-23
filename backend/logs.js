const db = require("../backend/db");

async function logAction({user_id, action, entity_type, entity_id, details}){
    try{
        await db.query(`
        INSERT INTO logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, $2,$3,$4,$5) 
        `, [user_id, action, entity_type ?? null, entity_id ?? null, details ?? null]);
    }catch{
        console.error("Ошибка логгирования", err.message);
    }
}

module.exports = {logAction}