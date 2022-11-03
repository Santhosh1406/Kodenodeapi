const { discipline, organization, program, user_data, course_batch, course_department_mapping, department, course, batch_sem,user_subject,subject } = require("../models");
const { Op } = require("sequelize");
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const HttpStatus = require('http-status');
const { isNull, isEmpty, ReE, to, ReS, generateCode } = require("../service/util.service");
const { checkOrganization, checkDiscipline, checkUserInf } = require("./common");
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { CONFIG } = require("../config/confifData");
const moment = require('moment');
const { checkMenuAccess } = require('./common');
const { checkDepartment } = require("./department");

module.exports.createCourseBatch = async (req, res) => {

    let body = req.body;
    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

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
        if (isNull(body.org_id) || !IsValidUUIDV4(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let fields = ['discipline_id', 'program_id', 'cdm_id', 'from', 'to'];

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

    let fromDate = moment(body.from, 'DD/MM/YYYY').format();
    let lateDate = moment(body.to, 'DD/MM/YYYY').format();

    let fM = moment(fromDate);
    let lM = moment(lateDate);

    if (!fM.isValid()) {
        return ReE(res, { message: "Please enter vaild course start date!." }, HttpStatus.BAD_REQUEST);
    }

    let courseDur = 0;

    if (!isNull(checkCourseDepartmentDetails.courseDepartment.courseDuration) && !isNull(checkCourseDepartmentDetails.courseDepartment.courseDuration.duration)) {
        courseDur = checkCourseDepartmentDetails.courseDepartment.courseDuration.duration;

        courseDur = Number(courseDur) > 0 ? Number(courseDur) - 1 : Number(courseDur);
    }

    let currentDate = moment(new Date()).subtract(courseDur, 'year').format('YYYY');

    currentDate = moment(`01/01/${currentDate}`, 'DD/MM/YYYY');

    let checkFdate = moment(fM._d).diff(currentDate._d);
    let Fdyear = moment.duration(checkFdate).asDays();

    if (Fdyear < CONFIG.batch.startDay) {
        return ReE(res, { message: `Please enter course start must more then ${CONFIG.batch.startDay} days from ${moment(currentDate._d).format('DD/MM/YYYY')} day!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!lM.isValid()) {
        return ReE(res, { message: "Please enter vaild course end date!." }, HttpStatus.BAD_REQUEST);
    }

    let checkTdate = moment(lM._d).diff(fM._d);

    let year = moment.duration(checkTdate).asYears();

    const { courseDuration } = checkCourseDepartmentDetails.courseDepartment;

    if (Math.floor(year) != Number(courseDuration.duration)) {
        return ReE(res, { message: `Please enter vaild course duration equal to ${courseDuration.duration}!.` }, HttpStatus.BAD_REQUEST);
    }

    let fyear = `01/01/${fM.format('YYYY')}`;

    let tYear = `31/12/${fM.format('YYYY')}`;

    let checkCourseBatch, coursebatchOption = {
        where: {
            org_id: org_id,
            program_id: body.program_id,
            discipline_id: body.discipline_id,
            cdm_id: body.cdm_id,
            [Op.and]: [{ from: { [Op.gte]: moment(fyear, 'DD/MM/YYYY')._d } }, { from: { [Op.lte]: moment(tYear, 'DD/MM/YYYY')._d } }],
            is_active: true,
            is_block: false
        }
    };

    [err, checkCourseBatch] = await to(course_batch.findOne(coursebatchOption));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkCourseBatch)) {
        return ReE(res, { message: `Already you created the batch for current year!.` }, HttpStatus.BAD_REQUEST);
    }

    let codeName = `${String(fM.format('YYYY')).slice(2)}${checkProgramDetails.name}`;

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

            [err, checkCode] = await to(course_batch.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    let createBatch, courseBatchData = {
        org_id: org_id,
        program_id: body.program_id,
        discipline_id: body.discipline_id,
        cdm_id: body.cdm_id,
        code: code,
        from: fM.set({ h: 0, m: 0 })._d,
        to: lM.set({ h: 23, m: 59 })._d,
        createdby: user._id,
        updatedby: user._id,
        is_active: true,
        is_block: false
    };


    [err, createBatch] = await to(course_batch.create(courseBatchData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createBatch)) {
        return ReE(res, { message: "Something went wrong to create batch !." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createBatch)) {
        return ReS(res, { message: "Course batch was created successfully!." }, HttpStatus.OK);
    }
}

module.exports.getAllCourseBatch = async (req, res) => {

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
                model: course_department_mapping,
                as: 'cdmId',
                include: [
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
            ['from', 'ASC']
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

    if (!isNull(body.department_id) && isNull(body.cdm_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let getCdms;

        [err, getCdms] = await to(course_department_mapping.findAll({ where: { department_id: body.department_id, is_active: true, is_block: false } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(getCdms)) {
            return ReE(res, { message: `Not yet mapped course on this ${checkDepartmentDetails.departmentDetails.name} department!.` }, HttpStatus.BAD_REQUEST);
        }

        let ids = getCdms.map(x => `${x._id}`);
        query.where = {
            ...query.where,
            cdm_id: { [Op.in]: ids }
        };
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
    let getCourseBatch;

    [err, getCourseBatch] = await to(course_batch.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getCourseBatch)) {
        return ReE(res, { message: "Batch was not fetch!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(getCourseBatch)) {
        return ReS(res, { message: "Batch was exists!.", data: getCourseBatch }, HttpStatus.OK);
    }

}

module.exports.getCourseBatch = async (req, res) => {

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
        return ReE(res, { message: "Please select semester details!." }, HttpStatus.BAD_REQUEST);
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
                model: course_department_mapping,
                as: 'cdmId',
                include: [
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
            ['from', 'ASC']
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


    if (!isNull(body.department_id) && isNull(body.cdm_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let getCdms;

        [err, getCdms] = await to(course_department_mapping.findAll({ where: { department_id: body.department_id, is_active: true, is_block: false } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(getCdms)) {
            return ReE(res, { message: `Not yet mapped course on this ${checkDepartmentDetails.departmentDetails.name} department!.` }, HttpStatus.BAD_REQUEST);
        }

        let ids = getCdms.map(x => `${x._id}`);
        query.where = {
            ...query.where,
            cdm_id: { [Op.in]: ids }
        };
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

    let getCourseBatch;

    [err, getCourseBatch] = await to(course_batch.findOne(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getCourseBatch)) {
        return ReE(res, { message: "Batch was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (getCourseBatch.is_block) {
        return ReE(res, { message: "Batch was blocked!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(getCourseBatch)) {
        return ReS(res, { message: "Batch was exists!.", data: getCourseBatch, }, HttpStatus.OK);
    }

}

const checkCourseBatch = async (body) => {

    if (isNull(body.course_batch_id) || !IsValidUUIDV4(body.course_batch_id)) {
        return { message: "Please select course batch details!.", success: false };
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
                model: batch_sem,
                as: 'currentSim'
            },
            {
                model: course_department_mapping,
                as: 'cdmId',
                include: [
                    {
                        model: department,
                        as: 'departmentId'
                    },
                    {
                        model: course,
                        as: 'courseId'
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
            ['from', 'ASC']
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


    if (!isNull(body.department_id) && isNull(body.cdm_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let getCdms;

        [err, getCdms] = await to(course_department_mapping.findAll({ where: { department_id: body.department_id, is_active: true, is_block: false } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(getCdms)) {
            return ReE(res, { message: `Not yet mapped course on this ${checkDepartmentDetails.departmentDetails.name} department!.` }, HttpStatus.BAD_REQUEST);
        }

        let ids = getCdms.map(x => `${x._id}`);
        query.where = {
            ...query.where,
            cdm_id: { [Op.in]: ids }
        };
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
        _id: body.course_batch_id
    }

    let getCourseBatch;

    [err, getCourseBatch] = await to(course_batch.findOne(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(getCourseBatch)) {
        return { message: "Batch was not found!.", success: false };
    }

    if (getCourseBatch.is_block) {
        return { message: "Batch was blocked!.", success: false };
    }

    if (!isNull(getCourseBatch)) {
        return { message: "Batch was exists!.", courseBatchData: getCourseBatch, success: true };
    }
};

module.exports.checkCourseBatch = checkCourseBatch;