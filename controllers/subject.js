const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline, organization, user_data, subject, department, group } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkDepartment } = require("./department");
const { CONFIG } = require("../config/confifData");

const allFields = ["_id", "name", "code", "description", "org_id", "discipline_id", "department_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "code", "description", "department_id"];
const updateRequiredFields = ["_id", "code"];

module.exports.addSubject = async (req, res) => {
  let err, org, data, disciplineId, departmentId, subCode, subCreate, subName;
  const user = req.user;
  data = req.body;


  if (!user.owner) {

    const { checkMenuAccess } = require('./common');

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
  const validation = validator("subject", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  [err, departmentId] = await to(department.findOne({ where: { _id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  data.org_id = data.org_id;
  data.discipline_id = data.discipline_id;
  [err, org] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(org)) {
    return ReE(res, { message: 'Organization not found' }, BAD_REQUEST);
  }
  [err, disciplineId] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(disciplineId)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST);
  }
  [err, subName] = await to(subject.findOne({ where: { name: data.name, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(subName)) {
    return ReE(res, { message: 'Subject Name already exist' }, BAD_REQUEST);
  }
  [err, subCode] = await to(subject.findOne({ where: { code: data.code, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(subCode)) {
    return ReE(res, { message: 'Subject Code already exist' }, BAD_REQUEST);
  }
  data.is_active = true;
  data.is_block = false;
  data.createdby = user._id;
  [err, subCreate] = await to(subject.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subCreate)) {
    return ReE(res, { message: 'Subject Creation failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Subject created successfully' }, OK);
}

exports.getAllSubject = async (req, res) => {
  let err, subjects, data, query, filter;
  const user = req.user;
  data = req.query;

  if (!user.owner) {
    const { checkMenuAccess } = require('./common')
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
        model: department,
        as: 'departmentId'
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
  [err, subjects] = await to(subject.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return ReE(res, { message: "Subjects are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Subjects founded", data: subjects }, OK);
};

exports.getOneSubject = async (req, res) => {
  let err, subjects, data, query = { is_active: true, is_block: false };
  const user = req.user;
  data = req.query;

  if (!user.owner) {
    const { checkMenuAccess } = require('./common');
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }

  if (!data.id || typeof data.id !== "string") {
    return ReE(res, { message: "Subject id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid subject id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, subjects] = await to(subject.findOne({
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
        model: department,
        as: 'departmentId'
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
  if (!subjects || !subjects._id) {
    return ReE(res, { message: "Subject not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Subject founded", data: subjects }, OK);
};


const checkSubject = async (body) => {

  if (isNull(body.subject_id) || !IsValidUUIDV4(body.subject_id)) {
    return { message: "Please select subject details!.", success: false };
  }

  let checkSubjectDetails, optionSubject = {
    where: getQuery(body)
  };

  if (!isNull(body.department_id)) {
    let departmentDetails = await checkDepartment({ department_id: body.department_id });

    if (!departmentDetails.success) {
      return { message: "Please select vaild department details!.", success: false };
    }

    optionSubject.where = {
      ...optionSubject.where,
      department_id: body.department_id
    };

  }

  optionSubject.where = {
    ...optionSubject.where,
    _id: body.subject_id,
    is_active: true
  };

  [err, checkSubjectDetails] = await to(subject.findOne(optionSubject));

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkSubjectDetails)) {
    return { message: "Subject details was not found!.", success: false };
  }

  if (checkSubjectDetails.is_block) {
    return { message: "Subject details was blocked!.", success: false };
  }

  if (!isNull(checkSubjectDetails)) {
    return { message: "Subject was fetched!.", subjectDetails: checkSubjectDetails, success: true };
  }
}

module.exports.checkSubject = checkSubject;

exports.updateSub = async(req, res) => {
  let err, Sfind, Ufind, existFind;
  let data = req.body;
  const user = req.user;
  const { checkMenuAccess } = require('./common');
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      data = checkMenuUserDetails.body;
    }
  }
  const validation = await validator("subject", "update", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  [err, Sfind] = await to(subject.findOne({ where: { _id: data.id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(Sfind)){
    return ReE(res, { message: 'Subject not found' }, BAD_REQUEST);
  }
  [err, existFind] = await to(subject.findOne({ where: { _id: { [Op.ne]: data.id }, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, name: data.name, is_active: true, is_block: false } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(!isNull(existFind)){
    return ReE(res, { message: 'Subject name already exist' }, BAD_REQUEST);
  }
  [err, Ufind] = await to(subject.update({ name: data.name, description: data.description }, { where: { _id: Sfind._id } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(Ufind)){
    return ReE(res, { message: 'Subject update failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Subject updated successfully' }, OK);
}