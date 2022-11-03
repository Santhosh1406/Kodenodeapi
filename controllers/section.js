const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap, isEmpty } = require("../service/util.service");
const { discipline, organization, user_data, section, course_batch, program, course, department, course_department_mapping, user_subject, subject } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkOrganization, checkDiscipline, checkMenuAccess, checkUserInf } = require("./common");
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { checkCourseBatch } = require("./course_batch");
const { CONFIG } = require("../config/confifData");

const allFields = ["_id", "name", "org_id", "discipline_id", "course_batch_id", "program_id", "course_id", "department_id", "cdm_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "cdm_id", "course_batch_id"];
const updateRequiredFields = ["_id"];

exports.addSection = async (req, res) => {
  let err, sections, sectionName, orgId, disId, proId, courseId, departmentId, cdmId, data, batch;
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
  const validation = validator("section", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, cdmId] = await to(course_department_mapping.findOne({ where: { _id: data.cdm_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(cdmId)) {
    return ReE(res, { message: 'Coruse Department Mapping not found' }, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  data.org_id = cdmId.org_id;
  data.discipline_id = cdmId.discipline_id;
  data.program_id = cdmId.program_id;
  data.course_id = cdmId.course_id;
  data.department_id = cdmId.department_id;
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
  [err, proId] = await to(program.findOne({ where: { _id: data.program_id, discipline_id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(proId)) {
    return ReE(res, { message: 'Program not found' }, BAD_REQUEST);
  }
  [err, courseId] = await to(course.findOne({ where: { _id: data.course_id, program_id: data.program_id, discipline_id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseId)) {
    return ReE(res, { message: 'Course not found' }, BAD_REQUEST);
  }
  [err, departmentId] = await to(department.findOne({ where: { _id: data.department_id, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findOne({ where: { _id: data.course_batch_id, cdm_id: cdmId._id, org_id: cdmId.org_id, discipline_id: disId._id, program_id: proId._id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(batch)) {
    return ReE(res, { message: 'Course batch not found' }, BAD_REQUEST);
  }
  [err, sectionName] = await to(section.findOne({ where: { name: data.name, course_batch_id: batch._id, org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id, department_id: data.department_id, course_id: data.course_id, cdm_id: data.cdm_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(sectionName)) {
    return ReE(res, { message: 'Section Already Exist' }, BAD_REQUEST);
  }
  [err, sections] = await to(section.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sections)) {
    return ReE(res, { message: 'Section creation failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Section created successfully' }, OK);
}

exports.getAllSection = async (req, res) => {
  let err, sections, data, query, filter;
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
  if (!isNull(data.cdm_id)) {
    query.cdm_id = data.cdm_id;
  }
  if (!isNull(data.course_batch_id)) {
    query.course_batch_id = data.course_batch_id;
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
      query = {
        ...query,department_id: { [Op.in]: department }
      };
      if (!isNull(req.query.program_id)) {
        query = {
          ...query, program_id: req.query.program_id
        };
      }
    }
  };

  if (!user.owner) {

    let checkUserInfo = await checkUserInf({ user_id: user._id });

    if (!checkUserInfo.success) {
      return ReE(res, { message: checkUserInfo.message }, BAD_REQUEST);
    }

    if (checkUserInfo.userInfo.course_batch_id && isNull(data.section_id)) {
      return ReE(res, { message: "Your Section not yet mapped!." }, BAD_REQUEST);
    }

    if (!isNull(data.section_id)) query._id = checkUserInfo.userInfo.section_id;

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
        model: course_department_mapping,
        as: 'cdmId'
      },
      {
        model: course_batch,
        as: 'courseBatchId'
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
  [err, sections] = await to(section.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return ReE(res, { message: "Section are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Sections founded", data: sections }, OK);
}

exports.getOneSection = async (req, res) => {
  let err, sections, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Section id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid section id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, sections] = await to(section.findOne({
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
        model: course,
        as: 'courseId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course_department_mapping,
        as: 'cdmId'
      },
      {
        model: course_batch,
        as: 'courseBatchId'
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
  if (isNull(sections)) {
    return ReE(res, { message: "Section not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Section founded", data: sections }, OK);
};

const checkSection = async (body) => {

  let err, sections, query = { where: getQuery(body) };

  if (isNull(body.section_id) || !IsValidUUIDV4(body.section_id)) {
    return { message: 'Invalid section id', success: false };
  }

  if (!isNull(body.org_id)) {
    checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
      return { message: checkOrganizationDetails.message, success: false };
    }

    query.where = {
      ...query.where,
      org_id: body.org_id
    }
  }

  if (!isNull(body.discipline_id)) {

    const { checkDiscipline } = require('./discipline');

    let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

    if (!checkDisciplineDetails.success) {
      return { message: checkDisciplineDetails.message, success: false };
    }

    query.where = {
      ...query.where,
      discipline_id: body.discipline_id
    }
  }

  if (!isNull(body.program_id)) {
    let checkProgramDetails = await checkProgram({ program_id: body.program_id });

    if (!checkProgramDetails.success) {
      return { message: checkProgramDetails.message, success: false };
    }

    query.where = {
      ...query.where,
      program_id: body.program_id
    }

  }

  if (!isNull(body.cdm_id)) {
    let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id });

    if (!checkCourseDepartmentDetails.success) {
      return { message: checkCourseDepartmentDetails.message, success: false };
    }
    query.where = {
      ...query.where,
      cdm_id: body.cdm_id
    }
  }

  if (!isNull(body.course_batch_id)) {
    let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id });
    if (!checkCourseBatchDetails.success) {
      return { message: checkCourseBatchDetails.message, success: false };
    }
    query.where = {
      ...query.where,
      course_batch_id: body.course_batch_id
    }
  }

  query.where = {
    ...query.where,
    _id: body.section_id
  };

  [err, sections] = await to(section.findOne({
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
        model: course,
        as: 'courseId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course_department_mapping,
        as: 'cdmId'
      },
      {
        model: course_batch,
        as: 'courseBatchId'
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
    return { message: err, success: false };
  }
  if (isNull(sections)) {
    return { message: "Section not found", success: false };
  }

  if (sections.is_block) {
    return { message: "Section was blocked!.", success: false };
  }

  return { message: "Section founded", section: sections, success: true };
};

module.exports.checkSection = checkSection;

exports.updateSec = async (req, res) => {
  let err, SEfind, SEupdate, Efind;
  const user = req.user;
  let data = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }
  const validation = await validator("section", "update", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  let query = { _id: data.id, org_id: data.org_id, discipline_id: data.discipline_id, cdm_id: data.cdm_id, course_batch_id: data.course_batch_id, is_active: true, is_block: false };
  if (!isNull(data.department_id)) {
    query.department_id = data.department_id;
  }
  [err, SEfind] = await to(section.findOne({ where: query }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(SEfind)) {
    return ReE(res, { message: 'Section not found' }, BAD_REQUEST)
  }
  [err, Efind] = await to(section.findOne({ where: { _id: { [Op.ne]: SEfind._id }, course_batch_id: SEfind.course_batch_id, is_active: true, is_active: false, name: data.name } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(Efind)) {
    return ReE(res, { message: 'Section name already exist' }, BAD_REQUEST);
  }
  [err, SEupdate] = await to(section.update({ name: data.name }, { where: { _id: SEfind._id } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(SEupdate)) {
    return ReE(res, { message: 'Section update failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Section updated successfully' }, OK);
}