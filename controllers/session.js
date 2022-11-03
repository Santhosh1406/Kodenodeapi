const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, SumHours, convertToRoman, todays, isEmpty, chechSession } = require("../service/util.service");
const { time_day, time_table, leave, session, user_info, time_frame, course_batch, course_department_mapping, section, subject, user_data, topic, sub_topic, batch_sem } = require("../models");
const { Op } = require("sequelize");
const moment = require("moment");

exports.autoSession = async () => {
  console.log("Session Genrate Start");
  let err, timeTable, dayFind, sessionInsert, leaves, leaveIds = [];
  [err, leaves] = await to(leave.findAll({ where: { date: { [Op.gte]: moment().format('YYYY-MM-DD 00:00:00+00'), [Op.lt]: moment().add(1,"d").format('YYYY-MM-DD 00:00:00+00') } } }));
  if(err){
    console.log(err);
  } else if(isNull(leaves)){
    console.log({ message: 'Leaves not found' });
  }
  leaves.forEach(element => {
    let id = isNull(element.dataValues)? `${element.org_id}`: `${element.dataValues.org_id}`;
    if(!leaveIds.includes(id)){
      leaveIds.push(id);
    }
  });
  [err, dayFind] = await to(time_day.findOne({ where: { order: `${new Date().getDay()}`, is_active: true, is_block: false } }));
  if (err) {
    console.log({ message: err });
  } else if (isNull(dayFind)) {
    console.log({ message: "Day not found" });
  } else {
    [err, timeTable] = await to(
      time_table.findAll({
        where: { time_day_id: dayFind._id, is_active: true, is_block: false, active: true, current: true, org_id: { [Op.notIn]: leaveIds } },
        include: [{ model: time_frame, as: "timeFrameId" }, { model: course_batch, as: "courseBatchId" }, { model: course_department_mapping, as: "cdmId" }, { model: section, as: 'sectionId' }],
      })
    );
    if (err) {
      console.log({ message: err });
    } else if (isNull(timeTable)) {
      console.log({ message: "Timetable not found" });
    } else {
      let founded = [];
      const date = moment().format('YYYY/MM/DD HH:mm');
      const dateIndia = moment().tz('Asia/Kolkata').format('YYYY/MM/DD HH:mm');
      const duration = moment.duration(moment(`${date}`,'YYYY/MM/DD HH:mm').diff(moment(`${dateIndia}`,'YYYY/MM/DD HH:mm'))).asMinutes();
      for (let index = 0; index < timeTable.length; index++) {
        let err1, findSession;
        const element = timeTable[index];
        let sessionId = `SES${convertToRoman(element.timeFrameId.period)}${todays()}${element.sectionId._id}`;
        [err1, findSession] = await to(session.findOne({ where: { session_id: sessionId, is_active: true, is_block: false } }));
        if (err1) {
          console.log({ message: err1 });
        } else if (!isNull(findSession)) {
          console.log({ message: "This Session already Exist" });
        } else {
          if(founded.filter(x=> x.session_id === sessionId).length === 0){
            const val1 = `${element.timeFrameId.session_start_time}`;
            const val2 = `${element.timeFrameId.session_end_time}`;
            const calculate = (val) => (moment(`${todays()} ${val}`).add(duration-2, 'minutes').format('YYYY/MM/DD HH:mm'));
            founded.push({
              name: `Session ${convertToRoman(element.timeFrameId.period)}`,
              session_id: sessionId,
              session_date: await todays(),
              session_start_time: await calculate(val1),
              session_end_time: await calculate(val2),
              duration: await SumHours(val1, val2),
              file_path: "",
              class_type: "TimeTable",
              org_id: element.org_id,
              discipline_id: element.discipline_id,
              program_id: element.program_id,
              department_id: element.cdmId.department_id,
              cdm_id: element.cdm_id,
              section_id: element.section_id,
              course_batch_id: element.course_batch_id,
              batch_sem_id: element.batch_sem_id,
              time_frame_id: element.time_frame_id,
              subject_id: element.subject_id,
              topic_id: null,
              sub_topic_id: null,
              faculty_id: element.user_id,
              started: false,
              timezone: moment.tz.guess(),
              is_active: true,
              is_block: false,
            });
          }else{
            console.log({ message: 'Dupplicate Session' });
          }
        }
      }
      if (founded.length > 0) {
        [err, sessionInsert] = await to(session.bulkCreate(founded));
        if (err) {
          console.log({ message: err });
        } else if (isNull(sessionInsert)) {
          console.log({ message: "Session creation failed" });
        } else {
          console.log({ message: "Session Created Successfully" });
        }
      } else {
        console.log({ message: "Today no new sessions" });
      }
    }
  }
  console.log("Session Genrate Ended");
};

exports.getSession = async (req, res) => {
  let err, getSession, users, time = new Date().getTime();
  const query = req.query;
  let data = {};
  const user = req.user;
  [err, users] = await to(
    user_info.findOne({
      where: { user_id: user._id, is_active: true, is_block: false },
      include: [
        {
          model: user_data,
          as: "userId",
        },
        {
          model: course_batch,
          as: "courseBatchId",
        },
      ],
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(users)) {
    return ReE(res, { message: "User Info not found" }, BAD_REQUEST);
  }
  if (users.userId.is_active !== true || users.userId.is_block !== false) {
    return ReE(
      res,
      { message: "You are suspended please contact admin" },
      BAD_REQUEST
    );
  }

  if (isNull(users.course_batch_id)) {
    data = {
      ...data,
      faculty_id: user._id,
      is_active: true,
      is_block: false,
      session_date: query.completed === 'true' ? { [Op.or]: [todays(1), todays()] } : todays(),
    };
    [err, getSession] = await to(
      session.findAll({
        where: data,
        include: [
          { model: course_department_mapping, as: "cdmId" },
          { model: section, as: "sectionId" },
          { model: subject, as: "subjectId" },
          { model: batch_sem, as: "batchSemId" },
          { model: user_data, as: "facultyId", include: [{ model: user_info, as: 'userInfo' }], attributes: { exclude: 'password email_otp phone_otp' } }
        ],
        order: [["session_start_time", "ASC"]],
      })
    );
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!Array.isArray(getSession) || getSession.length === 0) {
      return ReE(res, { message: "Sessions not found" }, BAD_REQUEST);
    }
    getSession = await chechSession(getSession, query.available, query.completed, "dataValues");
    let update = getSession.filter((x) => (x.available === true && ( x.topic_id === null || x.sub_topic_id === null ))).length > 0;
    return ReS(
      res,
      {
        message: `Session's founded`,
        session: getSession,
        user: users,
        status: update,
        faculty: true,
      },
      OK
    );
  } else if (!isNull(users.course_batch_id)) {
    data = {
      ...data,
      course_batch_id: users.courseBatchId._id,
      section_id: users.section_id,
      session_date: !isNull(query.completed) ? { [Op.or]: [todays(1), todays()] } : todays(),
      is_active: true,
      is_block: false,
    };
    [err, getSession] = await to(
      session.findAll({
        where: data,
        include: [
          { model: course_department_mapping, as: "cdmId" },
          { model: section, as: "sectionId" },
          { model: subject, as: "subjectId" },
          { model: batch_sem, as: "batchSemId" },
          { model: user_data, as: "facultyId", include: [{ model: user_info, as: 'userInfo' }], attributes: { exclude: 'password email_otp phone_otp' } }
        ],
        order: [["session_start_time", "ASC"]],
      })
    );
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!Array.isArray(getSession) || getSession.length === 0) {
      return ReE(res, { message: "Sessions not found" }, BAD_REQUEST);
    }
    getSession = await chechSession(getSession, query.available, query.completed, "dataValues");
    return ReS(
      res,
      {
        message: `Session's founded`,
        session: getSession,
        user: users,
        faculty: false,
      },
      OK
    );
  }
};

exports.updateSessionDetails = async (req, res) => {
  let err, sessions, topics, sub_topics, updateSession;
  const user = req.user;
  const body = req.body;
  if (isNull(body._id)) {
    return ReE(res, { message: "Session id is must" }, BAD_REQUEST);
  }
  if (isNull(body.topic_id)) {
    return ReE(res, { message: "Topic id is must" }, BAD_REQUEST);
  }
  if (isNull(body.sub_topic_id)) {
    return ReE(res, { message: "Sup Topic id is must" }, BAD_REQUEST);
  }
  [err, sessions] = await to(
    session.findOne({
      where: { _id: body._id, is_active: true, is_block: false },
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sessions)) {
    return ReE(res, { message: "Session not found" }, BAD_REQUEST);
  }
  [err, topics] = await to(
    topic.findOne({
      where: {
        _id: body.topic_id,
        subject_id: sessions.subject_id,
        is_active: true,
        is_block: false,
      },
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(topics)) {
    return ReE(res, { message: "Topic not found" }, BAD_REQUEST);
  }
  [err, sub_topics] = await to(
    sub_topic.findOne({
      where: {
        _id: body.sub_topic_id,
        topic_id: topics._id,
        subject_id: sessions.subject_id,
        is_active: true,
        is_block: false,
      },
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sub_topics)) {
    return ReE(res, { message: "Sub Topic not found" }, BAD_REQUEST);
  }
  [err, updateSession] = await to(session.update({ topic_id: topics._id, sub_topic_id: sub_topics._id },{ where: { _id: sessions._id } } ));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(updateSession)) {
    return ReE(res, { message: "Session update failed" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Session updated successfully" }, OK);
};

exports.sessionEntry = async (req, res) => {
  let err, sessions, updateSession, userInfo;
  const user = req.user;
  const sessionId = req.params.id;
  [err, sessions] = await to(
    session.findOne({
      where: {
        _id: sessionId,
        is_active: true,
        is_block: false,
      },
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sessions)) {
    return ReE(res, { message: "Session not found" }, BAD_REQUEST);
  }
  sessions = await chechSession([sessions], null, null, 'dataValues');
  sessions = sessions[0];
  if (sessions.completed !== false) {
    return ReE(res, { message: 'Session already completed' }, BAD_REQUEST)
  }
  if (sessions.available !== true) {
    return ReE(res, { message: 'Currently Session not available' }, BAD_REQUEST);
  }
  [err, userInfo] = await to(user_info.findOne({ where: { user_id: user._id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(userInfo)) {
    return ReE(res, { message: 'User info not found' }, BAD_REQUEST);
  }
  if (sessions.faculty_id === user._id) {
    if(sessions.topic_id === null || sessions.sub_topic_id === null){
      return ReE(res, { message: 'You must update Topic, Sub topic details' }, BAD_REQUEST);
    }
    [err, updateSession] = await to(session.update({ started: (req.query.action === 'true') }, { where: { _id: sessions._id } }));
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(updateSession)) {
      return ReE(res, { message: "Faculty action record failed" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Faculty action recorded successfully" }, OK);
  } else {
    if (userInfo.section_id !== sessions.section_id) {
      return ReE(res, { message: 'You dont have access to join this session' }, BAD_REQUEST)
    }
    if (sessions.started === false) {
      return ReE(res, { message: "Please wait for faculty join" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Session started" }, OK);
  }
};