const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull } = require("../service/util.service");
const { discipline, organization, program, user_data, department, department_master } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkDiscipline, checkMenuAccess } = require("./common");
const { CONFIG } = require("../config/confifData");

const allFields = ["_id", "department_id", "name", "description", "logo", "org_id", "discipline_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "description", "discipline_id"];
const updateRequiredFields = ['_id', 'department_id'];

module.exports.addDepartment = async (req, res) => {
  let err, orgId, disciplineId, data, departmentId, departmentName, department_id, removeSpl, idSub, departmentCreate, depMas;
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
  [err, depMas] = await to(department_master.findOne({ where: { _id: data.name, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR)
  }
  if (isNull(depMas)) {
    return ReE(res, { message: 'Department master not found' }, BAD_REQUEST);
  }
  data.name = depMas.name;
  data.department_master = depMas._id;
  const validation = validator("department", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, disciplineId] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }))
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(disciplineId)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST)
  }
  data.org_id = disciplineId.org_id;
  [err, orgId] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(orgId)) {
    return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
  }
  [err, departmentName] = await to(department.findOne({ where: { name: data.name, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(departmentName)) {
    return ReE(res, { message: 'Department Name name already exist' }, BAD_REQUEST);
  }
  removeSpl = String(`${data.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
  department_id = `${String(removeSpl).substring(0, 3).toUpperCase()}${String(orgId.org_id).substring(3, String(orgId).length)}`;
  [err, departmentId] = await to(department.findAll(({ where: { department_id: { [Op.iLike]: `${department_id}%` } } })));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Somthing went wrong' }, BAD_REQUEST);
  }
  idSub = departmentId.length === 0 ? `${department_id}` : `${department_id}${departmentId.length}`;
  data.department_id = idSub;
  data.is_active = true;
  data.createdby = user._id;
  data.is_block = false;
  [err, departmentCreate] = await to(department.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentCreate)) {
    return ReE(res, { message: 'Department Creation Failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Department Created Successfully' }, OK);
}

module.exports.getAllDepartment = async (req, res) => {
  let err, departments, data, query, filter;
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

  query = getQuery(data);
  if (!isNull(data.org_id)) {
    query.org_id = data.org_id;
  }
  if (!isNull(data.discipline_id)) {
    query.discipline_id = data.discipline_id;
  }

  if (!isNull(data.department_id)) {
    if (typeof data.department_id !== "string" || !IsValidUUIDV4(data.department_id)) {
      return ReE(res, { message: 'Valid Department id is must' }, BAD_REQUEST)
    }

    let checkDepartmentDetails = await checkDepartment({ department_id: data.department_id });

    if (!checkDepartmentDetails.success) {
      return ReE(res, { message: checkDepartmentDetails.message }, BAD_REQUEST);
    }

    query._id = data.department_id;
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
        model: department_master,
        as: 'departmentMaster'
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
  [err, departments] = await to(department.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!departments || !Array.isArray(departments) || departments.length === 0) {
    return ReE(res, { message: "Departments are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Departments founded", data: departments }, OK);
};

module.exports.getOneDepartment = async (req, res) => {
  let err, departments, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Department id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid department id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, departments] = await to(department.findOne({
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
  if (!departments || !departments._id) {
    return ReE(res, { message: "Department not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Department founded", data: departments }, OK);
};

const checkDepartment = async (body) => {

  if (isNull(body.department_id)) {
    return { message: "Please select department details!.", success: false };
  }

  let checkDepartmentDetails, optionDepartment = {
    where: {
      _id: body.department_id,
      is_active: true
    }
  };

  if (!isNull(body.discipline_id)) {
    
    const { checkDiscipline } = require('./discipline');
    let disciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

    if (!disciplineDetails.success) {
      return { message: "Please select vaild discipline details!.", success: false };
    }

    optionDepartment.where = {
      ...optionDepartment.where,
      discipline_id: body.discipline_id
    }
  }

  [err, checkDepartmentDetails] = await to(department.findOne(optionDepartment))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkDepartmentDetails)) {
    return { message: "Department was not found!.", success: false };
  }

  if (checkDepartmentDetails.is_block) {
    return { message: "Department details was blocked!.", success: false };
  }

  if (!isNull(checkDepartmentDetails)) {
    return { message: "Department was fetched!.", departmentDetails: checkDepartmentDetails, success: true };
  }
}

module.exports.checkDepartment = checkDepartment;