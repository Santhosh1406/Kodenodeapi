const { user_data, role, organization, kode_role, role_menu_mapping } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, generateCode } = require('../service/util.service');
const { checkUserInf, checkMenuAccess } = require('./common');
const { checkOrganization } = require('./common');
const { getQuery } = require('../service/validation');

module.exports.createRole = async (req, res) => {
    let body = req.body;

    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please enter organization details!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let err;

    let fields = ['name'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 3) {
        return ReE(res, { message: "Please enter vaild type with more then 3 character!." }, HttpStatus.BAD_REQUEST);
    }

    let checkUserInfo;

    if (user.owner) {
        let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

    } else {
        let checkInfo = await checkUserInf({ user_id: user._id });

        if (!checkInfo.success) {
            return ReE(res, { message: checkInfo.message }, HttpStatus.BAD_REQUEST);
        }

        checkUserInfo = checkInfo.userInfo;
    }


    let checkRole, optionRole = {
        where: {
            name: firstCap(String(body.name).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };


    if (user.owner) {
        optionRole.where = {
            ...optionRole.where,
            org_id: body.org_id
        };
    } else {
        optionRole.where = {
            ...optionRole.where,
            org_id: checkUserInfo.org_id
        };

    }

    [err, checkRole] = await to(role.findOne(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkRole)) {
        return ReE(res, { message: "Role already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let code;

    const data = async () => {

        code = generateCode(body.name, 5);

        if (String(code).length < 5) {
            data();
        } else {
            let checkCodeRole, codeRoleOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkCodeRole] = await to(role.findOne({
                where: codeRoleOption
            }));

            if (!isNull(checkCodeRole)) {
                data();
            }
        }
    }

    data();

    let createType, createData = {
        name: firstCap(String(body.name).trim()),
        code: code,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id,
        org_id: body.org_id
    };

    [err, createType] = await to(role.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Role!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Role created Successfully!." }, HttpStatus.OK);
    }
}

module.exports.getAllRole = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let roles, optionRole = {
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
            }]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (user.owner) {

        if (!isNull(body.org_id)) {

            let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

            if (!checkOrganizationDetails.success) {
                return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
            }

            optionRole.where = {
                ...optionRole.where,
                org_id: body.org_id
            }
        }
    } else {
        
        let checkInfo = await checkUserInf({ user_id: user._id });

        if (!checkInfo.success) {
            return { message: checkInfo.message, success: false };
        }

        checkUserInfo = checkInfo.userInfo;

        optionRole.where = {
            ...optionRole.where,
            org_id: checkInfo.userInfo.org_id
        }
    }

    [err, roles] = await to(role.findAll(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(roles)) {
        return ReE(res, { message: "Roles was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(roles)) {
        return ReS(res, { message: "Roles was exists!", roles }, HttpStatus.OK);
    }
}

module.exports.getRole = async (req, res) => {
    const user = req.user;

    let body = req.params;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(body.roleId)) {
        return ReE(res, { message: "Please select role!." }, HttpStatus.BAD_REQUEST);
    }

    let err;

    let checkRole, optionRole = {
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
            }]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    optionRole.where = {
        ...optionRole.where,
        _id: body.roleId
    }

    [err, checkRole] = await to(role.findOne(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkRole)) {
        return ReE(res, { message: "Roles was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkRole)) {
        return ReS(res, { message: "Roles was exists!", checkRole }, HttpStatus.OK);
    }
}

module.exports.createKodeRole = async (req, res) => {
    let body = req.body;

    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let fields = ['name'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 3) {
        return ReE(res, { message: "Please enter vaild type with more then 3 character!." }, HttpStatus.BAD_REQUEST);
    }

    let checkRole, optionRole = {
        where: {
            name: firstCap(String(body.name).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkRole] = await to(kode_role.findOne(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkRole)) {
        return ReE(res, { message: "Role already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let code;

    const data = async () => {

        code = generateCode(body.name, 5);

        if (String(code).length < 5) {
            data();
        } else {
            let checkCodeRole, codeRoleOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkCodeRole] = await to(kode_role.findOne({
                where: codeRoleOption
            }));

            if (!isNull(checkCodeRole)) {
                data();
            }
        }
    }
    data();

    let createType, createData = {
        name: firstCap(String(body.name).trim()),
        code: code,
        is_block: false,
        is_active: true,
        createdby: user._id,
        updatedby: user._id,
        org_id: body.org_id
    };

    [err, createType] = await to(kode_role.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createType)) {
        return ReE(res, { message: "Something went wrong to create Role!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createType)) {
        return ReS(res, { message: "Role created Successfully!." }, HttpStatus.OK);
    }
}

module.exports.getAllKodeRole = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let roles, optionRole = {
        where: getQuery(body),
        include: [
            {
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
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    [err, roles] = await to(kode_role.findAll(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(roles)) {
        return ReE(res, { message: "Roles was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(roles)) {
        return ReS(res, { message: "Roles was exists!", roles }, HttpStatus.OK);
    }
}

module.exports.getKodeRole = async (req, res) => {
    const user = req.user;

    let body = req.params;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(body.roleId)) {
        return ReE(res, { message: "Please select role!." }, HttpStatus.BAD_REQUEST);
    }

    let err;

    let checkRole, optionRole = {
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
            }]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    optionRole.where = {
        ...optionRole.where,
        _id: body.roleId
    }

    [err, checkRole] = await to(kode_role.findOne(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkRole)) {
        return ReE(res, { message: "Roles was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkRole)) {
        return ReS(res, { message: "Roles was exists!", checkRole }, HttpStatus.OK);
    }
}

const checkRole = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select role!.", success: false };
    }

    if (!isNull(body.org_id)) {

        let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

    }

    let err;

    let checkRole, optionRole = {
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
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    optionRole.where = {
        ...optionRole.where,
        _id: body.roleId
    };

    if (!isNull(body.org_id)) {
        optionRole.where = {
            ...optionRole.where,
            org_id: body.org_id
        };
    }

    [err, checkRole] = await to(role.findOne(optionRole));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkRole)) {
        return { message: `Customer Roles was not found!.`, success: false };
    }

    if (!isNull(checkRole)) {
        return { message: "Customer Roles was exists!", checkRole, success: true };
    }
}

module.exports.checkRole = checkRole;

const checkKodeRole = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select kode role!.", success: false };
    }

    let err;

    let checkRole, optionRole = {
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
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    optionRole.where = {
        ...optionRole.where,
        _id: body.roleId
    };

    [err, checkRole] = await to(kode_role.findOne(optionRole));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkRole)) {
        return { message: `Kode Roles was not found!.`, success: false };
    }

    if (!isNull(checkRole)) {
        return { message: "Kode Roles was exists!", checkRole, success: true };
    }
}

module.exports.checkKodeRole = checkKodeRole;


const getCustomerRoleByKodeRole = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select role!.", success: false };
    }

    let checkKodeRoleDetails = await checkKodeRole({ roleId: body.roleId });

    if (!checkKodeRoleDetails.success) {
        return { message: checkKodeRoleDetails.message, success: false };
    }

    let err;

    let getRole, optionRole = {
        where: getQuery(body),
        include: [
            {
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
        optionRole = {
            ...optionRole,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRole = {
            ...optionRole,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    optionRole.where = {
        ...optionRole.where,
        ref_role_id: body.roleId
    };

    [err, getRole] = await to(role_menu_mapping.findAll(optionRole));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(getRole)) {
        return { message: `Customer Role not yet referred for this ${checkKodeRoleDetails.checkRole.name} kode role!.`, success: false };
    }

    if (!isEmpty(getRole)) {

        let ids = [];

        await getRole.map(x => ids.push(x.role_id));

        return { message: "Customer Role are exists!", roles: getRole, ids: ids, success: true };
    }
}

module.exports.getCustomerRoleByKodeRole = getCustomerRoleByKodeRole;