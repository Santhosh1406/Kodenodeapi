const { user_data, organization, group } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, isEmail, isEmpty, isPhone, generatePassword, firstLetterCap, genrateUserName, isPhoneCountry, generateCode } = require('../service/util.service');
const { checkOrganization, checkMenuAccess } = require('./common');

module.exports.createGroup = async (req, res) => {
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

    let fields = ['org_id', 'no_branch', 'name'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 3) {
        return ReE(res, { message: "Organization Group Name must have more then 3 character!." }, HttpStatus.BAD_REQUEST)
    }

    let checkOrg, optionOrg = {
        where: {
            _id: body.org_id,
            is_active: true
        }
    };

    [err, checkOrg] = await to(organization.findOne(optionOrg));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkOrg)) {
        return { message: "Organization was not found!.", success: false };
    }

    if (checkOrg.is_block) {
        return { message: "Organziation was blocked!.", success: false };
    }

    let checkExistGroup, optionExistGroup = {
        where: {
            org_id: body.org_id,
            is_active: true
        }
    };

    [err, checkExistGroup] = await to(group.findOne(optionExistGroup));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkExistGroup)) {
        return ReE(res, { message: `This ${checkOrg.org_name} Organization Group was already exist!.` }, HttpStatus.BAD_REQUEST);
    }

    if (isNaN(body.no_branch)) {
        return ReE(res, { message: "Please enter vaild Organization branch count!." }, HttpStatus.BAD_REQUEST)
    }

    if (Number(body.no_branch) < 1) {
        return ReE(res, { message: `Organization branch count must have more then 1!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkGroupName, optionGroupName = {
        where: {
            name: firstLetterCap(String(body.name).trim()),
            is_active: true
        }
    };

    [err, checkGroupName] = await to(group.findOne(optionGroupName));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkGroupName)) {
        return ReE(res, { message: "Group name already exits!." }, HttpStatus.BAD_REQUEST);
    }

    let code;

    const data = async () => {

        code = generateCode(checkOrg.sortname, 8);

        if (String(code).length < 8) {
            data();
        } else {
            let checkOrgCode, orgCodeOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkOrgCode] = await to(group.findOne({
                where: orgCodeOption
            }));

            if (!isNull(checkOrgCode)) {
                data();
            }
        }
    };

    data();
    let createGroup, createGroupData = {
        org_id: body.org_id,
        code: code,
        name: firstLetterCap(String(body.name).trim()),
        no_branch: Number(body.no_branch),
        is_active: true,
        is_block: false,
        createdby: user._id,
        updatedby: user._id
    };

    [err, createGroup] = await to(group.create(createGroupData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createGroup)) {
        return ReE(res, { message: "Something went wrong to create organization group!." }, HttpStatus.BAD_REQUEST);
    }

    let updateOrganization, optionOrganization = {
        set: {
            group_id: createGroup._id,
            updatedby: user._id
        },
        where: {
            _id: createGroup.org_id,
            is_active: true,
            is_block: false
        }
    };

    [err, updateOrganization] = await to(organization.update(optionOrganization));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateOrganization) {
        return ReE(res, { message: "Something went wrong to update orgzanization!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createGroup) && updateOrganization) {
        return ReS(res, { message: "Organization group was created successfully!." }, HttpStatus.OK);
    }

}

module.exports.getAllGroup = async (req, res) => {

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

    let existGroups, optionGroup = {
        where: {
            is_active: true,
            is_block: false
        },
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

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionGroup.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionGroup.where = {
            is_active: true
        }
    }

    [err, existGroups] = await to(group.findAll(optionGroup));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(existGroups)) {
        return ReE(res, { message: "Organization groups was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(existGroups)) {
        return ReS(res, { message: "Organization groups was found!.", group: existGroups }, HttpStatus.OK);
    }

}

module.exports.getGroup = async (req, res) => {

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

    if (isNull(req.params.org_id)) {
        return ReE(res, { message: "Please select institution!." }, HttpStatus.BAD_REQUEST);
    }

    let err;

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
    }

    let existGroups, optionGroup = {
        where: {
            org_id: body.org_id,
            is_active: true,
            is_block: false
        },
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

    if (String(body.status).toLocaleLowerCase() == 'inactive') {
        optionGroup.where = {
            is_active: true,
            is_block: true
        }
    }

    if (String(body.status).toLocaleLowerCase() == 'all') {
        optionGroup.where = {
            is_active: true
        }
    }

    [err, existGroups] = await to(group.findAll(optionGroup));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(existGroups)) {
        return ReE(res, { message: "Organization groups was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(existGroups)) {
        return ReS(res, { message: "Organization groups was found!.", group: existGroups }, HttpStatus.OK);
    }

}

module.exports.mapGroupOrganization = async (req, res) => {
    let body = req.body;

    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let fields = ['org_id', 'no_branch', 'name'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrg, optionOrg = {
        where: {
            _id: body.org_id,
            is_active: true
        }
    };

    [err, checkOrg] = await to(organization.findOne(optionOrg));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkOrg)) {
        return { message: "Organization was not found!.", success: false };
    }

    if (checkOrg.is_block) {
        return { message: "Organziation was blocked!.", success: false };
    }


    let checkExistGroup, optionExistGroup = {
        where: {
            org_id: body.org_id,
            is_active: true
        }
    };

    [err, checkExistGroup] = await to(group.findOne(optionExistGroup));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkExistGroup)) {
        return ReE(res, { message: `This ${checkOrg.org_name} Organization Group was not exist!.` }, HttpStatus.BAD_REQUEST);
    }


    if (!isNull(checkOrg.group_id)) {
        if (checkOrg.group_id === checkExistGroup._id) {
            return ReE(res, { message: "Please edit something to update the organization group details!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let updateOrganization, optionOrganization = {
        set: {
            group_id: createGroup._id,
            updatedby: user._id
        },
        where: {
            _id: createGroup.org_id,
            is_active: true,
            is_block: false
        }
    };

    [err, updateOrganization] = await to(organization.update(optionOrganization));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!updateOrganization) {
        return ReE(res, { message: "Something went wrong to update orgzanization!." }, HttpStatus.BAD_REQUEST);
    }

    if (updateOrganization) {
        return ReS(res, { message: "Organization group was updated successfully!." }, HttpStatus.OK);
    }

}

const createGroupMethod = async (body) => {

    let err;

    let fields = ['org_id', 'no_branch', 'user_id', 'name'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return { message: `Please enter required fields ${inVaildFields}!.` };
    }

    let checkOrg, optionOrg = {
        where: {
            _id: body.org_id,
            is_active: true
        }
    };

    [err, checkOrg] = await to(organization.findOne(optionOrg));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkOrg)) {
        return { message: "Organization was not found!.", success: false };
    }

    if (checkOrg.is_block) {
        return { message: "Organziation was blocked!.", success: false };
    }

    let checkExistGroup, optionExistGroup = {
        where: {
            org_id: body.org_id,
            is_active: true,
        }
    };
    [err, checkExistGroup] = await to(group.findOne(optionExistGroup));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkExistGroup)) {
        return { message: `This ${checkOrg.org_name} Organization Group was already exist!.`, success: false };
    }

    if (isNaN(body.no_branch)) {
        return { message: "Please enter vaild Organization branch count!.", success: false };
    }

    if (Number(body.no_branch) < 1) {
        return { message: `Organization branch count must have more then 1!.`, success: false };
    }

    if (String(body.name).length < 3) {
        return { message: `Organization Group Name must have more then 3 character!.`, success: false };
    }


    let checkGroupName, optionGroupName = {
        where: {
            name: firstLetterCap(String(body.name).trim()),
            is_active: true
        }
    };

    [err, checkGroupName] = await to(group.findOne(optionGroupName));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkGroupName)) {
        return { message: "Group name already exits!.", success: false };
    }

    let code;

    const data = async () => {

        code = generateCode(checkOrg.sortname, 5);

        if (String(code).length < 8) {
            data();
        } else {
            let checkOrgCode, orgCodeOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkOrgCode] = await to(group.findOne({
                where: orgCodeOption
            }));

            if (!isNull(checkOrgCode)) {
                data();
            }
        }
    };

    data();
    let createGroup, createGroupData = {
        org_id: body.org_id,
        code: code,
        no_branch: Number(body.no_branch),
        name: firstLetterCap(String(body.name).trim()),
        is_active: true,
        is_block: false,
        createdby: body.user_id,
        updatedby: body.user_id
    };

    [err, createGroup] = await to(group.create(createGroupData));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(createGroup)) {
        return { message: "Something went wrong to create organization group!.", success: false };
    }

    if (!isNull(createGroup)) {
        return { message: "Organization group was created successfully!.", success: true, createGroup };
    }
}

module.exports.createGroupMethod = createGroupMethod;

const checkGroup = async (body) => {

    if (isNull(body.group_id)) {
        return { message: "Please select group details!.", success: false };
    }

    let checkGroupDetails, optionGroup = {
        where: {
            _id: body.group_id,
            is_active: true
        }
    };


    if (!isNull(body.org_id)) {
        let organizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!organizationDetails.success) {
            return { message: "Please select vaild organization details!.", success: false };
        }

        optionGroup.where = {
            ...optionGroup.where,
            org_id: body.org_id
        }
    }

    [err, checkGroupDetails] = await to(group.findOne(optionGroup))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkGroupDetails)) {
        return { message: "Please select group details!.", success: false };
    }

    if (checkGroupDetails.is_block) {
        return { message: "Group details was blocked!.", success: false };
    }

    if (!isNull(checkGroupDetails)) {
        return { message: "Group was fetched!.", groupDetails: checkGroupDetails, success: true };
    }
}

module.exports.checkGroup = checkGroup;