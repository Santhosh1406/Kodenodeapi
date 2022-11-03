const { event, organization, user_data } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap } = require('../service/util.service');
const { checkOrganization, checkMenuAccess } = require('./common');
const { getQuery, IsValidUUIDV4 } = require('../service/validation');

module.exports.createEvents = async (req, res) => {
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

    let fields = ['org_id', 'title', 'one_line', 'description', 'event_date'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required details ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.title).length < 5 || String(body.title).length > 200) {
        return ReE(res, { message: "Please enter event title must with in 5 to 200 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.one_line).length < 25 || String(body.one_line).length > 500) {
        return ReE(res, { message: "Please enter event one line story must with in 30 to 500 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.description).length < 50 || String(body.description).length > 2000) {
        return ReE(res, { message: "Please enter event description must with in 50 to 1000 character!." }, HttpStatus.BAD_REQUEST);
    }

    let fDate = moment(body.event_date, 'DD/MM/YYYY').startOf('day');

    if (!moment(fDate._d).isValid()) {
        return ReE(res, { message: "Please select vaild event date!." }, HttpStatus.BAD_REQUEST);
    }

    fDate = moment.tz(fDate._d, 'Asia/Calcutta');

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let currentDate = moment(today);

    let checkFdate = moment(fDate._d).diff(currentDate._d);
    let Fdyear = moment.duration(checkFdate).asDays();
    let timeDur = moment.duration(checkFdate).asHours();

    Fdyear = 0 + Math.round(Fdyear);

    if (Fdyear < 0 && timeDur <= -10) {
        return ReE(res, { message: `Please select event date must be today before 10:00 AM or future day!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkEvents, optionEvents = {
        where: {
            org_id: body.org_id,
            event_date: { [Op.eq]: fDate._d },
            title: firstCap(String(body.title)),
            is_active: true
        }
    };

    [err, checkEvents] = await to(event.findOne(optionEvents));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkEvents)) {
        return ReE(res, { message: `Event title was already exist on within ${moment(fDate._d).format('DD/MM/YYYY')} date!.` }, HttpStatus.BAD_REQUEST);
    }

    let create, createDate = {
        title: firstCap(String(body.title).trim()),
        one_line: firstCap(String(body.one_line).trim()),
        description: firstCap(String(body.description).trim()),
        org_id: body.org_id,
        event_date: fDate._d,
        createdby: user._id,
        is_active: true,
        is_block: false
    };

    [err, create] = await to(event.create(createDate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong create this events!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(create)) {
        return ReS(res, { message: "Event created!." }, HttpStatus.OK);
    }

}

module.exports.getAllEvents = async (req, res) => {

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

    let events, optionEvent = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
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
        order:[['event_date','ASC']]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionEvent = {
            ...optionEvent,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionEvent = {
            ...optionEvent,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.event_id)) {

        let checkEventDetails = await checkEvent({ event_id: body.event_id });

        if (!checkEventDetails.success) {
            return ReE(res, { message: checkEventDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionEvent.where = {
            ...optionEvent.where,
            _id: body.event_id
        }
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionEvent.where = {
            ...optionEvent.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionEvent.where = {
                ...query.where,
                event_date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, events] = await to(event.findAll(optionEvent));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(events)) {
        return ReE(res, { message: "Events details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(events)) {
        return ReS(res, { message: "Events details was fetched!.", events: events }, HttpStatus.OK);
    }
}

module.exports.getEvent = async (req, res) => {
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

    let eventData, optionEvent = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
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
        order:[['event_date','ASC']]
    };

    if (isNull(req.params.event_id) || !IsValidUUIDV4(req.params.event_id)) {
        return ReE(res, { message: "Please select vaild events details!.", }, HttpStatus.BAD_REQUEST);
    }

    optionEvent.where = {
        ...optionEvent.where,
        _id: req.params.event_id
    }


    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionEvent = {
            ...optionEvent,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionEvent = {
            ...optionEvent,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionEvent.where = {
            ...optionEvent.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionEvent.where = {
                ...query.where,
                event_date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, eventData] = await to(event.findOne(optionEvent));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(eventData)) {
        return ReE(res, { message: "Events details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(eventData)) {
        return ReS(res, { message: "Events details was fetched!.", event: eventData }, HttpStatus.OK);
    }
}

module.exports.updateEvent = async (req, res) => {
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

    if (isNull(body.event_id) || !IsValidUUIDV4(body.event_id)) {
        return ReE(res, { message: "Please select vaild event details!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['title', 'active', 'one_line', 'description', 'event_date'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated event details!.` }, HttpStatus.BAD_REQUEST);
    }

    let update, updatedData = {
        where: {
            _id: body.event_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    let checkEventDetails = await checkEvent({ event_id: body.event_id });

    if (!checkEventDetails.success) {
        return ReE(res, { message: checkEventDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkEventDetails.eventData.is_block == status) {
            return ReE(res, { message: `Evnet was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { eventData } = checkEventDetails;


        let updateAbleFields = existFields.filter(x => body[x] != eventData[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update event details!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('title')) {

            if (eventData.title == firstCap(String(body.title))) {
                return ReE(res, { message: "Please edit something to update event title!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.title).length < 5 || String(body.title).length > 200) {
                return ReE(res, { message: "Please enter event title must with in 5 to 200 character!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                title: firstCap(String(body.title))
            };
        }

        if (updateAbleFields.includes('one_line')) {

            if (eventData.one_line == firstCap(String(body.one_line))) {
                return ReE(res, { message: "Please edit something to update event one line story!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.one_line).length < 25 || String(body.one_line).length > 500) {
                return ReE(res, { message: "Please enter event one line story must with in 25 to 500 character!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                one_line: firstCap(String(body.one_line))
            };
        }

        if (updateAbleFields.includes('description')) {

            if (eventData.description == firstCap(String(body.description))) {
                return ReE(res, { message: "Please edit something to update event description!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.description).length < 50 || String(body.description).length > 2000) {
                return ReE(res, { message: "Please enter event description must with in 50 to 1000 character!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                description: firstCap(String(body.description))
            };
        }

        if (updateAbleFields.includes('event_date')) {

            let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

            let fDate = moment(body.event_date, 'DD/MM/YYYY').startOf('day');

            if (!moment(fDate._d).isValid()) {
                return ReE(res, { message: "Please select vaild event date!." }, HttpStatus.BAD_REQUEST);
            }

            fDate = moment.tz(fDate._d, 'Asia/Calcutta');

            if (!moment(eventData.event_date).isSame(fDate._d)) {

                let currentDate = moment(today);

                let checkFdate = moment(fDate._d).diff(currentDate._d);
                let Fdyear = moment.duration(checkFdate).asDays();
                let timeDur = moment.duration(checkFdate).asHours();

                Fdyear = 0 + Math.round(Fdyear);

                if (Fdyear < 0 && timeDur <= -10) {
                    return ReE(res, { message: `Please select event date must be today before 10:00 AM or future day to update event details!.` }, HttpStatus.BAD_REQUEST);
                }

                let checkEvents, optionEvents = {
                    where: {
                        org_id: eventData.org_id,
                        event_date: { [Op.eq]: fDate._d },
                        title: firstCap(String(body.title)) || eventData.title,
                        is_active: true
                    }
                };

                [err, checkEvents] = await to(event.findOne(optionEvents));

                if (err) {
                    return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
                }

                if (!isNull(checkEvents)) {
                    return ReE(res, { message: `Event details was already exist on this ${moment(fDate._d).format('DD/MM/YYYY')} date!.` }, HttpStatus.BAD_REQUEST);
                }

                updatedData.set = {
                    ...updatedData.set,
                    event_date: fDate._d
                };
            }
        }
    }

    [err, update] = await to(event.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update event details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(update)) {
        return ReS(res, { message: "Event updated!." }, HttpStatus.OK);
    }
}

const checkEvent = async (body) => {

    let eventData, optionEvent = {
        where: getQuery({ ...body, status: 'all' }),
        include: [
            {
                model: organization,
                as: 'orgId'
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

    if (!isNull(body.event_id)) {
        if (isNull(body.event_id) || !IsValidUUIDV4(body.event_id)) {
            return { message: "Please select vaild events details!.", success: false };
        }

        optionEvent.where = {
            ...optionEvent.where,
            _id: body.event_id
        }
    }

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionEvent = {
            ...optionEvent,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionEvent = {
            ...optionEvent,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        optionEvent.where = {
            ...optionEvent.where,
            org_id: body.org_id
        }
    }


    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment().format();

        if (from == 'past') {
            optionEvent.where = {
                ...query.where,
                event_date: { [Op.lt]: moment(currentYear)._d }
            }
        }

        if (from == 'present') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.eq]: moment(currentYear)._d }
            }
        }

        if (from == 'future') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gt]: moment(currentYear)._d }
            }
        }


        if (from == 'notpast') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.gte]: moment(currentYear)._d }
            }
        }

        if (from == 'notfuture') {
            optionEvent.where = {
                ...optionEvent.where,
                event_date: { [Op.lte]: moment(currentYear)._d }
            }
        }
    }

    [err, eventData] = await to(event.findOne(optionEvent));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(eventData)) {
        return { message: "Events details was empty!.", success: false };
    }

    if (!isNull(eventData)) {
        return { message: "Events details was fetched!.", eventData: eventData, success: true };
    }
}