const user_field = require('../models').user_field;
const user_fields_mapping = require('../models').user_fields_mapping;
const user_data = require('../models').user_data;
const menu = require('../models').menu;
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { checkField } = require('./user_field');
const { isNull, ReE, to, ReS, isEmpty } = require('../service/util.service');
const { checkMenu, checkUserInf, checkMenuAccess } = require('./common');
const { getQuery } = require('../service/validation');

module.exports.fieldsMenuMapping = async (req, res) => {
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

    let fields = ['menu_id', 'fields'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please select requried data ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.fields)) {
        return ReE(res, { message: "Please select vaild fields names!." }, HttpStatus.BAD_REQUEST);
    }

    let checkMenuDetails = await checkMenu({ menuId: body.menu_id });

    if (!checkMenuDetails.success) {
        return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
    }

    const toFindDuplicates = body.fields.filter((item, index) => body.fields.indexOf(item) !== index);

    if (!isEmpty(toFindDuplicates)) {
        return ReE(res, { message: "Please remove the dublicated fields!." }, HttpStatus.BAD_REQUEST);
    }

    let inVaildUserFields = [], vaildUserFields = [];

    for (var i = 0; i < body.fields.length; i++) {
        let x = body.fields[i];

        let checkFieldsDetails = await checkField({ _id: x });

        if (!checkFieldsDetails.success) {
            inVaildUserFields.push(checkFieldsDetails);
        }

        if (checkFieldsDetails.success) {
            vaildUserFields.push(checkFieldsDetails.fieldData);
        }
    };

    if (!isEmpty(inVaildUserFields)) {
        return ReE(res, { message: "Please select vaild menu details!." }, HttpStatus.BAD_REQUEST);
    }

    let addedMenus = [];

    for (var i = 0; i < vaildUserFields.length; i++) {
        let x = vaildUserFields[i]._id;
        let checkMenuMenu, optionMenuMenu = {
            where: {
                menu_id: body.menu_id,
                field_id: x,
                is_active: true,
                is_block: false,
            }
        };

        [err, checkMenuMenu] = await to(user_fields_mapping.findOne(optionMenuMenu));

        if (!isNull(checkMenuMenu)) {
            addedMenus.push(x);
        }
    };

    if (!isEmpty(addedMenus)) {
        return ReE(res, { message: "Please remove already mapped fields!." }, HttpStatus.BAD_REQUEST);
    }

    let mappedFields = [];

    for (var i = 0; i < vaildUserFields.length; i++) {
        let data = vaildUserFields[i]._id;

        let mapFields, optionMap = {
            menu_id: body.menu_id,
            field_id: data,
            is_active: true,
            is_block: false,
            createdby: user._id,
            updatedby: user._id
        };

        [err, mapFields] = await to(user_fields_mapping.create(optionMap));


        if (isNull(mapFields)) {
            inVaildUserFields.push(vaildUserFields[i].name);
        }

        if (!isNull(mapFields)) {
            mappedFields.push(vaildUserFields[i].name);
        }
    };

    if (!isEmpty(inVaildUserFields) && isEmpty(mappedFields)) {
        return ReE(res, { message: `Something went wrong to fields mapping into menu!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildUserFields) && !isEmpty(mappedFields)) {
        return ReS(res, { message: `Fields was mappined into menu but expect this fields ${mappedFields}!.` }, HttpStatus.OK);
    }

    if (isEmpty(inVaildUserFields) && !isEmpty(mappedFields)) {
        return ReS(res, { message: `Fields ${mappedFields} was mappined into menu!.` }, HttpStatus.OK);
    }

}

module.exports.getAllFieldsByMenu = async (req, res) => {

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

    let getFieldsMenus, optionFieldsMenu = {
        include: [
            {
                model: user_field,
                as: 'fieldDetails',
            },
            {
                model: menu,
                as: 'menuDetails'
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
        where: getQuery(body),
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionFieldsMenu = {
            ...optionFieldsMenu,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionFieldsMenu = {
            ...optionFieldsMenu,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.menu_id)) {

        let checkMenuDetails = await checkMenu({ menuId: body.menu_id });

        if (!checkMenuDetails.success) {
            return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionFieldsMenu.where = {
            ...optionFieldsMenu.where,
            menu_id: body.menu_id,
        };
    }

    [err, getFieldsMenus] = await to(user_fields_mapping.findAll(optionFieldsMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let getFields, mappedFields = [], unMappedFields = [];



    let ids = [];

    [err, getFields] = await to(user_field.findAll({ where: { is_active: true, is_block: false } }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isEmpty(getFields)) {
        await getFieldsMenus.map(x => ids.push(x.field_id));
        await getFields.map(x => {
            if (ids.includes(x._id)) {
                mappedFields.push(x);
            }
            else {
                unMappedFields.push(x);
            }
        });
    }

    if (!isEmpty(getFieldsMenus) || !isEmpty(mappedFields) || !isEmpty(unMappedFields)) {
        let data = {
            fields: getFieldsMenus
        }

        if (body.mapped == 'true') {
            data = {
                ...data,
                mappedFields
            };
        }

        if (body.unmapped == 'true') {
            data = {
                ...data,
                unMappedFields
            };
        }

        return ReS(res, { message: "Fields was fetched !.", ...data }, HttpStatus.OK);
    }
}

const checkFieldsByUser = async (body) => {

    let err;

    let checkUserInfo = await checkUserInf({ user_id: body.user._id });

    if (!checkUserInfo.success) {
        return { message: checkUserInfo.message, success: false };
    }

    if (isNull(body.fieldId)) {
        return { message: "Please select fields!.", success: false };
    }

    let getFieldsMenus, optionFieldsMenu = {
        where: {
            is_active: true,
            is_block: false
        },
        include: [
            {
                model: user_field,
                as: 'fieldDetails'
            },
            {
                model: menu,
                as: 'menuDetails'
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

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionMenu.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionMenu.where = {
            is_active: true
        }
    }

    optionFieldsMenu.where = {
        ...optionFieldsMenu.where,
        menu_id: checkUserInfo.menuId,
        field_id: checkField.fieldId
    };

    [err, getFieldsMenus] = await to(user_fields_mapping.findOne(optionFieldsMenu));

    if (err) {
        return { message: err, success: false }
    }

    if (isNull(getFieldsMenus)) {
        return { message: "You don't have fields access!.", success: false };
    }

    if (!isNull(getFieldsMenus)) {
        return { message: "Fields was fetched !.", fields: getFieldsMenus, success: true };
    }

}

module.exports.checkFieldsByUser = checkFieldsByUser;

const checkFieldsByMenu = async (body) => {

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let err;

    let getFieldsMenus, optionFieldsMenu = {
        where: getQuery(body),
        include: [
            {
                model: user_field,
                as: 'fieldDetails'
            },
            {
                model: menu,
                as: 'menuDetails'
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

    
    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionFieldsMenu = {
            ...optionFieldsMenu,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionFieldsMenu = {
            ...optionFieldsMenu,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    optionFieldsMenu.where = {
        ...optionFieldsMenu.where,
        menu_id: body.menuId
    };

    [err, getFieldsMenus] = await to(user_fields_mapping.findAll(optionFieldsMenu));

    if (err) {
        return { message: err, success: false }
    }

    if (isEmpty(getFieldsMenus)) {
        return { message: "You don't have any fields access!.", success: false };
    }

    if (!isEmpty(getFieldsMenus)) {
        return { message: "Fields was fetched !.", fields: getFieldsMenus, success: true };
    }

}

module.exports.checkFieldsByMenu = checkFieldsByMenu;