const { user_data, role_menu_mapping, menu, role, kode_role_menu_mapping, kode_role, organization } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, isEmpty, firstLetterCap } = require('../service/util.service');
const { checkRole, checkKodeRole } = require('./role');
const { checkOrganization } = require('./common');
const { getQuery, IsValidUUIDV4 } = require('../service/validation');
const { checkUserInf } = require('./common');
const { checkMenu } = require('./common');

module.exports.roleMenuMapping = async (req, res) => {

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

    let err;

    let fields = ['role_id', 'ref_role_id'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUserInfo, orgOption;

    if (user.owner) {

        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select institution details!." }, HttpStatus.BAD_REQUEST);
        }

        orgOption = { org_id: body.org_id };

    } else {
        checkUserInfo = await checkUserInf({ user_id: user._id });

        if (!checkUserInfo.success) {
            return ReE(res, { message: checkUserInfo.message }, HttpStatus.BAD_REQUEST);
        }

        orgOption = { org_id: checkUserInfo.userInfo.org_id };
    }

    let checkOrganizationDetails = await checkOrganization(orgOption);

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkRoleDetails = await checkRole({ roleId: body.role_id, org_id: checkOrganizationDetails.organizationDetails._id });

    if (!checkRoleDetails.success) {
        return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkKodeRoleDetails = await checkKodeRole({ roleId: body.ref_role_id });

    if (!checkKodeRoleDetails.success) {
        return ReE(res, { message: checkKodeRoleDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getKodeMenus = await getKodeMenuByRole({ roleId: body.ref_role_id });

    if (!getKodeMenus.success) {
        return ReE(res, { message: getKodeMenus.message }, HttpStatus.BAD_REQUEST);
    }

    if ((isNull(body.menus) || isEmpty(body.menus)) && isEmpty(getKodeMenus.menus)) {
        return ReE(res, { message: "Please select menus access!." }, HttpStatus.BAD_REQUEST);
    }

    if ((isNull(body.menus) || isEmpty(body.menus)) && !isEmpty(getKodeMenus.menus)) {
        body.menus = [];
        let { menus } = getKodeMenus;
        menus.map(x =>
            body.menus.push({ _id: x.menuDetails._id, ...x.access }));

    }

    if (!isEmpty(body.menus)) {
        const toFindDuplicates = body.menus.filter((item, index) => body.menus.indexOf(item) !== index);

        if (!isEmpty(toFindDuplicates)) {
            return ReE(res, { message: "Please remove the dublicated menus!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let inVaildMenus = [], vaildMenus = [];

    for (var i = 0; i < body.menus.length; i++) {
        let menuDat = body.menus[i];

        let checkMenuDetails = await checkMenu({ menuId: menuDat._id });

        if (!checkMenuDetails.success) {
            inVaildMenus.push(checkMenuDetails.checkMenu);
        }

        if (checkMenuDetails.success) {
            vaildMenus.push({ ...menuDat, name: checkMenuDetails.checkMenu.name });
        }
    }

    if (!isEmpty(inVaildMenus)) {
        return ReE(res, { message: "Please select vaild menu details!." }, HttpStatus.BAD_REQUEST);
    }

    let addedMenu = [], mappedMenu = [], inVaildAccess = [], inVaildKode = [], addAbleMenu = [];

    for (var i = 0; i < vaildMenus.length; i++) {
        let data = vaildMenus[i];
        let checkRoleMenu, optionRoleMenu = {
            where: {
                menu_id: data._id,
                role_id: body.role_id,
                is_active: true,
                is_block: false,
            }
        };

        if (user.owner) {
            optionRoleMenu.where = {
                ...optionRoleMenu.where,
                org_id: body.org_id
            }
        } else {
            optionRoleMenu.where = {
                ...optionRoleMenu.where,
                org_id: checkUserInfo.userInfo.org_id
            }
        }

        [err, checkRoleMenu] = await to(role_menu_mapping.findOne(optionRoleMenu));

        if (!isNull(checkRoleMenu)) {
            addedMenu.push(data);
        }

        if (!isNull(body.ref_role_id)) {

            let checkRoleDetails = await checkKodeRole({ roleId: body.ref_role_id, kode: true });

            if (!checkRoleDetails.success) {
                return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
            }

            // let checkMenuAndRole = await checkKodeMenu({ roleId: body.ref_role_id, menuId: data._id });

            // if (!checkMenuAndRole.success) {
            //     inVaildKode.push(data);
            // }

            // if (checkMenuAndRole.checkKodeRole && checkMenuAndRole.checkKodeRole.access) {
            //     CONFIG.access.map(x => {
            //         if (checkMenuAndRole.checkKodeRole.access[x] == true) {
            //             data[x] = checkMenuAndRole.checkKodeRole.access[x];
            //         }
            //     });
            // }
        }

        let accessInvaild = [], accessVaild = [];
        await CONFIG.access.map(x => {
            if ((isNull(data[String(x)]) || data[String(x)] == false) && data[String(x)] != true) {
                accessInvaild.push(x);
            }

            if (data[String(x)] == true) {
                accessVaild.push(x)
            }
        });

        if (isEmpty(accessVaild) && !isEmpty(accessInvaild)) {
            inVaildAccess.push(data);
        }

        if (!isEmpty(accessVaild)) {
            addAbleMenu.push(data);
        }
    };

    if (!isEmpty(addedMenu)) {
        return ReE(res, { message: `Please remove already mapped menus [${addedMenu.map(x => x.name)}]!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildAccess)) {
        return ReE(res, { message: `Please give vaild access for metioned menus[${inVaildAccess.map(x => x.name)}]!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildKode)) {
        return ReE(res, { message: `Kode doesn't have any access for metioned menus [${inVaildKode.map(x => x.name)}]!.` }, HttpStatus.BAD_REQUEST);
    }


    for (var i = 0; i < addAbleMenu.length; i++) {
        let data = addAbleMenu[i];

        let mapRole, optionMap = {
            menu_id: data._id,
            access: {
                Create: false,
                Update: false,
                Get: false,
                Delete: false
            },
            role_id: body.role_id,
            ref_role_id: body.ref_role_id,
            org_id: user.owner ? body.org_id : checkUserInfo.userInfo.org_id,
            is_active: true,
            is_block: false,
            createdby: user._id,
            updatedby: user._id
        };

        await CONFIG.access.map(x => optionMap.access[String(x)] = data[String(x)] ? data[String(x)] : false);

        [err, mapRole] = await to(role_menu_mapping.create(optionMap));

        if (err) {
            inVaildMenus.push(vaildMenus[i].name);
        }

        if (isNull(mapRole)) {
            inVaildMenus.push(vaildMenus[i].name);
        }

        if (!isNull(mapRole)) {
            mappedMenu.push(vaildMenus[i].name);
        }
    };

    if (!isEmpty(inVaildMenus) && isEmpty(mappedMenu)) {
        return ReE(res, { message: `Something went wrong to menus mapping into ${checkRoleDetails.checkRole.name} role!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildMenus) && !isEmpty(mappedMenu)) {
        return ReS(res, { message: `Menus are mappined into this ${checkRoleDetails.checkRole.name} role but expect this menus ${mappedMenu}!.` }, HttpStatus.OK);
    }

    if (isEmpty(inVaildMenus) && !isEmpty(mappedMenu)) {
        return ReS(res, { message: `Menus are mappined into this ${checkRoleDetails.checkRole.name} role !.` }, HttpStatus.OK);
    }
}

module.exports.getAllMenuByRole = async (req, res) => {

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

    let checkUserInfo;

    if (user.owner) {

        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select institution details!." }, HttpStatus.BAD_REQUEST);
        }

    } else {
        checkUserInfo = await checkUserInf({ user_id: user._id });

        if (!checkUserInfo.success) {
            return ReE(res, { message: checkUserInfo.message }, HttpStatus.BAD_REQUEST);
        }
    }

    let getRoleMenus, optionRoleMenus = {
        include: [
            {
                model: menu,
                as: 'menuDetails'
            },
            {
                model: role,
                as: 'roleDetails'
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
        where: getQuery(body)
    };

    if (!isNull(body.role_id)) {

        let checkRoleDetails = await checkRole({ roleId: body.role_id });

        if (!checkRoleDetails.success) {
            return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: body.role_id
        }
    }

    if (!isNull(body.ref_role_id)) {

        let checkRoleDetails = await checkKodeRole({ roleId: body.ref_role_id });

        if (!checkRoleDetails.success) {
            return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            ref_role_id: body.ref_role_id
        }
    }


    if (!isNull(body.org_id)) {

        let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            org_id: body.org_id
        }
    }

    if (!isNull(body.menuId)) {

        let checkMenuDetails = await checkMenu({ menuId: body.menuId });

        if (!checkMenuDetails.success) {
            return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            menu_id: body.menuId
        }
    }

    if (!isNull(body.limit) && !isNull(body.page)) {
        optionRoleMenus.limit = body.limit;
        optionRoleMenus.offset = (body.page * (body.page - 1));
    };

    [err, getRoleMenus] = await to(role_menu_mapping.findAll(optionRoleMenus));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    let menus, optionMenu = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    [err, menus] = await to(menu.findAll(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(menus)) {
        return ReE(res, { message: "Menu was empty!." }, HttpStatus.BAD_REQUEST);
    }


    let mapped = [], unmapped = [], ids = [], mappedMenu = [];

    await getRoleMenus.map(x => ids.push(x.menu_id));
    await menus.map(x => {
        if (ids.includes(x._id)) {
            mapped.push(x);
            mappedMenu.push(x);
        }
        else {
            unmapped.push(x);
        }
    });


    if (!isEmpty(getRoleMenus) || !isEmpty(mapped) || !isEmpty(unmapped)) {

        let data = {
            data: getRoleMenus
        }

        if (body.mapped == 'true') {
            data = {
                ...data,
                mapped
            };
        }

        if (body.unmapped == 'true') {
            data = {
                ...data,
                unmapped
            };
        }

        if (body.menu == 'true') {
            data = {
                ...data,
                mappedMenu
            }
        }

        if (isEmpty(data.data) && isNull(data.mapped) && isNull(data.unmapped)) {
            return ReE(res, { message: "Menu was not yet mapped." }, HttpStatus.BAD_REQUEST);
        }

        return ReS(res, { message: "Menu was fetched !.", ...data }, HttpStatus.OK);
    }
}

module.exports.kodeRoleMenuMapping = async (req, res) => {

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

    let err;

    let fields = ['menus', 'role_id'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkRoleDetails = await checkKodeRole({ roleId: body.role_id });

    if (!checkRoleDetails.success) {
        return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.menus)) {
        return ReE(res, { message: "Please select menus access!." }, HttpStatus.BAD_REQUEST);
    }

    const toFindDuplicates = body.menus.filter((item, index) => body.menus.indexOf(item) !== index);

    if (!isEmpty(toFindDuplicates)) {
        return ReE(res, { message: "Please remove the dublicated menus!." }, HttpStatus.BAD_REQUEST);
    }

    let inVaildMenus = [], vaildMenus = [];

    for (var i = 0; i < body.menus.length; i++) {
        let x = body.menus[i];
        let checkMenuDetails = await checkMenu({ menuId: x._id });

        if (!checkMenuDetails.success) {
            inVaildMenus.push(checkMenuDetails.checkMenu);
        }

        if (checkMenuDetails.success) {
            vaildMenus.push({ ...x, name: checkMenuDetails.checkMenu.name });
        }
    }


    if (!isEmpty(inVaildMenus)) {
        return ReE(res, { message: "Please select vaild menu details!." }, HttpStatus.BAD_REQUEST);
    }

    let addedMenu = [];

    for (var i = 0; i < vaildMenus.length; i++) {
        let x = vaildMenus[i];
        let checkRoleMenu, optionRoleMenu = {
            where: {
                menu_id: x._id,
                role_id: body.role_id,
                is_active: true,
                is_block: false,
            }
        };

        [err, checkRoleMenu] = await to(kode_role_menu_mapping.findOne(optionRoleMenu));

        if (!isNull(checkRoleMenu)) {
            addedMenu.push(x);
        }
    };

    if (!isEmpty(addedMenu)) {
        return ReE(res, { message: `Please remove already mapped menus [${addedMenu.map(x => x.name)}]!.` }, HttpStatus.BAD_REQUEST);
    }

    let mappedMenu = [], inVaildAccess = [];

    for (var i = 0; i < vaildMenus.length; i++) {
        let data = vaildMenus[i];

        let accessInvaild = await CONFIG.access.filter(x => (isNull(data[x]) || data[x] == false));

        if (accessInvaild.length === CONFIG.access.length) {
            inVaildAccess.push(data);
        }
    }

    if (!isEmpty(inVaildAccess)) {
        return ReE(res, { message: `Please give any access for metioned menus[${inVaildAccess.map(x => x.name)}]!.` }, HttpStatus.BAD_REQUEST);
    }

    for (var i = 0; i < vaildMenus.length; i++) {
        let data = vaildMenus[i];

        let mapRole, optionMap = {
            menu_id: data._id,
            access: {

            },
            role_id: body.role_id,
            is_active: true,
            is_block: false,
            createdby: user._id,
            updatedby: user._id
        };

        CONFIG.access.map(x => optionMap.access[String(x)] = data[String(x)] ? data[String(x)] : false);


        [err, mapRole] = await to(kode_role_menu_mapping.create(optionMap));

        if (err) {
            inVaildMenus.push(vaildMenus[i].name);
        }

        if (isNull(mapRole)) {
            inVaildMenus.push(vaildMenus[i].name);
        }

        if (!isNull(mapRole)) {
            mappedMenu.push(vaildMenus[i].name);
        }
    };


    if (!isEmpty(inVaildMenus) && isEmpty(mappedMenu)) {
        return ReE(res, { message: `Something went wrong to menus mapping into ${checkRoleDetails.checkRole.name} role!.` }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildMenus) && !isEmpty(mappedMenu)) {
        return ReS(res, { message: `Menus are mappined into this ${checkRoleDetails.checkRole.name} role but expect this menus ${mappedMenu}!.` }, HttpStatus.OK);
    }

    if (isEmpty(inVaildMenus) && !isEmpty(mappedMenu)) {
        return ReS(res, { message: `${mappedMenu} Menus are mappined into this ${checkRoleDetails.checkRole.name} role !.` }, HttpStatus.OK);
    }
}

module.exports.getAllKodeRoleMenu = async (req, res) => {

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

    let getRoleMenus, optionRoleMenus = {
        include: [
            {
                model: menu,
                as: 'menuDetails'
            },
            {
                model: kode_role,
                as: 'roleDetails'
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
        order:[['createdby','ASC']]
    };

    if (!isNull(body.role_id)) {

        let checkRoleDetails = await checkKodeRole({ roleId: body.role_id });

        if (!checkRoleDetails.success) {
            return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: body.role_id
        }
    }

    if (!isNull(body.menuId)) {

        let checkMenuDetails = await checkMenu({ menuId: body.menuId });

        if (!checkMenuDetails.success) {
            return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            menu_id: body.menuId
        }
    }

    if (!isNull(body.cus_role_id)) {

        let checkCusRoleDetails = await checkRole({ roleId: body.cus_role_id });

        if (!checkCusRoleDetails.success) {
            return ReE(res, { message: checkCusRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let getMappedRoleMenu, roleMenuIds = [], optionCusRoleMenu = {
            where: {
                role_id: body.cus_role_id,
                is_active: true,
                is_block: false
            }
        };

        [err, getMappedRoleMenu] = await to(role_menu_mapping.findAll(optionCusRoleMenu));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isEmpty(getMappedRoleMenu)) {
            getMappedRoleMenu.map(x => roleMenuIds.push(x.menu_id));

            optionRoleMenus.where = {
                ...optionRoleMenus.where,
                menu_id: { [Op.notIn]: roleMenuIds }
            }
        }
    }


    if (!isNull(body.limit) && !isNull(body.page)) {
        optionRoleMenus.limit = body.limit;
        optionRoleMenus.offset = (body.page * (body.page - 1));
    };

    [err, getRoleMenus] = await to(kode_role_menu_mapping.findAll(optionRoleMenus));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let menus, optionMenu = {
        where: {
            is_active: true,
            is_block: false
        }
    };


    [err, menus] = await to(menu.findAll(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(menus)) {
        return ReE(res, { message: "Menu was empty!." }, HttpStatus.BAD_REQUEST);
    }

    let roles, optionRole = {
        where: {
            is_active: true,
            is_block: false
        }
    };


    [err, roles] = await to(kode_role.findAll(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(roles)) {
        return ReE(res, { message: "Role was empty!." }, HttpStatus.BAD_REQUEST);
    }

    let mapped = [], unmapped = [], ids = [], mappedMenu = [], mappedRole = [], unmappedRole = [];


    await getRoleMenus.map(x => ids.push(x.menu_id));
    await menus.map(x => {
        if (ids.includes(x._id)) {
            mapped.push(x);
            mappedMenu.push(x);
        }
        else {
            unmapped.push(x);
        }
    });

    let filterData = [], roleId = [];

    getRoleMenus.map((x, i) => {
        if (filterData.length <= 0) {
            filterData.push(x)
        }
        else {
            let array = filterData.findIndex(y => x.role_id === y.role_id);

            if (array < 0) {
                filterData.push(x);
            }
        }

    });

    filterData.map(x => {
        roleId.push(x.roleDetails._id);
    });

    roles.map(x => {
        if (roleId.includes(x._id)) {
            mappedRole.push(x);
            let roleId = getRoleMenus.filter(y => y.role_id == x._id)

            if (roleId.length < menus.length) unmappedRole.push(x);
        } else {
            unmappedRole.push(x);
        }
    });

    if (!isEmpty(getRoleMenus) || !isEmpty(mapped) || !isEmpty(unmapped) || !isEmpty(mappedRole) || !isEmpty(mappedMenu) || !isEmpty(unmappedRole)) {

        let data = {
            data: getRoleMenus
        }

        if (body.mapped == 'true') {
            data = {
                ...data,
                mapped
            };
        }

        if (body.unmapped == 'true') {
            data = {
                ...data,
                unmapped
            };
        }

        if (body.menu == 'true') {
            data = {
                ...data,
                mappedMenu
            }
        }

        if (body.role == 'true') {
            data = {
                ...data,
                mappedRole
            }
        }

        if (body.unmappedRole == 'true') {
            data = {
                ...data,
                unmappedRole
            }
        }

        if (isEmpty(data.data) && isNull(data.mapped) && isNull(data.unmapped) && isNull(data.mappedRole) && isNull(data.unmappedRole)) {
            return ReE(res, { message: "Menu was not yet mapped." }, HttpStatus.BAD_REQUEST);
        }

        return ReS(res, { message: "Menu was fetched !.", ...data }, HttpStatus.OK);
    }
}

module.exports.getAllRoleMenu = async (req, res) => {
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

    let getRoleMenus, optionRoleMenus = {
        include: [
            {
                model: menu,
                as: 'menuDetails'
            },
            {
                model: role,
                as: 'roleDetails'
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
        order:[['createdby','ASC']]
    };

    let roles, optionRole = {
        include: [
            {
                model: organization,
                as: 'orgId'
            }
        ],
        where: {
            is_active: true,
            is_block: false
        }
    };


    if (isNull(body.org_id) || !IsValidUUIDV4(body.org_id)) {
        return ReE(res, { message: "Please select vaild institution details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    optionRoleMenus.where = {
        ...optionRoleMenus.where,
        org_id: body.org_id
    }

    optionRole.where = {
        ...optionRole.where,
        org_id: body.org_id
    }

    if (!isNull(body.role_id)) {

        let roleOption = { roleId: body.role_id };

        if (!user.owner) {
            let checkInfo = await checkUserInf({ user_id: user._id });

            if (!checkInfo.success) {
                return ReE(res, { message: checkInfo.message }, HttpStatus.BAD_REQUEST);
            }

            optionRoleMenus.where = {
                ...optionRoleMenus.where,
                org_id: checkInfo.userInfo.org_id
            }

            optionRole.where = {
                ...optionRole.where,
                org_id: checkInfo.userInfo.org_id
            }
            roleOption = { ...roleOption, org_id: checkInfo.userInfo.org_id }

        } else {

            let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

            if (!checkOrganizationDetails.success) {
                return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
            }
            optionRoleMenus.where = {
                ...optionRoleMenus.where,
                org_id: body.org_id
            }
            roleOption = { ...roleOption, org_id: body.org_id }

        }

        let checkRoleDetails = await checkRole(roleOption);

        if (!checkRoleDetails.success) {
            return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: body.role_id
        }
    }

    if (!isNull(body.ref_role_id)) {

        let checkRoleDetails = await checkKodeRole({ roleId: body.ref_role_id });

        if (!checkRoleDetails.success) {
            return ReE(res, { message: checkRoleDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            ref_role_id: body.ref_role_id
        }
    }


    if (!isNull(body.menuId)) {

        let checkMenuDetails = await checkMenu({ menuId: body.menu_id });

        if (!checkMenuDetails.success) {
            return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            menu_id: body.menuId
        }
    }

    if (!isNull(body.limit) && !isNull(body.page)) {
        optionRoleMenus.limit = body.limit;
        optionRoleMenus.offset = (body.page * (body.page - 1));
    };

    [err, getRoleMenus] = await to(role_menu_mapping.findAll(optionRoleMenus));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    let menus, optionMenu = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    [err, menus] = await to(menu.findAll(optionMenu));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(menus)) {
        return ReE(res, { message: "Menu was empty!." }, HttpStatus.BAD_REQUEST);
    }


    [err, roles] = await to(role.findAll(optionRole));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(roles)) {
        return ReE(res, { message: "Role was empty!." }, HttpStatus.BAD_REQUEST);
    }


    let mapped = [], unmapped = [], ids = [], mappedMenu = [], mappedRole = [], unmappedRole = [];


    await getRoleMenus.map(x => ids.push(x.menu_id));
    await menus.map(x => {
        if (ids.includes(x._id)) {
            mapped.push(x);
            mappedMenu.push(x);
        }
        else {
            unmapped.push(x);
        }
    });

    let filterData = [], roleId = [];

    getRoleMenus.map((x, i) => {
        if (filterData.length <= 0) {
            filterData.push(x)
        }
        else {
            let array = filterData.findIndex(y => x.role_id === y.role_id);

            if (array < 0) {
                filterData.push(x);
            }
        }

    });

    filterData.map(x => {
        roleId.push(x.roleDetails._id);
    });

    roles.map(x => {
        if (roleId.includes(x._id)) {
            mappedRole.push(x);
            let roleId = getRoleMenus.filter(y => y.role_id == x._id)

            if (roleId.length < menus.length) unmappedRole.push(x);

        } else {
            unmappedRole.push(x);
        }
    });

    if (!isEmpty(getRoleMenus) || !isEmpty(mapped) || !isEmpty(unmapped) || !isEmpty(mappedRole) || !isEmpty(mappedMenu) || !isEmpty(unmappedRole)) {

        let message = "Menu was fetched !.";
        let data = {
            data: getRoleMenus
        }

        if (body.mapped == 'true') {
            data = {
                ...data,
                mapped
            };

            if (isEmpty(mapped)) message = "Mapped Menu was Empty!.";
        }

        if (body.unmapped == 'true') {
            data = {
                ...data,
                unmapped
            };

            if (isEmpty(unmapped)) message = "Mapped menu was empty!.";
        }

        if (body.menu == 'true') {
            data = {
                ...data,
                mappedMenu
            }

            if (isEmpty(mappedMenu)) message = "Mapped menu was empty!.";
        }

        if (body.role == 'true') {
            data = {
                ...data,
                mappedRole
            }
            if (isEmpty(mappedMenu)) message = "Customer role was not yet mapped!.";
        }

        if (body.unmappedRole == 'true') {
            data = {
                ...data,
                unmappedRole
            }

            if (isEmpty(unmappedRole)) message = "Customer role all are already mapped!.";

        }

        if (isEmpty(data.data) && isNull(data.mapped) && isNull(data.unmapped) && isNull(data.mappedRole) && isNull(data.unmappedRole)) {
            return ReE(res, { message: "Menu was not yet mapped." }, HttpStatus.BAD_REQUEST);
        }

        return ReS(res, { message: message, ...data }, HttpStatus.OK);
    }
}

module.exports.updateRoleMenu = async (req, res) => {
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

    let err;

    let updateFields = ['access', 'role_menu_id', 'active'];

    let inVaildUpdateFields = updateFields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildUpdateFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildUpdateFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.role_menu_id)) {
        return ReE(res, { message: "Please select customer role menu mapped details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkRoleMenu, optionCheckRoleMenu = {
        where: {
            _id: body.role_menu_id,
            is_active: true
        }
    };

    [err, checkRoleMenu] = await to(role_menu_mapping.findOne(optionCheckRoleMenu));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkRoleMenu)) {
        return ReE(res, { message: "Please select vaild customer role menu mapping detail !." }, HttpStatus.BAD_REQUEST);
    }

    let updateRole, updatedData = {
        where: {
            _id: body.role_menu_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };


    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkRoleMenu.is_block == status) {
            return ReE(res, { message: `Customer Role menu was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }

    } else {

        let fields = ['access'];

        let inVaildFields = fields.filter(x => isNull(body[x]));

        if (!isEmpty(inVaildFields)) {
            return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
        }

        let accessInvaild = [], accessVaild = [], notUpdateAccess = [];
        await CONFIG.access.map(x => {
            if (isNull(body.access[String(x)])) {
                accessInvaild.push(x);
            } else {

                if (checkRoleMenu.access[String(x)] != body.access[String(x)]) {
                    accessVaild.push(x)
                }

                if (checkRoleMenu.access[String(x)] == body.access[String(x)]) {
                    notUpdateAccess.push(x)
                }
            }
        });


        console.log(accessInvaild,accessVaild,notUpdateAccess,body.access,checkRoleMenu.access);

        if (!isEmpty(accessInvaild)) {
            return ReE(res, { message: "Please select vaild access to update this customer role menu details!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isEmpty(notUpdateAccess) && isEmpty(accessVaild)) {
            return ReE(res, { message: "Please edit something to update customer role menu access details!." }, HttpStatus.BAD_REQUEST);
        }

        if (isEmpty(accessVaild)) {
            return ReE(res, { message: "No vaild access to update this customer role menu details!." }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            access: body.access
        };

    }

    [err, updateRole] = await to(role_menu_mapping.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(updateRole)) {
        return ReE(res, { message: "Something went wrong to update customer role menu details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(updateRole)) {
        return ReS(res, { message: "Customer role menu details was updated!." }, HttpStatus.OK);
    }

}

module.exports.updateKodeRoleMenu = async (req, res) => {
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

    let err;

    let updateFields = ['access', 'role_menu_id', 'active'];

    let inVaildUpdateFields = updateFields.filter(x => !isNull(body[x]));

    if (isEmpty(inVaildUpdateFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildUpdateFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.role_menu_id)) {
        return ReE(res, { message: "Please select role menu mapped details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkRoleMenu, optionCheckRoleMenu = {
        where: {
            _id: body.role_menu_id,
            is_active: true
        }
    };

    [err, checkRoleMenu] = await to(kode_role_menu_mapping.findOne(optionCheckRoleMenu));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkRoleMenu)) {
        return ReE(res, { message: "Please select vaild role menu mapping detail !." }, HttpStatus.BAD_REQUEST);
    }

    let updateRole, updatedData = {
        where: {
            _id: body.role_menu_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };


    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkRoleMenu.is_block == status) {
            return ReE(res, { message: `Kode Role menu was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }

    } else {

        let fields = ['access'];

        let inVaildFields = fields.filter(x => isNull(body[x]));

        if (!isEmpty(inVaildFields)) {
            return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
        }

        let accessInvaild = [], accessVaild = [], notUpdateAccess = [];
        await CONFIG.access.map(x => {
            if (isNull(body.access[String(x)])) {
                accessInvaild.push(x);
            } else {

                if (checkRoleMenu.access[String(x)] != body.access[String(x)]) {
                    accessVaild.push(x)
                }

                if (checkRoleMenu.access[String(x)] == body.access[String(x)]) {
                    notUpdateAccess.push(x)
                }
            }
        });

        if (!isEmpty(accessInvaild)) {
            return ReE(res, { message: "Please select vaild access to update this kode role menu details!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isEmpty(notUpdateAccess) && isEmpty(accessVaild)) {
            return ReE(res, { message: "Please edit something to update kode role menu access details!." }, HttpStatus.BAD_REQUEST);
        }

        if (isEmpty(accessVaild)) {
            return ReE(res, { message: "No vaild access to update this kode role menu details!." }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            access: body.access
        };

    }

    [err, updateRole] = await to(kode_role_menu_mapping.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(updateRole)) {
        return ReE(res, { message: "Something went wrong to update kode role menu details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(updateRole)) {
        return ReS(res, { message: "Kode role menu details was updated!." }, HttpStatus.OK);
    }

}

const checkMenuByUser = async (body) => {

    let err;

    let checkUserInfo = await checkUserInf({ user_id: body.user_id });

    if (!checkUserInfo.success) {
        return { message: checkUserInfo.message, success: false };
    }

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let getRoleMenus, optionRoleMenus = {
        where: getQuery(body),
        include: [
            {
                model: menu,
                as: 'menuDetails',
                attributes: ['_id', 'name', 'label', 'user']
            },
            {
                model: role,
                as: 'roleDetails',
                attributes: ['_id', 'name']
            },
            {
                model: kode_role,
                as: 'refRoleDetails',
                attributes: ['_id', 'name']
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
        optionRoleMenus = {
            ...optionRoleMenus,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRoleMenus = {
            ...optionRoleMenus,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (checkUserInfo.userInfo && checkUserInfo.userInfo.org_id) {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            org_id: checkUserInfo.userInfo.org_id,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    } else {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    }

    [err, getRoleMenus] = await to(role_menu_mapping.findOne(optionRoleMenus));

    if (err) {
        return { message: err, success: false }
    }

    if (isNull(getRoleMenus)) {
        return { message: "You not allow to access this menu!.", success: false };
    }

    if (!isNull(body.access)) {
        let accessInvaild = await CONFIG.access.filter(x => (getRoleMenus.access[x] == true));

        if (accessInvaild.length == 0) {
            return { message: "You don't have any access on this menu!.", success: false };
        }

        let exist = accessInvaild.filter(x => body.access[x] == true);

        if (isEmpty(exist)) {
            return { message: `You don't have ${exist.map(x => `${x} `)} access on this menu!.`, success: false };
        }

    }


    let data = body;

    let fields = ['group_id', 'org_id', 'discipline_id', 'department_id', 'program_id', 'role_id', 'cdm_id', 'course_batch_id', 'section_id'];

    await fields.map(x => {
        if (checkUserInfo.userInfo[x]) {
            data[x] = checkUserInfo.userInfo[x]
        }
    });

    if (!isNull(getRoleMenus)) {
        return { message: "Menu was fetched !.", role_menu: getRoleMenus, body: data, success: true };
    }

}

module.exports.checkMenuByUser = checkMenuByUser;


const checkKodeMenu = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select role!.", success: false };
    }

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let err;

    let checkKodeRole, optionRole = {
        where: getQuery(body),
        include: [{
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
        }]
    };

    optionRole.where = {
        ...optionRole.where,
        role_id: body.roleId,
        menu_id: body.menuId
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

    [err, checkKodeRole] = await to(kode_role_menu_mapping.findOne(optionRole));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkKodeRole)) {
        return { message: "Kode role was not yet mapped on this menu!.", success: false };
    }

    if (!isNull(checkKodeRole)) {
        return { message: "Kode role was exists!", checkKodeRole, success: true };
    }
}

module.exports.checkKodeMenu = checkKodeMenu;

const getKodeMenuByRole = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select role!.", success: false };
    }

    let checkKodeRoleDetails = await checkKodeRole({ roleId: body.roleId });

    if (!checkKodeRoleDetails.success) {
        return { message: checkKodeRoleDetails.message, success: false };
    }

    let err;

    let checkKodeRoleMap, optionRole = {
        where: getQuery(body),
        include: [{
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
        role_id: body.roleId
    };

    [err, checkKodeRoleMap] = await to(kode_role_menu_mapping.findAll(optionRole));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(checkKodeRoleMap)) {
        return { message: `Menu are not yet mapped  for this ${checkKodeRoleDetails.checkRole.name} kode role!.`, success: false };
    }

    if (!isEmpty(checkKodeRoleMap)) {
        return { message: "Kode role mapped menu was exists!", menus: checkKodeRoleMap, success: true };
    }
}

module.exports.getKodeMenuByRole = getKodeMenuByRole;

const checkRolesByUser = async (body) => {

    let err;

    let checkUserInfo = await checkUserInf({ user_id: body.user_id });

    if (!checkUserInfo.success) {
        return { message: checkUserInfo.message, success: false };
    }

    let getRoleMenus, optionRoleMenus = {
        where: getQuery(body),
        include: [
            {
                model: menu,
                as: 'menuDetails',
                attributes: ['_id', 'name', 'label', 'user', 'ref_role_id']
            },
            {
                model: role,
                as: 'roleDetails',
                attributes: ['_id', 'name']
            },
            {
                model: kode_role,
                as: 'refRoleDetails',
                attributes: ['_id', 'name']
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
        optionRoleMenus = {
            ...optionRoleMenus,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRoleMenus = {
            ...optionRoleMenus,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    let getRole = await checkRole({ roleId: checkUserInfo.userInfo.role_id });

    if (!getRole.success) {
        return { message: getRole.message, success: false };
    }

    if (checkUserInfo.userInfo && checkUserInfo.userInfo.org_id) {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            org_id: checkUserInfo.userInfo.org_id,
            role_id: checkUserInfo.userInfo.role_id,
        }
    } else {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: checkUserInfo.userInfo.role_id,
        }
    }

    [err, getRoleMenus] = await to(role_menu_mapping.findAll(optionRoleMenus));

    if (err) {
        return { message: err, success: false }
    }

    if (isEmpty(getRoleMenus)) {
        return { message: "You not allow to access this menu!.", success: false };
    }

    if (!isEmpty(getRoleMenus)) {
        return { message: "Menu was fetched !.", role_menu: getRoleMenus, role: getRole.checkRole, success: true };
    }

}

module.exports.checkRolesByUser = checkRolesByUser;


const checkMenuAccess = async (body) => {

    let err;

    let checkUserInfo = await checkUserInf({ user_id: body.user_id });

    if (!checkUserInfo.success) {
        return { message: checkUserInfo.message, success: false };
    }

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let getRoleMenus, optionRoleMenus = {
        where: getQuery(body),
        include: [
            {
                model: menu,
                as: 'menuDetails',
                attributes: ['_id', 'name', 'label', 'user']
            },
            {
                model: role,
                as: 'roleDetails',
                attributes: ['_id', 'name']
            },
            {
                model: kode_role,
                as: 'refRoleDetails',
                attributes: ['_id', 'name']
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
        optionRoleMenus = {
            ...optionRoleMenus,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRoleMenus = {
            ...optionRoleMenus,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (checkUserInfo.userInfo && checkUserInfo.userInfo.org_id) {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            org_id: checkUserInfo.userInfo.org_id,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    } else {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    }

    [err, getRoleMenus] = await to(role_menu_mapping.findOne(optionRoleMenus));

    if (err) {
        return { message: err, success: false }
    }

    if (isNull(getRoleMenus)) {
        return { message: "You not allow to access this menu!.", success: false };
    }

    if (!isNull(body.access)) {
        let accessInvaild = await CONFIG.access.filter(x => (getRoleMenus.access[x] == true));

        if (accessInvaild.length == 0) {
            return { message: "You don't have any access on this menu!.", success: false };
        }

        let exist = accessInvaild.filter(x => body.access[x] == true);

        if (isEmpty(exist)) {
            return { message: `You don't have ${exist.map(x => `${x} `)} access on this menu!.`, success: false };
        }

    }


    let data = body.body;

    let fields = ['group_id', 'org_id', 'discipline_id', 'department_id', 'program_id', 'cdm_id', 'course_batch_id', 'section_id'];

    await fields.map(x => {
        if (checkUserInfo.userInfo[x]) {
            data[x] = checkUserInfo.userInfo[x]
        }
    });

    if (!isNull(getRoleMenus)) {
        return { message: "Menu was fetched !.", role_menu: getRoleMenus, body: data, success: true };
    }

}

module.exports.checkMenuAccess = checkMenuAccess;