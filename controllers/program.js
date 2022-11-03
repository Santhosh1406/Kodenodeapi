const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull } = require("../service/util.service");
const { discipline, organization, program, user_data, program_master } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkDiscipline, checkMenuAccess } = require("./common");
const { CONFIG } = require("../config/confifData");

const allFields = ["_id", "program_id", "name", "description", "logo", "org_id", "discipline_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "org_id", "description", "discipline_id"];
const updateRequiredFields = ["_id", "program_id"]

exports.getAllProgram = async (req, res) => {
  let err, programs, data, query, filter;
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
    query._id = data.program_id;
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
        model: program_master,
        as: 'programMaster'
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
  [err, programs] = await to(program.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!programs || !Array.isArray(programs) || programs.length === 0) {
    return ReE(res, { message: "Programs are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Programs founded", data: programs }, OK);
};

exports.getOneProgram = async (req, res) => {
  let err, programs, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Program id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid program id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, programs] = await to(program.findOne({
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
  if (!programs || !programs._id) {
    return ReE(res, { message: "Program are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Program founded", data: programs }, OK);
};

exports.createProgram = async (req, res) => {
  let err, org, dis, programs, programId, programAdd, data, program_Id, idSub, proMas;
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
  const validation = validator("program", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, dis] = await to(discipline.findOne({ where: { _id: data.discipline_id, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(dis)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST);
  }
  [err, proMas] = await to(program_master.findOne({ where: { _id: data.name, discipline_master_id: dis.discipline_master, org_id: { [Op.or]: [ null, data.org_id ] }, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(proMas)) {
    return ReE(res, { message: 'Program master not found' }, BAD_REQUEST);
  }
  data.name = proMas.name;
  data.program_master = proMas._id;
  data.org_id = dis.org_id;
  [err, org] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(org)) {
    return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
  }
  [err, programs] = await to(program.findOne({ where: { name: data.name, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(programs)) {
    return ReE(res, { message: 'Program name was already exist' }, BAD_REQUEST);
  }
  program_Id = `${String(data.name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0, 3).toUpperCase()}${String(dis.discipline_id).substring(3, String(dis.discipline_id).length)}`;
  [err, programId] = await to(program.findAll({ where: { program_id: { [Op.iLike]: `${program_Id}%` } } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!programId && !Array.isArray(programId)) {
    return ReE(res, { message: 'Something went wrong' }, BAD_REQUEST);
  }
  idSub = programId?.length === 0 ? `${program_Id}` : `${program_Id}${programId?.length}`;
  data.program_id = idSub;
  data.is_active = true;
  data.createdby = user._id;
  data.is_block = false;
  [err, programAdd] = await to(program.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(programAdd)) {
    return ReE(res, { message: 'Program create failed' }, BAD_REQUEST);
  }
  return ReS(res, { messsage: 'Program Created Successfully' }, OK);
}

const checkProgram = async (body) => {

  if (isNull(body.program_id) || !IsValidUUIDV4(body.program_id)) {
    return { message: "Please select program details!.", success: false };
  }

  let checkProgramDetails, optionProgram = {
    where: {
      _id: body.program_id,
      is_active: true
    }
  };

  if (!isNull(body.discipline_id)) {
    let disciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

    if (!disciplineDetails.success) {
      return { message: "Please select vaild discipline details!.", success: false };
    }

    optionProgram.where = {
      ...optionProgram.where,
      discipline_id: body.discipline_id
    }
  }

  [err, checkProgramDetails] = await to(program.findOne(optionProgram))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkProgramDetails)) {
    return { message: "Please select program details!.", success: false };
  }

  if (checkProgramDetails.is_block) {
    return { message: "Program details was blocked!.", success: false };
  }

  if (!isNull(checkProgramDetails)) {
    return { message: "Program was fetched!.", programDetails: checkProgramDetails, success: true };
  }
}

module.exports.checkProgram = checkProgram;