const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap, isEmpty } = require("../service/util.service");
const { discipline, organization, program, user_data, department, course, course_department_mapping, course_duration, course_sem_duration, user_subject, subject } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkProgram } = require("./program");
const { CONFIG } = require("../config/confifData");
const { checkMenuAccess } = require('./common');

const allFields = ["_id", "name", "description", "org_id", "discipline_id", "program_id", "department_id", "total_year", "course_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["description", "department_id", 'course_duration_id', 'course_sem_duration_id', "course_id"];
const updateRequiredFields = ["_id"];

exports.addCDM = async (req, res) => {
  let err, courseDept, data, courseId, departmentId, courseCode, courseName, orgId, disId;
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
  const validation = validator("course_department_mapping", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, departmentId] = await to(department.findOne({ where: { _id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  [err, courseId] = await to(course.findOne({ where: { _id: data.course_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseId)) {
    return ReE(res, { message: 'Course not found' }, BAD_REQUEST);
  }
  if (departmentId.org_id !== courseId.org_id || departmentId.discipline_id !== courseId.discipline_id) {
    return ReE(res, { message: 'Provoid valid department, course details' }, BAD_REQUEST);
  }
  let errcoD, couDFind;
  [errcoD, couDFind] = await to(course_duration.findOne({ where: { _id: data.course_duration_id, org_id: { [Op.or]: [null, departmentId.org_id] }, is_active: true, is_block: false } }));
  if (errcoD) {
    return ReE(res, errcoD, INTERNAL_SERVER_ERROR);
  }
  if (isNull(couDFind)) {
    return ReE(res, { message: 'Course Duration not found' }, BAD_REQUEST);
  }
  let errCSD, csdFind;
  [errCSD, csdFind] = await to(course_sem_duration.findOne({ where: { _id: data.course_sem_duration_id, org_id: { [Op.or]: [null, departmentId.org_id] }, is_active: true, is_block: false } }));
  if (errCSD) {
    return ReE(res, errCSD, INTERNAL_SERVER_ERROR);
  }
  if (isNull(csdFind)) {
    return ReE(res, { message: 'Course Semester Duration not found' }, BAD_REQUEST);
  }
  data.course_sem_duration_id = csdFind._id;
  data.course_duration_id = couDFind._id;
  data.total_year = String(couDFind.duration);
  data.program_id = courseId.program_id;
  data.org_id = courseId.org_id;
  data.discipline_id = courseId.discipline_id;
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
  [err, proId] = await to(program.findOne({ where: { _id: data.program_id, discipline_id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(proId)) {
    return ReE(res, { message: 'Program not found' }, BAD_REQUEST)
  }
  let code = `${String(orgId.org_name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0, 3).toUpperCase()}${orgId.year_of_foundation}CDM`;
  data.is_active = true;
  data.is_block = false;
  data.name = firstCap(`${courseId.name}-${departmentId.name}`);
  data.createdby = user._id;
  [err, courseName] = await to(course_department_mapping.findOne({ where: { org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id, course_id: data.course_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(courseName)) {
    return ReE(res, { message: 'Course already mapped' }, BAD_REQUEST);
  }
  [err, courseCode] = await to(course_department_mapping.findAll({ where: { code: { [Op.iLike]: `${code}%` } } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseCode)) {
    return ReE(res, { message: 'Course Department Mapping not found' }, BAD_REQUEST);
  }
  data.code = `${code}${(courseCode.length + 1)}`;
  [err, courseDept] = await to(course_department_mapping.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseDept)) {
    return ReE(res, { message: 'Course Department Mapping Failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Course Department mapped Successfully' }, OK);
}

exports.getAllCourseDepartment = async (req, res) => {
  let err, courseDepartment, data, query, filter;
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
  if (!isNull(data.department_id)) {
    query.department_id = data.department_id;
  }
  if (!isNull(data.program_id)) {
    query.program_id = data.program_id;
  }
  if (!isNull(data.course_id)) {
    query.course_id = data.course_id;
  }

  if (!isNull(query.department_id)) {
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
        query = {
          ...query, department_id: { [Op.in]: department }
        };
      }
    };

  }

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
        as: "programId"
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course_duration,
        as: 'courseDuration'
      },
      {
        model: course_sem_duration,
        as: 'courseSemDuration'
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
  [err, courseDepartment] = await to(course_department_mapping.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!courseDepartment || !Array.isArray(courseDepartment) || courseDepartment.length === 0) {
    return ReE(res, { message: "Course Department Mappings are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Course Department Mappings founded", data: courseDepartment }, OK);
};

exports.getOneCourseDepartment = async (req, res) => {
  let err, courseDepartment, data, query = { is_active: true, is_block: false };
  const user = req.user;
  data = req.query;

  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }

  if (!data.id || typeof data.id !== "string") {
    return ReE(res, { message: "Course Department Mapping id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid Course Department Mapping id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, courseDepartment] = await to(course_department_mapping.findOne({
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
        module: course_duration,
        as: 'courseDuration'
      },
      {
        model: program,
        as: 'programId'
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course_duration,
        as: 'courseDuration'
      },
      {
        model: course_sem_duration,
        as: 'courseSemDuration'
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
  if (isNull(courseDepartment)) {
    return ReE(res, { message: "Course not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Course founded", data: courseDepartment }, OK);
};

const checkCourseDepart = async (body) => {

  if (isNull(body.cdm_id) || !IsValidUUIDV4(body.cdm_id)) {
    return { message: "Please select vaild course department details!.", success: false };
  }

  let checkCdm, optionCdm = {
    where: {
      _id: body.cdm_id,
      is_active: true
    },
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
        as: "programId"
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course_duration,
        as: 'courseDuration'
      },
      {
        model: course_sem_duration,
        as: 'courseSemDuration'
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

  if (!isNull(body.program_id)) {
    let progamDetails = await checkProgram({ program_id: body.program_id });

    if (!progamDetails.success) {
      return { message: "Please select vaild program details!.", success: false };
    }

    optionCdm.where = {
      ...optionCdm.where,
      program_id: body.program_id
    }
  }

  [err, checkCdm] = await to(course_department_mapping.findOne(optionCdm))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkCdm)) {
    return { message: "Course department details not found!.", success: false };
  }

  if (checkCdm.is_block) {
    return { message: "Course department details was blocked!.", success: false };
  }

  if (!isNull(checkCdm)) {
    return { message: "Course department details was fetched!.", courseDepartment: checkCdm, success: true };
  }
}

module.exports.checkCourseDepart = checkCourseDepart;