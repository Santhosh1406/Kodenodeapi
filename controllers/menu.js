const menu = require('../models').menu;
const user_data = require('../models').user_data;
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstLetterCap } = require('../service/util.service');
const { getQuery } = require('../service/validation');
const { getKodeMenuByRole } = require('./role_menu_mapping');
const { MenuBulkCheck } = require('./commonMutiple');

module.exports.createMenu = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    let fields = ['name', 'user'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 4) {
        return ReE(res, { message: "Please enter vaild type with more then 4 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.label).length < 4) {
        return ReE(res, { message: "Please enter vaild type with more then 4 character!." }, HttpStatus.BAD_REQUEST);
    }

    let checkMenu, optionMenu = {
        where: {
            name: firstLetterCap(String(body.name).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkMenu] = await to(menu.findOne(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkMenu)) {
        return ReE(res, { message: "Menu already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let checkMenuLabel, optionMenuLabel = {
        where: {
            label: String(body.label).trim(),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkMenuLabel] = await to(menu.findOne(optionMenuLabel));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkMenuLabel)) {
        return ReE(res, { message: "Menu label was already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let createType, createData = {
        name: firstLetterCap(String(body.name).trim()),
        label: String(body.label).trim(),
        user: false,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id
    };

    if (!isNull(body.user)) {
        if (!CONFIG.boolean.includes(body.user)) {
            return ReE(res, { message: "Please select vaild menu user fields data!." }, HttpStatus.BAD_REQUEST);
        }

        createData = {
            ...createData,
            user: body.user
        }

        if (!isNull(body.ref_role_id)) {

            let checkKodeRoleDetails = await getKodeMenuByRole({ roleId: body.ref_role_id });

            if (!checkKodeRoleDetails.success) {
                return ReE(res, { message: checkKodeRoleDetails.message }, HttpStatus.BAD_REQUEST);
            }

            createData = {
                ...createData,
                user: body.user,
                ref_role_id: body.ref_role_id
            }
        }

    }

    [err, createType] = await to(menu.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Menu!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Menu created Successfully!." }, HttpStatus.OK);
    }
}

module.exports.createBulkMenu = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    if (isNull(body.data) || isEmpty(body.data)) {
        return ReE(res, { message: "Please enter menu datas!" }, HttpStatus.BAD_REQUEST);
    }

    let createDatas = [];

    for (var i = 0; i < body.data.length; i++) {
        const element = body.data[i];
        let checkMenuDetails = await MenuBulkCheck({ ...element, userDetails:user });

        if (!checkMenuDetails.success) {
            return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
        } else {
            createDatas.push(checkMenuDetails.createData);
        }
    }

    [err, createType] = await to(menu.bulkCreate(createDatas));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Menu!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Menu created Successfully!." }, HttpStatus.OK);
    }
}

module.exports.menuUpdate = async (req, res) => {
    const body = req.body;

    const user = req.user;

    let err;

    if (isNull(body.menu_id)) {
        return ReE(res, { message: "Please select menu!." }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['name', 'user', 'ref_role_id', 'label'];


    let checkMenuDetails = await checkMenu({ menuId: body.menu_id });

    if (!checkMenuDetails.success) {
        return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
    }


    let updateFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(updateFields)) {
        return ReE(res, { message: `Please enter something to update menu details!.` }, HttpStatus.BAD_REQUEST);
    }

    let updateMenu, updateData = {
        set: {
            updatedby: user._id
        },
        where: {
            _id: body.menu_id,
            is_active: true,
            is_block: false
        }
    };

    if (updateFields.includes('name')) {

        if (checkMenuDetails.checkMenu.name == body.name) {
            return ReE(res, { message: "Please edit something to update the menu name!." }, HttpStatus.BAD_REQUEST);
        }

        if (String(body.name).length < 4) {
            return ReE(res, { message: "Please enter vaild type with more then 4 character!." }, HttpStatus.BAD_REQUEST);
        }

        let checkMenuName, optionMenu = {
            where: {
                name: firstLetterCap(String(body.name).trim()),
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            }
        };


        [err, checkMenuName] = await to(menu.findOne(optionMenu));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isNull(checkMenuName)) {
            return ReE(res, { message: "Menu name already exits!." }, HttpStatus.BAD_REQUEST);
        }

        updateData.set = { ...updateData.set, name: firstLetterCap(String(body.name)) };

    }


    if (updateFields.includes('label')) {

        if (checkMenuDetails.checkMenu.label == String(body.label).trim()) {
            return ReE(res, { message: "Please edit something to update the menu label!." }, HttpStatus.BAD_REQUEST);
        }

        if (String(body.name).length < 4) {
            return ReE(res, { message: "Please enter vaild type with more label then 4 character!." }, HttpStatus.BAD_REQUEST);
        }

        let checkMenulabel, optionlabel = {
            where: {
                label: String(body.label).trim(),
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            }
        };


        [err, checkMenulabel] = await to(menu.findOne(optionlabel));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isNull(checkMenulabel)) {
            return ReE(res, { message: "Menu label already exits!." }, HttpStatus.BAD_REQUEST);
        }

        updateData.set = { ...updateData.set, label: String(body.label).trim() };

    }

    if (updateFields.includes('user')) {
        if (!CONFIG.boolean.includes(body.user)) {
            return ReE(res, { message: "Please select vaild menu user fields data!." }, HttpStatus.BAD_REQUEST);
        }

        if (body.user == checkMenuDetails.checkMenu.user) {
            return ReE(res, { message: "Please change menu user value to update!." }, HttpStatus.BAD_REQUEST);
        }

        updateData.set = { ...updateData.set, user: body.user };
    }


    if (updateFields.includes('ref_role_id')) {
        if (checkMenuDetails.checkMenu.user !== true && (isNull(body.user) || body.user != true)) {
            return ReE(res, { message: "You can add role into user role mapped menus only!." }, HttpStatus.BAD_REQUEST);
        }

        if (body.ref_role_id == checkMenuDetails.checkMenu.ref_role_id) {
            return ReE(res, { message: "Please edit something to update menu role reference!." }, HttpStatus.BAD_REQUEST);
        }

        let getKodeRoleMenu = await getKodeMenuByRole({ roleId: body.ref_role_id });

        if (!getKodeRoleMenu.success) {
            return ReE(res, { message: getKodeRoleMenu.message }, HttpStatus.BAD_REQUEST);
        }

        updateData.set = { ...updateData.set, ref_role_id: body.ref_role_id };

    }

    [err, updateMenu] = await to(menu.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateMenu) {
        return ReE(res, { message: "Something went wrong to update menu!" }, HttpStatus.BAD_REQUEST);
    }

    if (updateMenu) {
        return ReS(res, { message: "Menu details was updated successfully!." }, HttpStatus.BAD_REQUEST);
    }
}

module.exports.getAllMenu = async (req, res) => {
    const user = req.user;

    const body = req.query;

    let err;

    let menus, optionMenu = {
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
        }]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionMenu = {
            ...optionMenu,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionMenu = {
            ...optionMenu,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.user)) {
        let userF = false;
        if (!isNull(body.user)) {
            if (body.user != 'false' && body.user != 'true') {
                return ReE(res, { message: "Please select vaild menu user fields data!." }, HttpStatus.BAD_REQUEST);
            }

            userF = body.user;
        }

        optionMenu.where = {
            ...optionMenu.where,
            user: userF
        }
    }

    [err, menus] = await to(menu.findAll(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(menus)) {
        return ReE(res, { message: "Menus was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(menus)) {
        return ReS(res, { message: "Menus was exists!", menus }, HttpStatus.OK);
    }
}

module.exports.getMenu = async (req, res) => {
    const user = req.user;

    const body = req.params;

    if (isNull(body.menuId)) {
        return ReE(res, { message: "Please select menu!." }, HttpStatus.BAD_REQUEST);
    }

    let err;

    let checkMenu, optionMenu = {
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
        }]
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

    [err, checkMenu] = await to(menu.findOne(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkMenu)) {
        return ReE(res, { message: "Menus was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkMenu)) {
        return ReS(res, { message: "Menus was exists!", checkMenu }, HttpStatus.OK);
    }
}

const checkMenu = async (body) => {

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let err;

    let checkMenuDetails, optionMenu = {
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
        }]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionMenu = {
            ...optionMenu,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionMenu = {
            ...optionMenu,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    optionMenu.where = {
        ...optionMenu.where,
        _id: body.menuId
    };

    if (!isNull(body.user)) {
        let userF = false;
        if (!isNull(body.user)) {
            if (body.user !== false && body.user !== true) {
                return { message: "Please select vaild menu user fields data!.", success: false };
            }

            userF = body.user;
        }

        optionMenu.where = {
            ...optionMenu.where,
            user: userF
        }
    }

    [err, checkMenuDetails] = await to(menu.findOne(optionMenu));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkMenuDetails)) {
        return { message: "Menus was not found!.", success: false };
    }

    if (!isNull(checkMenuDetails)) {
        return { message: "Menus was exists!", checkMenu: checkMenuDetails, success: true };
    }
};

module.exports.checkMenu = checkMenu;