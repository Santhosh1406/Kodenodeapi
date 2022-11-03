const { organization_type, user_data } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, stringWithReg } = require('../service/util.service');
const { checkMenuAccess } = require('./common');
const { IsValidUUIDV4 } = require('../service/validation');

module.exports.createOrganizationType = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    let fields = ['type'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.type).length < 3) {
        return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!stringWithReg(firstCap(String(body.type).trim()))) {
        return ReE(res, { message: "Please enter vaild Teaching sourse type name!." }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails, optionOrganization = {
        where: {
            type: firstCap(String(body.type).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkOrganizationDetails] = await to(organization_type.findOne(optionOrganization));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkOrganizationDetails)) {
        return ReE(res, { message: "Organization Type already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createType, createData = {
        type: firstCap(String(body.type).trim()),
        is_block: false,
        is_active: true,
        professional: body.professional || false,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createType] = await to(organization_type.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Organization type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Organization created Successfully!." }, HttpStatus.OK);
    }

}

module.exports.getAllOrganizationType = async (req, res) => {
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

    let err;

    let organizationType, optionOrganization = {
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
        optionOrganization.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionOrganization.where = {
            is_active: true
        }
    }

    [err, organizationType] = await to(organization_type.findAll(optionOrganization));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(organizationType)) {
        return ReE(res, { message: "Organization Types was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(organizationType)) {
        return ReS(res, { message: "Organization Types was exists!", organizationType }, HttpStatus.OK);
    }

}

module.exports.updateOrganizationType = async (req, res) => {
    const user = req.user;

    let body = req.body;

    let err;

    let fields = ['type', 'professional', 'active'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated Organization type!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.organization_id) || !IsValidUUIDV4(body.organization_id)) return ReE(res, { message: "Please select organization type !." }, HttpStatus.BAD_REQUEST);

    let updatedData = {
        where: {
            _id: body.organization_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    if (!isNull(body.active)) {

        let checkOrganizationTypeDetails = await checkOrganizationType({ organization_id: body.organization_id, status: 'all' });

        if (!checkOrganizationTypeDetails.success) {
            return ReE(res, { message: checkOrganizationTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkOrganizationTypeDetails.organizationType.is_block == status) {
            return ReE(res, { message: `Organization Type was already ${!status ? 'Active' : 'Blocked' }!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let checkOrganizationTypeDetails = await checkOrganizationType({ organization_id: body.organization_id, status: 'active' });

        if (!checkOrganizationTypeDetails.success) {
            return ReE(res, { message: checkOrganizationTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }


        let { organizationType } = checkOrganizationTypeDetails;

        let updatedField = inVaildFields.filter(x => body[x] != organizationType[x]);

        if (isEmpty(updatedField)) {
            return ReE(res, { message: `Please edit something to updated Organization type!.` }, HttpStatus.BAD_REQUEST);
        }

        if (updatedField.includes('type')) {
            if (String(firstCap(body.type)).length < 5) {
                return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
            }

            if (!stringWithReg(firstCap(String(body.type).trim()))) {
                return ReE(res, { message: "Please enter vaild Teaching sourse type name!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(firstCap(body.type)).trim() === String(organizationType.type).trim()) {
                return ReE(res, { message: "Please change organization type name to update!." }, HttpStatus.BAD_REQUEST);
            }

            let checkOrganizationDetails = await checkOrganizationTypeValue({ type: body.type, status: 'all' });

            if (!checkOrganizationDetails.success) {
                return ReE(res, { message: checkOrganizationTypeDetails.message }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                type: String(firstCap(body.type)).trim()
            }
        }

        if (updatedField.includes('professional')) {
            if (body.professional !== true || body.professional !== false) {
                return ReE(res, { message: "Please select vaild organization type professional status!. " }, HttpStatus.BAD_REQUEST);
            }

            if (body.professional == organizationType.professional) {
                return ReE(res, { message: "Please change on organization professional status to update!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                professional: body.professional
            }
        }

    }

    let updateOrganizationType;

    [err, updateOrganizationType] = await to(organization_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateOrganizationType) {
        return ReE(res, { message: "Something went wrong to update Organization!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateOrganizationType) {
        return ReS(res, { message: "Organization Type was updated!." }, HttpStatus.OK)
    }

}

module.exports.deleteOrganizationType = async (req, res) => {

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

    if (isNull(body.organization_id)) return ReE(res, { message: "Please select organization type !." }, HttpStatus.BAD_REQUEST);

    let checkOrganizationTypeDetails = await checkOrganizationType({ organization_id: body.organization_id, status: 'all' });

    if (!checkOrganizationTypeDetails.success) {
        return ReE(res, { message: checkOrganizationTypeDetails.message }, HttpStatus.BAD_REQUEST);
    }


    let updatedData = {
        where: {
            _id: body.organization_id,
            is_active: true
        },
        set: {
            updatedby: user._id,
            is_active: false
        }
    };

    let updateOrganizationType;

    [err, updateOrganizationType] = await to(organization_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateOrganizationType) {
        return ReE(res, { message: "Something went wrong to delete Orgzanization!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateOrganizationType) {
        return ReS(res, { message: "Orgzanization Type was delere!." }, HttpStatus.OK)
    }

}

const checkOrganizationType = async (body) => {

    let err;

    let organizationType, optionOrganization = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionOrganization.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionOrganization.where = {
            is_active: true
        }
    }

    if (!isNull(body.organization_id)) {
        optionOrganization.where = {
            ...optionOrganization.where,
            _id: body.organization_id
        }
    }

    if (!isNull(body.type)) {
        optionOrganization.where = {
            ...optionOrganization.where,
            type: String(firstCap(body.type)).trim()
        }
    }

    [err, organizationType] = await to(organization_type.findOne(optionOrganization));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(organizationType)) {
        return { message: "Organization Types was not found!.", success: false };
    }

    if (!isNull(organizationType)) {
        return { message: "Organization Types was exists!", organizationType, success: true };
    }
}

const checkOrganizationTypeValue = async (body) => {

    let err;

    let organizationType, optionOrganization = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionOrganization.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionOrganization.where = {
            is_active: true
        }
    }

    if (!isNull(body.organization_id)) {
        optionOrganization.where = {
            ...optionOrganization.where,
            _id: body.organization_id
        }
    }

    if (!isNull(body.type)) {
        optionOrganization.where = {
            ...optionOrganization.where,
            type: String(firstCap(body.type)).trim()
        }
    }

    [err, organizationType] = await to(organization_type.findOne(optionOrganization));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(organizationType)) {
        return { message: "Organization Types was already exits!.", organizationType, success: false };
    }

    if (isNull(organizationType)) {
        return { message: "Organization Types not exists!", success: true };
    }
}