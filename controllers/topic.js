const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline, organization, user_data, subject, department, topic } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkMenuAccess } = require("./common");
const { CONFIG } = require("../config/confifData");
const { checkSubject } = require("./subject");
const { checkDepartment } = require("./department");

const allFields = ["_id", "name", "code", "description", "subject_code", "org_id", "discipline_id", "department_id", "subject_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "description", "subject_id"];
const updateRequiredFields = ["_id", "code"];

exports.addTopic = async (req, res) => {
  let err, topics, topicName, topicId, orgId, disciplineId, departmentId, subjectId, data;
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
  const validation = validator("topic", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  [err, subjectId] = await to(subject.findOne({ where: { _id: data.subject_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subjectId)) {
    return ReE(res, { message: 'Subject not found' }, BAD_REQUEST);
  }
  data.org_id = subjectId.org_id;
  data.discipline_id = subjectId.discipline_id;
  data.department_id = subjectId.department_id;
  data.subject_code = subjectId.code;
  data.is_active = true;
  data.is_block = false;
  data.createdby = user._id;
  [err, topicName] = await to(topic.findOne({ where: { name: data.name, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(topicName)) {
    return ReE(res, { message: 'topic name was already exist' }, BAD_REQUEST);
  }
  [err, topicId] = await to(topic.findAll({ where: { code: { [Op.iLike]: `${subjectId.code}%` }, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(topicId)) {
    return ReE(res, { message: 'Something went wrong' }, BAD_REQUEST);
  }
  data.code = `${subjectId.code}-${topicId.length}`;
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
  [err, departmentId] = await to(department.findOne({ where: { _id: data.department_id, org_id: data.org_id, discipline_id: data.discipline_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(departmentId)) {
    return ReE(res, { message: 'Department not found' }, BAD_REQUEST);
  }
  [err, topics] = await to(topic.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(topics)) {
    return ReE(res, { message: 'Topic creation failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Topic created successfully' }, OK);
}

exports.getAllTopic = async (req, res) => {
  let err, topics, data, query, filter;
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
  if (!isNull(data.subject_id)) {
    query.subject_id = data.subject_id;
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
        model: subject,
        as: 'subjectId'
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
  [err, topics] = await to(topic.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return ReE(res, { message: "Topics are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Topics founded", data: topics }, OK);
}

exports.getOneTopic = async (req, res) => {
  let err, topics, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "Topic id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid Topic id' }, BAD_REQUEST);
  }
  query._id = data.id;
  [err, topics] = await to(topic.findOne({
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
        model: subject,
        as: 'subjectId'
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
  if (isNull(topics)) {
    return ReE(res, { message: "Topic not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "Topic founded", data: topics }, OK);
};

exports.updateTop = async (req,res) => {
  let err, Tfind, Tupdate, Efind;
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
  const validation = await validator("topic", "update", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  [err, Tfind] = await to(topic.findOne({ where: { _id: data.id, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Tfind)) {
    return ReE(res, { message: 'Topic not found' }, BAD_REQUEST);
  }
  [err, Efind] = await to(topic.findOne({ where: { _id: { [Op.ne]: Tfind._id }, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, name: data.name } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(Efind)) {
    return ReE(res, { message: 'Topic name already exist' }, BAD_REQUEST);
  }
  [err, Tupdate] = await to(topic.update({ name: data.name, description: data.description }, { where: { _id: Tfind._id } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Tupdate)) {
    return ReE(res, { message: 'Topic update failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Topic updated success' }, OK);
}


const checkTopic = async (body) => {

  if (isNull(body.topic_id) || !IsValidUUIDV4(body.topic_id)) {
    return { message: "Please select subject topic details!.", success: false };
  }

  let checkTopicDetails, optionTopic = {
    where: getQuery(body)
  };

  if (!isNull(body.department_id)) {
    let departmentDetails = await checkDepartment({ department_id: body.department_id });

    if (!departmentDetails.success) {
      return { message: "Please select vaild department details!.", success: false };
    }

    optionTopic.where = {
      ...optionTopic.where,
      department_id: body.department_id
    };

  }

  if (!isNull(body.subject_id)) {
    let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

    if (!checkSubjectDetails.success) {
      return { message: "Please select vaild subject details!.", success: false };
    }

    optionTopic.where = {
      ...optionTopic.where,
      subject_id: body.subject_id
    };
  }

  optionTopic.where = {
    ...optionTopic.where,
    _id: body.topic_id,
    is_active: true
  };


  [err, checkTopicDetails] = await to(topic.findOne(optionTopic));

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkTopicDetails)) {
    return { message: "Subject Topic details was not found!.", success: false };
  }

  if (checkTopicDetails.is_block) {
    return { message: "Subject Topic details was blocked!.", success: false };
  }

  if (!isNull(checkTopicDetails)) {
    return { message: "Subject Topic was fetched!.", topicDetails: checkTopicDetails, success: true };
  }
}

module.exports.checkTopic = checkTopic;