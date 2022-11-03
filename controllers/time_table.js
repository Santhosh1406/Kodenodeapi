const { discipline, organization, program, user_data, course_batch, course_department_mapping, batch_sem, time_table, time_day, time_frame, subject, department, course, user_subject, section } = require("../models");
const { Op } = require("sequelize");
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const HttpStatus = require('http-status');
const { isNull, isEmpty, ReE, to, ReS, generateCode, firstLetterCap, durationArray } = require("../service/util.service");
const { checkOrganization, checkDiscipline, checkUserSubject, checkMenuAccess, checkUserInf } = require("./common");
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { CONFIG } = require("../config/confifData");
const moment = require('moment');
const { checkCourseBatch } = require("./course_batch");
const { checkBatchSemester } = require("./batch_sem");
const { checkSection } = require("./section");
const { checkTimeFrame, getAllTimeFrameDetails } = require("./time_frame");
const { checkDay, getDays } = require("./time_day");
const { checkSubjectMapping } = require("./subject_mapping");

module.exports.createTable = async (req, res) => {
    const user = req.user;
    let body = req.body;
    let org_id;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let fields = ['discipline_id', 'program_id', 'cdm_id', 'course_batch_id', 'section_id', 'batch_sem_id', 'session'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
    }

    let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: checkOrg.organizationDetails._id });

    if (!checkDisciplineDetails.success) {
        return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

    if (!checkProgramDetails.success) {
        return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

    if (!checkCourseDepartmentDetails.success) {
        return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, from: 'present' });

    if (!checkCourseBatchDetails.success) {
        return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSectionDetails = await checkSection({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, section_id: body.section_id });

    if (!checkSectionDetails.success) {
        return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.session)) {
        return ReE(res, { message: "Please select session details to create time table!." }, HttpStatus.BAD_REQUEST);
    }

    let checkBatchSemDetails = await checkBatchSemester({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, batch_sem_id: body.batch_sem_id, from: 'persent' });

    if (!checkBatchSemDetails.success) {
        return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkTimeTableData = {
        'discipline_id': body.discipline_id,
        'program_id': body.program_id,
        'cdm_id': body.cdm_id,
        'course_batch_id': body.course_batch_id,
        'section_id': body.section_id,
        'batch_sem_id': body.batch_sem_id
    };

    // let checkTimeTableDetails = await checkTimeTable(checkTimeTableData);

    // if (!checkTimeTableDetails.success) {
    //     return ReE(res, { message: checkTimeTableDetails.message }, HttpStatus.BAD_REQUEST);
    // }

    let vaildSession = [], inVaildSession = [];

    const methods = async (body) => {
        let checkTimeFrameDetails = await checkTimeFrame({ org_id: org_id, time_frame_id: body.time_frame_id });

        if (!checkTimeFrameDetails.success) {
            return { message: checkTimeFrameDetails.message, success: false };
        }

        let checkTimeDayDetails = await checkDay({ org_id: org_id, time_day_id: body.time_day_id });

        if (!checkTimeDayDetails.success) {
            return { message: checkTimeDayDetails.message, success: false };
        }

        let checkSubjectMappingDetails = await checkSubjectMapping({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, batch_sem_id: body.batch_sem_id, subject_id: body.subject_id });

        if (!checkSubjectMappingDetails.success) {
            return { message: checkSubjectMappingDetails.message, success: false };
        }

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id, subject_id: body.subject_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        let checkTimeTableFrameDetails = await checkTimeTable({ ...checkTimeTableData, time_frame_id: body.time_frame_id, time_day_id: body.time_day_id, active: true });

        if (!checkTimeTableFrameDetails.success) {
            return { message: `${checkTimeTableFrameDetails.message} for this time frame day and time!.`, success: false };
        }

        let array = durationArray(checkTimeFrameDetails.data.session_start_time, checkTimeFrameDetails.data.session_end_time);

        let getTimeFrame = await getAllTimeFrameDetails({ time: array });

        if (!getTimeFrame.success) {
            return { message: getTimeFrame.message, success: false };
        }

        let ids = getTimeFrame.data.map(x => x._id);

        let checkTimeTableDetails = await checkTimeTable({
            'user_id': body.user_id,
            'active': true,
            'current': false,
            'time_frame_id': ids,
            'time_day_id': body.time_day_id
        });

        if (!checkTimeTableDetails.success) {
            return { message: `${checkTimeTableDetails.message} for this time frame day and time to this faculty!.`, success: false };
        }

        let code;

        const data = async () => {
            code = generateCode(String(`${checkCourseDepartmentDetails.courseDepartment.courseId.name}${String(checkTimeTableFrameDetails.name).slice(3)}${checkTimeFrameDetails.data.period}`).toUpperCase().replace(/[^a-zA-Z0-9 ]/g, '').replace(' ', ''), 8)

            if (String(code).length < 5) {
                data();
            } else {
                let checkCode, codeOption = {
                    code: code,
                    [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
                };

                [err, checkCode] = await to(time_table.findOne({
                    where: codeOption
                }));

                if (!isNull(checkCode)) {
                    data();
                }
            }
        }

        data();

        return {
            message: "All are okay", success: true, createData: {
                ...checkTimeTableData,
                'org_id': org_id,
                'user_id': body.user_id,
                'time_frame_id': body.time_frame_id,
                'time_day_id': body.time_day_id,
                'subject_id': body.subject_id,
                'code': code,
                'active': true,
                'current': false,
                'is_active': true,
                'is_block': false,
                'createdby': user._id,
                'updatedby': user._id
            }
        };


    }

    let array = [];

    for (let index = 0; index < body.session.length; index++) {
        const element = body.session[index];

        let fieldSession = ['time_frame_id', 'time_day_id', 'subject_id', 'user_id'];

        let inVaildFieldSession = await fieldSession.filter(x => (isNull(element[x]) || !IsValidUUIDV4(element[x])));

        if (!isEmpty(inVaildFieldSession)) {
            inVaildSession.push({ ...element, message: `Please select vaild required details ${inVaildFieldSession}!.` });
        }

        if (isEmpty(inVaildFieldSession)) {

            let ids = [];
            await body.session.map((x, i) => ids.push(`${x.time_frame_id}${x.time_day_id}`));


            let isDuplicate = ids.some((item, idx) => ids.indexOf(item) != idx);

            if (isDuplicate) {
                inVaildSession.push({ ...element, message: "Please remove the dublicate session details!." });
            } else {

                let methodsCheck = await methods(element);

                if (!methodsCheck.success) {
                    inVaildSession.push({ ...element, message: methodsCheck.message });
                }

                if (methodsCheck.success) {
                    vaildSession.push({ ...element, code: methodsCheck.createData.code, message: methodsCheck.message });

                    array.push(methodsCheck.createData);
                }
            }
        }
    }

    if (!isEmpty(inVaildSession) && isEmpty(vaildSession) && isEmpty(array)) {
        return ReE(res, { message: "Invaild Time table details  was exist!.", inVaildSession }, HttpStatus.BAD_REQUEST);
    }


    if (isEmpty(vaildSession) && isEmpty(array)) {
        return ReE(res, { message: "No vaild data was found to add!." }, HttpStatus.BAD_REQUEST);
    }

    let createTime;

    [err, createTime] = await to(time_table.bulkCreate(array));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createTime)) {
        return ReE(res, { message: "Something went wrong to mapping time table!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createTime)) {
        return ReS(res, { message: "Time table session are mapped successfully!.", data: createTime }, HttpStatus.OK);
    }

}

module.exports.verifyTable = async (req, res) => {
    const user = req.user;
    let body = req.body;
    let org_id;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let fields = ['discipline_id', 'program_id', 'cdm_id', 'course_batch_id', 'section_id', 'batch_sem_id', 'session'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
    }

    let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: checkOrg.organizationDetails._id });

    if (!checkDisciplineDetails.success) {
        return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

    if (!checkProgramDetails.success) {
        return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

    if (!checkCourseDepartmentDetails.success) {
        return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, from: 'present' });

    if (!checkCourseBatchDetails.success) {
        return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSectionDetails = await checkSection({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, section_id: body.section_id });

    if (!checkSectionDetails.success) {
        return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.session)) {
        return ReE(res, { message: "Please select session details to create time table!." }, HttpStatus.BAD_REQUEST);
    }

    let checkBatchSemDetails = await checkBatchSemester({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, batch_sem_id: body.batch_sem_id, from: 'persent' });

    if (!checkBatchSemDetails.success) {
        return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkTimeTableData = {
        'discipline_id': body.discipline_id,
        'program_id': body.program_id,
        'cdm_id': body.cdm_id,
        'course_batch_id': body.course_batch_id,
        'section_id': body.section_id,
        'batch_sem_id': body.batch_sem_id
    };

    // let checkTimeTableDetails = await checkTimeTable(checkTimeTableData);

    // if (!checkTimeTableDetails.success) {
    //     return ReE(res, { message: checkTimeTableDetails.message }, HttpStatus.BAD_REQUEST);
    // }

    let vaildSession = [], inVaildSession = [];

    const methods = async (body) => {
        let checkTimeFrameDetails = await checkTimeFrame({ org_id: org_id, time_frame_id: body.time_frame_id });

        if (!checkTimeFrameDetails.success) {
            return { message: checkTimeFrameDetails.message, success: false };
        }

        let checkTimeDayDetails = await checkDay({ org_id: org_id, time_day_id: body.time_day_id });

        if (!checkTimeDayDetails.success) {
            return { message: checkTimeDayDetails.message, success: false };
        }

        let checkSubjectMappingDetails = await checkSubjectMapping({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, batch_sem_id: body.batch_sem_id, subject_id: body.subject_id });

        if (!checkSubjectMappingDetails.success) {
            return { message: checkSubjectMappingDetails.message, success: false };
        }

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id, subject_id: body.subject_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        let checkTimeTableFrameDetails = await checkTimeTable({ ...checkTimeTableData, time_frame_id: body.time_frame_id, time_day_id: body.time_day_id });

        if (!checkTimeTableFrameDetails.success) {
            return { message: `${checkTimeTableFrameDetails.message} for this time frame day and time!.`, success: false };
        }

        let array = durationArray(checkTimeFrameDetails.data.session_start_time, checkTimeFrameDetails.data.session_end_time);

        let getTimeFrame = await getAllTimeFrameDetails({ time: array });

        if (!getTimeFrame.success) {
            return ReE(res, { message: getTimeFrame.message }, HttpStatus.BAD_REQUEST);
        }

        let ids = getTimeFrame.data.map(x => x._id);

        let checkTimeTableDetails = await checkTimeTable({
            'user_id': body.user_id,
            'time_frame_id': ids,
            'time_day_id': body.time_day_id
        });

        if (!checkTimeTableDetails.success) {
            return { message: `${checkTimeTableDetails.message} for this time frame day and time to this faculty!.`, success: false };
        }

        let code;

        const data = async () => {
            code = generateCode(String(`${checkCourseDepartmentDetails.courseDepartment.courseId.name}${String(checkTimeTableFrameDetails.name).slice(3)}${checkTimeFrameDetails.data.period}`).toUpperCase().replace(/[^a-zA-Z0-9 ]/g, '').replace(' ', ''), 8)

            if (String(code).length < 5) {
                data();
            } else {
                let checkCode, codeOption = {
                    code: code,
                    [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
                };

                [err, checkCode] = await to(time_table.findOne({
                    where: codeOption
                }));

                if (!isNull(checkCode)) {
                    data();
                }
            }
        }

        data();

        return {
            message: "All are okay", success: true, createData: {
                ...checkTimeTableData,
                'user_id': body.user_id,
                'time_frame_id': body.time_frame_id,
                'time_day_id': body.time_day_id,
                'code': code,
                'is_active': true,
                'is_block': false,
                'createdby': user._id,
                'updatedby': user._id
            }
        };


    }


    for (let index = 0; index < body.session.length; index++) {
        const element = body.session[index];

        let fieldSession = ['time_frame_id', 'time_day_id', 'subject_id', 'user_id'];

        let inVaildFieldSession = await fieldSession.filter(x => (isNull(element[x]) || !IsValidUUIDV4(element[x])));

        if (!isEmpty(inVaildFieldSession)) {
            inVaildSession.push({ ...element, message: `Please select vaild required details ${inVaildFieldSession}!.` });
        }

        if (isEmpty(inVaildFieldSession)) {

            let ids = [];
            await body.session.map((x, i) => ids.push(`${x.time_frame_id}${x.time_day_id}`));


            let isDuplicate = ids.some((item, idx) => ids.indexOf(item) != idx);

            if (isDuplicate) {
                inVaildSession.push({ ...element, message: "Please remove the dublicate session details!." });
            } else {

                let methodsCheck = await methods(element);

                if (!methodsCheck.success) {
                    inVaildSession.push({ ...element, message: methodsCheck.message });
                }

                if (methodsCheck.success) {
                    vaildSession.push({ ...element, code: methodsCheck.createData.code, message: methodsCheck.message });
                }
            }
        }
    }

    return ReS(res, { message: "Verification was completed!", errSession: inVaildSession, Session: vaildSession }, HttpStatus.OK);

}

module.exports.getAllTimeTable = async (req, res) => {
    const user = req.user;
    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;


        let checkSubject, optionSubject = {
            where: {
                user_id: user._id,
                is_active: true
            }
        };

        [err, checkSubject] = await to(user_subject.findAll(optionSubject));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isEmpty(checkSubject) || !isNull(checkUserDetails.userInfo.course_batch_id)) {
            body = { ...body, user_id: user._id, course_batch_id: checkUserDetails.userInfo.course_batch_id };
        }

        if (checkUserDetails.userInfo.course_batch_id && isNull(body.section_id)) {
            return ReE(res, { message: "Your Section not yet mapped!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isNull(checkUserDetails.userInfo.section_id)) body = { ...body, section_id: checkUserDetails.userInfo.section_id };

    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }
    }


    let query = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId',
                attributes: ['_id', 'org_id', 'org_name']
            },
            {
                model: discipline,
                as: 'disciplineId',
                attributes: ['_id', 'discipline_id', 'name']
            },
            {
                model: program,
                as: 'programId',
                attributes: ['_id', 'program_id', 'name']
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: section,
                as: 'sectionId'
            },
            {
                model: time_day,
                as: 'timeDayId',
                attributes: ['_id', 'name', 'code']
            },
            {
                model: time_frame,
                as: 'timeFrameId',
                attributes: ['_id', 'period']
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email', 'surname']
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
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: user_data,
                as: 'createdBy',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email', 'surname']
            },
            {
                model: user_data,
                as: 'updatedBy',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email', 'surname']
            }
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    if (!isNull(body.discipline_id)) {
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.department_id)) {

            query.where = {
                ...query.where,
                discipline_id: body.discipline_id
            }
        }

        if (!isNull(body.department_id)) {
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

            if (isEmpty(getSubjects)) {
                query.where = {
                    ...query.where,
                    discipline_id: body.discipline_id
                }
            };
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            program_id: body.program_id
        }
    }

    if (!isNull(body.cdm_id)) {
        let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id });

        if (!checkCourseDepartmentDetails.success) {
            return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            cdm_id: body.cdm_id
        }
    }

    if (!isNull(body.course_batch_id)) {

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            course_batch_id: body.course_batch_id
        }
    }

    if (!isNull(body.section_id)) {
        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            section_id: body.section_id
        };
    }


    if (!isNull(body.batch_sem_id)) {
        let checkBatchSemDetails = await checkBatchSemester({ batch_sem_id: body.batch_sem_id, from: 'persent' });

        if (!checkBatchSemDetails.success) {
            return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            batch_sem_id: body.batch_sem_id
        }
    }

    if (!isNull(body.time_frame_id)) {
        let checkTimeFrameDetails = await checkTimeFrame({ time_frame_id: body.time_frame_id });

        if (!checkTimeFrameDetails.success) {
            return ReE(res, { message: checkTimeFrameDetails.message, success: false }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            time_frame_id: body.time_frame_id
        }
    }

    if (!isNull(body.time_day_id)) {
        let checkTimeDayDetails = await checkDay({ time_day_id: body.time_day_id });

        if (!checkTimeDayDetails.success) {
            return ReE(res, { message: checkTimeDayDetails.message, success: false }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            time_day_id: body.time_day_id
        }
    }

    if (!isNull(body.subject_id) && isNull(body.course_batch_id)) {
        let checkSubjectMappingDetails = await checkSubjectMapping({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, });

        if (!checkSubjectMappingDetails.success) {
            return ReE(res, { message: checkSubjectMappingDetails.message, success: false }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.user_id) && isNull(body.course_batch_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id });

        if (!checkUserSubjectDetails.success) {
            return ReE(res, { message: checkUserSubjectDetails.message, success: false }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            user_id: body.user_id
        }
    }

    let getDay = await getDays({ org_id: org_id });

    if (!getDay.success) {
        return ReE(res, { message: getDay.message }, HttpStatus.BAD_REQUEST);
    }

    let { days } = getDay;

    let timeframe, optionTimeFrame = {
        where: {
            is_active: true,
            is_block: false
        },
        order: [['period', 'ASC']]
    }

    if (!isNull(body.program_id)) {
        optionTimeFrame.where = {
            ...optionTimeFrame.where,
            program_id: body.program_id
        };

        [err, timeframe] = await to(time_frame.findAll(optionTimeFrame));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(timeframe)) {
            return ReE(res, { message: "Time frame details was not found!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let timeTable = [];

    for (let index = 0; index < days.length; index++) {
        const element = days[index];

        query.where = {
            ...query.where,
            time_day_id: element._id
        }

        let getTime;

        [err, getTime] = await to(time_table.findAll(query));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (body.today === 'true' && firstLetterCap(element.name) == moment().format('dddd')) {
            if (!isEmpty(getTime)) timeTable = timeTable.concat(getTime);
        } else if (body.today === 'false' || isNull(body.today)) {
            if (!isEmpty(getTime)) timeTable = timeTable.concat(getTime);
        }
    }

    if (isEmpty(timeTable)) {
        return ReE(res, { message: "Time table session details empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(timeTable)) {
        return ReS(res, { message: "Time table session was exists!.", data: timeTable, days: days, timeframe: timeframe }, HttpStatus.OK);
    }
}

module.exports.updateTable = async (req, res) => {

    const user = req.user;
    let body = req.body;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let fields = ['time_table_id', 'time_frame_id', 'time_day_id', 'subject_id', 'user_id'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
    }

    let checkTime, checkTimeTableOption = {
        where: {
            _id: body.time_table_id,
            org_id: org_id,
            is_active: true
        }
    };

    [err, checkTime] = await to(time_table.findOne(checkTimeTableOption));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkTime)) {
        return ReE(res, { message: "Please select vaild time table details!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkTime.is_block) {
        return ReE(res, { message: "Time table was blocked!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkTime.current) {
        return ReE(res, { message: "You can't update current semester!." }, HttpStatus.BAD_REQUEST);
    }

    if (!checkTime.active) {
        return ReE(res, { message: "You can't update completed semester!." }, HttpStatus.BAD_REQUEST);
    }

    let checkTimeFrameDetails = await checkTimeFrame({ org_id: org_id, time_frame_id: body.time_frame_id });

    if (!checkTimeFrameDetails.success) {
        return { message: checkTimeFrameDetails.message, success: false };
    }

    let checkTimeDayDetails = await checkDay({ org_id: org_id, time_day_id: body.time_day_id });

    if (!checkTimeDayDetails.success) {
        return { message: checkTimeDayDetails.message, success: false };
    }

    let checkSubjectMappingDetails = await checkSubjectMapping({ org_id: org_id, course_batch_id: checkTimeFrameDetails.data.course_batch_id, subject_id: body.subject_id });

    if (!checkSubjectMappingDetails.success) {
        return { message: checkSubjectMappingDetails.message, success: false };
    }

    let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id, subject_id: body.subject_id });

    if (!checkUserSubjectDetails.success) {
        return { message: checkUserSubjectDetails.message, success: false };
    }

    let updatedFields = ['user_id', 'subject_id'];

    let checkUpdatedField = await updatedFields.filter(x => checkTime[x] != body[x]);

    if (isEmpty(checkUpdatedField)) {
        return ReE(res, { message: "Please edit something to update time table details!." }, HttpStatus.BAD_REQUEST);
    }

    let array = durationArray(checkTimeFrameDetails.data.session_start_time, checkTimeFrameDetails.data.session_end_time);

    let getTimeFrame = await getAllTimeFrameDetails({ time: array });

    if (!getTimeFrame.success) {
        return ReE(res, { message: getTimeFrame.message }, HttpStatus.BAD_REQUEST);
    }

    let ids = getTimeFrame.data.map(x => x._id);

    let checkTimeTableDetails = await checkTimeTable({
        'time_table_id': body.time_table_id,
        'user_id': body.user_id,
        'active': true,
        'current': false,
        'time_frame_id': ids,
        'time_day_id': body.time_day_id,
        'timeTable': false
    });

    if (!checkTimeTableDetails.success) {
        return { message: `${checkTimeTableDetails.message} for this time frame day and time to this faculty!.`, success: false };
    }

    let updateDetails, updateData = {
        where: {
            '_id': body.time_table_id,
            'active': true,
            'is_active': true,
            'is_block': false,
            'current': false
        },
        set: {
            'user_id': body.user_id,
            'subject_id': body.subject_id,
            'updatedby': user._id
        }
    };

    [err, updateDetails] = await to(time_table.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(updateDetails)) {
        return ReE(res, { message: "Something went wrong to update time table!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(updateDetails)) {
        return ReS(res, { message: "Time table details was updated!." }, HttpStatus.OK);
    }
}

const checkTimeTable = async (body) => {

    let query = {
        where: getQuery(body),
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
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: program,
                as: 'programId'
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
                as: 'createdBy',
                attributes: ['_id', 'username']
            },
            {
                model: user_data,
                as: 'updatedBy',
                attributes: ['_id', 'username']
            }
        ],
        order: [
            ['createdby', 'ASC']
        ]
    }

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
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

    if (!isNull(body.section_id)) {
        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            section_id: body.section_id
        }

    }

    if (!isNull(body.batch_sem_id)) {
        let checkBatchSemDetails = await checkBatchSemester({ batch_sem_id: body.batch_sem_id, from: 'persent' });

        if (!checkBatchSemDetails.success) {
            return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            batch_sem_id: body.batch_sem_id
        }

    }

    if (!isNull(body.time_frame_id)) {
        let checkTimeFrameDetails = await checkTimeFrame({ time_frame_id: body.time_frame_id });

        if (!checkTimeFrameDetails.success) {
            return { message: checkTimeFrameDetails.message, success: false };
        }

        if (Array.isArray(body.time_frame_id)) {
            query.where = {
                ...query.where,
                time_frame_id: { [Op.in]: body.time_frame_id }
            }
        }

        if (IsValidUUIDV4(body.time_frame_id)) {
            query.where = {
                ...query.where,
                time_frame_id: body.time_frame_id
            }
        }

    }

    if (!isNull(body.time_day_id)) {
        let checkTimeDayDetails = await checkDay({ time_day_id: body.time_day_id });

        if (!checkTimeDayDetails.success) {
            return { message: checkTimeDayDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            time_day_id: body.time_day_id
        }
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectMappingDetails = await checkSubjectMapping({ subject_id: body.subject_id });

        if (!checkSubjectMappingDetails.success) {
            return { message: checkSubjectMappingDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.user_id) && !isNull(body.subject_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id, subject_id: body.subject_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.time_table_id)) {
        if (!IsValidUUIDV4(body.time_table_id)) {
            return { message: "Please select vaild time table details!.", success: false };
        }

        query.where = {
            ...query.where,
            _id: body.time_table_id
        }

        if (body.timeTable == false) {
            query.where = {
                ...query.where,
                _id: { [Op.notIn]: [`${body.time_table_id}`] }
            }
        }
    }

    if (body.active == true) {
        query.where = {
            ...query.where,
            active: true
        }
    } else {
        query.where = {
            ...query.where,
            active: false
        }
    }

    if (body.current == true) {
        query.where = {
            ...query.where,
            current: true
        }
    } else if (isNull(body.both)) {
        query.where = {
            ...query.where,
            current: false
        }
    }

    let getTimetable;

    [err, getTimetable] = await to(time_table.findOne(query));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(getTimetable)) {
        return { message: "Time table session details was already created!.", timeTable: getTimetable, success: false }
    }

    if (isNull(getTimetable)) {
        return { message: "Time table session detail was ready to created!.", success: true };
    }

}

module.exports.checkTimeTable = checkTimeTable;

const getAllTimeTableMethod = async (body) => {

    let query = {
        where: getQuery(body),
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
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId',
                include: [
                    {
                        model: course,
                        as: 'courseId'
                    },
                    {
                        model: department,
                        as: 'departmentId'
                    }
                ]
            },
            {
                model: course_batch,
                as: 'courseBatchId'
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
        ],
        order: [
            ['createdby', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
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

    if (!isNull(body.section_id)) {
        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            section_id: body.section_id
        }
    }

    if (!isNull(body.batch_sem_id)) {
        let checkBatchSemDetails = await checkBatchSemester({ batch_sem_id: body.batch_sem_id, from: 'persent' });

        if (!checkBatchSemDetails.success) {
            return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            batch_sem_id: body.batch_sem_id
        }
    }

    if (!isNull(body.time_frame_id)) {
        let checkTimeFrameDetails = await checkTimeFrame({ time_frame_id: body.time_frame_id });

        if (!checkTimeFrameDetails.success) {
            return { message: checkTimeFrameDetails.message, success: false };
        }

        let array = durationArray(checkTimeFrameDetails.data.session_start_time, checkTimeFrameDetails.data.session_end_time);

        let getTimeFrame = await getAllTimeFrameDetails({ time: array });

        if (!getTimeFrame.success) {
            return { message: getTimeFrame.message, success: false };
        }

        let ids = getTimeFrame.data.map(x => x._id);

        query.where = {
            ...query.where,
            time_frame_id: { [Op.in]: ids }
        }
    }

    if (!isNull(body.time_day_id)) {
        let checkTimeDayDetails = await checkDay({ time_day_id: body.time_day_id });

        if (!checkTimeDayDetails.success) {
            return { message: checkTimeDayDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            time_day_id: body.time_day_id
        }
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectMappingDetails = await checkSubjectMapping({ subject_id: body.subject_id });

        if (!checkSubjectMappingDetails.success) {
            return { message: checkSubjectMappingDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.user_id) && !isNull(body.subject_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id, subject_id: body.subject_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            user_id: body.user_id,
            subject_id: body.subject_id
        }
    }

    if (body.active == true) {
        query.where = {
            ...query.where,
            active: true
        }
    }

    if (body.current == true) {
        query.where = {
            ...query.where,
            current: true
        }
    }

    let getTimetable;

    [err, getTimetable] = await to(time_table.findAll(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(getTimetable)) {
        return { message: "Time table session details was empty!.", success: false }
    }

    if (!isEmpty(getTimetable)) {
        return { message: "Time table session detail was exists!.", timeTable: getTimetable, success: true };
    }

}

module.exports.getAllTimeTableMethod = getAllTimeTableMethod;