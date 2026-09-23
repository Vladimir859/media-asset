const Pool = require("pg").Pool

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'diplom_db',
    password: 'root',
    port: 5432,
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