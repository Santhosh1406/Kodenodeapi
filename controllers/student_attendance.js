const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, todays, validations, isEmpty, firstCap, chechSession } = require("../service/util.service");
const { session, student_attendance, user_info } = require("../models");
const { IsValidUUIDV4 } = require("../service/validation");
const { CONFIG } = require("../config/confifData");
const { Op } = require("sequelize");

const calDuration = (x, data) => {
  let datas = { hours: 0, mins: 0, secs: 0 };
  datas.hours = (parseInt(x[0]) + (data?.hours || 0)), datas.mins = (parseInt(x[1]) + (data?.mins || 0)), datas.secs = (parseInt(x[2] || 0) + (data?.secs || 0));
  if (datas.secs > 60) {
    datas.mins = (datas.mins + (Math.floor(datas.secs / 60)));
    datas.secs = (datas.secs % 60);
  }
  if (datas.mins > 60) {
    datas.hours = (datas.hours + (Math.floor(datas.mins / 60)));
    datas.mins = (datas.mins % 60);
  }
  return datas;
};

exports.markAttendance = async (req, res) => {
  let err, sessionId, studentAttendanceId, addAttendance, updateAttendance;
  const session_id = req.params.id;
  const user = req.user;
  let attDetails = {
    enter_time: new Date().toISOString(),
    end_time: null,
    duration: null
  };
  if (isNull(session_id) || !IsValidUUIDV4(session_id)) {
    return ReE(res, { message: "Invalid Session id" }, BAD_REQUEST);
  }
  [err, sessionId] = await to(session.findOne({ where: { _id: session_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sessionId)) {
    return ReE(res, { message: "Session not found" }, BAD_REQUEST);
  }
  sessionId = await chechSession([sessionId], null, null, "dataValues");
  sessionId = sessionId[0];
  if(sessionId.available !== true){
    return ReE(res, { message: 'Session not available' }, BAD_REQUEST);    
  }
  if(sessionId.started !== true){
    return ReE(res, { message: 'Session not started' }, BAD_REQUEST);
  }
  [err, userInfo] = await to(user_info.findOne({ where: { user_id: user._id, is_active: true, is_block: false } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(userInfo)){
    return ReE(res, { message: 'User info not found' }, BAD_REQUEST);
  }
  if(sessionId.faculty_id !== user._id && userInfo.section_id !== sessionId.section_id){
    return ReE(res, { message: 'You dont have access to join this session' }, BAD_REQUEST)
  }
  [err, studentAttendanceId] = await to(student_attendance.findOne({ where: { session_id: session_id, user_id: user._id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(studentAttendanceId)) {
    let data = {
      user_id: user._id,
      session_id: sessionId._id,
      session_name: firstCap(sessionId.name),
      faculty_id: sessionId.faculty_id,
      duration: sessionId.duration,
      student_track: [attDetails],
      session_date: sessionId.session_date,
      session_start_time: sessionId.session_start_time,
      session_end_time: sessionId.session_end_time,
      org_id: sessionId.org_id,
      discipline_id: sessionId.discipline_id,
      program_id: sessionId.program_id,
      department_id: sessionId.department_id,
      cdm_id: sessionId.cdm_id,
      section_id: sessionId.section_id,
      course_batch_id: sessionId.course_batch_id,
      batch_sem_id: sessionId.batch_sem_id,
      subject_id: sessionId.subject_id,
      is_active: true,
      is_block: false
    };
    [err, addAttendance] = await to(student_attendance.create({ ...data }));
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(addAttendance)) {
      return ReE(res, { message: 'Add attendance failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Attendance added successfully' }, OK);
  } else {
    let filter = studentAttendanceId.student_track.filter(x => x.end_time === null && x.duration === null);
    if (filter.length === 0) {
      [err, updateAttendance] = await to(student_attendance.update({ student_track: [...studentAttendanceId.student_track, attDetails] }, { where: { _id: studentAttendanceId._id } }));
      if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
      }
      if (isNull(updateAttendance)) {
        return ReE(res, { message: 'Attendance adding failed' }, BAD_REQUEST)
      }
      return ReS(res, { message: 'Attendance added successfully' }, OK);
    } else {
      return ReS(res, { message: 'Attendance added successfully' }, OK);
    }
  }
};

exports.updateAttendance = async (req, res) => {
  let err, sessionId, getAttendance, updateAttendance;
  const user = req.user;
  const session_id = req.params.id;
  if (isNull(session_id) || !IsValidUUIDV4(session_id)) {
    return ReE(res, { message: "Invalid Session id" }, BAD_REQUEST);
  }
  [err, sessionId] = await to(session.findOne({ where: { _id: session_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sessionId)) {
    return ReE(res, { message: "Session not found" }, BAD_REQUEST);
  }
  [err, getAttendance] = await to(student_attendance.findOne({ where: { session_id: session_id, user_id: user._id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(getAttendance)) {
    return ReE(res, { message: 'Attendance not found' }, BAD_REQUEST);
  }
  let index = getAttendance.student_track.findIndex(x => x.end_time === null && x.duration === null);
  let newData = getAttendance.student_track;
  if (index !== -1) {
    let date1 = new Date().toISOString();
    let duration = validations(new Date(newData[index].enter_time).toISOString(), date1);
    newData[index] = { ...newData[index], end_time: date1, duration: duration };
    [err, updateAttendance] = await to(student_attendance.update({ student_track: newData }, { where: { _id: getAttendance._id } }));
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(updateAttendance)) {
      return ReE(res, { message: 'Attendance updated successfully' }, BAD_REQUEST);
    }
  }
  return ReS(res, { message: 'Attendance updated successfully' }, OK);
}

exports.autoAttendance = async () => {
  let err, attendance;
  let calDurations = (x) => parseInt(((parseInt(x[0] || 0)*60)*60) + (parseInt(x[1] || 0)*60) + parseInt(x[2] || 0));
  [err, attendance] = await to(student_attendance.findAll({ where: { [Op.or]: [{ present: null }, { total_duration: null }] } }));
  if (err) {
    console.log({ message: err });
  }
  if(isNull(attendance) || isEmpty(attendance)){
    console.log({ message: 'Attendance not found' });
  }
  if(attendance && attendance.length !== 0){
    for (let index = 0; index < attendance.length; index++) {
      const element = attendance[index];
      if(new Date(element.session_end_time).getTime() < new Date().getTime()){
        let err1, updateAttendance, durations = 0, total_duration = 0, datas = { hours: 0, mins: 0, secs: 0 };
        let studentTrack = element.student_track;
        let timings = studentTrack.map(x => String(x.duration).replaceAll(" hrs ", " ").replaceAll(" mins ", " ").replaceAll(" sec ", "").split(" "));
        durations = calDurations(String(element.duration).replaceAll(" hrs ", " ").replaceAll(" mins", "").split(" "));
        timings.map(x => {
          total_duration = (total_duration + calDurations(x));
          datas = calDuration(x, datas);
        });
        let percent = ((total_duration/durations)*100) >= CONFIG.minAtten;
        [err1, updateAttendance] = await to(student_attendance.update({ present: percent, total_duration: `${datas.hours} Hours ${datas.mins} Minutes ${datas.secs} Seconds` }, { where: { _id: element._id } }));
        if (err1) {
          console.log({ message: err1 });
        }
        else if (isNull(updateAttendance)) {
          console.log({ message: 'Attendance update failed' });
        }
      }
    }
  } else {
    console.log({ message: 'No attendance to do update now' });
  }
  console.log({ message: 'OK' });
}