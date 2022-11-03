const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull } = require("../service/util.service");
const { discipline, organization, user_data, discipline_master } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkDepartment } = require("./department");
const { checkOrganization } = require("./common");
const { CONFIG } = require("../config/confifData");
const { checkMenuAccess } = require('./common');

const allFields = ["_id", "discipline_id", "description", "name", "logo", "org_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["description", "name", "org_id", "logo"];
const updateRequiredFields = ["_id", "discipline_id"];
const updateAbleFields = ["description", "name"];

exports.getAllDiscipline = async (req, res) => {
  let err, dis, data, query, filter;
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
    query = { ...query, org_id: data.org_id };
  }

  if (!isNull(data.discipline_id)) {
    query = { ...query, _id: data.discipline_id };
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
        model: discipline_master,
        as: 'disciplineMaster'
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
  }
  [err, dis] = await to(discipline.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!dis || !Array.isArray(dis) || dis.length === 0) {
    return ReE(res, { message: "Discipline are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Discipline founded", data: dis }, OK);
};

exports.getOneDiscipline = async (req, res) => {
  let err, dis, data, query = { is_active: true, is_block: false };
  const user = req.user;
  data = req.query;
  if (!data.id || typeof data.id !== "string") {
    return ReE(res, { message: "Discipline id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid discipline id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, dis] = await to(
    discipline.findOne({
      where: query,
      include: [
        {
          model: organization,
          as: 'orgId'
        },
        {
          model: discipline_master,
          as: 'disciplineMaster'
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
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!dis || !dis._id) {
    return ReE(res, { message: "Discipline not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Discipline founded", data: dis }, OK);
};

exports.addDiscipline = async (req, res) => {
  let err, dis, disId, org, disCreate, data, disMas;
  const user = req.user;
  data = req.body;
  const InvalidFields = createRequiredFields.filter(x => isNull(data[x]));
  if (InvalidFields.length > 0) {
    return ReE(res, { message: `${InvalidFields} not valid data` }, BAD_REQUEST);
  }
  [err, disMas] = await to(discipline_master.findOne({ where: { _id: data.name, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(disMas)) {
    return ReE(res, { message: 'Discipline master not found' }, BAD_REQUEST);
  }
  data.name = disMas.name;
  data.discipline_master = disMas._id;
  const validation = validator('discipline', 'create', data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, org] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }))
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(org)) {
    return ReE(res, { message: 'Discipline not found' }, BAD_REQUEST)
  }
  [err, dis] = await to(discipline.findOne({ where: { name: data.name, org_id: data.org_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(dis)) {
    return ReE(res, { message: 'Discipline name already exist' }, BAD_REQUEST);
  }
  let dis_Id = `${String(data.name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0, 3).toUpperCase()}${String(org.org_id).substring(3, String(org.org_id).length).toUpperCase()}`;
  [err, disId] = await to(discipline.findAll({ where: { discipline_id: { [Op.iLike]: `${dis_Id}%` } } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!disId || !Array.isArray(disId)) {
    return ReE(res, { message: 'Something went wrong' }, BAD_REQUEST);
  }
  let idSub = disId.length === 0 ? `${dis_Id}` : `${dis_Id}${disId.length}`;
  data.discipline_id = idSub;
  data.is_active = true;
  data.is_block = false;
  data.createdby = user._id;
  [err, disCreate] = await to(discipline.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!disCreate) {
    return ReE(res, { message: 'Discipline create failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Discipline created successfully' }, OK);
}

const checkDiscipline = async (body) => {

  if (isNull(body.discipline_id)) {
    return { message: "Please select discipline details!.", success: false };
  }

  let checkDisciplineDetails, optionDiscipline = {
    where: {
      _id: body.discipline_id,
      is_active: true
    }
  };

  if (!isNull(body.org_id)) {
    let organizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!organizationDetails.success) {
      return { message: "Please select vaild Institution details!.", success: false };
    }

    optionDiscipline.where = {
      ...optionDiscipline.where,
      org_id: body.org_id
    }
  }

  [err, checkDisciplineDetails] = await to(discipline.findOne(optionDiscipline))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkDisciplineDetails)) {
    return { message: "Please select discipline details!.", success: false };
  }

  if (checkDisciplineDetails.is_block) {
    return { message: "Discipline details was blocked!.", success: false };
  }

  if (!isNull(checkDisciplineDetails)) {
    return { message: "Discipline was fetched!.", groupDetails: checkDisciplineDetails, success: true };
  }
}

module.exports.checkDiscipline = checkDiscipline;