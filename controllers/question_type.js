const { question_type, user_data, organization } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap } = require('../service/util.service');
const { checkMenuAccess, checkOrganization } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');

module.exports.createQuestionType = async (req, res) => {
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

    let err, fields = ['name', 'option', 'org_id','answer'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required vaild ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).trim().length < 3) {
        return ReE(res, { message: "Please enter vaild quetion type name with more then 2 character!" }, HttpStatus.BAD_REQUEST);
    }

    let checkName = await checkQuestionTypeValue({ name: body.name, status: 'all' });

    if (checkName.success) {
        return ReE(res, { message: "Question Type was already exists!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.boolean.includes(body.option)) {
        return ReE(res, { message: "Please select vaild question type choose details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.boolean.includes(body.answer)) {
        return ReE(res, { message: "Please select vaild question type currect answer details!." }, HttpStatus.BAD_REQUEST);
    }

    let create, createData = {
        name: firstCap(String(body.name).trim()),
        org_id: body.org_id,
        option: body.option,
        answer: body.answer,
        createdby: user._id,
        is_active: true,
        is_block: false
    }

    if (body.option === CONFIG.boolean[0]) {
        if (isNaN(body.option_length) || isNull(body.option_length)) {
            return ReE(res, { message: "Please enter vaild question type choose limit!." }, HttpStatus.BAD_REQUEST);
        }

        if (Number(body.option_length) < 2) {
            return ReE(res, { message: "Question Type choose limit must have more then 1!" }, HttpStatus.BAD_REQUEST);
        }

        createData = {
            ...createData,
            option_length: Number(body.option_length)
        };
    }

    [err, create] = await to(question_type.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong to create question type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(create)) {
        return ReS(res, { message: "Question Type was created!." }, HttpStatus.OK);
    }

}

module.exports.getAllQuestionType = async (req, res) => {
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

    let questionTypes, optionQuestionType = {
        where: getQuery(body),
        includes: [{
            model: organization,
            as: "orgId",
            attributes: ['_id', 'org_name', 'org_id']
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
        optionQuestionType = {
            ...optionQuestionType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionType = {
            ...optionQuestionType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.org_id)) {
        let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionType.where = {
            ...optionQuestionType.where,
            org_id: body.org_id
        };

    }

    [err, questionTypes] = await to(question_type.findAll(optionQuestionType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(questionTypes)) {
        return ReE(res, { message: "Question type was not exist!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(questionTypes)) {
        return ReS(res, { message: "Question type was fetched!.", questionTypes }, HttpStatus.OK)
    }
}

module.exports.getQuestionType = async (req, res) => {
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

    let questionType, optionQuestionType = {
        where: getQuery(body),
        includes: [{
            model: organization,
            as: "orgId",
            attributes: ['_id', 'org_name', 'org_id']
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
        optionQuestionType = {
            ...optionQuestionType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionType = {
            ...optionQuestionType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.question_type_id) || !IsValidUUIDV4(req.params.question_type_id)) {
        return ReE(res, { message: "Please select vaild question type details!" }, HttpStatus.BAD_REQUEST);
    }

    optionQuestionType.where = {
        ...optionQuestionType.where,
        _id: req.params.question_type_id
    };

    if (!isNull(body.org_id)) {
        let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionType.where = {
            ...optionQuestionType.where,
            org_id: body.org_id
        };

    }

    [err, questionType] = await to(question_type.findOne(optionQuestionType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(questionType)) {
        return ReE(res, { message: "Question type was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(questionType)) {
        return ReS(res, { message: "Question type was fetched!.", questionType }, HttpStatus.OK);
    }
}

module.exports.updateQuestionType = async (req, res) => {

    const user = req.user;
    let body = req.body;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (isNull(body.question_type_id) || !IsValidUUIDV4(body.question_type_id)) {
        return ReE(res, { message: "Please select vaild question type details!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['name', 'active', 'answer'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated Question type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.question_type_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id, status: 'all' });

    if (!checkQuestionTypeDetails.success) {
        return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkQuestionTypeDetails.questionType.is_block == status) {
            return ReE(res, { message: `Question type was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { questionType } = checkQuestionTypeDetails;

        let updateAbleFields = existFields.filter(x => body[x] != questionType[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update question type!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('name')) {

            if (body.name === questionType.name) {
                return ReE(res, { message: "Please edit question type name to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.name).length < 3) {
                return ReE(res, { message: "Please enter vaild quetion type name with more then 2 character!" }, HttpStatus.BAD_REQUEST);
            }

            let checkName = await checkQuestionTypeValue({ name: body.name, status: 'all' });

            if (checkName.success) {
                return ReE(res, { message: "Question Type was already exists!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: firstCap(String(body.name).trim())
            }
        }

        if (updateAbleFields.includes('answer')) {

            if (!CONFIG.boolean.includes(body.answer)) {
                return ReE(res, { message: "Please select vaild question type currect answer details!." }, HttpStatus.BAD_REQUEST);
            }

            if (body.answer === questionType.answer) {
                return ReE(res, { message: "Please edit question type currect answer to update!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                answer: body.answer
            }
        }
    }

    let update;

    [err, update] = await to(question_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update question type!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(update)) {
        return ReS(res, { message: "Question Type was updated!." }, HttpStatus.OK);
    }

}

const checkQuestionTypeValue = async (body) => {

    let questionType, optionQuestionType = {
        where: getQuery(body)
    }

    if (!isNull(body.question_type_id)) {
        if (!IsValidUUIDV4(body.question_type_id)) {
            return { message: "Please select vaild question type details!.", success: false };
        }

        optionQuestionType.where = {
            ...optionQuestionType.where,
            _id: body.question_type_id
        }
    }

    if (!isNull(body.name)) {
        if (String(body.name).length < 3) {
            return { message: "Please enter vaild quetion type name with more then 2 character!", success: false };
        }

        optionQuestionType.where = {
            ...optionQuestionType.where,
            name: firstCap(String(body.name))
        }
    }

    [err, questionType] = await to(question_type.findOne(optionQuestionType));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(questionType)) {
        return { message: "Question Type was not exist!.", success: false };
    }

    if (!isNull(questionType)) {
        return { message: "Question Type was exist!.", questionType, success: true };
    }

}

module.exports.checkQuestionTypeValue = checkQuestionTypeValue;