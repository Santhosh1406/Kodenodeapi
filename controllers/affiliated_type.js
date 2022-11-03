const affiliated_type = require('../models').affiliated_type;
const user_data = require('../models').user_data;
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, stringWithReg } = require('../service/util.service');
const { checkMenuAccess } = require('./common');
const { IsValidUUIDV4 } = require('../service/validation');

module.exports.createAffiliate = async (req, res) => {
    let body = req.body;

    const user = req.user;

    let err;

    let fields = ['type', 'status'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.type).length < 5) {
        return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!stringWithReg(firstCap(String(body.type).trim()))) {
        return ReE(res, { message: "Please enter vaild affiliation type name!." }, HttpStatus.BAD_REQUEST);
    }

    let checkAffiliate, optionAffilicate = {
        where: {
            type: firstCap(String(body.type).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkAffiliate] = await to(affiliated_type.findOne(optionAffilicate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkAffiliate)) {
        return ReE(res, { message: "Affiliate Type already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createType, createData = {
        type: firstCap(String(body.type).trim()),
        is_block: false,
        status: body.status,
        is_active: true,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createType] = await to(affiliated_type.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Affiliated type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Affiliated created Successfully!." }, HttpStatus.OK);
    }

}

module.exports.getAllAffiliatedType = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, menuId: body.menu_id, body: body, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let affiliatedTypes, optionAffilicate = {
        where: {
            is_active: true,
            is_block: false
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
        }],
        order: [
            ['type', 'ASC']
        ]
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionAffilicate.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionAffilicate.where = {
            is_active: true
        }
    }

    [err, affiliatedTypes] = await to(affiliated_type.findAll(optionAffilicate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(affiliatedTypes)) {
        return ReE(res, { message: "Affiliated Types was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(affiliatedTypes)) {
        return ReS(res, { message: "Affiliated Types was exists!", affiliatedTypes }, HttpStatus.OK);
    }

}

module.exports.updatedAffiliatedType = async (req, res) => {

    const user = req.user;

    let body = req.body;

    let err;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let fields = ['type', 'status', 'active'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated Affiliated type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.affiliated_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    if (isNull(body.affiliated_id) || !IsValidUUIDV4(body.affiliated_id)) return ReE(res, { message: "Please select affiliated type !." }, HttpStatus.BAD_REQUEST);

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        let checkAffiliateType = await checkAffiliated({ affiliated_id: body.affiliated_id, status: 'all' });

        if (!checkAffiliateType.success) {
            return ReE(res, { message: checkAffiliateType.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkAffiliateType.affiliatedType.is_block == status) {
            return ReE(res, { message: `Affiliation Type was already ${!status ? 'Active' : 'Blocked' }!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let checkAffiliateType = await checkAffiliated({ affiliated_id: body.affiliated_id, status: 'active' });

        if (!checkAffiliateType.success) {
            return ReE(res, { message: checkAffiliateType.message }, HttpStatus.BAD_REQUEST);
        }


        let { affiliatedType } = checkAffiliateType;

        let updatedField = inVaildFields.filter(x => body[x] != affiliatedType[x]);

        if (isEmpty(updatedField)) {
            return ReE(res, { message: `Please edit something to updated Affiliated type!.` }, HttpStatus.BAD_REQUEST);
        }

        if (updatedField.includes('type')) {
            if (String(body.type).length < 5) {
                return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
            }

            if (!stringWithReg(firstCap(String(body.type).trim()))) {
                return ReE(res, { message: "Please enter vaild affiliation type name!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.type).trim() === String(affiliatedType.type).trim()) {
                return ReE(res, { message: "Please change affilicated type name to update!." }, HttpStatus.BAD_REQUEST);
            }

            let checkAffiliate = await checkValueAffiliated({ type: body.type, status: 'all' });

            if (!checkAffiliate.success) {
                return ReE(res, { message: checkAffiliate.message }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                type: String(body.type).trim()
            }
        }

        if (updatedField.includes('status')) {
            if (body.status == affiliatedType.status) {
                return ReE(res, { message: "Please change on affilicated type status to update!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                status: body.status
            }
        }

    }

    let updateAffiliatedType;

    [err, updateAffiliatedType] = await to(affiliated_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateAffiliatedType) {
        return ReE(res, { message: "Something went wrong to update Affiliated!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateAffiliatedType) {
        return ReS(res, { message: "Affiliated Type was updated!." }, HttpStatus.OK)
    }

}

module.exports.deleteAffiliatedType = async (req, res) => {

    const user = req.user;

    let body = req.body;

    let err;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[2]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(body.affiliated_id)) return ReE(res, { message: "Please select affiliated type !." }, HttpStatus.BAD_REQUEST);

    let checkAffiliateType = await checkAffiliated({ affiliated_id: body.affiliated_id, status: 'all' });

    if (!checkAffiliateType.success) {
        return ReE(res, { message: checkAffiliateType.message }, HttpStatus.BAD_REQUEST);
    }


    let updatedData = {
        where: {
            _id: body.affiliated_id,
            is_active: true
        },
        set: {
            updatedby: user._id,
            is_active: false
        }
    };

    let updateAffiliatedType;

    [err, updateAffiliatedType] = await to(affiliated_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateAffiliatedType) {
        return ReE(res, { message: "Something went wrong to delete Affiliated!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateAffiliatedType) {
        return ReS(res, { message: "Affiliated Type was delere!." }, HttpStatus.OK)
    }

}

const checkAffiliated = async (body) => {

    let err;

    let affiliatedType, optionAffilicate = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionAffilicate.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionAffilicate.where = {
            is_active: true
        }
    }

    if (body.type) {
        optionAffilicate.where = {
            ...optionAffilicate.where,
            type: String(body.type).trim()
        }
    }

    if (body.affiliated_id) {
        optionAffilicate.where = {
            ...optionAffilicate.where,
            _id: body.affiliated_id
        }
    }

    [err, affiliatedType] = await to(affiliated_type.findOne(optionAffilicate));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(affiliatedType)) {
        return { message: "Affiliated Types was not found!.", success: false };
    }

    if (!isNull(affiliatedType)) {
        return { message: "Affiliated Types was exists!", affiliatedType, success: true };
    }
}

const checkValueAffiliated = async (body) => {

    let err;

    let affiliatedType, optionAffilicate = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionAffilicate.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionAffilicate.where = {
            is_active: true
        }
    }

    if (!isNull(body.type)) {
        optionAffilicate.where = {
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }],
            type: String(firstCap(body.type)).trim()
        }
    }

    if (body._id) {
        optionAffilicate.where = {
            ...optionAffilicate.where,
            _id: body._id
        }
    }

    [err, affiliatedType] = await to(affiliated_type.findOne(optionAffilicate));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(affiliatedType)) {
        return { message: "Affiliated Types was already exits!", affiliatedType, success: false };
    }

    if (isNull(affiliatedType)) {
        return { message: "Affiliated Types was not exits ready to created!.", success: true };
    }
}