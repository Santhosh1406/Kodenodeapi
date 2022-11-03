const { leave, organization, user_data } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, firstLetterCap } = require('../service/util.service');
const { checkOrganization, checkMenuAccess } = require('./common');
const { getQuery, IsValidUUIDV4 } = require('../service/validation');

module.exports.createLeave = async (req, res) => {
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

    let fields = ['org_id', 'name', 'type', 'date'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required details ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 5 || String(body.name).length > 200) {
        return ReE(res, { message: "Please enter leave name must with in 10 to 200 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.leave.type.includes(firstLetterCap(String(body.type)))) {
        return ReE(res, { message: "Please enter vaild leave type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.description)) {
        if (String(body.description).length < 100 || String(body.description).length > 2000) {
            return ReE(res, { message: "Please enter leave description must with in 100 to 1000 character!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let fDate = moment(body.date, 'DD/MM/YYYY').startOf('day');

    if (!moment(fDate._d).isValid()) {
        return ReE(res, { message: "Please select vaild leave date!." }, HttpStatus.BAD_REQUEST);
    }

    fDate = moment.tz(fDate._d, 'Asia/Calcutta');

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let currentDate = moment(today);

    let checkFdate = moment(fDate._d).diff(currentDate._d);
    let Fdyear = moment.duration(checkFdate).asDays();
    let timeDur = moment.duration(checkFdate).asHours();

    Fdyear = 0 + Math.round(Fdyear);

    console.log(Fdyear, today, fDate, timeDur);

    if (Fdyear < 0 && timeDur <= -10) {
        return ReE(res, { message: `Please select leave date must be today before 10:00 AM or future day!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkLeave, optionLeave = {
        where: {
            date: { [Op.eq]: fDate._d },
            is_active: true,
            org_id: body.org_id,
        }
    };

    [err, checkLeave] = await to(leave.findOne(optionLeave));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkLeave)) {
        return ReE(res, { message: `Leave  was already added on this  ${moment(fDate._d).format('DD/MM/YYYY')} date!.` }, HttpStatus.BAD_REQUEST);
    }

    let create, createDate = {
        name: firstCap(String(body.name).trim()),
        type: firstLetterCap(String(body.type)),
        description: body.description ? firstCap(String(body.description).trim()) : '',
        org_id: body.org_id,
        user_id: user._id,
        date: fDate._d,
        createdby: user._id,
        is_active: true,
        is_block: false
    };

    [err, create] = await to(leave.create(createDate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong create this leave!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(create)) {
        return ReS(res, { message: "Leave details created!." }, HttpStatus.OK);
    }

}

module.exports.getAllLeave = async (req, res) => {

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

    let leaves, optionLeave = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
        order: [['date', 'ASC']]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionLeave = {
            ...optionLeave,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionLeave = {
            ...optionLeave,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.leave_id)) {

        let checkLeaveDetails = await checkLeave({ leave_id: body.leave_id });

        if (!checkLeaveDetails.success) {
            return ReE(res, { message: checkLeaveDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionLeave.where = {
            ...optionLeave.where,
            _id: body.leave_id
        }
    }

    if (!isNull(body.type)) {
        if (!CONFIG.leave.type.includes(firstLetterCap(String(body.type)))) {
            return ReE(res, { message: "Please enter vaild leave type!." }, HttpStatus.BAD_REQUEST);
        }

        optionLeave.where = {
            ...optionLeave.where,
            type: firstLetterCap(String(body.type))
        }
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionLeave.where = {
            ...optionLeave.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionLeave.where = {
                ...query.where,
                date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, leaves] = await to(leave.findAll(optionLeave));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(leaves)) {
        return ReE(res, { message: "Leaves details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    let days = leaves.map(x => x.date);

    if (!isEmpty(leaves)) {
        return ReS(res, { message: "Leaves details was fetched!.", leaves: leaves, days }, HttpStatus.OK);
    }
}

module.exports.getLeave = async (req, res) => {
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

    let leaveData, optionLeave = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
        order: [['date', 'ASC']]
    };

    if (isNull(req.params.leave_id) || !IsValidUUIDV4(req.params.leave_id)) {
        return ReE(res, { message: "Please select vaild leaves details!.", }, HttpStatus.BAD_REQUEST);
    }

    optionLeave.where = {
        ...optionLeave.where,
        _id: req.params.leave_id
    }

    if (!isNull(body.type)) {
        if (!CONFIG.leave.type.includes(firstLetterCap(String(body.type)))) {
            return ReE(res, { message: "Please enter vaild leave type!." }, HttpStatus.BAD_REQUEST);
        }

        optionLeave.where = {
            ...optionLeave.where,
            type: firstLetterCap(String(body.type))
        }
    }

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionLeave = {
            ...optionLeave,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionLeave = {
            ...optionLeave,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionLeave.where = {
            ...optionLeave.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionLeave.where = {
                ...query.where,
                date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, leaveData] = await to(leave.findOne(optionLeave));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(leaveData)) {
        return ReE(res, { message: "Leaves details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(leaveData)) {
        return ReS(res, { message: "Leaves details was fetched!.", leave: leaveData }, HttpStatus.OK);
    }
}

module.exports.updateLeave = async (req, res) => {
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

    if (isNull(body.leave_id) || !IsValidUUIDV4(body.leave_id)) {
        return ReE(res, { message: "Please select vaild leave details!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['name', 'active', 'type', 'description', 'date'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated leave details!.` }, HttpStatus.BAD_REQUEST);
    }

    let update, updatedData = {
        where: {
            _id: body.leave_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    let checkLeaveDetails = await checkLeave({ leave_id: body.leave_id });

    if (!checkLeaveDetails.success) {
        return ReE(res, { message: checkLeaveDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkLeaveDetails.leaveData.is_block == status) {
            return ReE(res, { message: `Leave was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { leaveData } = checkLeaveDetails;


        let updateAbleFields = existFields.filter(x => body[x] != leaveData[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update leave details!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('name')) {

            if (leaveData.name == firstCap(String(body.name))) {
                return ReE(res, { message: "Please edit something to update leave title!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.name).length < 10 || String(body.name).length > 200) {
                return ReE(res, { message: "Please enter leave title must with in 10 to 200 character!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: firstCap(String(body.name))
            };
        }

        if (updateAbleFields.includes('type')) {

            if (leaveData.one_line == firstCap(String(body.type).trim())) {
                return ReE(res, { message: "Please edit something to update leave one line story!." }, HttpStatus.BAD_REQUEST);
            }

            if (!CONFIG.leave.type.includes(firstLetterCap(String(body.type).trim()))) {
                return ReE(res, { message: "Please enter vaild leave type!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                one_line: firstCap(String(body.type).trim())
            };
        }

        if (updateAbleFields.includes('description')) {

            if (leaveData.description == firstCap(String(body.description))) {
                return ReE(res, { message: "Please edit something to update leave description!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.description).length < 100 || String(body.description).length > 2000) {
                return ReE(res, { message: "Please enter leave description must with in 100 to 1000 character!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                description: firstCap(String(body.description))
            };
        }

        if (updateAbleFields.includes('date')) {

            let fDate = moment(body.date, 'DD/MM/YYYY').startOf('day');

            if (!moment(fDate._d).isValid()) {
                return ReE(res, { message: "Please select vaild leave date!." }, HttpStatus.BAD_REQUEST);
            }

            if (!moment(leaveData.date).isSame(fDate._d)) {

                fDate = moment.tz(fDate._d, 'Asia/Calcutta');

                let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

                let currentDate = moment(today);

                let checkFdate = moment(fDate._d).diff(currentDate._d);
                let Fdyear = moment.duration(checkFdate).asDays();
                let timeDur = moment.duration(checkFdate).asHours();

                Fdyear = 0 + Math.round(Fdyear);

                if (Fdyear < 0 && timeDur <= -10) {
                    return ReE(res, { message: `Please select leave date must be today before 10:00 AM clock or future day!.` }, HttpStatus.BAD_REQUEST);
                }

                let checkLeaves, optionLeaves = {
                    where: {
                        date: { [Op.eq]: fDate._d },
                        is_active: true,
                        org_id: leaveData.org_id,
                    }
                };

                [err, checkLeaves] = await to(leave.findOne(optionLeaves));

                if (err) {
                    return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
                }

                if (!isNull(checkLeaves)) {
                    return ReE(res, { message: `Leave title was already exist on this ${moment(fDate._d).format('DD/MM/YYYY')} date!.` }, HttpStatus.BAD_REQUEST);
                }

                updatedData.set = {
                    ...updatedData.set,
                    date: fDate._d
                };
            }
        }
    }

    let checkData = existFields.filter(x => !isNull(updatedData.set[x]))

    if (isEmpty(checkData)) {
        return ReE(res, { message: "Please edit something to update leave details!." }, HttpStatus.BAD_REQUEST);
    }

    [err, update] = await to(leave.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update leave details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(update)) {
        return ReS(res, { message: "Leave updated!." }, HttpStatus.OK);
    }
}

const checkLeave = async (body) => {

    let leaveData, optionLeave = {
        where: getQuery({ ...body, status: 'all' }),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
    };

    if (isNull(body.leave_id)) {
        if (!IsValidUUIDV4(body.leave_id)) {
            return { message: "Please select vaild leaves details!.", success: false };
        }

        optionLeave.where = {
            ...optionLeave.where,
            _id: body.leave_id
        }
    }

    if (!isNull(body.type)) {
        if (!CONFIG.leave.type.includes(firstLetterCap(String(body.type)))) {
            return { message: "Please enter vaild leave type!.", success: false };
        }

        optionLeave.where = {
            ...optionLeave.where,
            type: firstLetterCap(String(body.type))
        }
    }

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionLeave = {
            ...optionLeave,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionLeave = {
            ...optionLeave,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        optionLeave.where = {
            ...optionLeave.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionLeave.where = {
                ...query.where,
                date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionLeave.where = {
                ...optionLeave.where,
                date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, leaveData] = await to(leave.findOne(optionLeave));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(leaveData)) {
        return { message: "Leaves details was empty!.", success: false };
    }

    if (!isNull(leaveData)) {
        return { message: "Leaves details was fetched!.", leaveData: leaveData, success: true };
    }
}