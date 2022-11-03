const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, todays, isEmpty } = require("../service/util.service");
const { discipline, organization, user_data, program, time_frame, user_subject, subject } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkOrganization, checkMenuAccess } = require("./common");
const { CONFIG } = require("../config/confifData");

const arrayFields = ["_id", "period", "description", "session_start_time", "session_end_time", "org_id", "discipline_id", "program_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["period", "description", "session_start_time", "session_end_time", "program_id"];
const updateRequiredFields = ["_id"];

exports.addTimeFrame = async (req, res) => {
  let err, timeFrame, orgId, disId, proId, allFrame, frameName, data;
  const user = req.user;
  data = req.body;

  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }

  const InvalidFields = createRequiredFields.filter((x) => isNull(data[x]));
  if (InvalidFields.length > 0) {
    return ReE(res, { message: `${InvalidFields} not valid data` }, BAD_REQUEST);
  }
  const validation = validator("time_frame", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, proId] = await to(program.findOne({ where: { _id: data.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(proId)) {
    return ReE(res, { message: 'Program not found' }, BAD_REQUEST);
  }
  data.org_id = proId.org_id;
  data.discipline_id = proId.discipline_id;
  data.is_active = true;
  data.is_block = false;
  data.createdby = user._id;
  [err, orgId] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(orgId)) {
    return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
  }
  [err, disId] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(disId)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST);
  }
  [err, frameName] = await to(time_frame.findAll({ where: { org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id }, order: [['session_end_time', 'ASC']] }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(frameName)) {
    return ReE(res, { message: 'Time Frame not found' }, BAD_REQUEST);
  }
  if (frameName.length > 0 && new Date(`${todays()} ${frameName[(frameName.length - 1)]}`).getTime() >= new Date(`${todays} ${data.session_start_time}`).getTime()) {
    return ReE(res, { message: 'Session start time must greader then last session end time' }, BAD_REQUEST);
  }
  data.period = (frameName.length + 1);
  [err, allFrame] = await to(time_frame.findAll({ where: { org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(allFrame)) {
    return ReE(res, { message: 'Time Frame not found' }, BAD_REQUEST);
  }
  if (allFrame.length > 0) {
    let s1Date = new Date(`${todays()} ${data.session_start_time}`).getTime();
    let e1Date = new Date(`${todays()} ${data.session_end_time}`).getTime();
    let Invalid = allFrame.filter(x => {
      let sDate = new Date(`${todays()} ${x.session_start_time}`).getTime();
      let eDate = new Date(`${todays()} ${x.session_end_time}`).getTime();
      return ((((s1Date >= sDate) && (s1Date <= eDate))) || (((e1Date >= sDate) && (e1Date <= eDate))));
    })
    if (Invalid.length > 0) {
      return ReE(res, { message: 'Session already exist on this time' }, BAD_REQUEST);
    }
  }
  [err, timeFrame] = await to(time_frame.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(timeFrame)) {
    return ReE(res, { message: 'Time Frame creation failed' }, BAD_REQUEST);
  }
  return ReE(res, { message: 'Time Frame created successfully' }, OK);
}

exports.getAllTimeFrame = async (req, res) => {
  let err, timeFrame, data, query, filter;
  const user = req.user;
  data = req.query;

  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }

  query = getQuery(data);
  if (!isNull(data.org_id)) {
    query.org_id = data.org_id;
  }
  if (!isNull(data.discipline_id)) {
    query.discipline_id = data.discipline_id;
  }
  if (!isNull(data.program_id)) {
    query.program_id = data.program_id;
  }

  let getSubjects;

  [err, getSubjects] = await to(user_subject.findAll({
    where: { user_id: user._id, is_active: true, is_block: false },
    include: [
      {
        model: subject,
        as: 'subjectId'
      }]
  }));

  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }

  if (!isEmpty(getSubjects)) {

    let department = [];

    await getSubjects.map(x => {
      if (x.subjectId.department_id && !department.includes(x.subjectId.department_id)) department.push(x.subjectId.department_id);
    });

    if (department.length > 0) {
      delete query.discipline_id;
      if (!isNull(req.query.program_id)) {
        query = {
          ...query, program_id: req.query.program_id
        };
      }
    }
  };

  filter = {
    where: query,
    order: [['createddate', 'ASC']],
    include: [
      {
        model: organization,
        as: 'orgId'
      },
      {
        model: discipline,
        as: 'disciplineId'
      },
      {
        model: program,
        as: 'programId'
      },
      {
        model: user_data,
        as: 'createdBy'
      },
      {
        model: user_data,
        as: 'updatedBy'
      }
    ],
    order: [
      ['period', 'ASC']
    ]
  };
  if (!isNull(data.limit) && !isNull(data.page)) {
    filter.limit = data.limit;
    filter.offset = (data.page * (data.page - 1));
  };
  [err, timeFrame] = await to(time_frame.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!timeFrame || !Array.isArray(timeFrame) || timeFrame.length === 0) {
    return ReE(res, { message: "Time frame are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Time Frame founded", data: timeFrame }, OK);
}

exports.getOneTimeFrame = async (req, res) => {
  let err, timeFrame, data, query = { is_active: true, is_block: false };
  const user = req.user;
  data = req.query;

  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }

  if (!data.id || typeof data.id !== "string") {
    return ReE(res, { message: "Time frame id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid Time frame id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, timeFrame] = await to(time_frame.findOne({
    where: query,
    include: [
      {
        model: organization,
        as: 'orgId'
      },
      {
        model: discipline,
        as: 'disciplineId'
      },
      {
        model: program,
        as: 'programId'
      },
      {
        model: user_data,
        as: 'createdBy'
      },
      {
        model: user_data,
        as: 'updatedBy'
      }
    ]
  }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(timeFrame)) {
    return ReE(res, { message: "Time Frame not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Time Frame founded", data: timeFrame }, OK);
};

const checkTimeFrame = async (body) => {
  let err, timeFrame, query = { where: { is_active: true } };


  if (isNull(body.time_frame_id) && !Array.isArray(body.time_frame_id) && !IsValidUUIDV4(body.time_frame_id)) {
    return { message: 'Please select vaild time frame details', success: false };
  }

  if (!isNull(body.org_id)) {
    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
      return { message: checkOrganizationDetails.message, success: false };
    }

    query.where = {
      ...query.where,
      org_id: body.org_id
    }
  }

  if (Array.isArray(body.time_frame_id)) {
    query.where = {
      ...query.where,
      _id: { [Op.in]: body.time_frame_id }
    };
  }

  if (IsValidUUIDV4(body.time_frame_id)) {
    query.where = {
      ...query.where,
      _id: body.time_frame_id
    };
  }

  let option = {
    where: query.where,
    include: [
      {
        model: organization,
        as: 'orgId'
      },
      {
        model: discipline,
        as: 'disciplineId'
      },
      {
        model: program,
        as: 'programId'
      },
      {
        model: user_data,
        as: 'createdBy'
      },
      {
        model: user_data,
        as: 'updatedBy'
      }
    ],
    order: [['period', 'ASC']]
  };

  if (Array.isArray(body.time_frame_id)) {
    
    [err, timeFrame] = await to(time_frame.findAll(option));

    if (err) {
      return { messgae: err, success: false };
    }
    if (isEmpty(timeFrame)) {
      return { message: "Time Frame not found", success: false };
    }

  } else {

    [err, timeFrame] = await to(time_frame.findOne(option));

    if (err) {
      return { messgae: err, success: false };
    }
    if (isNull(timeFrame)) {
      return { message: "Time Frame not found", success: false };
    }
  
    if (timeFrame.is_block) {
      return { message: "Time Frame was blocked", success: false };
    }
  }

  return { message: "Time Frame founded", data: timeFrame, success: true };
};

module.exports.checkTimeFrame = checkTimeFrame;

const getAllTimeFrameDetails = async (body) => {
  let err, timeFrame, query = { where: { is_active: true } };

  if (isNull(body.time_frame_id) && !Array.isArray(body.time) && !IsValidUUIDV4(body.time_frame_id)) {
    return { message: 'Please select vaild time frame details', success: false };
  }

  if (!isNull(body.org_id)) {
    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
      return { message: checkOrganizationDetails.message, success: false };
    }

    query.where = {
      ...query.where,
      org_id: body.org_id
    }
  }

  if (Array.isArray(body.time)) {
    query.where = {
      ...query.where,
      session_start_time: { [Op.in]: body.time }
    };
  }

  if (IsValidUUIDV4(body.time_frame_id)) {
    query.where = {
      ...query.where,
      _id: body.time_frame_id
    };
  }

  [err, timeFrame] = await to(time_frame.findAll({
    where: query.where,
    include: [
      {
        model: organization,
        as: 'orgId'
      },
      {
        model: discipline,
        as: 'disciplineId'
      },
      {
        model: program,
        as: 'programId'
      },
      {
        model: user_data,
        as: 'createdBy'
      },
      {
        model: user_data,
        as: 'updatedBy'
      }
    ],
    order: [['period', 'ASC']]
  }));

  if (err) {
    return { messgae: err, success: false };
  }

  if (isEmpty(timeFrame)) {
    return { message: "Time Frame not found", success: false };
  }

  return { message: "Time Frame founded", data: timeFrame, success: true };
};

module.exports.getAllTimeFrameDetails = getAllTimeFrameDetails;

exports.updateTimeFrame = async (req, res) => {
  let err, Ftime, Utime;
  let data = req.body;
  const user = req.user;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }
  const validation = validator("time_frame", "update", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  let query = { _id: data.id, is_active: true, is_block: false };
  if (data.org_id) {
    query.org_id = data.org_id;
  }
  if (data.discipline_id) {
    query.discipline_id = data.discipline_id;
  }
  if (data.program_id) {
    query.program_id = data.program_id;
  }
  [err, Ftime] = await to(time_frame.findOne({ where: query }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Ftime)) {
    return ReE(res, { message: 'Time frame not found' }, BAD_REQUEST)
  }
  [err, frameName] = await to(time_frame.findOne({ where: { _id: { [Op.ne]: Ftime._id }, period: data.period, org_id: Ftime.org_id, discipline_id: Ftime.discipline_id, program_id: Ftime.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(frameName)) {
    return ReE(res, { message: 'Time Frame period already exist' }, BAD_REQUEST);
  }
  [err, allFrame] = await to(time_frame.findAll({ where: { _id: { [Op.ne]: Ftime._id }, org_id: Ftime.org_id, discipline_id: Ftime.discipline_id, program_id: Ftime.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(allFrame)) {
    return ReE(res, { message: 'Time Frame not found' }, BAD_REQUEST);
  }
  if (allFrame.length > 0) {
    let s1Date = new Date(`${todays()} ${data.session_start_time}`).getTime();
    let e1Date = new Date(`${todays()} ${data.session_end_time}`).getTime();
    let Invalid = allFrame.filter(x => {
      let sDate = new Date(`${todays()} ${x.session_start_time}`).getTime();
      let eDate = new Date(`${todays()} ${x.session_end_time}`).getTime();
      return ((((s1Date >= sDate) && (s1Date <= eDate))) || (((e1Date >= sDate) && (e1Date <= eDate))));
    })
    if (Invalid.length > 0) {
      return ReE(res, { message: 'Session already exist on this time' }, BAD_REQUEST);
    }
  }
  [err, Utime] = await to(time_frame.update(data, { where: { _id: Ftime._id } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Utime)) {
    return ReE(res, { message: 'Time Frame update failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Timeframe updated successfu;;y' }, OK);
}