const { question_type, question_bank, question_bank_type, user_data, question } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { isNull, ReE, to, ReS, isEmpty, } = require('../service/util.service');
const { checkMenuAccess } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkQuestionTypeValue } = require('./question_type');
const { checkQuestionBank } = require('./question_bank');


module.exports.getAllQuestionBankType = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message },HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let questionBankType, optionQuestionBankType = {
        where: getQuery(body),
        include: [
            {
                model: question_bank,
                as: 'questionBankId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
        optionQuestionBankType = {
            ...optionQuestionBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_bank_id)) {
        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.question_bank_type_id)) {
        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_bank_type_id: body.question_bank_type_id
        };
    }


    [err, questionBankType] = await to(question_bank_type.findAll(optionQuestionBankType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(questionBankType)) {
        return ReE(res, { message: "Question Bank's Types  was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(questionBankType)) {
        return ReS(res, { message: "Question Bank's Types was fatched!.", questionBankType }, HttpStatus.OK);
    }

}

module.exports.getQuestionBankType = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message },HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let questionBankType, optionQuestionBankType = {
        where: getQuery(body),
        include: [
            {
                model: question_bank,
                as: 'questionBankId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
        optionQuestionBankType = {
            ...optionQuestionBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.question_bank_type_id) || !IsValidUUIDV4(req.params.question_bank_type_id)) {
        return ReE(res, { message: "Please select vaild question bank's types!." }, HttpStatus.BAD_REQUEST);
    }

    optionQuestionBankType.where = {
        ...optionQuestionBankType.where,
        _id: req.params.question_bank_type_id
    };

    if (!isNull(body.question_bank_id)) {
        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, questionBankType] = await to(question_bank_type.findOne(optionQuestionBankType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(questionBankType)) {
        return ReE(res, { message: "Question Bank's Types  was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(questionBankType)) {
        return ReS(res, { message: "Question Bank's Types was fatched!.", questionBankType }, HttpStatus.OK);
    }

}

module.exports.updateQuestionBankType = async (req, res) => {
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

    if (isNull(body.question_bank_type_id) || !IsValidUUIDV4(body.question_bank_type_id)) {
        return ReE(res, { message: "Please select vaild question bank's type details!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['active', 'count'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated Question bank's type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.question_bank_type_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    let checkQuestionBankTypeDetails = await checkQuestionBankType({ question_bank_type_id: body.question_bank_type_id, status: 'all' });

    if (!checkQuestionBankTypeDetails.success) {
        return ReE(res, { message: checkQuestionBankTypeDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkQuestionBankTypeDetails.questionBankType.is_block == status) {
            return ReE(res, { message: `Question bank type was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { questionBankType } = checkQuestionBankTypeDetails;

        let updateAbleFields = existFields.filter(x => body[x] != questionBankType[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update question bank's type!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('count')) {

            if (Number(body.count) === Number(questionBankType.count)) {
                return ReE(res, { message: "Please edit question bank type count to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNaN(body.count) || Number(body.count) < 0 || Number(body.count) > CONFIG.question.questionMax) {
                return ReE(res, { message: `Please enter vaild question count must within 0 to ${CONFIG.question.questionMax}!.` }, HttpStatus.BAD_REQUEST);
            }

            let checkQuestion, optionQuestions = {
                where: {
                    question_bank_id: questionBankType.question_bank_id,
                    question_type_id: questionBankType.question_type_id,
                    is_active: true
                }
            };

            [err, checkQuestion] = await to(question.findAll(optionQuestions));

            console.log(checkQuestion, err);

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (!isEmpty(checkQuestion)) {
                if (Number(checkQuestion.length) > Number(body.count)) {
                    return ReE(res, { message: `Question Bank type count must greater then already created questions ${checkQuestion.length}!.` }, HttpStatus.BAD_REQUEST);
                }
            }

            updatedData.set = {
                ...updatedData.set,
                count: Number(body.count)
            }
        }

    }


    let update;

    [err, update] = await to(question_bank_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update question bank's type!." }, HttpStatus.BAD_REQUEST);
    }

    let updateQ;
    
    if (updatedData.set.count) {
        let getQuestionBankTypeDetails = await getQuestionBankTypes({ question_bank_id: checkQuestionBankTypeDetails.questionBankType.question_bank_id });

        total_count = 0;

        if (getQuestionBankTypeDetails.success) {
            let { questionBankType } = getQuestionBankTypeDetails;

            console.log(questionBankType.map(x => x.count));
            questionBankType.map(x => total_count = total_count + Number(x.count));
        }

        let updateData = {
            where: {
                _id: checkQuestionBankTypeDetails.questionBankType.question_bank_id,
                is_active: true,
                is_block: false
            },
            set: {
                total_count: total_count,
                updatedby: user._id
            }
        };

        [err, updateQ] = await to(question_bank.update(updateData.set, { where: updateData.where }));

        if (err) {
            return ReE(res, { message: "Question Bank's type was added but " + err }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(updateQ)) {
            return ReE(res, { message: "Question Bank's type was added but Something went wrong to update total count!." }, HttpStatus.BAD_REQUEST);
        }
    }
    if (!isNull(update) || (updatedData.set.count && isNull(updateQ))) {
        return ReS(res, { message: "Question bank's type was updated!." }, HttpStatus.OK);
    }
}

module.exports.addQuestionBankType = async (req, res) => {
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

    if (isNull(body.question_bank_id) || !IsValidUUIDV4(body.question_bank_id)) {
        return ReE(res, { message: "Please select vaild question bank details!" }, HttpStatus.BAD_REQUEST);
    }

    let fields = ['questions'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to add Question bank's type!.` }, HttpStatus.BAD_REQUEST);
    }

    let create;

    let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id, status: 'all' });

    if (!checkQuestionBankDetails.success) {
        return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.questions)) {
        return ReE(res, { message: "Please select question bank's eligble question types!." }, HttpStatus.BAD_REQUEST);
    }

    let errQuestion = [], vaildQuestion = [], vaildIds = [], total_count = 0;

    for (let index = 0; index < body.questions.length; index++) {
        const element = body.questions[index];

        const isDuplicate = vaildIds.includes(element.question_type_id);

        if (isDuplicate) {

            errQuestion.push({ ...element, message: "Please remove dublicate question type details!." });

        } else if (isNull(element.question_type_id)) {

            errQuestion.push({ ...element, message: "Please select vaild question type details!." }, HttpStatus.BAD_REQUEST);

        } else {

            let checkQuestionBankTypeDetails = await checkQuestionBankType({ question_bank_id: body.question_bank_id, question_type_id: element.question_type_id });

            if (checkQuestionBankTypeDetails.success) {
                errQuestion.push({ ...element, message: `Please remove already added question bank's type details!.` });
            } else {

                let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: element.question_type_id });

                if (!checkQuestionTypeDetails.success) {
                    errQuestion.push({ ...element, message: checkDepartmentDetails.message });
                }

                if (checkQuestionTypeDetails.success) {
                    if (isNull(element.count) || isNaN(element.count) || Number(element.count) < 0 || Number(element.count) > CONFIG.question.questionMax) {
                        errQuestion.push({ ...element, message: `Please enter vaild question count must within 0 to ${CONFIG.question.questionMax}!.` })
                    } else {
                        vaildQuestion.push({
                            question_type_id: element.question_type_id,
                            count: Number(element.count),
                            question_bank_id: body.question_bank_id,
                            is_active: true,
                            is_block: false,
                            user_id: user._id,
                            createdby: user._id,
                            updatedby: user._id
                        });
                        total_count = total_count + Number(element.count);
                        vaildIds.push(element.question_type_id);
                    }
                }
            }
        }

    }

    if (!isEmpty(errQuestion)) {
        return ReE(res, { message: errQuestion }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildQuestion)) {
        return ReE(res, { message: "No vaild question type data to add  into question bank's" }, HttpStatus.BAD_REQUEST);
    }

    [err, create] = await to(question_bank_type.bulkCreate(vaildQuestion));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(create) || isEmpty(create)) {
        return ReE(res, { message: "Something went wrong to add question type to bank!." }, HttpStatus.BAD_REQUEST);
    }

    let getQuestionBankTypeDetails = await getQuestionBankType({ question_bank_id: body.question_bank_id });

    total_count = 0;

    if (getQuestionBankTypeDetails.success) {
        let { questionBankType } = getQuestionBankTypeDetails;

        console.log(questionBankType.map(x => x.count));
        questionBankType.map(x => total_count = total_count + Number(x.count));
    }

    let update, updateData = {
        where: {
            _id: body.question_bank_id,
            is_active: true,
            is_block: false
        },
        set: {
            total_count: total_count,
            updatedby: user._id
        }
    };

    [err, update] = await to(question_bank.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, { message: "Question Bank's type was added but " + err }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Question Bank's type was added but Something went wrong to update total count!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(update)) {
        return ReS(res, { message: "Question Bnak's type was added!." }, HttpStatus.OK)
    }

}

const checkQuestionBankType = async (body) => {

    let questionBankType, optionQuestionBankType = {
        where: getQuery(body),
        include: [
            {
                model: question_bank,
                as: 'questionBankId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_bank_type_id)) {
        if (!IsValidUUIDV4(body.question_bank_type_id)) {
            return { message: "Please select vaild question bank's types!.", success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            _id: body.question_bank_type_id
        };
    }

    if (!isNull(body.question_bank_id)) {
        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return { message: checkQuestionBankDetails.message, success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, questionBankType] = await to(question_bank_type.findOne(optionQuestionBankType));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(questionBankType)) {
        return { message: "Question Bank's Types  was not found!.", success: false };
    }

    if (!isNull(questionBankType)) {
        return { message: "Question Bank's Types was fatched!.", questionBankType, success: true };
    }
}

module.exports.checkQuestionBankType = checkQuestionBankType;

const getQuestionBankTypes = async (body) => {

    let questionBankType, optionQuestionBankType = {
        where: getQuery(body),
        include: [
            {
                model: question_bank,
                as: 'questionBankId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
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
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBankType = {
            ...optionQuestionBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_bank_type_id)) {
        if (!IsValidUUIDV4(body.question_bank_type_id)) {
            return { message: "Please select vaild question bank's types!.", success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            _id: body.question_bank_type_id
        };
    }

    if (!isNull(body.question_bank_id)) {
        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return { message: checkQuestionBankDetails.message, success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionQuestionBankType.where = {
            ...optionQuestionBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, questionBankType] = await to(question_bank_type.findAll(optionQuestionBankType));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(questionBankType)) {
        return { message: "Question Bank's Types  was not found!.", success: false };
    }

    if (!isEmpty(questionBankType)) {
        return { message: "Question Bank's Types was fatched!.", questionBankType, success: true };
    }
}

module.exports.getQuestionBankTypes=getQuestionBankTypes;