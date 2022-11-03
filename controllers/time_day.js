const { organization, user_data, time_day } = require('../models');
const { isNull, ReE, to, ReS, isEmpty, generateCode, firstLetterCap } = require("../service/util.service");
const { checkOrganization, checkUserInf, checkMenuAccess } = require("./common");
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { getQuery, IsValidUUIDV4 } = require('../service/validation');
const { isValidUUIDV4 } = require('is-valid-uuid-v4');
const { CONFIG } = require('../config/confifData');


module.exports.createDayDurationMaster = async (req, res) => {
    const user = req.user;
    let body = req.body;

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
        return ReE(res, { message: "You are not allow to access this menu!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['name', 'order'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 3) {
        return ReE(res, { message: "Please enter day name with more then 3 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNaN(String(body.order).replace(' ', ''))) {
        return ReE(res, { message: "Please enter vaild order details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkOrder, orderOption = {
        order: String(body.order).replace(' ', ''),
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkOrder] = await to(time_day.findOne({
        where: orderOption
    }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkOrder)) {
        return ReE(res, { message: "Day order was already exits!." }, HttpStatus.BAD_REQUEST);
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
            name: firstLetterCap(String(body.name).trim()),
            is_active: true
        }
    };

    if (!isNull(body.org_id)) {
        durationOption.where = {
            ...durationOption.where,
            [Op.or]: [{ name: firstLetterCap(String(body.name).trim()), org_id: null }, { name: firstLetterCap(String(body.name).trim()), org_id: body.org_id }]
        }
    }

    [err, checkDuration] = await to(time_day.findOne(durationOption));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkDuration)) {
        return ReE(res, { message: "Timetable name was already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let codeName = `${body.name}`;

    if (checkOrganizationDetails && checkOrganizationDetails.organizationDetails) {
        codeName = `${body.name}${checkOrganizationDetails.organizationDetails.org_name}`;
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

            [err, checkCode] = await to(time_day.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    let createDay, createDayData = {
        name: firstLetterCap(String(body.name).trim()),
        code: code,
        order: String(body.order).replace(' ', ''),
        createdby: user._id,
        updatedby: user._id,
        is_active: true,
        is_block: false
    };

    if (!isNull(body.org_id)) {
        createDayData = {
            ...createDayData,
            org_id: body.org_id
        }
    }


    [err, createDay] = await to(time_day.create(createDayData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createDay)) {
        return ReE(res, { message: "Something went wrong to create course semester name!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createDay)) {
        return ReS(res, { message: "Timetable day was created successfully!." }, HttpStatus.OK);
    }
}

module.exports.getAllDayDurationMaster = async (req, res) => {
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

    let checkUserDetails, org_id = '', checkOrganizationDetails, getDayDuration;

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
            ['order', 'ASC']
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
    [err, getDayDuration] = await to(time_day.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getDayDuration)) {
        return ReE(res, { message: "Timetable name was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(getDayDuration)) {
        return ReS(res, { message: "Timetable name was exists!", data: getDayDuration }, HttpStatus.OK);
    }

}

module.exports.getDayDurationMaster = async (req, res) => {
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

    let checkUserDetails, org_id, checkOrganizationDetails, getDayDuration;

    if (isNull(req.body.dayId)) {
        return ReE(res, { message: "Please enter vaild day details!." }, HttpStatus.BAD_REQUEST);
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
        }],
        order: [
            ['order', 'ASC']
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
            org_id: org_id
        };
    }

    query.where = {
        ...query.where,
        _id: req.body.dayId
    }

    [err, getDayDuration] = await to(time_day.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(getDayDuration)) {
        return ReE(res, { message: "Timetable name was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (getDayDuration.is_block) {
        return ReE(res, { message: "Timetable name was blocked!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(getDayDuration)) {
        return ReS(res, { message: "Timetable name was exists!", data: getDayDuration }, HttpStatus.OK);
    }

}

const checkDay = async (body) => {

    let checkOrganizationDetails, getDayDuration;

    if (isNull(body.time_day_id) || !isValidUUIDV4(body.time_day_id)) {
        return { message: "Please enter vaild day details!.", success: false }
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


    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            [Op.or]: [{ org_id: body.org_id }, { org_id: null }]
        };
    }

    query.where = {
        ...query.where,
        _id: body.time_day_id
    };

    [err, getDayDuration] = await to(time_day.findOne(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(getDayDuration)) {
        return { message: "Timetable name was not found!.", success: false };
    }

    if (getDayDuration.is_block) {
        return { message: "Timetable name was blocked!.", success: false };
    }

    if (!isNull(getDayDuration)) {
        return { message: "Timetable name was exists!", days: getDayDuration, success: true };
    }
}

module.exports.checkDay = checkDay;

const getDays = async (body) => {

    let checkOrganizationDetails, getDayDuration;

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
            ['order', 'ASC']
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
            [Op.or]: [{ org_id: body.org_id }, { org_id: null }]
        };
    }

    [err, getDayDuration] = await to(time_day.findAll(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(getDayDuration)) {
        return { message: "Timetable name was not found!.", success: false };
    }

    if (!isEmpty(getDayDuration)) {
        return { message: "Timetable name was exists!", days: getDayDuration, success: true };
    }
}

module.exports.getDays = getDays;