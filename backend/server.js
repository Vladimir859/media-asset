const express = require('express');
const { Pool } = require('pg');
const userRouter = require("../backend/routes/user_routes")
const pool = require("../backend/db")
const cookieParser = require("cookie-parser")


const app = express();
const port = 3000;
const path = require('path');

app.use(express.static(path.join(__dirname, "../")));
app.use(express.json())
app.use(cookieParser())
app.use("/api", userRouter)


app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
