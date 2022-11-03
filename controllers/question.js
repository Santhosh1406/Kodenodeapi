const { question, question_type, question_bank, question_topic, question_bank_type, discipline, department, organization, program, user_data, course_batch, course_department_mapping, subject, topic, sub_topic } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, generateCode, generateCodeName } = require('../service/util.service');
const { checkMenuAccess, checkOrganization, checkDiscipline } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkProgram } = require('./program');
const { checkDepartment } = require('./department');
const { checkSubject } = require('./subject');
const { checkQuestionTypeValue } = require('./question_type');
const { checkTopic } = require('./topic');
const { checkSubTopic } = require('./sub_topic');
const { checkQuestionBank } = require('./question_bank');
const { checkQuestionBankType } = require('./question_bank_type');

module.exports.questionVerification = async (req, res) => {
    const user = req.user;
    let body = req.body;


    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message },HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let fields = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id', 'questions'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }
    }


    if (isEmpty(body.questions)) {
        return ReE(res, { message: "Please enter questions details!." }, HttpStatus.BAD_REQUEST);
    }

    let errQuestion = [], vaildQuestion = [], vaildQuestions = [];
    for (let index = 0; index < body.questions.length; index++) {
        let element = body.questions[index];

        let field = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id',];

        let questionData = {};

        field.map(x => questionData[x] = body[x]);

        let checkQuestionCreation = await checkQuestionCreationMethod({ ...questionData, ...element });

        if (!checkQuestionCreation.success) {
            errQuestion.push({ ...element, message: checkQuestionCreation.message });
        } else if (checkQuestionCreation.success) {

            let qN = String(`${firstCap(String(element.question))}-${element.question_type_id}`).replaceAll(' ', '');

            if (vaildQuestions.includes(qN)) {
                errQuestion.push({ ...element, message: `Please remove dublucation questions!.` });
            } else {
                vaildQuestions.push(qN);
                let obj = {
                    ...element,
                    ...questionData,
                    question: firstCap(String(element.question)),
                    is_active: true,
                    is_block: false,
                    user_id: user._id,
                    createby: user._id,
                    updatedby: user._id
                };
                vaildQuestion.push(obj);
            }
        }
    }

    let message = {}

    if (!isEmpty(errQuestion)) {
        message = "Vaildation was completed but error occurreds!.";
    }

    if (isEmpty(vaildQuestion)) {
        message = "Vaildation was completed but no vaild datas!.";
    }

    if (isEmpty(errQuestion) && !isEmpty(vaildQuestion)) {
        message = "Vaildation was completed!.";
    }

    return ReS(res, { message: message, errQuestion, vaildQuestion }, HttpStatus.OK);
}

module.exports.createQuestionBulk = async (req, res) => {
    const user = req.user;
    let body = req.body;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message },HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let err;

    let fields = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id', 'questions'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }
    }


    if (isEmpty(body.questions)) {
        return ReE(res, { message: "Please enter questions details!." }, HttpStatus.BAD_REQUEST);
    }

    let errQuestion = [], vaildQuestion = [], vaildQuestions = [], done = [];
    for (let index = 0; index < body.questions.length; index++) {
        let element = body.questions[index];

        let field = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id'];

        let questionData = {};

        field.map(x => questionData[x] = body[x]);

        let checkQuestionCreation = await checkQuestionCreationMethod({ ...questionData, ...element });

        if (!checkQuestionCreation.success) {
            errQuestion.push({ ...element, message: checkQuestionCreation.message });
        }

        if (checkQuestionCreation.success) {
            let qN = String(`${firstCap(String(element.question))}-${element.question_type_id}`).replaceAll(' ', '');

            if (!vaildQuestions.includes(qN)) {
                vaildQuestions.push(qN);

                let obj = {
                    ...element,
                    ...questionData,
                    question: firstCap(String(element.question).trim()),
                    option: checkQuestionCreation.question.option,
                    correct_answer: checkQuestionCreation.question.answer,
                    code: checkQuestionCreation.question.code,
                    is_active: true,
                    is_block: false,
                    user_id: user._id,
                    createdby: user._id,
                    updatedby: user._id
                };

                vaildQuestion.push(obj);
            };

            if (vaildQuestions.includes(qN)) {
                errQuestion.push({ ...element, message: `Please remove dublucation questions!.` });
            };
            done.push(element);
        }
    };

    if (isEmpty(vaildQuestion)) {
        return ReE(res, { message: "Vaildation was completed but no vaild datas!." }, HttpStatus.BAD_REQUEST);
    }

    let addTopic = [], errTopic = [];

    for (let index = 0; index < vaildQuestion.length; index++) {
        const element = vaildQuestion[index];

        let checkQuestionTopicDetails = await checkQuestionTopic({ question_bank_id: element.question_bank_id, topic_id: element.topic_id });

        if (!checkQuestionTopicDetails.success) {

            let createQuestionTopic;

            let field = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id'];

            let codeName = `${element.code}QTOPIC`;

            let code;

            const data = async () => {
                code = generateCodeName(codeName, 8, 6);
                if (String(code).length < 5) {
                    data();
                } else {
                    let checkCode, codeOption = {
                        code: code,
                        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
                    };

                    [err, checkCode] = await to(question_topic.findOne({
                        where: codeOption
                    }));

                    if (!isNull(checkCode)) {
                        data();
                    }
                }
            }

            data();

            let optionQuestionTopic = {};

            await field.map(x => optionQuestionTopic[x] = body[x]);

            optionQuestionTopic = { ...optionQuestionTopic, sub_topic_id: [element.sub_topic_id], question_bank_id: element.question_bank_id, code, is_active: true, is_block: false, user_id: user._id, createdby: user._id, updatedby: user._id };

            [err, createQuestionTopic] = await to(question_topic.create(optionQuestionTopic));
            if (err) {
                errTopic.push({ ...element, message: err });
            } else if (isNull(createQuestionTopic)) {
                errTopic.push({ ...element, message: 'Something went wrong to add topic and sub topic into question bank!.' }, HttpStatus.BAD_REQUEST);
            } else if (!isNull(createQuestionTopic)) {
                addTopic.push(element);
            }
        } if (checkQuestionTopicDetails.success) {
            let { questionTopic } = checkQuestionTopicDetails;

            if (!isEmpty(questionTopic.sub_topic_id) && questionTopic.sub_topic_id.includes(element.sub_topic_id)) {
                addTopic.push(element);
            } else {

                let sub = [element.sub_topic_id];

                sub = sub.concat(questionTopic.sub_topic_id)

                let update, updateData = {
                    where: {
                        _id: questionTopic._id,
                        topic_id: element.topic_id,
                        is_active: true,
                        is_block: false
                    },
                    set: {
                        sub_topic_id: sub,
                        updatedby: user._id
                    }
                };

                [err, update] = await to(question_topic.update(updateData.set, { where: updateData.where }));

                if (err) {
                    errTopic.push({ ...element, message: err });
                } else if (isNull(update)) {
                    errTopic.push({ ...element, message: 'Something went wrong to add topic and sub topic into question bank!.' }, HttpStatus.BAD_REQUEST);
                } else if (!isNull(update)) {
                    addTopic.push(element);
                }
            }
        }
    }


    if (!isEmpty(errTopic)) {
        return ReE(res, { message: errTopic }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(addTopic)) {
        return ReE(res, { message: "Vaildation was completed but no vaild datas!." }, HttpStatus.BAD_REQUEST);
    }


    let create;

    [err, create] = await to(question.bulkCreate(addTopic));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    if (isNull(create) || isEmpty(create)) {
        return ReE(res, { message: "Something went wrong create questions!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(create) && !isEmpty(create)) {
        return ReS(res, { message: "Questions Created!." }, HttpStatus.OK)
    }
}

module.exports.getAllQuestions = async (req, res) => {

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

    let err;

    let questions, optionQuestion = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: subject,
                as: 'subjectId'
            },
            {
                model: topic,
                as: 'topicId'
            },
            {
                model: sub_topic,
                as: 'subTopicId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
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
        optionQuestion = {
            ...optionQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestion = {
            ...optionQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return ReE(res, { message: "Please select vaild question details!." }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            _id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, questions] = await to(question.findAll(optionQuestion));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(questions)) {
        return ReE(res, { message: "Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(questions)) {
        return ReS(res, { message: "Question was fatched!.", questions }, HttpStatus.OK);
    }
}

module.exports.getQuestions = async (req, res) => {

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

    let err;

    let question, optionQuestion = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
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
        optionQuestion = {
            ...optionQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestion = {
            ...optionQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.question_id) || !IsValidUUIDV4(req.params.question_id)) {
        return ReE(res, { message: "Please select vaild question details!." }, HttpStatus.BAD_REQUEST);
    }

    optionQuestion.where = {
        ...optionQuestion.where,
        _id: req.params.question_id
    };

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, question] = await to(question.findOne(optionQuestion));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(question)) {
        return ReE(res, { message: "Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(question)) {
        return ReS(res, { message: "Question was fatched!.", question }, HttpStatus.OK);
    }
}

module.exports.getAllQuestionTopic = async (req, res) => {

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

    let err;

    let questionTopics, optionQuestionTopic = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
            },
            {
                model: topic,
                as: 'topicId'
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
        optionQuestionTopic = {
            ...optionQuestionTopic,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionTopic = {
            ...optionQuestionTopic,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_topic_id)) {
        if (!IsValidUUIDV4(body.question_topic_id)) {
            return ReE(res, { message: "Please select vaild question bank topic details!." }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            _id: body.question_topic_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            sub_topic_id: { [Op.contains]: body.sub_topic_id }
        }
    }

    [err, questionTopics] = await to(question_topic.findAll(optionQuestionTopic));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(questionTopics)) {
        return ReE(res, { message: "Question Bank was not found!." }, HttpStatus.BAD_REQUEST);
    }

    let questions = [];

    for (var i = 0; i < questionTopics.length; i++) {
        let x = questionTopics[i];

        if (!isEmpty(x.sub_topic_id)) {
            let array, option = {
                where: {
                    _id: { [Op.in]: x.sub_topic_id },
                    is_active: true
                }
            };

            [err, array] = await to(sub_topic.findAll(option));

            if (!isEmpty(array)) {
                x.setDataValue("sub_topic_id", array)
            }
            questions.push(x);
        }
    };

    if (!isEmpty(questions)) {
        return ReS(res, { message: "Question bank was fatched!.", questionTopics: questions }, HttpStatus.OK);
    }
}

const checkQuestionCreationMethod = async (body) => {

    let eFields = ['question_type_id', 'question_bank_id', 'question'];

    let einVaildFields = await eFields.filter(x => isNull(body[x]));

    if (!isEmpty(einVaildFields)) {
        return { message: `Please enter required fields ${einVaildFields}!.` };
    }

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return { message: checkOrg.message, success: false };
    }

    let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: checkOrg.organizationDetails._id });

    if (!checkDisciplineDetails.success) {
        return { message: checkDisciplineDetails.message, success: false };
    }

    let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

    if (!checkProgramDetails.success) {
        return { message: checkProgramDetails.message, success: false };
    }

    let checkDepartmentDetails = await checkDepartment({ discipline_id: body.discipline_id, department_id: body.department_id });

    if (!checkDepartmentDetails.success) {
        return { message: checkDepartmentDetails.message, success: false };
    }

    let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id, department_id: body.department_id });

    if (!checkSubjectDetails.success) {
        return { message: checkSubjectDetails.message, success: false };
    }

    let checkTopicDetails = await checkTopic({ subject_id: body.subject_id, department_id: body.department_id, topic_id: body.topic_id });

    if (!checkTopicDetails.success) {
        return { message: checkTopicDetails.message, success: false };
    }

    let checkSubTopicDetails = await checkSubTopic({ subject_id: body.subject_id, department_id: body.department_id, topic_id: body.topic_id, sub_topic_id: body.sub_topic_id });

    if (!checkSubTopicDetails.success) {
        return { message: checkSubTopicDetails.message, success: false };
    }

    let checkQuestionBankDetails = await checkQuestionBank({ subject_id: body.subject_id, question_bank_id: body.question_bank_id });

    if (!checkQuestionBankDetails.success) {
        return { message: checkQuestionBankDetails.message, success: false };
    }

    let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

    if (!checkQuestionTypeDetails.success) {
        return { message: checkQuestionBankDetails.message, success: false };
    }

    let checkQuestionBankTypeDetails = await checkQuestionBankType({ question_bank_id: body.question_bank_id, question_type_id: body.question_type_id });

    if (!checkQuestionBankTypeDetails.success) {
        return { message: checkQuestionBankTypeDetails.message, success: false };
    }

    if (isNull(body.question)) {
        return { message: "Please enter question details!.", success: false };
    }

    if (String(body.question).length > CONFIG.question.max || String(body.question).length < CONFIG.question.min) {
        return { message: `Please enter question character must length  within ${CONFIG.question.min} to ${CONFIG.question.max} !.`, success: false };
    }

    let checkQuestionName = await checkQuestion({ question: firstCap(String(body.question)), status: 'all', question_bank_id: body.question_bank_id, question_type_id: body.question_type_id });

    if (checkQuestionName.success) {
        return { message: `Question was already added on this question bank!.`, success: false };
    }

    if (checkQuestionTypeDetails.questionType.option == CONFIG.boolean[0]) {

        if (isNull(body.option) || isEmpty(body.option)) {
            return { message: "Please select question option details!.", success: false };
        }


        if (body.option.length != checkQuestionTypeDetails.questionType.option_length) {
            return { message: `Please select question option with ${checkQuestionTypeDetails.questionType.option_length}!`, success: false };
        }

        let errOption = [], vaildOption = [];

        body.option.map((x, i) => {
            if (String(x.value).length > 300 || String(x.value).length < 1) {
                errOption.push({ ...x, message: `Please enter vaild question option within 1 to 300 character!.` });
            } else {
                vaildOption.push({ id: i + 1, ...x });
            }
        });

        if (!isEmpty(errOption)) {
            return { message: errOption, success: false };
        }

        if (isEmpty(vaildOption)) {
            return { message: "No vaild question option have to create question!.", success: false };
        }

        let options = [];
        vaildOption.map(x => options.push(x.value));

        var isDuplicate = options.some(function (item, idx) {
            return options.indexOf(item) != idx
        });

        if (isDuplicate) {
            return { message: `Please remove dublicate question options!.`, success: false };
        }

        if (checkQuestionTypeDetails.questionType.answer == CONFIG.boolean[0]) {
            if (isNull(body.answer) || isNull(body.answer.value)) {
                return { message: "Please select question answer details!.", success: false };
            }

            if (!options.includes(body.answer.value)) {
                return { message: "Please check , question correct answer was not exist on option details!.", success: false };
            }

            let index = await options.indexOf(body.answer.value);
            body.option = vaildOption;

            body.answer = vaildOption[index];
        }

        if (checkQuestionTypeDetails.questionType.answer == CONFIG.boolean[1] && !isNull(body.answer)) {
            if (isNull(body.answer.value)) {
                return { message: "Please select question answer details!.", success: false };
            }

            if (!options.includes(body.answer.value)) {
                return { message: "Please check , question correct answer was not exist on option details!.", success: false };
            }

            let index = await options.indexOf(body.answer.value);
            body.option = vaildOption;

            body.answer = vaildOption[index];
        }

    }

    if (checkQuestionTypeDetails.questionType.option == CONFIG.boolean[1]) {
        if (checkQuestionTypeDetails.questionType.answer == CONFIG.boolean[0]) {
            if (isNull(body.answer)) {
                return { message: "Please enter question answer details!.", success: false };
            }

            if (String(body.answer).length > CONFIG.question.answer || String(body.answer).length < CONFIG.question.min) {
                return { message: `Please enter question answer character must length  within ${CONFIG.question.min} to ${CONFIG.question.answer} !.`, success: false };
            }
        }

        if (checkQuestionTypeDetails.questionType.answer == CONFIG.boolean[1] && !isNull(body.answer)) {
            if (String(body.answer).length > CONFIG.question.answer || String(body.answer).length < CONFIG.question.min) {
                return { message: `Please enter question answer character must length  within ${CONFIG.question.min} to ${CONFIG.question.answer} !.`, success: false };
            }
        }
    }

    let code = '';

    let codeName = `${String(moment(checkQuestionBankDetails.questionBank.year, 'DD/MM/YYYY').format('YYYY')).slice(2)}${checkQuestionBankDetails.questionBank.name}`;

    const data = async () => {
        code = generateCodeName(codeName, 8, 6);
        if (String(code).length < 5) {
            data();
        } else {
            let checkCode, codeOption = {
                code: code,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkCode] = await to(question.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    };

    await data();

    return {
        message: "Verified Successfully!.", question: { questionBank: checkQuestionBankDetails.questionBank, option: body.option, code: code, answer: body.answer }, success: true
    };

}

const checkQuestion = async (body) => {
    let questionData, optionQuestion = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
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
        optionQuestion = {
            ...optionQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestion = {
            ...optionQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return { message: "Please select vaild question details!.", success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            _id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return { message: checkQuestionBankDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.question)) {
        if (String(body.question).length > CONFIG.question.max || String(body.question).length < CONFIG.question.min) {
            return { message: `Please enter question character must length  within ${CONFIG.question.min} to ${CONFIG.question.max} !.`, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question: firstCap(String(body.question).trim())
        };

    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false }
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return { message: checkTopicDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return { message: checkSubTopicDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, questionData] = await to(question.findOne(optionQuestion));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(questionData)) {
        return { message: "Question Bank was not found!.", success: false };
    }

    if (!isNull(questionData)) {
        return { message: "Question bank was fatched!.", question: questionData, success: true };
    }
}

module.exports.checkQuestion = checkQuestion;

const checkQuestionTopic = async (body) => {

    let questionTopic, optionQuestionTopic = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
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
        optionQuestionTopic = {
            ...optionQuestionTopic,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionTopic = {
            ...optionQuestionTopic,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_topic_id)) {
        if (!IsValidUUIDV4(body.question_topic_id)) {
            return { message: "Please select vaild question topic details!.", success: false };
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            _id: body.question_topic_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return { message: checkQuestionBankDetails.message, success: false };
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false }
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return { message: checkTopicDetails.message, success: false };
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return { message: checkSubTopicDetails.message, success: false };
        }

        optionQuestionTopic.where = {
            ...optionQuestionTopic.where,
            sub_topic_id: { [Op.contains]: body.sub_topic_id }
        }
    }

    [err, questionTopic] = await to(question_topic.findOne(optionQuestionTopic));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(questionTopic)) {
        return { message: "Question Bank topic was not found!.", success: false };
    }

    if (!isNull(questionTopic)) {
        return { message: "Question bank  topic was fatched!.", questionTopic, success: true };
    }
}

module.exports.checkQuestionTopic = checkQuestionTopic;

const getQuestion = async (body) => {
    let questionData, optionQuestion = {
        where: getQuery(body),
        include: [
            {
                model: organization,
                as: 'orgId'
            },
            {
                model: discipline,
                as: 'disciplineId'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: department,
                as: 'departmentId'
            },
            {
                model: question_type,
                as: 'questionTypeId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
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
        optionQuestion = {
            ...optionQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestion = {
            ...optionQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return { message: "Please select vaild question details!.", success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            _id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let questionBankId;

        if (!IsValidUUIDV4(body.question_bank_id) && !Array.isArray(body.question_bank_id)) {
            return { message: 'Please select vaild topic details!', success: false };
        }
        if (Array.isArray(body.question_bank_id)) {            
            questionBankId = body.question_bank_id;
        } else {
            questionBankId = [body.question_bank_id]
        }

        let errors = [];

        for (let index = 0; index < questionBankId.length; index++) {
            const element = questionBankId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild topic details!.');
            }

            let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element });

            if (!checkQuestionBankDetails.success) {
                errors.push(checkQuestionBankDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_bank_id: { [Op.in]: questionBankId }
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.question)) {
        if (String(body.question).length > CONFIG.question.max || String(body.question).length < CONFIG.question.min) {
            return { message: `Please enter question character must length  within ${CONFIG.question.min} to ${CONFIG.question.max} !.`, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            question: firstCap(String(body.question).trim())
        };

    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false }
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let topicId;

        if (!IsValidUUIDV4(body.topic_id) && !Array.isArray(body.topic_id)) {
            return { message: 'Please select vaild topic details!', success: false };
        }

        if (Array.isArray(body.topic_id)) {
            topicId = body.topic_id
        } else {
            topicId = [body.topic_id]
        }

        let errors = [];

        for (let index = 0; index < topicId.length; index++) {
            const element = topicId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild topic details!.');
            }

            let checkTopicDetails = await checkTopic({ topic_id: element });

            if (!checkTopicDetails.success) {
                errors.push(checkTopicDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            topic_id: { [Op.in]: topicId }
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return { message: checkSubTopicDetails.message, success: false };
        }

        optionQuestion.where = {
            ...optionQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, questionData] = await to(question.findAll(optionQuestion));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(questionData)) {
        return { message: "Question Bank was not found!.", success: false };
    }

    if (!isEmpty(questionData)) {
        return { message: "Question bank was fatched!.", questions: questionData, success: true };
    }
}

module.exports.getQuestion = getQuestion;