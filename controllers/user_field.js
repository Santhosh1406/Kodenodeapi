const user_field = require('../models').user_field;
const user_data = require('../models').user_data;
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty } = require('../service/util.service');
const { getQuery } = require('../service/validation');
const { checkMenuAccess } = require('./common');

module.exports.createField = async (req, res) => {
    let body = req.body;

    const user = req.user;

    let err;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let fields = ['name', 'label', 'required'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 2) {
        return ReE(res, { message: "Please enter vaild name with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.label).length < 2) {
        return ReE(res, { message: "Please enter vaild label with more then 5 character!." }, HttpStatus.BAD_REQUEST);
    }

    let checkField, optionField = {
        where: {
            name: String(body.name).trim(),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkField] = await to(user_field.findOne(optionField));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkField)) {
        return ReE(res, { message: "Field Type already exits!." }, HttpStatus.BAD_REQUEST);
    }


    let checkLabelField, optionLabelField = {
        where: {
            label: String(body.label).trim(),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkLabelField] = await to(user_field.findOne(optionLabelField));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkLabelField)) {
        return ReE(res, { message: "Field Label was already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createField, createData = {
        name: String(body.name).trim(),
        label: String(body.label).trim(),
        required: body.required,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createField] = await to(user_field.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createField)) {
        return ReE(res, { message: "Something went wrong to create Field type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createField)) {
        return ReS(res, { message: "Field created Successfully!." }, HttpStatus.OK);
    }

}

module.exports.createMultipleField = async (req, res) => {
    let body = req.body;

    const user = req.user;

    let err;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(body.fields) || isEmpty(body.fields)) {
        return ReE(res, { message: "Please enter vaild fields array list!." }, HttpStatus.BAD_REQUEST);
    }

    let errFields = [], vaildFields = [];

    for (let index = 0; index < body.fields.length; index++) {
        const element = body.fields[index];

        let fields = ['name', 'label', 'required'];

        let inVaildFields = fields.filter(x => isNull(element[x]));

        if (!isEmpty(inVaildFields)) {
            errFields.push({ ...element, message: `Please enter required fields ${inVaildFields}!.` });
        }

        if (String(body.name).length < 2) {
            errFields.push({ ...element, message: "Please enter vaild name with more then 5 character!." });
        }

        if (String(body.label).length < 2) {
            errFields.push({ ...element, message: "Please enter vaild label with more then 5 character!." });
        }

        let checkField, optionField = {
            where: {
                name: String(element.name).trim(),
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            }
        };

        [err, checkField] = await to(user_field.findOne(optionField));

        if (err) {
            errFields.push({ ...element, message: err });
        }

        if (!isNull(checkField)) {
            errFields.push({ ...element, message: "Field Type already exits!." });
        }


        let checkLabelField, optionLabelField = {
            where: {
                label: String(element.label).trim(),
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            }
        };

        [err, checkLabelField] = await to(user_field.findOne(optionLabelField));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isNull(checkLabelField)) {
            errFields.push({ ...element, message: "Field Label was already exits!." });
        }

        if (isNull(checkLabelField)) {

            let createData = {
                name: String(element.name).trim(),
                label: String(element.label).trim(),
                required: element.required,
                is_block: false,
                is_active: true,
                createdby: user._id,
                updatedby: user._id
            };

            vaildFields.push(createData);
        }

    }

    if (!isEmpty(errFields)) {
        return ReE(res, { message: "Vaildation failed!.", errFields: errFields, Fields: body.fields }, HttpStatus.BAD_REQUEST)
    }

    if (isEmpty(vaildFields)) {
        return ReE(res, { message: "No vaild field datas to create !.", errFields: errFields, Fields: body.fields }, HttpStatus.BAD_REQUEST)
    }

    let createField;

    [err, createField] = await to(user_field.bulkCreate(vaildFields));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createField) || isEmpty(createField)) {
        return ReE(res, { message: "Something went wrong to create Field type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createField) || !isEmpty(createField)) {
        return ReS(res, { message: "Field created Successfully!.", Field: createField }, HttpStatus.OK);
    }

}

module.exports.getAllFieldData = async (req, res) => {
    const user = req.user;

    let body = req.query;

    let err;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let fieldsData, optionField = {
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
        }],
        order:[['name','ASC']],
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionField = {
            ...optionField,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionField = {
            ...optionField,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    [err, fieldsData] = await to(user_field.findAll(optionField));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(fieldsData)) {
        return ReE(res, { message: "Field Types was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(fieldsData)) {
        return ReS(res, { message: "Field Types was exists!", fieldsData }, HttpStatus.OK);
    }

}

module.exports.updatedFieldData = async (req, res) => {

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

    if (isNull(body.field_id)) return ReE(res, { message: "Please select field data!." }, HttpStatus.BAD_REQUEST);

    let checkFieldData = await checkField({ _id: body.field_id, status: 'active' });

    if (!checkFieldData.success) {
        return ReE(res, { message: checkFieldData.message }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['name', 'label'];

    let inVaildFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter something to updated Field data!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.field_id,
            is_active: true,
            is_block: false
        },
        set: {
            updatedby: user._id
        }
    };

    let { fieldData } = checkFieldData;

    let updatedField = inVaildFields.filter(x => body[x] != fieldData[x]);

    if (isEmpty(updatedField)) {
        return ReE(res, { message: `Please edit something to updated Field type!.` }, HttpStatus.BAD_REQUEST);
    }

    if (updatedField.includes('name')) {
        if (String(body.name).length < 2) {
            return ReE(res, { message: "Please enter vaild type with more then 2 character!." }, HttpStatus.BAD_REQUEST);
        }

        if (String(body.name).trim() === String(fieldData.name).trim()) {
            return ReE(res, { message: "Please change user field name to update!." }, HttpStatus.BAD_REQUEST);
        }

        let checkField = await checkValueField({ name: body.name, status: 'all' });

        if (!checkField.success) {
            return ReE(res, { message: checkField.message }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            name: String(body.name).trim()
        };
    }

    if (updatedField.includes('label')) {
        if (String(body.label).length < 2) {
            return ReE(res, { message: "Please enter vaild label with more then 2 character!." }, HttpStatus.BAD_REQUEST);
        }

        if (String(body.label).trim() === String(fieldData.label).trim()) {
            return ReE(res, { message: "Please change user field label to update!." }, HttpStatus.BAD_REQUEST);
        }

        let checkField = await checkValueField({ label: body.label, status: 'all' });

        if (!checkField.success) {
            return ReE(res, { message: checkField.message }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            label: String(body.label).trim()
        };
    }


    let updateFieldData;

    [err, updateFieldData] = await to(user_field.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateFieldData) {
        return ReE(res, { message: "Something went wrong to update Field!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateFieldData) {
        return ReS(res, { message: "Field Type was updated!." }, HttpStatus.OK)
    }

}

const checkField = async (body) => {

    let err;

    let fieldData, optionField = {
        where: {
            is_active: true,
            is_block: false
        }
    };


    if (body.name) {
        optionField.where = {
            ...optionField.where,
            name: String(body.name).trim()
        }
    }

    if (body.label) {
        optionField.where = {
            ...optionField.where,
            label: String(body.label).trim()
        }
    }

    if (body._id) {
        optionField.where = {
            ...optionField.where,
            _id: body._id
        }
    }

    [err, fieldData] = await to(user_field.findOne(optionField));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(fieldData)) {
        return { message: "Field Types was not found!.", success: false };
    }

    if (!isNull(fieldData)) {
        return { message: "Field Types was exists!", fieldData, success: true };
    }
}

module.exports.checkField = checkField;

const checkValueField = async (body) => {

    let err;

    let fieldData, optionField = {
        where: getQuery(body)
    };

    if (body.name) {
        optionField.where = {
            ...optionField.where,
            name: String(body.name).trim()
        }
    }

    if (body.label) {
        optionField.where = {
            ...optionField.where,
            label: String(body.label).trim()
        }
    }

    if (body._id) {
        optionField.where = {
            ...optionField.where,
            _id: body._id
        }
    }

    [err, fieldData] = await to(user_field.findOne(optionField));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(fieldData)) {
        return { message: "Field Types was already exits!", fieldData, success: false };
    }

    if (isNull(fieldData)) {
        return { message: "Field Types was not exits ready to created!.", success: true };
    }
}

module.exports.checkValueField = checkValueField;