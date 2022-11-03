const institution_type = require('../models').institution_type;
const user_data = require('../models').user_data;
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { CONFIG } = require('../config/confifData');
const { isNull, ReE, to, ReS, isEmpty, firstCap, stringWithReg } = require('../service/util.service');
const { IsValidUUIDV4 } = require('../service/validation');
const { checkMenuAccess } = require('./common');

module.exports.createInstitutionType = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    let fields = ['type', 'group'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.type).length < 5) {
        return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!stringWithReg(firstCap(String(body.type).trim()))) {
        return ReE(res, { message: "Please enter vaild Institution type name!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.boolean.includes(body.group)) {
        return ReE(res, { message: "Please enter vaild institution group type!." }, HttpStatus.BAD_REQUEST);
    }

    let checkInstitution, optionInstitution = {
        where: {
            type: firstCap(String(body.type).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkInstitution] = await to(institution_type.findOne(optionInstitution));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkInstitution)) {
        return ReE(res, { message: "Institution Type already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createType, createData = {
        type: firstCap(String(body.type).trim()),
        group: body.group,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createType] = await to(institution_type.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Institutiond type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Institutiond created Successfully!." }, HttpStatus.OK);
    }

}

module.exports.getAllInstitutionType = async (req, res) => {
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

    let institutionTypes, optionInstitution = {
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
        optionInstitution.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionInstitution.where = {
            is_active: true
        }
    }

    [err, institutionTypes] = await to(institution_type.findAll(optionInstitution));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(institutionTypes)) {
        return ReE(res, { message: "Institutiond Types was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(institutionTypes)) {
        return ReS(res, { message: "Institutiond Types was exists!", institutionTypes }, HttpStatus.OK);
    }

}

module.exports.updatedInstitutionType = async (req, res) => {

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

    let fields = ['type', 'group', 'active'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated Institution type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.institution_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    if (isNull(body.institution_id) || !IsValidUUIDV4(body.institution_id)) return ReE(res, { message: "Please select institution type !." }, HttpStatus.BAD_REQUEST);

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        let checkInstitutionTypeDetails = await checkInstitutionType({ institution_id: body.institution_id, status: 'all' });

        if (!checkInstitutionTypeDetails.success) {
            return ReE(res, { message: checkInstitutionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkInstitutionTypeDetails.institutionType.is_block == status) {
            return ReE(res, { message: `Institution Type was already ${!status ? 'Active' : 'Blocked' }!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let checkInstitutionTypeDetails = await checkInstitutionType({ institution_id: body.institution_id, status: 'active' });

        if (!checkInstitutionTypeDetails.success) {
            return ReE(res, { message: checkInstitutionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }


        let { institutionType } = checkInstitutionTypeDetails;

        let updatedField = inVaildFields.filter(x => body[x] != institutionType[x]);

        if (isEmpty(updatedField)) {
            return ReE(res, { message: `Please edit something to updated Institution type!.` }, HttpStatus.BAD_REQUEST);
        }

        if (updatedField.includes('type')) {
            if (String(firstCap(body.type)).length < 5) {
                return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
            }

            if (!stringWithReg(firstCap(String(body.type).trim()))) {
                return ReE(res, { message: "Please enter vaild Institution type name!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(firstCap(body.type)).trim() === String(institutionType.type).trim()) {
                return ReE(res, { message: "Please change institution type name to update!." }, HttpStatus.BAD_REQUEST);
            }

            let checkInstitution = await checkInstitutionTypeValue({ type: firstCap(body.type), status: 'all' });

            if (!checkInstitution.success) {
                return ReE(res, { message: `Institution Type was already exist!.` }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                type: String(firstCap(body.type)).trim()
            }
        }

        if (updatedField.includes('group')) {

            if (!CONFIG.boolean.includes(body.group)) {
                return ReE(res, { message: "Please enter vaild institution group type!." }, HttpStatus.BAD_REQUEST);
            }

            if (body.group == institutionType.group) {
                return ReE(res, { message: "Please change on institution type status to update!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                group: body.group
            }
        }

    }

    let updateInstitutionType;

    [err, updateInstitutionType] = await to(institution_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateInstitutionType) {
        return ReE(res, { message: "Something went wrong to update Institution!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateInstitutionType) {
        return ReS(res, { message: "Institution Type was updated!." }, HttpStatus.OK)
    }

}

const checkInstitutionType = async (body) => {

    let err;

    let institutionType, optionInstitution = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionInstitution.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionInstitution.where = {
            is_active: true
        }
    }

    if (!isNull(body.institution_id)) {
        optionInstitution.where = {
            ...optionInstitution.where,
            _id: body.institution_id
        }
    }

    if (!isNull(body.type)) {
        optionInstitution.where = {
            ...optionInstitution.where,
            type: String(firstCap(body.type)).trim()
        }
    }

    [err, institutionType] = await to(institution_type.findOne(optionInstitution));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(institutionType)) {
        return { message: "Institution Types was not found!.", success: false };
    }

    if (!isNull(institutionType)) {
        return { message: "Institution Types was exists!", institutionType, success: true };
    }
}

const checkInstitutionTypeValue = async (body) => {

    let err;

    let institutionType, optionInstitution = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionInstitution.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionInstitution.where = {
            is_active: true
        }
    }

    if (!isNull(body.institution_id)) {
        optionInstitution.where = {
            ...optionInstitution.where,
            _id: body.institution_id
        }
    }

    if (!isNull(body.type)) {
        optionInstitution.where = {
            ...optionInstitution.where,
            type: String(firstCap(body.type)).trim()
        }
    }

    [err, institutionType] = await to(institution_type.findOne(optionInstitution));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(institutionType)) {
        return { message: "Institution Types was found!.", institutionType, success: false };
    }

    if (isNull(institutionType)) {
        return { message: "Institution Types not exists!", success: true };
    }
}

module.exports.checkInstitutionType = checkInstitutionType;