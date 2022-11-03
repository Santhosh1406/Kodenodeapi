const university_type = require('../models').university_type;
const user_data = require('../models').user_data;
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { CONFIG } = require('../config/confifData');
const { isNull, ReE, to, ReS, isEmpty, firstCap, stringWithReg } = require('../service/util.service');
const { IsValidUUIDV4 } = require('../service/validation');
const { checkMenuAccess } = require('./common');

module.exports.createUniversityType = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    let fields = ['name', 'type'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 5) {
        return ReE(res, { message: "Please enter vaild type with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!stringWithReg(firstCap(String(body.name).trim()))) {
        return ReE(res, { message: "Please enter vaild university type name!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.universityType.includes(firstCap(String(body.type)))) {
        return ReE(res, { message: `Please enter vaild university type , where below metioned [${CONFIG.universityType}]!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUniversity, optionUniversity = {
        where: {
            name: firstCap(String(body.name).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkUniversity] = await to(university_type.findOne(optionUniversity));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkUniversity)) {
        return ReE(res, { message: "University Type already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createType, createData = {
        name: firstCap(String(body.name).trim()),
        type: body.type,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createType] = await to(university_type.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create University type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "University created Successfully!." }, HttpStatus.OK);
    }

}

module.exports.getAllUniversityType = async (req, res) => {
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

    let UniversityTypes, optionUniversity = {
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
            ['name', 'ASC']
        ]
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionUniversity.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionUniversity.where = {
            is_active: true
        }
    }

    [err, UniversityTypes] = await to(university_type.findAll(optionUniversity));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(UniversityTypes)) {
        return ReE(res, { message: "University Types was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(UniversityTypes)) {
        return ReS(res, { message: "University Types was exists!", UniversityTypes }, HttpStatus.OK);
    }

}

module.exports.updatedUniversityType = async (req, res) => {

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

    let fields = ['name', 'type', 'active'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated University type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.university_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    if (isNull(body.university_id) || !IsValidUUIDV4(body.university_id)) return ReE(res, { message: "Please select university type !." }, HttpStatus.BAD_REQUEST);

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        let checkUniversityTypeDetails = await checkUniversityType({ university_id: body.university_id, status: 'all' });

        if (checkUniversityTypeDetails.success) {
            return ReE(res, { message: `University Type was already exist!.` }, HttpStatus.BAD_REQUEST);
        }

        if (checkUniversityTypeDetails.universityType.is_block == status) {
            return ReE(res, { message: `University Type was already ${!status ? 'Active' : 'Blocked' }!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let checkUniversityTypeDetails = await checkUniversityType({ university_id: body.university_id, status: 'active' });

        if (!checkUniversityTypeDetails.success) {
            return ReE(res, { message: checkUniversityTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }


        let { universityType } = checkUniversityTypeDetails;

        let updatedField = inVaildFields.filter(x => body[x] != universityType[x]);

        if (isEmpty(updatedField)) {
            return ReE(res, { message: `Please edit something to updated University type!.` }, HttpStatus.BAD_REQUEST);
        }

        if (updatedField.includes('name')) {
            if (String(firstCap(body.name)).length < 5) {
                return ReE(res, { message: "Please enter vaild name with more then 5 character!." }, HttpStatus.BAD_REQUEST);
            }

            if (!stringWithReg(firstCap(String(body.name).trim()))) {
                return ReE(res, { message: "Please enter vaild university type name!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(firstCap(body.name)).trim() === String(universityType.name).trim()) {
                return ReE(res, { message: "Please change university type name to update!." }, HttpStatus.BAD_REQUEST);
            }

            let checkUniversity = await checkUniversityTypeValue({ name: firstCap(body.name), status: 'all' });

            if (!checkUniversity.success) {
                return ReE(res, { message: checkUniversity.message }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: String(firstCap(body.name)).trim()
            }
        }

        if (updatedField.includes('type')) {

            if (!CONFIG.universityType.includes(firstCap(String(body.type)))) {
                return ReE(res, { message: `Please enter vaild university type , where below metioned [${CONFIG.universityType}]!.` }, HttpStatus.BAD_REQUEST);
            }

            if (body.type == universityType.type) {
                return ReE(res, { message: "Please change on university type status to update!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                type: body.type
            }
        }

    }

    let updateUniversityType;

    [err, updateUniversityType] = await to(university_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateUniversityType) {
        return ReE(res, { message: "Something went wrong to update University!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateUniversityType) {
        return ReS(res, { message: "University Type was updated!." }, HttpStatus.OK)
    }

}

const checkUniversityType = async (body) => {

    let err;

    let UniversityType, optionUniversity = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionUniversity.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionUniversity.where = {
            is_active: true
        }
    }

    if (!isNull(body.name)) {
        optionUniversity.where = {
            ...optionUniversity.where,
            name: String(firstCap(body.name)).trim()
        }
    }

    if (body.university_id) {
        optionUniversity.where = {
            ...optionUniversity.where,
            _id: body.university_id
        }
    }

    [err, UniversityType] = await to(university_type.findOne(optionUniversity));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(UniversityType)) {
        return { message: "University Types was not found!.", success: false };
    }

    if (!isNull(UniversityType)) {
        return { message: "University Types was exists!", universityType: UniversityType, success: true };
    }
}

const checkUniversityTypeValue = async (body) => {

    let err;

    let UniversityType, optionUniversity = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionUniversity.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionUniversity.where = {
            is_active: true
        }
    }

    if (!isNull(body.name)) {
        optionUniversity.where = {
            ...optionUniversity.where,
            name: String(firstCap(body.name)).trim(),
        }
    }

    if (!isNull(body.university_id)) {
        optionUniversity.where = {
            ...optionUniversity.where,
            _id: body.university_id
        }
    }

    [err, UniversityType] = await to(university_type.findOne(optionUniversity));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(UniversityType)) {
        return { message: "University Types was already exits!.", universityType: UniversityType, success: false };
    }

    if (isNull(UniversityType)) {
        return { message: "University Types not exists!", success: true };
    }
}