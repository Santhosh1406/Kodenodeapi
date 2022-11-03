const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { Op } = require("sequelize");
const { CONFIG } = require("../config/confifData");
const moment = require("moment");
const {
  organization,
  institution_type,
  group,
  affiliated_type,
  organization_type,
  university_type,
  user_data,
  course_batch
} = require("../models");
const { ReE, ReS, to, isNull } = require("../service/util.service");
const { validator, IsValidUUIDV4, getQuery } = require("../service/validation");
const { checkMenuAccess } = require("./common");
const { createGroupMethod } = require("./group");

const allFields = [ "_id", "org_id", "org_name", "org_type", "last_name", "address", "city", "state", "country", "postal_code", "fax", "alternate_contact_no", "email", "url", "logo", "institution_type_id", "group_id", "affiliated_type_id", "affiliated_status", "university_ref", "affiliated_date", "year_of_foundation", "sortname", "is_active", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = [ "org_name", "org_type", "address", "city", "state", "country", "postal_code", "alternate_contact_no", "email", "url", "logo", "institution_type_id", "affiliated_type_id", "year_of_foundation", "sortname" ];
const updateRequiredFields = ["_id", "org_id"];

exports.getAllOrganization = async (req, res) => {
  let err, org, data, query, filter, batch;
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
  if (!isNull(data.org_id) && isNull(data.group_id)) {
    query._id = data.org_id;
  }
  if (!isNull(data.affiliated_type)) {
    query.affiliated_type_id = data.affiliated_type_id;
  }
  if (!isNull(data.org_type)) {
    query.org_type = data.org_type;
  }
  if (!isNull(data.institution_type)) {
    query.institution_type_id = data.institution_type;
  }
  if (!isNull(data.group_id)) {
    query.group_id = data.group_id;
  }
  if (!isNull(data.group)) {
    query.group_id = data.group;
  }
  if (!isNull(data.university)) {
    query.university_ref = data.university;
  }
  filter = {
    where: query,
    order: [['org_name','ASC'],['createddate', 'ASC']],
    include: [
      {
        model: institution_type,
        as: 'institution_typeId'
      },
      {
        model: group,
        as: 'groupId'
      },
      {
        model: affiliated_type,
        as: 'affiliated_typeId'
      },
      {
        model: university_type,
        as: 'universityRef'
      },
      {
        model: organization_type,
        as: 'orgType'
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
  [err, org] = await to(organization.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  org.forEach(async (x, i)=> {
    let values = isNull(x.dataValues)? x: x.dataValues;
    [err, batch] = await to(course_batch.findAll({ where: { org_id: values._id }, order: [ ['from', 'ASC'] ] }));
    if(!isNull(batch) && batch.length !== 0){
      let batchVal = await isNull(batch[0].dataValues)? batch[0].from: batch[0].dataValues.from;
      values = { ...values, batchFrom: moment(batchVal).format('YYYY') };
    }
    org[i] = values;
  });
  if (!org || !Array.isArray(org) || org.length === 0) {
    return ReE(res, { message: "Institution are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Institution founded", data: await org }, OK);
};

exports.getOneOrganization = async (req, res) => {
  let err, org, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Institution id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid Institution id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, org] = await to(organization.findOne({
    where: query,
    include: [
      {
        model: institution_type,
        as: 'institution_typeId'
      },
      {
        model: group,
        as: 'groupId'
      },
      {
        model: affiliated_type,
        as: 'affiliated_typeId'
      },
      {
        model: university_type,
        as: 'universityRef'
      },
      {
        model: organization_type,
        as: 'orgType'
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
  if (!org || !org._id) {
    return ReE(res, { message: "Institution not found" }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: isNull(org.dataValues)? org._id: org.dataValues._id }, order: [ ['from', 'ASC'] ] }));
  if(!isNull(batch) && batch.length !== 0){
    let values = isNull(org.dataValues)? org: org.dataValues;
    let batchVal = isNull(batch[0].dataValues)? batch[0].from: batch[0].dataValues.from;
    org = { ...values, batchFrom: moment(batchVal).format('YYYY') };
  }
  return ReS(res, { message: "Institution founded", data: org }, OK);
};

exports.addOrganization = async (req, res) => {
  let err, org, orgId, orgAdd, body, institutionTypeId, organizationTypeId, affiliatedTypeId, groups, orgUpdate, universityRef, existEmail, existPhone;
  const user = req.user;
  body = req.body;
  body.postal_code = String(body.postal_code);
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }

  const InvalidFields = createRequiredFields.filter((x) => isNull(body[x]));
  if (InvalidFields.length > 0) {
    return ReE(res, { message: `${InvalidFields} not valid data` }, BAD_REQUEST);
  }
  const validation = validator("organization", "create", body);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, affiliatedTypeId] = await to(
    affiliated_type.findOne({ where: { _id: body.affiliated_type_id, is_active: true, is_block: false } })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!affiliatedTypeId || !affiliatedTypeId._id) {
    return ReE(res, { message: "Affiliated Type not found" }, BAD_REQUEST);
  }
  body.affiliated_status = affiliatedTypeId.status;
  if (affiliatedTypeId.status === true) {
    if (!body.university_ref || typeof body.university_ref !== "string" || !IsValidUUIDV4(body.university_ref)) {
      return ReE(res, { message: 'Invalid university refernce' }, BAD_REQUEST);
    }
    [err, universityRef] = await to(
      university_type.findOne({ where: { _id: body.university_ref, is_active: true, is_block: false } })
    );
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!universityRef || !universityRef._id) {
      return ReE(res, { message: "University Ref not found" }, BAD_REQUEST);
    }
  } else {
    body.affiliated_type_id = null;
  }
  [err, organizationTypeId] = await to(
    organization_type.findOne({ where: { _id: body.org_type, is_active: true, is_block: false } })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!organizationTypeId || !organizationTypeId._id) {
    return ReE(res, { message: "Institution Type not found" }, BAD_REQUEST);
  }
  if (organizationTypeId.professional === true) {
    if (isNull(body.last_name)) {
      return ReE(res, { message: 'Last name is must' }, BAD_REQUEST);
    }
  }
  if (organizationTypeId.professional === false) {
    body.last_name = null;
  }
  body.email = String(body.email).toLowerCase();
  [err, existEmail] = await to(organization.findOne({ where: { email: body.email, is_active: true, is_block: false } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(!isNull(existEmail)){
    return ReE(res, { message: 'Email already exist' }, BAD_REQUEST);
  }
  [err, existPhone] = await to(organization.findOne({ where: { [Op.or]: [{ telephone: body.telephone }, { alternate_contact_no: body.alternate_contact_no }], is_active: true, is_block: false }}));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(!isNull(existPhone)){
    return ReE(res, { message: 'telephone, alternate_contact_no already exist' }, BAD_REQUEST);
  }
  [err, institutionTypeId] = await to(
    institution_type.findOne({ where: { _id: body.institution_type_id, is_active: true, is_block: false } })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!institutionTypeId || !institutionTypeId._id) {
    return ReE(res, { message: "Institution Type not found" }, BAD_REQUEST);
  }
  if (institutionTypeId.group === true) {
    if (body.group_id) {
      if (typeof body.group_id !== "string" || !IsValidUUIDV4(body.group_id)) {
        return ReE(res, { message: 'Invalid Group refernce' }, BAD_REQUEST);
      }
      [err, groups] = await to(group.findOne({ where: { _id: body.group_id, is_active: true, is_block: false } }));
      if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
      }
      if (isNull(groups)) {
        return ReE(res, { message: "Group not found" }, BAD_REQUEST);
      }
    }
  } else {
    body.group_id = null;
  }
  [err, org] = await to(
    organization.findAll({
      where: {
        org_name: body.org_name,
        org_type: body.org_type,
        is_active: true
      },
    })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!org || !Array.isArray(org) || org.length !== 0) {
    return ReE(res, { message: "Institution already exist" }, BAD_REQUEST);
  }
  let org_id = `${String(organizationTypeId.type).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0, 3).toUpperCase()}${String(body.org_name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0, 3).toUpperCase()}${String(body.year_of_foundation)}`;
  [err, orgId] = await to(
    organization.findAll({ where: { org_id: { [Op.iLike]: `${org_id}%` } } })
  );
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!orgId || !Array.isArray(orgId)) {
    return ReE(res, { message: "Something went wrong" }, BAD_REQUEST);
  }
  let idSub = orgId.length === 0 ? `${org_id}` : `${org_id}${String(orgId.length)}`;
  body.org_id = idSub;
  body.is_active = true;
  body.createdby = user._id;
  body.is_block = false;
  [err, orgAdd] = await to(organization.create({ ...body }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!orgAdd) {
    return ReE(res, { message: "Add Institution failed" }, BAD_REQUEST);
  }
  if (institutionTypeId.group === true) {
    if (!body.group_id) {
      let createGroupMethods = await createGroupMethod({ org_id: orgAdd._id, no_branch: body.no_branch, name: body.group_name, user_id: user._id });
      if (!createGroupMethods.success) {
        return ReE(res, { message: 'Institution created but group not mapped' }, BAD_REQUEST)
      } else {
        [err, orgUpdate] = await to(organization.update({ group_id: createGroupMethods.createGroup._id }, { where: { _id: orgAdd._id } }));
        if (err) {
          return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if (!orgUpdate) {
          return ReE(res, { message: 'Institution and Group created but you want to map the group' }, BAD_REQUEST);
        }
      }
    }
  }
  return ReS(res, { message: "Institution Added successsfully" }, OK);
};


const checkOrganization = async (body) => {

  if (isNull(body.org_id)) {
    return { message: "Please select Institution details!.", success: false };
  }

  let checkOrganizationDetails, optionOrganization = {
    where: {
      _id: body.org_id,
      is_active: true
    }
  };

  [err, checkOrganizationDetails] = await to(organization.findOne(optionOrganization))

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkOrganizationDetails)) {
    return { message: "Please select vaild institution details!.", success: false };
  }

  if (checkOrganizationDetails.is_block) {
    return { message: "Institution details was blocked!.", success: false };
  }

  if (!isNull(checkOrganizationDetails)) {
    return { message: "Institution was fetched!.", organizationDetails: checkOrganizationDetails, success: true };
  }
}

module.exports.checkOrganization = checkOrganization;