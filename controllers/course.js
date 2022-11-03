const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline, organization, program, user_data, course, course_master } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { CONFIG } = require("../config/confifData");
const { checkMenuAccess } = require('./common');

const allFields = ['_id', 'course_id', 'name', 'description', 'logo', 'org_id', 'discipline_id', 'program_id', 'is_active', 'is_block', 'createdby', 'updatedby', 'createddate', 'updateddate'];
const createRequiredFields = ['name', 'description', 'program_id'];
const updateRequiredFields = ['_id', 'course_id'];

exports.addCourse = async (req, res) => {
  let err, courseName, orgId, disciplineId, programId, couserId, data, course_id, removeSpl, idSub, courseCreate, couMas;
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

  const InvalidFields = await createRequiredFields.filter((x) => isNull(data[x]));
  if (InvalidFields.length > 0) {
    return ReE(res, { message: `${InvalidFields} not valid data` }, BAD_REQUEST);
  }
  [err, couMas] = await to(course_master.findOne({ where: { _id: data.name, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(couMas)) {
    return ReE(res, { message: 'Course master not found' }, BAD_REQUEST);
  }
  data.name = couMas.name;
  data.course_master = couMas._id;
  const validation = await validator("course", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, programId] = await to(program.findOne({ where: { _id: data.program_id, is_active: true, is_block: false } }))
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(programId)) {
    return ReE(res, { message: 'Program not found' }, BAD_REQUEST);
  }
  data.org_id = programId.org_id;
  data.discipline_id = programId.discipline_id;
  [err, orgId] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(orgId)) {
    return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
  }
  [err, disciplineId] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(disciplineId)) {
    return ReE(res, { message: 'Disicpline not found' }, BAD_REQUEST);
  }
  [err, courseName] = await to(course.findOne({ where: { name: data.name, org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(courseName)) {
    return ReE(res, { message: 'Course Name already exist' }, BAD_REQUEST);
  }
  removeSpl = String(`${data.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
  course_id = `${String(removeSpl).substring(0, 3).toUpperCase()}${String(orgId.org_id).substring(3, String(orgId.org_id).length)}`;
  [err, couserId] = await to(course.findAll({ where: { course_id: { [Op.iLike]: `${course_id}%` } } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(couserId)) {
    return ReE(res, { message: 'Something went wrong' }, BAD_REQUEST);
  }
  idSub = couserId.length === 0 ? `${course_id}` : `${course_id}${couserId.length}`;
  data.course_id = idSub;
  data.is_active = true;
  data.createdby = user._id;
  data.is_block = false;
  [err, courseCreate] = await to(course.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseCreate)) {
    return ReE(res, { message: 'Course Creation Failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Course Created Successfully' }, OK);
}


exports.getAllCourse = async (req, res) => {
  let err, courses, data, query, filter;
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
  filter = {
    where: query,
    order: [['createddate', 'ASC'], ['course_id', 'ASC']],
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
        model: course_master,
        as: 'courseMaster'
      },
      {
        model: program,
        as: "programId"
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
  };
  if (!isNull(data.limit) && !isNull(data.page)) {
    filter.limit = data.limit;
    filter.offset = (data.page * (data.page - 1));
  };
  [err, courses] = await to(course.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return ReE(res, { message: "Courses are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Courses founded", data: courses }, OK);
};

exports.getOneCourse = async (req, res) => {
  let err, courses, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Course id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid course id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, courses] = await to(course.findOne({
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
        as: 'createdBy',
        attributes: ['_id', 'username']
      },
      {
        model: user_data,
        as: 'updatedBy',
        attributes: ['_id', 'username']
      }
    ]
  }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!courses || !courses._id) {
    return ReE(res, { message: "Course not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Course founded", data: courses }, OK);
};

const checkCourse = async (body) => {

  if (isNull(body.course_id)) {
    return { message: "Please select course details!.", success: false };
  }

  let checkCourseDetails, optionCourse = {
    where: {
      _id: body.course_id,
      is_active: true
    }
  };

  if (!isNull(body.program_id)) {
    let progamDetails = await checkProgram({ program_id: body.program_id });

    if (!progamDetails.success) {
      return { message: "Please select vaild program details!.", success: false };
    }

    optionCourse.where = {
      ...optionCourse.where,
      program_id: body.program_id
    }
  }

  [err, checkCourseDetails] = await to(course.findOne(optionCourse))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkCourseDetails)) {
    return { message: "Please select course details!.", success: false };
  }

  if (checkCourseDetails.is_block) {
    return { message: "Course  details was blocked!.", success: false };
  }

  if (!isNull(checkCourseDetails)) {
    return { message: "Course was fetched!.", courseDetails: checkCourseDetails, success: true };
  }
}

module.exports.checkCourse = checkCourse;