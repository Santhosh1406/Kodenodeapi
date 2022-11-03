const { user_info, organization, user_data, discipline, menu, user_subject, course_sem_duration } = require('../models');
const { isNull, ReE, to, ReS, isEmpty, generateCode } = require("../service/util.service");
const { checkOrganization, checkUserInf } = require("./common");
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { getQuery, IsValidUUIDV4 } = require('../service/validation');
const { checkMenuAccess } = require('./common');
const { CONFIG } = require('../config/confifData');


module.exports.createSemDurationMaster = async (req, res) => {
    const user = req.user;
    let body = req.body;

    if (!user.owner) {
        return ReE(res, { message: "You are not allow to access this menu!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['duration'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isNaN(body.duration) || Number(body.duration) <= 0) {
        return ReE(res, { message: "Please enter vaild duration!." }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails;

    if (!isNull(body.org_id)) {

        if (!IsValidUUIDV4(body.org_id)) {
            return ReE(res, { message: "Please enter vaild organization details!." }, HttpStatus.BAD_REQUEST)
        }

        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }
    }

    let checkDuration, durationOption = {
        where: {
            duration: body.duration,
            is_active: true
        }
    };

    if (!isNull(body.org_id)) {
        durationOption.where = {
            ...durationOption.where,
            [Op.or]: [{ duration: body.duration, org_id: null }, { duration: body.duration, org_id: body.org_id }]
        }
    }

    [err, checkDuration] = await to(course_sem_duration.findOne(durationOption));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkDuration)) {
        return ReE(res, { message: "Course semester duration was already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let codeName = `${body.duration}ALL`;

    if (checkOrganizationDetails && checkOrganizationDetails.organizationDetails) {
        codeName = `${body.duration}${checkOrganizationDetails.organizationDetails.org_name}`;
    }


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

            [err, checkCode] = await to(course_sem_duration.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    let createDuration, createDurationData = {
        duration: body.duration,
        code: code,
        createdby: user._id,
        updatedby: user._id,
        is_active: true,
        is_block: false
    };

    if (!isNull(body.org_id)) {
        createDurationData = {
            ...createDurationData,
            org_id: body.org_id
        }
    }


    [err, createDuration] = await to(course_sem_duration.create(createDurationData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createDuration)) {
        return ReE(res, { message: "Something went wrong to create course semester duration!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createDuration)) {
        return ReS(res, { message: "Course Semester Duration was created successfully!." }, HttpStatus.OK);
    }
}

module.exports.getAllCourseSemDurationMaster = async (req, res) => {
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

    let checkUserDetails, org_id = '', checkOrganizationDetails, getCourseDurations;

    let query = {
        where: getQuery(body),
        include: [{
            model: user_data,
            as: 'createdBy',
            attributes: ['_id', 'username']
        },
        {
            model: user_data,
            as: 'updatedBy',
            attributes: ['_id', 'username']
        },
        {
            model: organization,
            as: "orgId"
        }],
        order: [
            ['duration', 'ASC'],
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
            [Op.or]: [{ org_id: org_id }, { org_id: null }]
        };
    }
    [err, getCourseDurations] = await to(course_sem_duration.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getCourseDurations)) {
        return ReE(res, { message: "Course semester duration was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(getCourseDurations)) {
        return ReS(res, { message: "Course semester duration was exists!", data: getCourseDurations }, HttpStatus.OK);
    }

}

module.exports.getCourseSemDurationMaster = async (req, res) => {
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

    let checkUserDetails, org_id, checkOrganizationDetails, getCourseDurations;

    if (isNull(req.body.courseId)) {
        return ReE(res, { message: "Please enter vaild course details!." }, HttpStatus.BAD_REQUEST);
    }

    let query = {
        where: getQuery(body),
        include: [{
            model: user_data,
            as: 'createdBy',
            attributes: ['_id', 'username']
        },
        {
            model: user_data,
            as: 'updatedBy',
            attributes: ['_id', 'username']
        },
        {
            model: organization,
            as: "orgId"
        }]
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
        };
    }

    query.where = {
        ...query.where,
        _id: req.body.courseId
    };

    [err, getCourseDurations] = await to(course_sem_duration.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getCourseDurations)) {
        return ReE(res, { message: "Course semester duration was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (getCourseDurations.is_block) {
        return ReE(res, { message: "Course semester duration was blocked!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(getCourseDurations)) {
        return ReS(res, { message: "Course semester duration was exists!", data: getCourseDurations }, HttpStatus.OK);
    }

}

module.exports.updateCourseSemDurationMaster = async (req, res) => {
    const user = req.user;

    let body = req.body, err;

    if (!user.owner) {
        return ReE(res, { message: "You are not allow to access this menu!" }, HttpStatus.BAD_REQUEST);
    }

    let org_id, checkOrganizationDetails, getCourseDurations;

    if (isNull(req.body.sem_duration_id)) {
        return ReE(res, { message: "Please enter vaild course semester details!." }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['duration', 'active'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated Course semester type!.` }, HttpStatus.BAD_REQUEST);
    }

    let query = {
        where: {
            is_active: true
        },
        include: [{
            model: user_data,
            as: 'createdBy',
            attributes: ['_id', 'username']
        },
        {
            model: user_data,
            as: 'updatedBy',
            attributes: ['_id', 'username']
        },
        {
            model: organization,
            as: "orgId"
        }]
    };

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
        };
    }

    query.where = {
        ...query.where,
        _id: req.body.sem_duration_id
    };

    [err, getCourseDurations] = await to(course_sem_duration.findOne(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getCourseDurations)) {
        return ReE(res, { message: "Course Semester duration was not found!." }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.sem_duration_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (getCourseDurations.is_block == status) {
            return ReE(res, { message: `Course Semester Duration Type was already ${!status ? 'Active' : 'Blocked' }!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        };
    } else {

        if (getCourseDurations.is_block) {
            return ReE(res, { message: "Course Semester duration was blocked!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNaN(body.duration) || Number(body.duration) <= 0) {
            return ReE(res, { message: "Please enter vaild duration!." }, HttpStatus.BAD_REQUEST);
        }

        if (Number(body.duration) == Number(getCourseDurations.duration)) {
            return ReE(res, { message: "Please edit something to update course Semester duration!." }, HttpStatus.BAD_REQUEST);
        }


        let checkDuration, durationOption = {
            where: {
                _id: { [Op.ne]: body.sem_duration_id },
                duration: body.duration,
                is_active: true
            }
        };

        [err, checkDuration] = await to(course_sem_duration.findOne(durationOption));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isNull(checkDuration)) {
            return ReE(res, { message: "Course Semester duration was already exits!." }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            duration: Number(body.duration)
        };
    }

    let updateCourseDuration;

    [err, updateCourseDuration] = await to(course_sem_duration.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateCourseDuration) {
        return ReE(res, { message: "Something went wrong to update course Semester duration!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateCourseDuration) {
        return ReS(res, { message: "Course Semester duration Type was updated!." }, HttpStatus.OK)
    }
}