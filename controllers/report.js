const { to, ReE, isNull, ReS, isObject, firstCap, firstLetterCap, isEmpty } = require("../service/util.service");
const {
  session,
  student_attendance,
  user_data,
  user_info,
  course_department_mapping,
  section,
  subject,
  subject_mapping,
  batch_sem,
  topic,
  sub_topic,
  organization,
  program,
  discipline,
  department,
  course_batch,
  university_type,
  affiliated_type,
  organization_type,
  institution_type,
  group,
  discipline_master,
  program_master,
  course_master,
  department_master,
  course_duration,
  course_sem_duration,
  course
} = require("../models");
const model = require('../models');
const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { Op, where, INET } = require("sequelize");
const moment = require('moment');
const { checkUserInf, checkMenuAccess } = require("./common");
const { IsValidUUIDV4, yearValidation } = require("../service/validation");
const { CONFIG } = require("../config/confifData");

const getUnique = (data) => {
  let getKeyVal = data[0] || {};
  if(!isNull(getKeyVal) && !isNull(getKeyVal.dataValues)){
    getKeyVal = getKeyVal.dataValues;
  }
  let newObj = {}, allKey = Object.keys(getKeyVal);
  allKey.forEach((element) => {
    if (element !== "_id") {
      let newArray = [ ...new Set(data.map((item) => isObject(item.dataValues)? item[element]: item.dataValues[element])) ];
      newObj[element] = newArray;
    }
  });
  Object.keys(newObj).forEach(async(l)=> {
    let unique, uniqueIds = [];
    if(isObject(newObj[l][0])){
      unique = newObj[l].filter((element) => {
        if(isObject(element)){
          const isDuplicate = uniqueIds.includes(`${element._id}`);
          if (!isDuplicate) {
            uniqueIds.push(`${element._id}`);
            return true
          }else{
            return false;
          }
        }
        return false;
      });
    }else{
      unique = newObj[l];
    }
    newObj[l] = unique;
  });
  return newObj;
};

const getKeyValue = (data, key) => {
  let val = data;
  if(!isNull(val.dataValues)){
    val = val.dataValues;
  }
  if(key === ''){
    return val;
  }else{
    if(!isNull(val[key])){
      return val[key];
    }else{
      return null;
    }
  }
};

const groupBys = (keys, data, names) => {
  let final = {};
  keys.forEach(k=> {
    let keyName = k === 'org_id'? 'org_name': !["subject_id","department_id", "program_id", "discipline_id", "cdm_id","org_id","topic_id"].includes(`${k}`)? names: 'name';
    let obj = {};
    let groups = data.reduce((group, element) => {
      if(!isNull(element.dataValues)){
        element = element.dataValues;
      }
      const datas = element[k];
      group[datas] = group[datas] ?? [];
      group[datas].push(element);
      return group;
    }, {});
    if(!["subject_id","department_id", "faculty_id", "program_id", "discipline_id", "cdm_id","org_id","topic_id"].includes(k)){
      k = String(k).replace("_id","");
    }
    let key = "";
    String(k).split("_").map((x, i)=> {
      if(i === 0){
        key = `${key}${x}`;
      }else{
        key = `${key}${firstLetterCap(x)}`;
      }
    });
    groups = Object.keys(groups).forEach((x)=> {
      if(groups[x].length > 0){
        let name;
        console.log(keyName);
        if(isNull(groups[x][0][key])){
          name = 'No_Data';
        }else{
          name = isNull(groups[x][0][key].dataValues)?`${groups[x][0][key][keyName]}`:`${groups[x][0][key].dataValues[keyName]}`;
          if(key === "orgId"){
            name = isNull(groups[x][0][key].dataValues)?`${groups[x][0][key][keyName]}`:`${groups[x][0][key].dataValues[keyName]}`;
          }
        }
        obj[name] = groups[x];
      }
    });
    final[k] = obj;
  })
  return final;
}

const models = {
  session: session,
  student_attendance: student_attendance,
  user_data: user_data,
  user_info: user_info,
  institution: organization,
  discipline: discipline,
  program: program,
  course: course,
  department: department,
  subject: subject,
  topic: topic,
  sub_topic: sub_topic,
  course_department_mapping: course_department_mapping,
  section: section,
  batch_sem: batch_sem,
  course_batch: course_batch,
};

const includes = {
  session: [
    { model: course_department_mapping, as: "cdmId" },
    { model: department, as: "departmentId" },
    { model: discipline, as: "disciplineId" },
    { model: section, as: "sectionId" },
    { model: subject, as: "subjectId" },
    { model: topic, as: "topicId" },
    { model: batch_sem, as: "batchSemId" },
    { model: user_data, as: "facultyId", include: [{ model: user_info, as: "userInfo" }], attributes: { exclude: "password email_otp phone_otp" } }
  ],
  student_attendance: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: program, as: "programId" },
    { model: department, as: "departmentId" },
    { model: course_department_mapping, as: "cdmId" },
    { model: section, as: "sectionId" },
    { model: course_batch, as: "courseBatchId" },
    { model: batch_sem, as: "batchSemId" },
    { model: subject, as: "subjectId" },
    { model: user_data, as: "facultyId", include: [{ model: user_info, as: "userInfo" }], attributes: { exclude: "password email_otp phone_otp" } },
    { model: user_data, as: "userId", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: session, as: "sessionId" },
  ],
  user_data: [ { model: user_info, as:'userInfo' } ],
  user_info: [
    { model: user_data, as: "userId", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: organization, as: "orgId", attributes: ["_id", "org_id", "org_name"] },
    { model: program, as: "programId", attributes: ["_id", "program_id", "name"] },
    { model: discipline, as: "disciplineId", attributes: ["_id", "discipline_id", "name"] },
    { model: department, as: "departmentId", attributes: ["_id", "discipline_id", "name"] },
    { model: course_department_mapping, as: "cdmId" },
    { model: course_batch, as: "courseBatchId" },
    { model: section, as: "sectionId", attributes: ["_id", "name", "course_batch_id"] }
  ],
  institution: [
    { model: +university_type, as: "universityRef" },
    { model: affiliated_type, as: "affiliated_typeId" },
    { model: organization_type, as: "orgType" },
    { model: institution_type, as: "institution_typeId" },
    { model: group, as: "groupId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  discipline: [
    { model: organization, as: "orgId" },
    { model: discipline_master, as: "disciplineMaster" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  program: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: program_master, as: "programMaster" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  course: [
    { model: organization, as:'orgId' },
    { model: course_master, as:'courseMaster' },
    { model: discipline, as:'disciplineId' },
    { model: program, as:'programId' },
    { model: user_data, as:'createdBy', attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as:'updatedBy', attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  department: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: department_master, as: "departmentMaster" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  subject: [
    { model: organization, as: "orgId" },
    { model: department, as: "departmentId" },
    { model: discipline, as: "disciplineId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  topic: [
    { model: subject, as: "subjectId" },
    { model: organization, as: "orgId" },
    { model: department, as: "departmentId" },
    { model: discipline, as: "disciplineId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  sub_topic: [
    { model: topic, as: "topicId" },
    { model: subject, as: "subjectId" },
    { model: organization, as: "orgId" },
    { model: department, as: "departmentId" },
    { model: discipline, as: "disciplineId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  course_department_mapping: [
    { model: organization, as: "orgId" },
    { model: course_duration, as: "courseDuration" },
    { model: course_sem_duration, as: "courseSemDuration" },
    { model: discipline, as: "disciplineId" },
    { model: program, as: "programId" },
    { model: course, as: "courseId" },
    { model: department, as: "departmentId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  subject_mapping: [
    { model: organization, as: 'orgId' },
    { model: discipline, as: 'disciplineId' },
    { model: program, as: "programId" },
    { model: department, as: 'sub_departmentId' },
    { model: department, as: 'departmentId' },
    { model: course, as: 'courseId' },
    { model: subject, as: 'subjectId' },
    { model: course_department_mapping, as: 'cdmId' },
    { model: course_batch, as: 'courseBatchId' },
    { model: batch_sem, as: 'batchSemId' },
    { model: user_data, as: 'createdBy', attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: 'updatedBy', attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  section: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: course_batch, as: "courseBatchId" },
    { model: program, as: "programId" },
    { model: course, as: "courseId" },
    { model: department, as: "departmentId" },
    { model: course_department_mapping, as: "cdmId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  batch_sem: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: program, as: "programId" },
    { model: course_department_mapping, as: "cdmId" },
    { model: course_batch, as: "courseBatchId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
  course_batch: [
    { model: organization, as: "orgId" },
    { model: discipline, as: "disciplineId" },
    { model: program, as: "programId" },
    { model: course_department_mapping, as: "cdmId" },
    { model: user_data, as: "createdBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } },
    { model: user_data, as: "updatedBy", attributes: { exclude: ["password", "user_info", "email_otp", "phone_otp"] } }
  ],
};

exports.getReport = async (req, res) => {
  let err,
    report,
    filter = { is_active: true, is_block: false };
  const body = req.body;
  const model = models[`${body.model}`];
  const include = includes[`${body.model}`];
  if (isNull(model) || isNull(include)) {
    return ReE(res, { message: "Invalid Report model" }, BAD_REQUEST);
  }
  if (isNull(body.filter) || !isObject(body.filter)) {
    return ReE(res, { message: "filter must be a object" }, BAD_REQUEST);
  }
  filter = { ...filter, ...body.filter };
  [err, report] = await to(model.findAll({ where: filter, include: include }));
  if (err) {
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if (isNull(report) || report.length === 0) {
    return ReE(res, { message: "Report not found" }, BAD_REQUEST);
  }
  const keys = Object.keys(report[0].dataValues);
  let newObj = {};
  keys.forEach((element) => {
    if (element !== "_id") {
      newObj[element] = [
        ...new Set(report.map((item) => item.dataValues[element])),
      ];
    }
  });
  return ReS(
    res,
    { message: "Report Gotted", data: report, unique: newObj },
    OK
  );
};

exports.enrollmentReport = async(req,res) => {
  let err, eReport, userData, uniqueObj, where, groupBy = {}, keys = ["department_id", "program_id", "discipline_id", "cdm_id"];
  const user = req.user;
  if(isNull(req.body) || !isObject(req.body)){
    return ReE(res, { message: 'Body must be json' }, BAD_REQUEST);
  }
  where = { course_batch_id: { [Op.ne]: null }, ...req.body };
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: where, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      if(!isNull(checkMenuUserDetails.body.group_id) && IsValidUUIDV4(checkMenuUserDetails.body.group_id) && !IsValidUUIDV4(where.org_id)){
        return ReE(res, { message: 'Organization id must' }, BAD_REQUEST);
      }else{
        where.org_id = checkMenuUserDetails.body.org_id;
      }
    }
  }
  delete where.group_id;
  [err, eReport] = await to(user_info.findAll({ where: where, include: includes.user_info }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(eReport) || eReport.length === 0){
    return ReE(res, { message: 'Report not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(eReport);
  groupBy = await groupBys(keys, eReport, 'name');
  return ReS(res, { message: 'Report founded', data:{ data: eReport, group: groupBy, unique: uniqueObj } }, OK);
}

exports.institutionReport = async(req, res) =>{
  let err, datas = {}, eReport, orgIds, userData, uniqueObj, batch, where={...req.body}, groupBy = {}, allkeys = ["department_id", "program_id", "discipline_id", "cdm_id"], keys = [], batchId = [];
  const user = req.user;
  if(isNull(where) || !isObject(where)){
    return ReE(res, { message: 'Body must be json' }, BAD_REQUEST);
  }
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: where, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      if(!isNull(checkMenuUserDetails.body.group_id) && IsValidUUIDV4(checkMenuUserDetails.body.group_id)){
        if(!isNull(where.screen) && isNull(where.org_id)){
          return ReE(res, { message: 'Organization id must' }, BAD_REQUEST);
        } else if (isNull(where.screen)){
          [err, orgIds] = await to(organization.findAll({ where: { group_id: checkMenuUserDetails.body.group_id, is_active: true, is_block: false } }));
          if(err){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
          }
          if(isNull(orgIds) || orgIds.length === 0){
            return ReE(res, { message: 'Organizatipon not found' }, BAD_REQUEST);
          }
          where.org_id = { [Op.in]: orgIds.map(x=> getKeyValue(x, "_id")) };
        }
      }else{
        where.org_id = checkMenuUserDetails.body.org_id;
      }
    }
  }
  if(isNull(where.academic_year)){
    where.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(where.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  if(isNull(where.screen)){
    keys.push("org_id");
  }else if(!isNull(where.screen) && !allkeys.includes(where.screen)){
    return ReE(res, { message: 'Invalid Screen name' }, BAD_REQUEST);
  }else{
    keys.push(where.screen);
  }
  datas = { ...where };
  delete datas.screen;
  delete datas.academic_year;
  delete datas.group_id;
  [err, batch] = await to(course_batch.findAll({ where: { ...datas, from: { [Op.gte]: moment(String(where.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS'), [Op.lt]: moment(String(parseInt(where.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS') } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  where = { course_batch_id: { [Op.in]: batchId } };
  [err, eReport] = await to(user_info.findAll({ where: where, include: includes.user_info }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(eReport)){
    return ReE(res, { message: 'Report not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(eReport);
  groupBy = await groupBys(keys, eReport, "name");
  if(eReport.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report founded', data:{ data: eReport, group: groupBy, unique: uniqueObj } }, OK);
}

exports.courseDurationReport = async(req,res) => {
  let err, couDur, uniqueObj, groupBy, keys= ["course_duration_id"];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST)
  }
  [err, couDur] = await to(course_department_mapping.findAll({ where: { ...body }, include: includes.course_department_mapping }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(couDur) || couDur.length === 0){
    return ReE(res, { message: 'course not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(couDur);
  groupBy = await groupBys(keys, couDur, "duration");
  if(couDur.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report founded', data: { data: couDur, group: groupBy, unique: uniqueObj } }, OK)
}

exports.semesterPerCourseReport = async(req,res) => {
  let err, semCou, uniqueObj, groupBy, keys = ["course_duration_id"];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST);
  }
  [err, semCou] = await to(course_department_mapping.findAll({ where: { ...body }, include: includes.course_department_mapping }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(semCou) || semCou.length === 0){
    return ReE(res, { message: 'Course not found' }, BAD_REQUEST);
  }
  semCou = await semCou.map((y, a)=> { 
    let x = isNull(y.dataValues) ? y: y.dataValues;
    let semCount = isNull(x.courseSemDuration.dataValues)? x.courseSemDuration.duration: x.courseSemDuration.dataValues.duration;
    x.courseDuration = isNull(x.courseDuration.dataValues)? { ...x.courseDuration, totalSem: (parseInt(x.courseDuration.duration)*parseInt(semCount)) }: { ...x.courseDuration.dataValues, totalSem: (parseInt(x.courseDuration.dataValues.duration)*parseInt(semCount)) };
    return x;
  })
  uniqueObj = await getUnique(semCou);
  groupBy = await groupBys(keys, semCou, 'totalSem');
  if(semCou.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report founded', data: { data: await semCou, group: await groupBy, unique: await uniqueObj } }, OK);
}

exports.subjectPerCourse = async(req,res) => {
  let err, topSub, uniqueObj, groupBy, keys = ["cdm_id"], batchId = [];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, from: { [Op.gte]: moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS'), [Op.lt]: moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS') } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body = { ...body, course_batch_id: { [Op.in]: batchId } };
  delete body.academic_year;
  delete body.group_id;
  [err, topSub] = await to(subject_mapping.findAll({ where: { ...body }, include: includes.subject_mapping }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(topSub) || topSub.length === 0){
    return ReE(res, { message: 'Topic not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(topSub);
  groupBy = await groupBys(keys, topSub, 'name');  
  if(topSub.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report founded', data: { data: topSub, group: groupBy, unique: uniqueObj } }, OK);
}

exports.topicsPerSubject = async(req,res) => {
  let err, topSub, uniqueObj, groupBy, keys = ["subject_id"];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST);
  }
  delete body.group_id;
  [err, topSub] = await to(topic.findAll({ where: { ...body }, include: includes.topic }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(topSub) || topSub.length === 0){
    return ReE(res, { message: 'Topic not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(topSub);
  groupBy = await groupBys(keys, topSub, 'name');  
  if(topSub.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report founded', data: { data: topSub, group: groupBy, unique: uniqueObj } }, OK);
}

exports.sessionPerSubject = async(req, res) => {
  let err, sesSub, uniqueObj, groupBy, keys = ["subject_id"], batchId = [];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST);
  }
  if(isNull(body.department_id) || !IsValidUUIDV4(body.department_id)){
    return ReE(res, { message: 'Invalid Department ID' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, from: { [Op.gte]: (moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS')), [Op.lt]: (moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS')) } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body.course_batch_id = { [Op.in]: batchId };
  body.session_end_time = { [Op.lte]: moment().format('YYYY/MM/DD HH:mm') };
  delete body.academic_year;
  delete body.group_id;
  [err, sesSub] = await to(session.findAll({ where: body, include: includes.session }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sesSub) || sesSub.length === 0){
    return ReE(res, { message: 'Sessions not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(sesSub);
  groupBy = await groupBys(keys, sesSub, 'name');
  if(sesSub.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report Founded', data: { data: sesSub, group: groupBy, unique: uniqueObj } }, OK);
}

exports.sessionPerTopic = async(req, res) => {
  let err, sesSub, uniqueObj, groupBy, keys = ["topic_id"], batchId = [];
  const user = req.user;
  let body = req.body;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }

    if (checkMenuUserDetails.body) {
      body = checkMenuUserDetails.body;
    }
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization id' }, BAD_REQUEST);
  }
  if(isNull(body.subject_id) || !IsValidUUIDV4(body.subject_id)){
    return ReE(res, { message: 'Invalid Subject id' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, from: { [Op.gte]: (moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS')), [Op.lt]: (moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS')) } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body.course_batch_id = { [Op.in]: batchId };
  delete body.academic_year;
  delete body.group_id;
  [err, sesSub] = await to(session.findAll({ where: body, include: includes.session }));;
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sesSub) || sesSub.length === 0){
    return ReE(res, { message: 'Sessions not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(sesSub);
  groupBy = await groupBys(keys, sesSub, 'name');
  if(sesSub.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report Founded', data: { data: sesSub, group: groupBy, unique: uniqueObj } }, OK);
};

exports.getAttendanceReport = async(req,res) => {
  let err, sessions, departmentFac, where = { session_date: {} }, attendance, userInfo, unique, groupBy, students;
  const body = req.body;
  const user = req.user;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });
    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }
    console.log(checkMenuUserDetails);
  }
  if(!isNull(body.user_id) && !IsValidUUIDV4(body.user_id)){
    return ReE(res, { message: 'Invalid User id' }, BAD_REQUEST)
  }
  if(isNull(body.from) || !moment(body.from).isValid()){
    return ReE(res, { message: 'Invalid from date' }, BAD_REQUEST);
  }
  where.session_date = moment(body.from, 'YYYY-MM-DD').format('YYYY-MM-DD');
  if(!isNull(body.to)){
    if(!moment(body.to, 'YYYY-MM-DD').isValid()){
      return ReE(res, { message: 'Invalid to date' }, BAD_REQUEST);
    }
    where.session_date = { [Op.gte]: moment(body.from, 'YYYY-MM-DD').format('YYYY-MM-DD'), [Op.lte]: moment(body.to, 'YYYY-MM-DD').format('YYYY-MM-DD') };
  }
  if(body.faculty === true){
    if(isNull(body.department_id) || !IsValidUUIDV4(body.department_id)){
      return ReE(res, { message: 'Invalid Department id' }, BAD_REQUEST)
    }
    if(!isNull(body.user_id)){
      where.faculty_id = body.user_id;
    }else{
      [err, departmentFac] = await to(user_info.findAll({ where: { department_id: body.department_id, designation: { [Op.ne]: null } } }));
      if(err){
        return ReE(res,err, INTERNAL_SERVER_ERROR);
      }
      if(isNull(departmentFac)){
        return ReE(res, { message: 'Faculty not found' }, BAD_REQUEST);
      }
      let ids = departmentFac.map(x=> getKeyValue(x, 'user_id'));
      where.faculty_id = { [Op.in]: ids };
      body.user_id = { [Op.in]: ids };
    }
  }else{
    if(isNull(body.section_id) || !IsValidUUIDV4(body.section_id)){
      return ReE(res, { message: 'Invalid Section id' }, BAD_REQUEST)
    }
    where.section_id = body.section_id;
    if(isNull(body.user_id)){
      [err, departmentFac] = await to(user_info.findAll({ where: { section_id: body.section_id }, include: includes.user_info }));
      if(err){
        return ReE(res,err, INTERNAL_SERVER_ERROR);
      }
      if(isNull(departmentFac)){
        return ReE(res, { message: 'Faculty not found' }, BAD_REQUEST);
      }
      let ids = departmentFac.map(x=> getKeyValue(x, 'user_id'));
      body.user_id = { [Op.in]: ids };
      students = departmentFac.map(x=> getKeyValue(x, ''));
    }else{
      [err, departmentFac] = await to(user_info.findAll({ where: { user_id: body.user_id }, include: includes.user_info }));
      if(err){
        return ReE(res,err, INTERNAL_SERVER_ERROR);
      }
      if(isNull(departmentFac)){
        return ReE(res, { message: 'Faculty not found' }, BAD_REQUEST);
      }
      let ids = departmentFac.map(x=> getKeyValue(x, 'user_id'));
      body.user_id = { [Op.in]: ids };
      students = departmentFac.map(x=> getKeyValue(x, ''));
    }
  }
  [err, sessions] = await to(session.findAll({ where: where, include: includes.session, order: [['session_start_time', 'ASC']] })); 
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sessions)){
    return ReE(res, { message: 'Session is Empty' }, BAD_REQUEST);
  }
  delete where.faculty_id;
  delete where.section_id;
  delete where.department_id;
  where.user_id = body.user_id;
  [err, attendance] = await to(student_attendance.findAll({ where: where, include: includes.student_attendance }))
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(attendance)){
    return ReE(res, { message: 'Attendance not found' }, BAD_REQUEST);
  }
  let finalData1 = []
  sessions.forEach(xy => {
    let val = getKeyValue(xy, '');
    let filter;
    if(body.faculty === true){
      filter = attendance.find(y=> val._id === getKeyValue(y, 'session_id'));
      let finalVal = {};
      if(isNull(filter)){
        finalVal = { ...val, session_end_time: String(val.session_end_time).substring(11,16), session_start_time: String(val.session_start_time).substring(11,16), student_track: [], total_duration: '', present: false, status: 'Absent' };
      }else{
        finalVal = { ...val, session_end_time: String(val.session_end_time).substring(11,16), session_start_time: String(val.session_start_time).substring(11,16), student_track: getKeyValue(filter, 'student_track'), total_duration: getKeyValue(filter, 'total_duration'), present: getKeyValue(filter, 'present'), status: getKeyValue(filter, 'present') === true? 'Present': 'Absent' };
      }
      finalData1.push(finalVal);
    }else{
        students.forEach(z => {
        let studentId = z.userId??{};
        let studentInfo = z;
        let filter = attendance.find(y=> val._id === getKeyValue(y, '_id') && z.user_id === getKeyValue(y, 'user_id'));
        let finalVal = {};
        if(isNull(filter)){
          finalVal = { ...val, session_end_time: String(val.session_end_time).substring(11,16), session_start_time: String(val.session_start_time).substring(11,16), student_track: [], total_duration: '', present: false, studentInfo: studentInfo, studentId: studentId, status: 'Absent' };
        }else{
          finalVal = { ...val, session_end_time: String(val.session_end_time).substring(11,16), session_start_time: String(val.session_start_time).substring(11,16), student_track: getKeyValue(filter, 'student_track'), total_duration: getKeyValue(filter, 'total_duration'), present: getKeyValue(filter, 'present'), studentInfo: studentInfo, studentId: studentId, status: getKeyValue(filter, 'present') === true? 'Present': 'Absent' };
        }
        finalData1.push(finalVal);
      })
    }
  });
  groupBy = { status: finalData1.reduce((group, element) => {
    if(!isNull(element.dataValues)){
      element = element.dataValues;
    }
    const datas = element.status;
    group[datas] = group[datas] ?? [];
    group[datas].push(element);
    return group;
  }, {}) };
  if(finalData1.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Attendance founded', data: { data: finalData1, unique: unique, group: groupBy } }, OK)
}

exports.sessionsByFacultyByCourse = async(req,res) => {
  let err, sessions, batch, batchId = [];
  let body = req.body;
  const user = req.user;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });
    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }
    console.log(checkMenuUserDetails);
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization Id' }, BAD_REQUEST);
  }
  if(isNull(body.cdm_id) || !IsValidUUIDV4(body.cdm_id)){
    return ReE(res, { message: 'Invalid Course Id' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, cdm_id: body.cdm_id, from: { [Op.gte]: (moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS')), [Op.lt]: (moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS')) } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body.course_batch_id = { [Op.in]: batchId };
  delete body.academic_year;
  delete body.group_id;
  [err, sessions] = await to(session.findAll({ where: body, include: includes.session }));;
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sessions) || sessions.length === 0){
    return ReE(res, { message: 'Sessions not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(sessions);
  groupBy = await groupBys(["faculty_id"], sessions, 'f_name');
  if(sessions.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report Founded', data: { data: sessions, group: groupBy, unique: uniqueObj } }, OK);
}

exports.sessionsByFacultyBySubjectOrTopic = async(req,res) => {
  let err, sessions, batch, batchId = [];
  let body = req.body;
  const user = req.user;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });
    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }
    console.log(checkMenuUserDetails);
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization Id' }, BAD_REQUEST);
  }
  if(isNull(body.topic_id) && isNull(body.subject_id)){
    return ReE(res, { message: 'Plaese select subject/topic Id' }, BAD_REQUEST);
  }
  if(!isNull(body.subject_id) && !IsValidUUIDV4(body.subject_id)){
    return ReE(res, { message: 'Invalid Subject Id' }, BAD_REQUEST);
  }
  if(!isNull(body.topic_id) && !IsValidUUIDV4(body.topic_id)){
    return ReE(res, { message: 'Invalid Topic Id' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, from: { [Op.gte]: (moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS')), [Op.lt]: (moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS')) } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body.course_batch_id = { [Op.in]: batchId };
  delete body.academic_year;
  delete body.group_id;
  [err, sessions] = await to(session.findAll({ where: body, include: includes.session }));;
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sessions) || sessions.length === 0){
    return ReE(res, { message: 'Sessions not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(sessions);
  groupBy = await groupBys(["faculty_id"], sessions, 'f_name');
  if(sessions.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report Founded', data: { data: sessions, group: groupBy, unique: uniqueObj } }, OK);
}

exports.deleteAllDataOfOrganization = async(req,res) => {
  const id = req.params.id;
  let tables = ['subject_mapping','batch_sem', 'section', 'course_batch', 'course_department_mapping', 'sub_topic',  'topic', 'subject', 'department', 'course', 'time_frame', 'program', 'discipline'];
  let response = {};
  tables.forEach(async(x)=> {
    let err, result;
    let models = model[x];
    console.log(models);
    [err, result] = await to(models.destroy({ where: { org_id: id } }));
    if(err){
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(result)){
      return ReE(res, { message: 'delete failed' }, BAD_REQUEST);
    }
    response[x] = result;
  });
  return ReS(res, { message: 'Success', data: response }, OK);
}

exports.sessionsByFacultyByCourseBySubjectOrTopic = async(req,res) => {
  let err, sessions, batch, batchId = [];
  let body = req.body;
  const user = req.user;
  if (!user.owner) {
    let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });
    if (!checkMenuUserDetails.success) {
      return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
    }
    console.log(checkMenuUserDetails);
  }
  if(isNull(body.org_id) || !IsValidUUIDV4(body.org_id)){
    return ReE(res, { message: 'Invalid Organization Id' }, BAD_REQUEST);
  }
  if(isNull(body.cdm_id) || !IsValidUUIDV4(body.cdm_id)){
    return ReE(res, { message: 'Invalid Course Id' }, BAD_REQUEST);
  }
  if(isNull(body.academic_year)){
    body.academic_year = moment().format('YYYY');
  }
  if(!yearValidation(body.academic_year)){
    return ReE(res, { message: 'Invalid Academic year' }, BAD_REQUEST);
  }
  [err, batch] = await to(course_batch.findAll({ where: { org_id: body.org_id, cdm_id: body.cdm_id, from: { [Op.gte]: (moment(String(body.academic_year)).format('YYYY-MM-DD HH:mm:ss+SS')), [Op.lt]: (moment(String(parseInt(body.academic_year)+1)).format('YYYY-MM-DD HH:mm:ss+SS')) } } }));
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(batch) || batch.length === 0){
    return ReE(res, { message: 'No batch found' }, BAD_REQUEST);
  }
  batch.forEach(x=> {
    let val = isNull(x.dataValues)?x._id: x.dataValues._id;
    batchId.push(val);
  });
  body.course_batch_id = { [Op.in]: batchId };
  delete body.academic_year;
  delete body.group_id;
  [err, sessions] = await to(session.findAll({ where: body, include: includes.session }));;
  if(err){
    return ReE(res, err, INTERNAL_SERVER_ERROR);
  }
  if(isNull(sessions) || sessions.length === 0){
    return ReE(res, { message: 'Sessions not found' }, BAD_REQUEST);
  }
  uniqueObj = await getUnique(sessions);
  groupBy = await groupBys(["faculty_id", "cdm_id", "subject_id", "topic_id"], sessions, 'f_name');
  if(sessions.length === 0){
    return ReE(res, { message: 'Report not found'}, BAD_REQUEST);    
  }
  return ReS(res, { message: 'Report Founded', data: { data: sessions, group: groupBy, unique: uniqueObj } }, OK);
}