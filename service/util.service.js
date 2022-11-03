const { to } = require('await-to-js');
const moment = require('moment');
var CryptoJS = require("crypto-js");

module.exports.to = async (promise) => {
    let err, res;
    [err, res] = await to(promise);
    if (err) return [err];
    return [null, res];
};

module.exports.ReE = function (res, err, code) { // Error Web Response
    if (typeof err == 'object' && typeof err.message != 'undefined') {
        err = err.message;
    }

    if (typeof code !== 'undefined') res.statusCode = code;

    return res.json({ success: false, error: err });
};

module.exports.ReS = function (res, data, code) { // Success Web Response
    let send_data = { success: true };

    if (typeof data == 'object') {
        send_data = Object.assign(data, send_data);//merge the objects
    }

    if (typeof code !== 'undefined') res.statusCode = code;

    return res.json(send_data)
};

module.exports.TE = function (err_message, log) { // TE stands for Throw Error
    if (log === true) {
        console.error(err_message);
    }

    throw new Error(err_message);
};

function isNull(field) {
    return field === undefined || field === 'null' || field === 'undefined' || field === '' || field === null;
}

module.exports.isNull = isNull

function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
};

module.exports.isObject = isObject;

function isEmpty(obj) {
    return !Object.keys(obj).length > 0;
}
module.exports.isEmpty = isEmpty;

module.exports.validation = async (fields, body) => {
    let fieldCheck = [];
    await fields.map((x) => {
        if (isNull(body[x])) {
            fieldCheck.push(x);
        }
    });

    if (fieldCheck.length !== 0) {
        return fieldCheck;
    }

    if (fieldCheck.length == 0) {
        return fieldCheck;
    }
}

module.exports.isEmail = (email) => {
    const reg = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (reg.test(email)) {
        return true
    }
    else {
        return false
    }
}

module.exports.isPhone = (phone) => {
    const reg = /^[6-9]\d{9}$/
    if (reg.test(phone)) {
        return true
    }
    else {
        return false
    }
}

module.exports.isPhoneCountry = (phone) => {
    const reg = /^([+][9][1]|[9][1]|[0]){0,1}([6-9]{1})([0-9]{9})$/
    if (reg.test(phone)) {
        return true
    }
    else {
        return false
    }
}

module.exports.isSmartCard = async (phone) => {
    const reg = /^[1-9]\d{11}$/
    if (reg.test(phone)) {
        return true
    }
    else {
        return false
    }
}

module.exports.genratePassword = async (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

module.exports.genrateNumber = async (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive

}

module.exports.dateDiff = async (startdate) => {
    //define moments for the startdate and enddate
    var startdateMoment = moment(startdate, "DD.MM.YYYY");
    var enddateMoment = moment(new Date(), "DD.MM.YYYY");

    if (startdateMoment.isValid() === true && enddateMoment.isValid() === true) {
        //getting the difference in years
        var years = enddateMoment.diff(startdateMoment, 'years');

        // //moment returns the total months between the two dates, subtracting the years
        // var months = enddateMoment.diff(startdateMoment, 'months') - (years * 12);

        // //to calculate the days, first get the previous month and then subtract it
        // startdateMoment.add(years, 'years').add(months, 'months');
        // var days = enddateMoment.diff(startdateMoment, 'days')

        return years
        // {
        //     years: years,
        //     months: months,
        //     days: days
        // };

    }
    else {
        return undefined;
    }

}

const todays = (val) => {
    var today = new Date();
    if (val === 1) {
        let y = today.setDate(today.getDate() - 1);
        today = new Date(y);
    }
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0");
    var yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
}

module.exports.todays = todays;

const validations = (x, y) => {
    let duration = ((new Date(`${y}`).getTime() - new Date(`${x}`).getTime()));
    let hourTime = (duration - (duration % 3600000));
    let minuteTime = ((duration - hourTime) - ((duration - hourTime) % 60000));
    let secondTime = ((duration - (hourTime + minuteTime)) - ((duration - (hourTime + minuteTime)) % 1000));
    let hour = hourTime / 3600000;
    let minute = minuteTime / 60000;
    let second = secondTime / 1000;
    if (hour < 10) { hour = '0' + hour; }
    if (minute < 10) { minute = '0' + minute; }
    if (second < 10) { second = '0' + second; }
    let value = hour + ' hrs ' + minute + ' mins ' + second + ' sec ';
    return value;
}

module.exports.validations = validations;

module.exports.dateCount = async (enddate) => {
    //define moments for the startdate and enddate
    var startdateMoment = moment(new Date(), "DD.MM.YYYY");
    var enddateMoment = moment(enddate, "DD.MM.YYYY");

    if (startdateMoment.isValid() === true && enddateMoment.isValid() === true) {
        //getting the difference in years
        // var years = enddateMoment.diff(startdateMoment, 'years');

        //moment returns the total months between the two dates, subtracting the years
        // var months = enddateMoment.diff(startdateMoment, 'months') - (years * 12);

        //to calculate the days, first get the previous month and then subtract it
        // startdateMoment.add(years, 'years').add(months, 'months');
        var days = enddateMoment.diff(startdateMoment, 'days')

        return days
        // {
        //     years: years,
        //     months: months,
        //     days: days
        // };

    }
    else {
        return undefined;
    }

}

module.exports.isAadhar = async (aadhar) => {
    const adharcardTwelveDigit = /^\d{12}$/;
    const adharSixteenDigit = /^\d{16}$/;
    if (adharcardTwelveDigit.test(aadhar)) {
        return true;
    }
    else if (adharSixteenDigit.test(aadhar)) {
        return true;
    }
    else {
        return false;
    }
}

module.exports.sendSms = async (phoneNo, sms, password) => {
    // const Nexmo = require('nexmo');

    // const nexmo = new Nexmo({
    //     apiKey: 'be5c50f8',
    //     apiSecret: 'da1JbKywVT93PP8W',
    // });

    // const from = 'VASBOOK';
    // const to = '91' + phoneNo;
    // const text = sms;

    // let data = await nexmo.message.sendSms(from, to, text);
    // return data;
    var request = require("request");
    var options = {
        method: 'GET',
        url: 'https://api.authkey.io/request',
        qs:
        {
            authkey: 'b307af4dc57410dd',
            sms: sms,
            mobile: phoneNo,
            country_code: '+91',
            sender: "8610356756"
        },
    };

    request(options, function (error, response, body) {
        if (error) return error

        console.log(body);
        return response;
    });
}
// <?php
// 	// Authorisation details.
// 	$username = "ranjithkumarranjith1999@gmail.com";
// 	$hash = "0ebaf2d9f5233b5a5009420d36663939ec89f47d6b408723e199700624be3a20";

// 	// Config variables. Consult http://api.textlocal.in/docs for more info.
// 	$test = "0";

// 	// Data for text message. This is the text message data.
// 	$sender = "TXTLCL"; // This is who the message appears to be from.
// 	$numbers = "910000000000"; // A single number or a comma-seperated list of numbers
// 	$message = "This is a test message from the PHP API script.";
// 	// 612 chars or less
// 	// A single number or a comma-seperated list of numbers
// 	$message = urlencode($message);
// 	$data = "username=".$username."&hash=".$hash."&message=".$message."&sender=".$sender."&numbers=".$numbers."&test=".$test;
// 	$ch = curl_init('http://api.textlocal.in/send/?');
// 	curl_setopt($ch, CURLOPT_POST, true);
// 	curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
// 	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// 	$result = curl_exec($ch); // This is the result from the API
// 	curl_close($ch);
// ?>

module.exports.isLandline = (inputtxt) => {
    var phoneno = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
    if (phoneno.test(inputtxt)) {
        return true;
    }
    else {
        return false;
    }
}

module.exports.isPan = (inputtxt) => {
    var panNo = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    if (panNo.test(inputtxt)) {
        return true;
    }
    else {
        return false;
    }
}

module.exports.generatePassword = () => {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "",
        specalset = "@#$&!";
    for (var i = 0, n = charset.length, k = specalset.length; i < length; ++i) {
        if (i < 7) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        } else {
            retVal += specalset.charAt(Math.floor(Math.random() * k));
        }
    }
    return retVal;
}

module.exports.firstLetterCap = (data) => {
    let normal = String(data).toLowerCase();
    normal = normal[0].toUpperCase() + normal.slice(1).trim();
    return normal
}

module.exports.firstCap = (data) => {
    let normal = String(data);
    if (normal == '') return normal
    // console.log(normal,"123321");
    normal = normal[0].toUpperCase() + normal.slice(1).trim();
    return normal.trim()
}

module.exports.stringWithReg = (data) => {
    const reg = /^[ A-Za-z@.&]*$/
    return reg.test(data);
}

//Encrypting text
module.exports.encrypt = (text, secret) => {
    // var wordArray = CryptoJS.enc.Utf8.parse(text);
    // var base64 = CryptoJS.enc.Base64.stringify(wordArray);

    var ciphertext = CryptoJS.AES.encrypt(text, secret).toString();
    return ciphertext;
}

module.exports.chechSession = async (datas, available, completed, key) => {
    let returnArray = [];
    available = available || '';
    completed = completed || '';
    let availables = (available === 'true') ? true : false;
    let completeds = (completed === 'true') ? true : false;
    const dateIndia = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm');
    const duration = (date) => moment.duration(moment(`${dateIndia}`, 'YYYY-MM-DD HH:mm').diff(moment(`${date}`, 'YYYY-MM-DD HH:mm'))).asMinutes();
    const convertIST = (val, date) => (moment(`${val}`, 'YYYY/MM/DD HH:mm').add(duration(date), 'minutes').format('YYYY-MM-DD HH:mm'));
    for (let index = 0; index < datas.length; index++) {
        let k = datas[index];
        const date = moment().tz(k.timezone).format('YYYY-MM-DD HH:mm');
        if (!isNull(key)) {
            k = k[key];
        }
        k.session_start_time = await convertIST(`${k.session_start_time}`, date);
        k.session_end_time = await convertIST(`${k.session_end_time}`, date);
        const dateHere = moment().format('YYYY-MM-DD HH:mm');
        const durationHere = await duration(dateHere);
        const time = moment(dateHere, 'YYYY-MM-DD HH:mm').toDate().getTime();
        const sTime = moment(k.session_start_time, 'YYYY-MM-DD HH:mm').subtract(durationHere, 'minutes').toDate().getTime();
        const eTime = moment(k.session_end_time, 'YYYY-MM-DD HH:mm').subtract(durationHere, 'minutes').toDate().getTime();
        let data = { ...k, available: ((sTime <= time) && (eTime >= time)), completed: ((sTime <= time) && (eTime <= time)) };
        if (available === '' && completed === '') returnArray.push(data);
        if (available !== '' && completed !== '' && data.available === availables && data.completed === completeds) returnArray.push(data);
        if (available !== '' && completed === '' && data.available === availables) returnArray.push(data);
        if (available === '' && completed !== '' && data.completed === completeds) returnArray.push(data);
    }
    return await returnArray;
}

// Decrypting text
module.exports.decrypt = (ciphertext, secret) => {
    // var parsedWordArray = CryptoJS.enc.Base64.parse(base64data);
    // var parsedStr = parsedWordArray.toString(CryptoJS.enc.Utf8);

    var bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
}

module.exports.genrateUserName = (name) => {
    name = String(name).replace(' ', '');
    min = Math.ceil(0);
    max = Math.floor(900);
    let num = Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive

    let str = `${String(name).slice(0, 3)}${num}`;

    return str;

}

module.exports.generateCode = (name, length, dLn) => {
    name = String(name).replaceAll(' ', '');
    let len = String(name).length;
    let strLen = 5, divLen = dLn || 3;

    if (Number(length) >= 5) {
        divLen = Math.floor(length / 2);

        strLen = length;
    }

    let str = '';
    for (var i = 0; i < strLen; i++) {
        if (len > i && i < strLen) {
            str = str + name[i];
        }
        if (i >= (strLen - divLen) || len < i) {
            min = Math.ceil(0);
            max = Math.floor(10);
            let num = Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive

            str = str + num;
        }
    }

    return String(str).toUpperCase();

}

module.exports.generateCodeName = (name, length, dLn) => {
    name = String(name).replaceAll(' ', '');
    let len = String(name).length;
    let strLen = length || len, divLen = dLn || len - 2;

    let str = '';
    for (var i = 0; i < strLen; i++) {
        if (len > i && i < strLen && divLen > i) {
            str = str + name[i];
        }
        if (i >= divLen || len < i) {
            min = Math.ceil(0);
            max = Math.floor(10);
            let num = Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive

            str = str + num;
        }
    }

    return String(str).toUpperCase();

}

const SumHours = (end, start) => {
    var smon = start;
    var fmon = end;
    var diff = 0;
    if (smon && fmon) {
        smon = ConvertToSeconds(smon);
        fmon = ConvertToSeconds(fmon);
        diff = Math.abs(fmon - smon);
        return secondsTohhmmss(diff);
    }
}

const ConvertToSeconds = (time) => {
    var splitTime = time.split(":");
    return splitTime[0] * 3600 + splitTime[1] * 60;
}

const secondsTohhmmss = (secs) => {
    secs = secs + 60;
    var hours = parseInt(secs / 3600);
    var seconds = parseInt(secs % 3600);
    var minutes = parseInt(seconds / 60);
    return `${hours} hrs ${minutes} mins`;
}

const convertToRoman = (num) => {
    if (typeof num !== 'number' || typeof parseInt(num) !== 'number') {
        num = parseInt(num);
        var digits = String(+num).split(""),
            key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
                "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
                "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
            roman_num = "",
            i = 3;
        while (i--)
            roman_num = (key[+digits.pop() + (i * 10)] || "") + roman_num;
        return Array(+digits.join("") + 1).join("M") + roman_num;
    }
}

module.exports.workday_count = (start, end) => {
    var first = start.clone().endOf('week'); // end of first week
    var last = end.clone().startOf('week'); // start of last week
    var days = last.diff(first, 'days') * 5 / 7; // this will always multiply of 7
    var wfirst = first.day() - start.day(); // check first week
    if (start.day() == 0) --wfirst; // -1 if start with sunday 
    var wlast = end.day() - last.day(); // check last week
    if (end.day() == 6) --wlast; // -1 if end with saturday
    return wfirst + Math.floor(days) + wlast;
}

module.exports.durationArray = (t1, t2) => {
    let time1 = moment(String(t1), 'hh:mm');
    let time2 = moment(String(t2), 'hh:mm');

    let duration = moment.duration(moment(time2._d).diff(time1._d)).asMinutes();

    let len = Math.round(duration / 60), remain = duration % 60;

    let array = [], timePr = String(String(t1)).slice(0, 2);

    for (let index = 0; index < len; index++) {
        let jLen = 60;

        if (index == len - 1) {
            jLen = remain;
        }

        let tiArr = [];
        let ti = Number(timePr) + index;
        ti = ti >= 10 ? ti : `0${ti}`;
        for (let j = 0; j < jLen; j++) {
            tiArr.push(`${ti}:${j >= 10 ? j : `0${+j}`}`);
        }
        array = array.concat(tiArr);
    };

    console.log(array);
    return array;
}


module.exports.SumHours = SumHours;
module.exports.ConvertToSeconds = ConvertToSeconds;
module.exports.secondsTohhmmss = secondsTohhmmss;
module.exports.convertToRoman = convertToRoman;