const { discipline, organization, program, user_data, course_batch, course_department_mapping, batch_sem, time_table, course, department, user_subject, subject } = require("../models");
const { Op } = require("sequelize");
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const HttpStatus = require('http-status');
const { isNull, isEmpty, ReE, to, ReS, generateCode, workday_count } = require("../service/util.service");
const { checkOrganization, checkDiscipline, checkUserInf } = require("./common");
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { CONFIG } = require("../config/confifData");
const moment = require('moment');
const { checkCourseBatch } = require("./course_batch");
const { checkMenuAccess } = require('./common');

module.exports.createSem = async (req, res) => {

    let body = req.body;
    const user = req.user;

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

    let fields = ['discipline_id', 'program_id', 'cdm_id', 'course_batch_id', 'from', 'to'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrg = await checkOrganization({ org_id: org_id });

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

    let checkCourse = moment.duration(moment(checkCourseBatchDetails.courseBatchData.to).diff(new Date())).asDays();

    if (checkCourse <= 0) {
        return ReE(res, { message: "Course Batch was already ended!." }, HttpStatus.BAD_REQUEST);
    }

    let getSem, optionSem = {
        where: {
            is_active: true,
            is_block: false,
            course_batch_id: body.course_batch_id
        }
    };

    [err, getSem] = await to(batch_sem.findAll(optionSem));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { courseDuration, courseSemDuration } = checkCourseDepartmentDetails.courseDepartment;

    let courseYear = 1, sem = 1;

    let fromDate = moment(body.from, 'DD/MM/YYYY').format();
    let lateDate = moment(body.to, 'DD/MM/YYYY').format();

    let fM = moment(fromDate);
    let lM = moment(lateDate);

    if (!isEmpty(getSem)) {
        let semLen = Number(courseSemDuration.duration) * Number(courseDuration.duration);

        if (semLen <= getSem.length) {
            return ReE(res, { message: "Already you are mapped all the semester's for this batch!." }, HttpStatus.BAD_REQUEST);
        }
        sem = (getSem.length % Number(courseSemDuration.duration)) + 1;
        courseYear = (getSem.length / Number(courseSemDuration.duration)) + 1;
    }

    let errSem = [];

    if (sem >= 1 && !isEmpty(getSem)) {
        getSem.map(x => {
            let checkX = moment(fM._d).diff(x.to);
            let Fd = moment.duration(checkX).asDays();
            if (Fd <= 0) {
                errSem.push(x);
            }
        });

        if (!isEmpty(errSem)) {
            return ReE(res, { message: "Semester start date must greater then of pervious semester end date!" }, HttpStatus.BAD_REQUEST);
        }
    } else {
        let checkX = moment(fM._d).diff(checkCourseBatchDetails.courseBatchData.from);
        let Fm = moment.duration(checkX).asMonths();
        let Fd = moment.duration(checkX).asDays();

        if (Fm > CONFIG.batch.semstart) {
            return ReE(res, { message: `Please check semester start date, because semester start date must with start before ${moment(checkCourseBatchDetails.courseBatchData.from).format('DD/MM/YYYY')} month from the course start date!.` }, HttpStatus.BAD_REQUEST);
        }

        if (Fd < 0) {
            return ReE(res, { message: `Please check semester start date, because semester start date was must more then course start date ${moment(checkCourseBatchDetails.courseBatchData.from).format('DD/MM/YYYY')}!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    if (!fM.isValid()) {
        return ReE(res, { message: "Please enter vaild semester start date!." }, HttpStatus.BAD_REQUEST);
    }

    let checkFdate = moment(fM._d).diff(checkCourseBatchDetails.courseBatchData.from);
    let Fdyear = moment.duration(checkFdate).asDays();

    if (Fdyear < CONFIG.batch.startDay) {
        return ReE(res, { message: `Please enter semester start must more then ${CONFIG.batch.startDay} days from course start date ${moment(checkCourseBatchDetails.courseBatchData.from).format('DD/MM/YYYY')}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!lM.isValid()) {
        return ReE(res, { message: "Please enter vaild course end date!." }, HttpStatus.BAD_REQUEST);
    }

    let checkTdate = moment(lM._d).diff(fM._d);

    let days = workday_count(moment(fM._d), moment(lM._d));

    // let year = moment.duration(checkTdate).asDays();

    if (Math.floor(days) > CONFIG.batch.semDuration.max || Math.floor(days) < CONFIG.batch.semDuration.min) {
        return ReE(res, { message: `Please enter vaild semester duration within ${CONFIG.batch.semDuration.min} to ${CONFIG.batch.semDuration.max} working days!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseSem, courseSemOption = {
        where: {
            org_id: org_id,
            program_id: body.program_id,
            discipline_id: body.discipline_id,
            cdm_id: body.cdm_id,
            course_batch_id: body.course_batch_id,
            to: { [Op.lte]: moment(fromDate).set({ h: 23, m: 59 })._d },
            from: { [Op.gte]: moment(fromDate).set({ h: 0, m: 0 })._d },
            is_active: true,
            is_block: false
        }
    };

    [err, checkCourseSem] = await to(batch_sem.findOne(courseSemOption));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkCourseSem)) {
        return ReE(res, { message: `Already you are mapped the batch semester in between dates!.` }, HttpStatus.BAD_REQUEST);
    }

    let codeName = `${sem}${String(fM.format('YYYY')).slice(2)}${checkProgramDetails.name}`;

    let code;

    const data = async () => {
        code = generateCode(codeName, 5);
        if (String(code).length < 5) {
            data();
        } else {
            let checkCode, codeOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkCode] = await to(batch_sem.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    let createSem, createSemData = {
        org_id: org_id,
        program_id: body.program_id,
        discipline_id: body.discipline_id,
        cdm_id: body.cdm_id,
        semester: Math.floor(sem),
        year: Math.floor(courseYear),
        course_batch_id: body.course_batch_id,
        code: code,
        from: moment(fromDate)._d,
        to: moment(lateDate)._d,
        createdby: user._id,
        updatedby: user._id,
        is_active: true,
        is_block: false
    };

    [err, createSem] = await to(batch_sem.create(createSemData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createSem)) {
        return ReE(res, { message: "Something went wrong to create semester!." }, HttpStatus.BAD_REQUEST);
    }

    let bet = `Batch ${moment(checkCourseBatchDetails.courseBatchData.from).format('YYYY')} - ${moment(checkCourseBatchDetails.courseBatchData.to).format('YYYY')}`;

    if (!isNull(createSem)) {
        return ReS(res, { message: `${bet} ${Math.floor(courseYear)} Year ${sem} Semester was created!.` }, HttpStatus.OK);
    }
}

module.exports.getAllSem = async (req, res) => {

    let body = req.query;
    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

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
                model: program,
                as: 'programId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
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
            ['year', 'ASC'],
            ['semester', 'ASC']
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

    let org_id;

    if (!user.owner) {
        checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (!isNull(body.org_id) && user.owner) {
        org_id = body.org_id;
    }

    if (!isNull(org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            org_id: org_id
        }
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

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            course_batch_id: body.course_batch_id
        }
    }


    if (body.time == 'true') {

        let currentYear = moment(`31/12/${moment().format('YYYY')}`, 'DD/MM/YYYY').format();
        query.where = {
            ...query.where,
            from: { [Op.lte]: moment(currentYear)._d },
            to: { [Op.gte]: moment()._d }
        }

        let getTimetable, optionTime = {
            where: {
                is_active: true,
                is_block: false,
                [Op.or]: [{
                    current: false,
                    active: false
                }]
            }
        };

        [err, getTimetable] = await to(time_table.findAll(optionTime));

        if (!isEmpty(getTimetable)) {
            let ids = [];

            getTimetable.map(x => {
                if (!ids.includes(x.batch_sem_id)) {
                    ids.push(x.batch_sem_id);
                }
            });
            query.where = {
                ...query.where,
                _id: { [Op.notIn]: ids }
            }

        }
    }

    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment(`31/12/${moment().format('YYYY')}`, 'DD/MM/YYYY').format();

        if (from == 'present') {
            query.where = {
                ...query.where,
                from: { [Op.lte]: moment(currentYear)._d },
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'past') {
            query.where = {
                ...query.where,
                to: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'notpast') {
            query.where = {
                ...query.where,
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'notfuture') {
            query.where = {
                ...query.where,
                from: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'future') {
            query.where = {
                ...query.where,
                from: { [Op.gte]: moment()._d }
            }
        }
    }


    let getSem;

    [err, getSem] = await to(batch_sem.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getSem)) {
        return ReE(res, { message: "Batch Semester was not fetch!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(getSem)) {
        return ReS(res, { message: "Batch Semester exists!.", data: getSem }, HttpStatus.OK);
    }

}

module.exports.getSem = async (req, res) => {

    let body = req.query;
    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(req.params.semId)) {
        return ReE(res, { message: "Please select batch!." }, HttpStatus.BAD_REQUEST);
    }

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
            ['year', 'ASC'],
            ['semester', 'ASC']
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

    let org_id;

    if (!user.owner) {
        checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (!isNull(body.org_id) && user.owner) {
        org_id = body.org_id;
    }

    if (!isNull(org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            org_id: org_id
        }
    }

    if (!isNull(body.discipline_id)) {

        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            discipline_id: body.discipline_id
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

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            course_batch_id: body.course_batch_id
        }

    }

    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment(`31/12/${moment().format('YYYY')}`, 'DD/MM/YYYY').format();

        if (from == 'present') {
            query.where = {
                ...query.where,
                from: { [Op.lte]: moment(currentYear)._d },
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'past') {
            query.where = {
                ...query.where,
                to: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'notpast') {
            query.where = {
                ...query.where,
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'notfuture') {
            query.where = {
                ...query.where,
                from: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'future') {
            query.where = {
                ...query.where,
                from: { [Op.gte]: moment()._d }
            }
        }
    }

    query.where = {
        ...query.where,
        _id: req.params.batchId
    }

    let getSems;

    [err, getSems] = await to(batch_sem.findOne(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getSems)) {
        return ReE(res, { message: "Semester was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (getSems.is_block) {
        return ReE(res, { message: "Semester was blocked!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(getSems)) {
        return ReS(res, { message: "Semester exists!.", data: getSems, }, HttpStatus.OK);
    }

}

const checkBatchSemester = async (body) => {

    if (isNull(body.batch_sem_id) || !IsValidUUIDV4(body.batch_sem_id)) {
        return { message: "Please select vaild batch semester details!.", success: false };
    }

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
            ['year', 'ASC'],
            ['semester', 'ASC']
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

    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment(`31/12/${moment().format('YYYY')}`, 'DD/MM/YYYY').format();

        if (from == 'present') {
            query.where = {
                ...query.where,
                from: { [Op.lte]: moment(currentYear)._d },
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'past') {
            query.where = {
                ...query.where,
                to: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'notpast') {
            query.where = {
                ...query.where,
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'notfuture') {
            query.where = {
                ...query.where,
                from: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'future') {
            query.where = {
                ...query.where,
                from: { [Op.gte]: moment()._d }
            }
        }
    }

    query.where = {
        ...query.where,
        _id: body.batch_sem_id
    }

    let getSems;

    [err, getSems] = await to(batch_sem.findOne(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getSems)) {
        return { message: "Semester was not found!.", success: false };
    }

    if (getSems.is_block) {
        return { message: "Semester was blocked!.", success: false };
    }

    if (!isNull(getSems)) {
        return { message: "Semester exists!.", batchSemesters: getSems, success: true }
    }

}

module.exports.checkBatchSemester = checkBatchSemester;