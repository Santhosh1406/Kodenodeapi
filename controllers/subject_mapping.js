const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, isEmpty } = require("../service/util.service");
const { discipline, organization, batch_sem, course_batch, program, user_data, subject, course_department_mapping, department, subject_mapping, course, user_subject } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkCourseBatch } = require("./course_batch");
const { checkBatchSemester } = require("./batch_sem");
const { checkSection } = require("./section");
const { checkOrganization, checkDiscipline, checkMenuAccess } = require("./common");
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { CONFIG } = require("../config/confifData");

const allFields = ["_id", "year", "semester", "description", "cdm_id", "subject_id", "sub_department_id", "org_id", "discipline_id", "program_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["course_batch_id", "batch_sem_id", "description", "cdm_id", "subject_id"];
const updateRequiredFields = ["_id"];

exports.addSubjectMapping = async (req, res) => {
  let err, subjectAdd, data, orgId, dis, programId, subDepartmentId, subjectId, cdmId, subMap, departmentId, courseId, batch, sem;
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
  const validation = validator("subject_mapping", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, subjectId] = await to(subject.findOne({ where: { _id: data.subject_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subjectId)) {
    return ReE(res, { message: 'Subject not found' }, BAD_REQUEST);
  }
  [err, cdmId] = await to(course_department_mapping.findOne({ where: { _id: data.cdm_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(cdmId)) {
    return ReE(res, { message: 'Course Department mapping not found' }, BAD_REQUEST);
  }
  if (cdmId.org_id !== subjectId.org_id || cdmId.discipline_id !== subjectId.discipline_id) {
    return ReE(res, { message: 'Provoid valid Institution and discipline details' }, BAD_REQUEST);
  }
  [err, departmentId] = await to(department.findOne({ where: { _id: cdmId.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findOne({ where: { _id: data.course_batch_id, cdm_id: cdmId._id, org_id: cdmId.org_id, discipline_id: cdmId.discipline_id, program_id: cdmId.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(batch)) {
    return ReE(res, { message: 'Course batch not found' }, BAD_REQUEST);
  }
  [err, sem] = await to(batch_sem.findOne({ where: { _id: data.batch_sem_id, course_batch_id: batch._id, cdm_id: cdmId._id, org_id: cdmId.org_id, discipline_id: cdmId.discipline_id, program_id: cdmId.program_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sem)) {
    return ReE(res, { message: 'Batch Semester not found' }, BAD_REQUEST);
  }
  [err, courseId] = await to(course.findOne({ where: { _id: cdmId.course_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(courseId)) {
    return ReE(res, { message: 'Course not found' }, BAD_REQUEST);
  }
  if ((parseInt(cdmId.total_year) * 2) < data.se) {
    return ReE(res, { message: 'Invalid semester' }, BAD_REQUEST);
  }
  data = {
    ...data,
    course_batch_id: batch._id,
    batch_sem_id: sem._id,
    sub_department_id: subjectId.department_id,
    org_id: cdmId.org_id,
    discipline_id: cdmId.discipline_id,
    program_id: cdmId.program_id,
    department_id: cdmId.department_id,
    course_id: cdmId.course_id,
    is_active: true,
    is_block: false,
    createdby: user._id
  };
  [err, orgId] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(orgId)) {
    return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
  }
  [err, dis] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(dis)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST);
  }
  [err, programId] = await to(program.findOne({ where: { _id: data.program_id, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR)
  }
  if (isNull(programId)) {
    return ReE(res, { message: 'Program not found' }, BAD_REQUEST);
  }
  [err, subDepartmentId] = await to(department.findOne({ where: { _id: data.sub_department_id, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subDepartmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  [err, subMap] = await to(subject_mapping.findOne({ where: { course_batch_id: batch._id, batch_sem_id: sem._id, org_id: data.org_id, discipline_id: data.discipline_id, program_id: data.program_id, cdm_id: data.cdm_id, subject_id: data.subject_id, sub_department_id: data.sub_department_id } }))
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(subMap)) {
    return ReE(res, { message: 'Subject already mapped for this semester' }, BAD_REQUEST);
  }
  [err, subjectAdd] = await to(subject_mapping.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subjectAdd)) {
    return ReE(res, { message: 'Subject Mapping failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Subject Mapped successfully' }, OK);
}

exports.getAllSubjectMapping = async (req, res) => {
  let err, subjects, data, query, filter;
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
  if (!isNull(data.sub_department_id)) {
    query.sub_department_id = data.sub_department_id;
  }
  if (!isNull(data.subject_id)) {
    query.subject_id = data.subject_id;
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
  if (!isNull(data.batch_sem_id)) {
    query.batch_sem_id = data.batch_sem_id;
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
        ...query, department_id: { [Op.in]: department }
      };
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
        as: "programId"
      },
      {
        model: department,
        as: 'sub_departmentId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: subject,
        as: 'subjectId'
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
        model: batch_sem,
        as: 'batchSemId'
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
  [err, subjects] = await to(subject_mapping.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return ReE(res, { message: "Subjects Mapping are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Subjects Mapping founded", data: subjects }, OK);
};

exports.getOneSubjectMapping = async (req, res) => {
  let err, subjects, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Subject Mapping id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid subject Mapping id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, subjects] = await to(subject_mapping.findOne({
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
        as: "programId"
      },
      {
        model: department,
        as: 'sub_departmentId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: subject,
        as: 'subjectId'
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
        model: batch_sem,
        as: 'batchSemId'
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
  if (!subjects || !subjects._id) {
    return ReE(res, { message: "Subject Mapping not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Subject Mapping founded", data: subjects }, OK);
};

const checkSubjectMapping = async (body) => {
  let err, subjects, query = { where: { is_active: true } };

  if (!isNull(body.subject_id)) {
    if (!IsValidUUIDV4(body.subject_id)) {
      return { message: 'Please select vaild subject details!.', success: false };
    }
  }

  query.where = {
    ...query.where,
    subject_id: body.subject_id
  };

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

  if (!isNull(body.batch_sem_id)) {
    let checkBatchSemDetails = await checkBatchSemester({ batch_sem_id: body.batch_sem_id, from: 'persent' });

    if (!checkBatchSemDetails.success) {
      return ReE(res, { message: checkBatchSemDetails.message }, BAD_REQUEST);
    }

  }

  [err, subjects] = await to(subject_mapping.findOne({
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
        as: "programId"
      },
      {
        model: department,
        as: 'sub_departmentId'
      },
      {
        model: department,
        as: 'departmentId'
      },
      {
        model: course,
        as: 'courseId'
      },
      {
        model: subject,
        as: 'subjectId'
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
        model: batch_sem,
        as: 'batchSemId'
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

  if (isNull(subjects)) {
    return { message: "Subject Mapping not found", success: false };
  }

  if (subjects.is_block) {
    return { message: "Subject was blocked", success: false };
  }

  return { message: "Subject Mapping founded", data: subjects, success: true };
};

module.exports.checkSubjectMapping = checkSubjectMapping;