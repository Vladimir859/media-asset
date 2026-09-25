const Pool = require("pg").Pool
require("dotenv").config()

const pool = new Pool({
    user: process.env.user_name,
    host: process.env.host_name,
    database: process.env.database_name,
    password: process.env.password,
    port: process.env.port,
})

pool.connect((err) => {
    if(err){
        console.error("ошибка подключения к базе: ", err)
    }
    else{
        console.log("Подключено к PostgreSQL")
    }
})

module.exports = pool