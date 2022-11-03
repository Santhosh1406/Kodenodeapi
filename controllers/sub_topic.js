const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline, organization, user_data, subject, department, topic, sub_topic } = require("../models");
const { Op } = require("sequelize");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { CONFIG } = require("../config/confifData");
const { checkMenuAccess } = require("./common");
const { checkTopic } = require("./topic");
const { checkDepartment } = require("./department");
const { checkSubject } = require("./subject");

const allFields = ["_id", "name", "code", "description", "subject_code", "topic_code", "org_id", "discipline_id", "department_id", "subject_id", "topic_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "description", "topic_id"];
const updateRequiredFields = ["_id", "code"];

exports.addSubTopic = async (req, res) => {
  let err, sub_topics, sub_topicName, sub_topicId, topicId, orgId, disciplineId, departmentId, subjectId, data;
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
  const validation = validator("sub_topic", "create", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  [err, topicId] = await to(topic.findOne({ where: { _id: data.topic_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(topicId)) {
    return ReE(res, { message: 'Topic not found' }, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  data.org_id = topicId.org_id;
  data.discipline_id = topicId.discipline_id;
  data.department_id = topicId.department_id;
  data.subject_id = topicId.subject_id;
  data.topic_code = topicId.code;
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
  [err, subjectId] = await to(subject.findOne({ where: { _id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(subjectId)) {
    return ReE(res, { message: 'Subject not found' }, BAD_REQUEST);
  }
  [err, sub_topicName] = await to(sub_topic.findOne({ where: { name: data.name, topic_id: data.topic_id, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(sub_topicName)) {
    return ReE(res, { message: 'Sub Topic name was already exist' }, BAD_REQUEST);
  }
  [err, sub_topicId] = await to(sub_topic.findAll({ where: { code: { [Op.iLike]: `${topicId.code}%` }, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sub_topicId)) {
    return ReE(res, { message: 'Something went wrong' }, BAD_REQUEST);
  }
  data.subject_code = subjectId.code;
  data.code = `${subjectId.code}-${sub_topicId.length}`;
  [err, sub_topics] = await to(sub_topic.create({ ...data }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(sub_topics)) {
    return ReE(res, { message: 'SubTopic creation failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'SubTopic created successfully' }, OK);
}

exports.getAllSubTopic = async (req, res) => {
  let err, subtopics, data, query, filter;
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
  if (!isNull(data.topic_id)) {
    query.topic_id = data.topic_id;
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
        model: topic,
        as: 'topicId'
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
  [err, subtopics] = await to(sub_topic.findAll(filter));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!subtopics || !Array.isArray(subtopics) || subtopics.length === 0) {
    return ReE(res, { message: "SubTopic are not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "SubTopic founded", data: subtopics }, OK);
}

exports.getOneSubTopic = async (req, res) => {
  let err, subtopics, data, query = { is_active: true, is_block: false };
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
    return ReE(res, { message: "SubTopic id is must" }, BAD_REQUEST);
  }
  if (data.id && !IsValidUUIDV4(data.id)) {
    return ReE(res, { message: 'Invalid subtopic id' }, BAD_REQUEST);
  }

  if (!isNull(data.topic_id)) {
    query.topic_id = data.topic_id;
  }

  query._id = data.id;
  [err, subtopics] = await to(sub_topic.findOne({
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
        model: topic,
        as: 'topicId'
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
  if (isNull(subtopics)) {
    return ReE(res, { message: "SubTopic not found" }, BAD_REQUEST);
  }
  return ReS(res, { message: "SubTopic founded", data: subtopics }, OK);
};

exports.updateSubTop = async (req,res) => {
  let err, Sfind, Supdate, Efind;
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
  const validation = await validator("sub_topic", "update", data);
  if (validation) {
    return ReE(res, validation, BAD_REQUEST);
  }
  data.name = firstCap(String(data.name));
  [err, Sfind] = await to(sub_topic.findOne({ where: { _id: data.id, topic_id: data.topic_id, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, is_active: true, is_block: false } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Sfind)) {
    return ReE(res, { message: 'Subtopic not found' }, BAD_REQUEST);
  }
  [err, Efind] = await to(sub_topic.findOne({ where: { _id: { [Op.ne]: Sfind._id }, topic_id: data.topic_id, subject_id: data.subject_id, org_id: data.org_id, discipline_id: data.discipline_id, department_id: data.department_id, name: data.name } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (!isNull(Efind)) {
    return ReE(res, { message: 'Subtopic name already exist' }, BAD_REQUEST);
  }
  [err, Supdate] = await to(sub_topic.update({ name: data.name, description: data.description }, { where: { _id: Sfind._id } }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(Supdate)) {
    return ReE(res, { message: 'Subtopic update failed' }, BAD_REQUEST);
  }
  return ReS(res, { message: 'Subtopic updated success' }, OK);
}

const checkSubTopic = async (body) => {

  if (isNull(body.sub_topic_id) || !IsValidUUIDV4(body.sub_topic_id)) {
    return { message: "Please select subject sub topic details!.", success: false };
  }

  let checkSubTopicDetails, optionSubTopic = {
    where: getQuery(body)
  };

  if (!isNull(body.department_id)) {
    let departmentDetails = await checkDepartment({ department_id: body.department_id });

    if (!departmentDetails.success) {
      return { message: "Please select vaild department details!.", success: false };
    }

    optionSubTopic.where = {
      ...optionSubTopic.where,
      department_id: body.department_id
    };

  }

  if (!isNull(body.subject_id)) {
    let checkSubTopicDetails = await checkSubject({ subject_id: body.subject_id });

    if (!checkSubTopicDetails.success) {
      return { message: "Please select vaild subject details!.", success: false };
    }

    optionSubTopic.where = {
      ...optionSubTopic.where,
      subject_id: body.subject_id
    };
  }

  if (!isNull(body.topic_id)) {
    let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

    if (!checkTopicDetails.success) {
      return { message: "Please select vaild subject topic details!.", success: false };
    }

    optionSubTopic.where = {
      ...optionSubTopic.where,
      topic_id: body.topic_id
    };
  }

  optionSubTopic.where = {
    ...optionSubTopic.where,
    _id: body.sub_topic_id,
    is_active: true
  };


  [err, checkSubTopicDetails] = await to(sub_topic.findOne(optionSubTopic));

  if (err) {
    return { message: err, success: false };
  }

  if (isNull(checkSubTopicDetails)) {
    return { message: "Subject Sub Topic details was not found!.", success: false };
  }

  if (checkSubTopicDetails.is_block) {
    return { message: "Subject Sub Topic details was blocked!.", success: false };
  }

  if (!isNull(checkSubTopicDetails)) {
    return { message: "Subject Sub Topic was fetched!.", subTopicDetails: checkSubTopicDetails, success: true };
  }
}

module.exports.checkSubTopic = checkSubTopic;