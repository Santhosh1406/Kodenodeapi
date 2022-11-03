const { assignment_bank, assignment_bank_type, discipline, department, organization, program, user_data, subject, question_topic, section, user_info, assignment_question, question_type, question_bank_type, question, question_bank } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, generateCode, generateCodeName } = require('../service/util.service');
const { checkAssignmentBank, checkAssignmentQuestion } = require('./assignment_bank');
const { getQuery, IsValidUUIDV4 } = require('../service/validation');
const { checkQuestionBank } = require('./question_bank');
const { checkMenuAccess } = require('./common');
const { getAssignmentQuestionsMethod } = require('./assignment_question');

module.exports.updateAssignmentBankType = async (req, res) => {
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

    if (isNull(body.assignment_bank_id)) {
        return ReE(res, { message: "Please select assignment bank detail!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.assignment_bank_type_id)) {
        return ReE(res, { message: "Please select assignment bank type details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

    if (!checkAssignmentBankDetails.success) {
        return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkAssignmentQuestionTypeDetails = await checkAssignmentBankType({ assignment_bank_id: body.assignment_bank_id, assignment_bank_type_id: body.assignment_bank_type_id });

    if (!checkAssignmentQuestionTypeDetails.success) {
        return ReE(res, { message: checkAssignmentQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let err;

    let fields = ['active', 'count', 'mark'];

    let existFields = await fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: "Please edit something to update assignment bank type!." }, HttpStatus.BAD_REQUEST);
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

    let assignment_question_type = {}, questionTypes = [], errQuestion = [], vaildQuestion = [];

    if (!isNull(body.active)) {

        let fDate = moment(checkAssignmentBankDetails.assignmentBank.from);

        let fDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes();

        if (fDuration <= 30) {
            let message = fDuration < 0 ? "Sorry you can't update already started assignments!." : "You can update assignment start time before 30 mins!."
            return ReE(res, { message: message }, HttpStatus.BAD_REQUEST);
        }

        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkAssignmentQuestionTypeDetails.assignmentBankType.is_block == status) {
            return ReE(res, { message: `Assignment bank's question type was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { assignmentBankType } = checkAssignmentQuestionTypeDetails;

        let updateAbleFields = await existFields.filter(x => body[x] != assignmentBankType[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update assignment bank's type details!." }, HttpStatus.BAD_REQUEST);
        }

        let fDate = moment(checkAssignmentBankDetails.assignmentBank.from);

        let fDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes();


        if (fDuration <= 30) {
            let message = fDuration < 0 ? "Sorry you can't update already started assignments!." : "You can update assignment start time before 30 mins!."
            return ReE(res, { message: message }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('count')) {

            if (assignmentBankType.count === Number(body.count)) {
                return ReE(res, { message: "Please edit assignment bank's question type count to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNaN(body.count) || Number(body.count) < 0 || Number(body.count) > CONFIG.question.questionMax) {
                return ReE(res, { message: `Please enter vaild assignment bank's question count must within 0 to ${CONFIG.question.questionMax}!.` }, HttpStatus.BAD_REQUEST);
            }

            let ids = assignmentBankType.question_bank_id.map(x => x._id);

            console.log(ids);

            let checkQuestion, optionQuestions = {
                where: {
                    question_bank_id: { [Op.in]: ids },
                    question_type_id: assignmentBankType.question_type_id,
                    is_active: true
                }
            };

            [err, checkQuestion] = await to(question.findAll(optionQuestions));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (isEmpty(checkQuestion)) {
                return ReE(res, { message: "Assignment question was empty!." }, HttpStatus.BAD_REQUEST);
            }

            if (!isEmpty(checkQuestion)) {
                if (checkQuestion.length < Number(body.count)) {
                    return ReE(res, { message: `Assignment Bank type count must less then or equal available questions ${checkQuestion.length}!.` }, HttpStatus.BAD_REQUEST);
                }
            }

            if (checkAssignmentBankDetails.assignmentBank.random === CONFIG.boolean[1]) {

                let assignmentQuestion, optionAssignmentQuestion = {
                    where: {
                        assignment_bank_id: checkAssignmentBankDetails.assignmentBank._id,
                        question_type_id: assignmentBankType.question_type_id,
                        is_active: true,
                        is_block: false
                    }
                };

                [err, assignmentQuestion] = await to(assignment_question.findAll(optionAssignmentQuestion));

                if (err) {
                    return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
                }

                if (assignmentQuestion.length > Number(body.count)) {
                    return ReE(res, { message: `Assignment Bank type count must greater then already created  questions ${assignmentQuestion.length}!.` }, HttpStatus.BAD_REQUEST);
                }

                if (!Array.isArray(body.questions)) {
                    return ReE(res, { message: "Please select assignment questions!." }, HttpStatus.BAD_REQUEST);
                }

                let vaildQuestionBankType = [assignmentBankType];

                await vaildQuestionBankType.map(x => {
                    questionTypes.push(x.question_type_id);
                    assignment_question_type = { ...assignment_question_type, [x.question_type_id]: [] };
                });

                let field = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id', 'cdm_id', 'course_batch_id', 'batch_sem_id',];

                let questionData = {};

                field.map(x => questionData[x] = checkAssignmentBankDetails.assignmentBank[x]);

                for (let index = 0; index < body.questions.length; index++) {
                    const element = body.questions[index];

                    let getAssignmentQuestionsDetails = await getAssignmentQuestionsMethod({ question_id: element, assignment_bank_id: body.assignment_bank_id });

                    if (getAssignmentQuestionsDetails.success) {
                        errQuestion.push({ message: "Please remove already added questions!." })
                    } else {
                        let checkAssignmentQuestionDetails = await checkAssignmentQuestion({ question_id: element, vaildQuestionBankType, vaildQuestionBank: assignmentBankType.question_bank_id, vaildTopic: checkAssignmentBankDetails.assignmentBank.topic_id, questionTypes, assignment_question_type });

                        let obj = checkAssignmentQuestionDetails.questionObj ? checkAssignmentQuestionDetails.questionObj : {};
                        if (!checkAssignmentQuestionDetails.success) {
                            errQuestion.push({ message: checkAssignmentQuestionDetails.message })
                        } else {
                            vaildQuestion.push({
                                ...questionData,
                                ...obj,
                                user_id: user._id,
                                createdby: user._id,
                                updatedby: user._id
                            });
                        }
                    }
                }

                if (!isEmpty(errQuestion)) {
                    return ReE(res, { message: errQuestion }, HttpStatus.BAD_REQUEST);
                }

                if (isEmpty(vaildQuestion) || vaildQuestion.length != Number(body.count)) {
                    return ReE(res, { message: `Assignment total question count was must equal to ${body.count} But vaild question count was ${vaildQuestion.length}!` }, HttpStatus.BAD_REQUEST);
                }
            }

            updatedData.set = {
                ...updatedData.set,
                count: Number(body.count)
            };

        }

        if (updateAbleFields.includes('mark')) {

            if (checkAssignmentBankDetails.assignmentBank.mark !== CONFIG.boolean[0]) {
                return ReE(res, { message: "Assignment bank mark details was not in active, please check!." }, HttpStatus.BAD_REQUEST);
            }

            if ((isNull(body.mark) || isNaN(body.mark) || Number(body.mark) <= 0 || Number(body.mark) >= 100)) {
                return { message: `Please select vaild assignment bank's type mark within 1 to 100!.`, success: false };
            }

            updatedData.set = {
                ...updatedData.set,
                mark: Number(body.mark)
            };

        }

    }

    let update;

    [err, update] = await to(assignment_bank_type.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update assignment bank's type!." }, HttpStatus.BAD_REQUEST);
    }

    let updateQ, message = "Assignment bank's type was updated!.";

    if (updatedData.set.count) {

        if (checkAssignmentBankDetails.assignmentBank.mark.random == CONFIG.boolean[1]) {

            let createQuestion, optionQuestion = [];

            await vaildQuestion.map(x => optionQuestion.push({ ...x, assignment_bank_id: create._id }));

            [err, createQuestion] = await to(assignment_question.bulkCreate(optionQuestion));

            if (err) {
                message = message + err;
            }

            if (isNull(createQuestion) || isEmpty(createQuestion)) {
                return ReE(res, { message: message + " but Something went wrong to create assignment questions details!." }, HttpStatus.BAD_REQUEST);
            }

        }

        let getQuestionBankTypeDetails = await getAssignmentBankTypes({ assignment_bank_id: checkAssignmentQuestionTypeDetails.assignmentBankType.assignment_bank_id });

        let total_count = 0, total_mark = 0;

        if (getQuestionBankTypeDetails.success) {
            let { assignmentBankTypes } = getQuestionBankTypeDetails;

            assignmentBankTypes.map(x => {
                total_count = total_count + Number(x.count);
                total_mark = total_mark + (Number(x.count) * Number(x.mark));
            });
        }

        let updateData = {
            where: {
                _id: checkAssignmentQuestionTypeDetails.assignmentBankType.assignment_bank_id,
                is_active: true,
                is_block: false
            },
            set: {
                total_count: total_count,
                total_mark: checkAssignmentBankDetails.assignmentBank.mark ? total_mark : 0,
                updatedby: user._id
            }
        };

        [err, updateQ] = await to(assignment_bank.update(updateData.set, { where: updateData.where }));

        if (err) {
            return ReE(res, { message: message + err }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(updateQ)) {
            return ReE(res, { message: message + " but Something went wrong to update total count!." }, HttpStatus.BAD_REQUEST);
        }
    }
    if (!isNull(update) || (updatedData.set.count && isNull(updateQ))) {
        return ReS(res, { message: message }, HttpStatus.OK);
    }

}

module.exports.getAllAssignmentBankType = async (req, res) => {
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


    let assignmentBankTypes, optionAssignmentBankType = {
        where: getQuery(body),
        include: [
            {
                model: assignment_bank,
                as: 'assignmentBankId'
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
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    if (!isNull(body.assignment_bank_type_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_type_id)) {
            return ReE(res, { message: "Please select vaild question bank's types!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            _id: body.assignment_bank_type_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_id)) {
            return ReE(res, { message: "Please select vaild assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
        }

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        if (!IsValidUUIDV4(body.question_bank_id) && !Array.isArray(body.question_bank_id)) {
            return ReE(res, { message: 'Please select vaild question bank details!' }, HttpStatus.BAD_REQUEST);
        }

        let questionBankId;

        if (Array.isArray(body.question_bank_id)) {
            questionBankId = body.question_bank_id
        } else {
            questionBankId = [body.question_bank_id]
        }

        let errors = [];

        for (let index = 0; index < questionBankId.length; index++) {
            const element = questionBankId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild question bank details!.');
            }

            let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element });

            if (!checkQuestionBankDetails.success) {
                errors.push(checkQuestionBankDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return ReE(res, { message: errors, }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message, }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, assignmentBankTypes] = await to(assignment_bank_type.findAll(optionAssignmentBankType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(assignmentBankTypes)) {
        return ReE(res, { message: "Assignment Bank's Types  was not found!." }, HttpStatus.BAD_REQUEST);
    }


    let questionType = [];

    for (var i = 0; i < assignmentBankTypes.length; i++) {
        let x = assignmentBankTypes[i];

        let array, option = {
            where: {
                _id: { [Op.in]: x.question_bank_id },
                is_active: true
            }
        };

        [err, array] = await to(question_bank.findAll(option));

        if (!isEmpty(array)) {
            x.setDataValue("question_bank_id", array)
        }

        questionType.push(x)
    }

    if (!isEmpty(questionType)) {
        return ReS(res, { message: "Assignment Bank's Types was fatched!.", assignmentBankTypes: questionType }, HttpStatus.OK);
    };
}

module.exports.getAssignmentBankType = async (req, res) => {
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

    let assignmentBankType, optionAssignmentBankType = {
        where: getQuery(body),
        include: [
            {
                model: assignment_bank,
                as: 'assignmentBankId'
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
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.assignment_bank_type_id)) {
        return ReE(res, { message: "Please select question bank's types!." }, HttpStatus.BAD_REQUEST);
    }

    if (!IsValidUUIDV4(req.params.assignment_bank_type_id)) {
        return ReE(res, { message: "Please select vaild question bank's types!." }, HttpStatus.BAD_REQUEST);
    }

    optionAssignmentBankType.where = {
        ...optionAssignmentBankType.where,
        _id: req.params.assignment_bank_type_id
    };


    if (!isNull(body.assignment_bank_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_id)) {
            return ReE(res, { message: "Please select vaild assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
        }

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        if (!IsValidUUIDV4(body.question_bank_id) && !Array.isArray(body.question_bank_id)) {
            return ReE(res, { message: 'Please select vaild question bank details!' }, HttpStatus.BAD_REQUEST);
        }

        let questionBankId;

        if (Array.isArray(body.question_bank_id)) {
            questionBankId = body.question_bank_id
        } else {
            questionBankId = [body.question_bank_id]
        }

        let errors = [];

        for (let index = 0; index < questionBankId.length; index++) {
            const element = questionBankId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild question bank details!.');
            }

            let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element });

            if (!checkQuestionBankDetails.success) {
                errors.push(checkQuestionBankDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return ReE(res, { message: errors, }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message, }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, assignmentBankType] = await to(assignment_bank_type.findOne(optionAssignmentBankType));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(assignmentBankType)) {
        return ReE(res, { message: "Assignment Bank's Types  was not found!." }, HttpStatus.BAD_REQUEST);
    }


    let questionType;
    let x = assignmentBankType;

    let array, option = {
        where: {
            _id: { [Op.in]: x.question_bank_id },
            is_active: true
        }
    };

    [err, array] = await to(question_bank.findAll(option));

    if (!isEmpty(array)) {
        x.setDataValue("question_bank_id", array)
    }

    questionType = s;

    if (!isNull(questionType)) {
        return ReS(res, { message: "Assignment Bank's Types was fatched!.", assignmentBankType: questionType }, HttpStatus.OK);
    }

}

const checkAssignmentBankType = async (body) => {

    let assignmentBankTypes, optionAssignmentBankType = {
        where: getQuery(body),
        include: [
            {
                model: assignment_bank,
                as: 'assignmentBankId'
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
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_bank_type_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_type_id)) {
            return { message: "Please select vaild question bank's types!.", success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            _id: body.assignment_bank_type_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        if (!IsValidUUIDV4(body.question_bank_id) && !Array.isArray(body.question_bank_id)) {
            return { message: 'Please select vaild question bank details!', success: false };
        }

        let questionBankId;

        if (Array.isArray(body.question_bank_id)) {
            questionBankId = body.question_bank_id
        } else {
            questionBankId = [body.question_bank_id]
        }

        let errors = [];

        for (let index = 0; index < questionBankId.length; index++) {
            const element = questionBankId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild question bank details!.');
            }

            let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element });

            if (!checkQuestionBankDetails.success) {
                errors.push(checkQuestionBankDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, assignmentBankTypes] = await to(assignment_bank_type.findOne(optionAssignmentBankType));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(assignmentBankTypes)) {
        return { message: "Assignment Bank's Types  was not found!.", success: false };
    }


    let questionType;

    let x = assignmentBankTypes;

    let array, option = {
        where: {
            _id: { [Op.in]: x.question_bank_id },
            is_active: true
        }
    };

    [err, array] = await to(question_bank.findAll(option));

    if (!isEmpty(array)) {
        x.setDataValue("question_bank_id", array)
    }

    questionType = (x);

    if (!isNull(questionType)) {
        return { message: "Assignment Bank's Types was fatched!.", assignmentBankType: questionType, success: true };
    }
}

const getAssignmentBankTypes = async (body) => {

    let assignmentBankTypes, optionAssignmentBankType = {
        where: getQuery(body),
        include: [
            {
                model: assignment_bank,
                as: 'assignmentBankId'
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
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBankType = {
            ...optionAssignmentBankType,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_bank_type_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_type_id)) {
            return { message: "Please select vaild question bank's types!.", success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            _id: body.assignment_bank_type_id
        };
    }


    if (!isNull(body.assignment_bank_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_id)) {
            return ReE(res, { message: "Please select vaild assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
        }

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return { message: checkAssignmentBankDetails.message, success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        if (!IsValidUUIDV4(body.question_bank_id) && !Array.isArray(body.question_bank_id)) {
            return { message: 'Please select vaild question bank details!', success: false };
        }

        let questionBankId;

        if (Array.isArray(body.question_bank_id)) {
            questionBankId = body.question_bank_id
        } else {
            questionBankId = [body.question_bank_id]
        }

        let errors = [];

        for (let index = 0; index < questionBankId.length; index++) {
            const element = questionBankId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild question bank details!.');
            }

            let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element });

            if (!checkQuestionBankDetails.success) {
                errors.push(checkQuestionBankDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.question_type_id)) {
        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionAssignmentBankType.where = {
            ...optionAssignmentBankType.where,
            question_type_id: body.question_type_id
        };
    }


    [err, assignmentBankTypes] = await to(assignment_bank_type.findAll(optionAssignmentBankType));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(assignmentBankTypes)) {
        return { message: "Assignment Bank's Types  was not found!.", success: false };
    }

    if (!isEmpty(assignmentBankTypes)) {
        return { message: "Assignment Bank's Types was fatched!.", assignmentBankTypes, success: true };
    }
}

module.exports.getAssignmentBankTypes = getAssignmentBankTypes;

module.exports.checkAssignmentBankType = checkAssignmentBankType;