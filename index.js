const express = require("express");
const cors = require("cors");
const { CONFIG } = require("./config/confifData");
const logger = require('morgan');
const passport = require('passport');
const schedule = require('node-schedule');
const { autoApi } = require("./service/auto/auto_api");
const { autoSession } = require("./controllers/session");
const moment = require('moment');
require("./middleware/passport")(passport);

const PORT = CONFIG.port;
const app = express();

app.use(cors());

app.use(passport.initialize());
// app.use(passport.session());

app.use(logger('combined'));


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// parse requests of content-type - application/json
app.use(express.json({ limit: '50mb' }));

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// simple route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to kode api." });
});

//route config

//v1
const v1 = require('./routes/v1');
app.use('/api/own', v1);

const v2 = require('./routes/v2');
const { autoAttendance } = require("./controllers/student_attendance");
app.use('/api', v2);

let rule = new schedule.RecurrenceRule();
rule.hour = 20;
rule.minute = 00;
rule.second = 00;
autoSession();
autoApi();
autoAttendance();
const job1 = schedule.scheduleJob(rule, async function () {
    console.log("first", new Date().toDateString());
    await autoApi();
    await autoSession();
    await autoAttendance();
});

// const job2 = schedule.scheduleJob('*/1 * * * *', async function () {
//     console.log("second", new Date().getMinutes(), new Date().getSeconds());
// });

app.listen(PORT, async () => {
    console.log(`Server is listening to port ${PORT}`);
});