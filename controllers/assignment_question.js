const { discipline, department, organization, program, user_data, subject, assignment_question, question, assignment_bank, topic, sub_topic, question_type, question_bank, assignment_student, section, course_batch, batch_sem, course_department_mapping } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, genrateNumber } = require('../service/util.service');
const { checkMenuAccess, checkUserInf, checkUser } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkSubject } = require('./subject');
const { checkQuestionBank } = require('./question_bank');
const { checkTopic } = require('./topic');
const { checkAssignmentBank } = require('./assignment_bank');
const { checkSubTopic } = require('./sub_topic');
const { checkQuestionTypeValue } = require('./question_type');
const { checkAssignmentBankType } = require('./assignment_bank_type');
const { getQuestion } = require('./question');


module.exports.getAllAssignmentQuestions = async (req, res) => {

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

    let assignemnetQuestions, optionAssignmentQuestion = {
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
                model: assignment_bank,
                as: 'assignmentBankId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_question_id)) {
        if (!IsValidUUIDV4(body.assignment_question_id)) {
            return ReE(res, { message: "Please select vaild assignment bank details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: body.assignment_question_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return ReE(res, { message: "Please select vaild question details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, assignemnetQuestions] = await to(assignment_question.findAll(optionAssignmentQuestion));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(assignemnetQuestions)) {
        return ReE(res, { message: "Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(assignemnetQuestions)) {
        return ReS(res, { message: "Question was fatched!.", assignemnetQuestions: assignemnetQuestions }, HttpStatus.OK);
    }
}

module.exports.getAssignmentQuestions = async (req, res) => {

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

    let assignmentQuestion, optionAssignmentQuestion = {
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
                model: question,
                as: 'questionId'
            },
            {
                model: assignment_bank,
                as: 'assignmentBankId'
            },
            {
                model: question_bank,
                as: 'questionBankId'
            }, {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.assignment_question_id)) {
        if (!IsValidUUIDV4(req.params.assignment_question_id)) {
            return ReE(res, { message: "Please select vaild assignment question details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: req.params.assignment_question_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return ReE(res, { message: "Please select vaild question details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return ReE(res, { message: checkQuestionTypeDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, assignmentQuestion] = await to(assignment_question.findOne(optionAssignmentQuestion));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(assignmentQuestion)) {
        return ReE(res, { message: "Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(assignmentQuestion)) {
        return ReS(res, { message: "Question was fatched!.", assignmentQuestion: assignmentQuestion }, HttpStatus.OK);
    }
}

module.exports.studentAssignmentQuestion = async (req, res) => {

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

    let checkUserInfoDetails = await checkUserInf({ user_id: user._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        return ReE(res, { message: "Student Assignment access only for students!." }, HttpStatus.BAD_REQUEST)
    }

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        body = { ...body, student_id: checkUserInfoDetails.userInfo.user_id };
    }

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let field = ['assignment_bank_id'];

    let inVaildFields = await field.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please provide required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id, section_id: checkUserInfoDetails.userInfo.section_id, student_id: user._id, from: 'present' });

    if (!checkAssignmentBankDetails.success) {
        return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let fDate = moment(checkAssignmentBankDetails.assignmentBank.from);

    let fDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes();

    if (fDuration > 0) {
        return ReE(res, { message: 'Assignment not yet started!.' }, HttpStatus.BAD_REQUEST);
    }


    let lDate = moment(checkAssignmentBankDetails.assignmentBank.to);

    let lDuration = moment.duration(moment(lDate._d).diff(today)).asMinutes();

    if (lDuration < 0) {
        return ReE(res, { message: 'Assignment was ended!.' }, HttpStatus.BAD_REQUEST);
    }

    const { getAssignmentBankTypes } = require('./assignment_bank_type');

    let getAssignmentBankTypesDetails = await getAssignmentBankTypes({ assignment_bank_id: body.assignment_bank_id });

    if (!getAssignmentBankTypesDetails.success) {
        return ReE(res, { message: getAssignmentBankTypesDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getAssignmentStudentQuestionsDetails = await getAssignmentStudentQuestions({ assignment_bank_id: body.assignment_bank_id, student_id: body.student_id });

    if (getAssignmentStudentQuestionsDetails.success) {
        return ReE(res, { message: "Student Assignment was already created!." }, HttpStatus.BAD_REQUEST);
    }

    let vaildQuestions = [], errQuestions = [];

    let { assignmentBankTypes } = getAssignmentBankTypesDetails;

    let { assignmentBank } = checkAssignmentBankDetails;

    let assignment_bank_type_id = [];

    for (let index = 0; index < assignmentBankTypes.length; index++) {
        let element = assignmentBankTypes[index];

        if (assignmentBank.random === CONFIG.boolean[0]) {
            let generateQuestionDetails = await generateQuestion({ question_bank_id: element.question_bank_id, assignment_bank_id: element.assignment_bank_id, ...element });

            if (!generateQuestionDetails.success) {
                element.setDataValue("message", generateQuestionDetails.message)
                errQuestions.push(element);
            } else if (isEmpty(generateQuestionDetails.questions)) {
                element.setDataValue("message", "No assignment question have to generate!.")
                errQuestions.push(element);
            } else {
                generateQuestionDetails.questions.map(x => {
                    vaildQuestions.push({
                        assignment_bank_type_id: element._id,
                        question_bank_id: x.question_bank_id,
                        question_id: x.question_id,
                        subject_id: x.subject_id,
                        topic_id: x.topic_id,
                        sub_topic_id: x.sub_topic_id,
                        question_type_id: x.question_type_id,
                        question: x.question,
                        option: x.option,
                        correct_answer: x.correct_answer
                    });
                });
                assignment_bank_type_id.push(element._id);
            }
        }

        if (assignmentBank.random === CONFIG.boolean[1]) {

            let getAssignmentQuestionsDetails = await getAssignmentQuestionsMethod({ question_bank_id: element.question_bank_id, assignment_bank_id: element.assignment_bank_id, question_type_id: element.question_type_id })

            if (!getAssignmentQuestionsDetails.success) {
                element.setDataValue("message", getAssignmentQuestionsDetails.message)
                errQuestions.push(element);
            }

            if (isNull(getAssignmentQuestionsDetails.assignemnetQuestions) || isEmpty(getAssignmentQuestionsDetails.assignemnetQuestions)) {
                element.setDataValue("message", "Student Assignment questions was not found!.")
                errQuestions.push(element);
            }

            if (getAssignmentQuestionsDetails.success && !isEmpty(getAssignmentQuestionsDetails.assignemnetQuestions)) {
                for (let index = 0; index < getAssignmentQuestionsDetails.assignemnetQuestions.length; index++) {
                    const x = getAssignmentQuestionsDetails.assignemnetQuestions[index];

                    vaildQuestions.push({
                        assignment_bank_type_id: element._id,
                        question_bank_id: x.question_bank_id,
                        question_id: x.question_id,
                        subject_id: x.subject_id,
                        topic_id: x.topic_id,
                        sub_topic_id: x.sub_topic_id,
                        question_type_id: x.question_type_id,
                        question: x.question,
                        option: x.option,
                        correct_answer: x.correct_answer
                    });
                    assignment_bank_type_id.push(element._id);
                };
            }

        }

    };

    if (!isEmpty(errQuestions)) {
        return ReE(res, { message: errQuestions }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildQuestions)) {
        return ReE(res, { message: "No vaild question have to create your assignment!." }, HttpStatus.BAD_REQUEST);
    }

    console.log(question_type_id);

    let studentAssignment = {
        assignment_bank_id: assignmentBank._id,
        org_id: assignmentBank.org_id,
        discipline_id: assignmentBank.discipline_id,
        question_bank_id: assignmentBank.question_bank_id,
        assignment_bank_type_id: assignment_bank_type_id,
        program_id: assignmentBank.program_id,
        department_id: assignmentBank.department_id,
        subject_id: assignmentBank.subject_id,
        cdm_id: checkUserInfoDetails.userInfo.cdm_id,
        course_batch_id: checkUserInfoDetails.userInfo.course_batch_id,
        section_id: checkUserInfoDetails.userInfo.section_id,
        student_id: user._id,
        batch_sem_id: assignmentBank.batch_sem_id,
        topic_id: assignmentBank.topic_id,
        user_id: user._id,
        from: assignmentBank.from,
        to: assignmentBank.to,
        question: vaildQuestions,
        total_count: assignmentBank.total_count,
        total_mark: assignmentBank.total_count,
        completed_count: 0,
        status: [{ action: CONFIG.assignmentStatus[0], date: today }],
        is_active: true,
        is_block: false,
        createdby: user._id,
        updatedby: user._id
    };

    let create;

    [err, create] = await to(assignment_student.create(studentAssignment));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong to create your assignment!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(create)) {
        return ReS(res, { message: "Your Assignment was created!." }, HttpStatus.OK);
    }

}

module.exports.getAssignmentQuestionByStudent = async (req, res) => {
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

    let checkUserInfoDetails = await checkUserInf({ user_id: body.student_id || user._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        return ReE(res, { message: "Please select vaild student details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        body = { ...body, student_id: checkUserInfoDetails.userInfo.user_id }
    }

    let field = ['assignment_bank_id'];

    let inVaildFields = await field.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please provide required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let assignmentOption = { assignment_bank_id: body.assignment_bank_id, section_id: checkUserInfoDetails.userInfo.section_id, student_id: body.student_id };


    if (!isNull(body.department_id) && !isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        assignmentOption = { ...assignmentOption, department_id: body.department_id };
    }

    let checkAssignmentBankDetails = await checkAssignmentBank(assignmentOption);

    if (!checkAssignmentBankDetails.success) {
        return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    const { getAssignmentBankTypes } = require('./assignment_bank_type');

    let getAssignmentBankTypesDetails = await getAssignmentBankTypes({ assignment_bank_id: body.assignment_bank_id });

    if (!getAssignmentBankTypesDetails.success) {
        return ReE(res, { message: getAssignmentBankTypesDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getAssignmentStudentQuestionsDetails = await getAssignmentStudentQuestions({ assignment_bank_id: body.assignment_bank_id, student_id: body.student_id });

    if (!getAssignmentStudentQuestionsDetails.success) {
        return ReE(res, { message: getAssignmentStudentQuestionsDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let { assignmentQuestion } = getAssignmentStudentQuestionsDetails;

    if (isEmpty(assignmentQuestion.question)) {
        return ReE(res, { message: "Student Assignment question details not found!." }, HttpStatus.BAD_REQUEST);
    }

    let question = [], errorQuestion = [];

    let assignmentQuestionData = assignmentQuestion.question;

    let checkAssignmentStatus = assignmentQuestion.status.filter((el, i) => {
        if (!isNull(el.action) && CONFIG.assignmentStatus.includes(el.action) && CONFIG.assignmentStatus[i] === el.action) {
            return true
        }
    });

    if (checkAssignmentStatus.length != assignmentQuestion.status.length) {
        return ReE(res, { message: "The status of student assignment does not match!." }, HttpStatus.BAD_REQUEST);
    }

    for (let index = 0; index < assignmentQuestionData.length; index++) {
        const x = assignmentQuestionData[index];

        if (assignmentQuestion.status.length == 1) {
            question.push({
                assignment_bank_type_id: x.assignment_bank_type_id,
                question_bank_id: x.question_bank_id,
                question_id: x.question_id,
                subject_id: x.subject_id,
                topic_id: x.topic_id,
                sub_topic_id: x.sub_topic_id,
                question_type_id: x.question_type_id,
                question: x.question,
                option: x.option,
                student_answer: x.student_answer
            })
        } else if (assignmentQuestion.status.length == 2) {
            question.push({
                assignment_bank_type_id: x.assignment_bank_type_id,
                question_bank_id: x.question_bank_id,
                question_id: x.question_id,
                subject_id: x.subject_id,
                topic_id: x.topic_id,
                sub_topic_id: x.sub_topic_id,
                question_type_id: x.question_type_id,
                question: x.question,
                option: x.option,
                student_answer: x.student_answer
            })
        } else if (assignmentQuestion.status.length == 3 && checkUserInfoDetails.userInfo.section_id) {
            question.push({
                assignment_bank_type_id: x.assignment_bank_type_id,
                question_bank_id: x.question_bank_id,
                question_id: x.question_id,
                subject_id: x.subject_id,
                topic_id: x.topic_id,
                sub_topic_id: x.sub_topic_id,
                question_type_id: x.question_type_id,
                question: x.question,
                option: x.option,
                student_answer: x.student_answer
            })
        } else if (assignmentQuestion.status.length == 3 && !checkUserInfoDetails.userInfo.section_id) {
            question.push({
                assignment_bank_type_id: x.assignment_bank_type_id,
                question_bank_id: x.question_bank_id,
                question_id: x.question_id,
                subject_id: x.subject_id,
                topic_id: x.topic_id,
                sub_topic_id: x.sub_topic_id,
                question_type_id: x.question_type_id,
                question: x.question,
                option: x.option,
                correct_answer: x.correct_answer,
                student_answer: x.student_answer,
                mark: assignmentQuestion.mark === CONFIG.boolean[0] ? x.mark : null
            });
        } else if (assignmentQuestion.status.length == 4) {
            question.push({
                assignment_bank_type_id: x.assignment_bank_type_id,
                question_bank_id: x.question_bank_id,
                question_id: x.question_id,
                subject_id: x.subject_id,
                topic_id: x.topic_id,
                sub_topic_id: x.sub_topic_id,
                question_type_id: x.question_type_id,
                question: x.question,
                option: x.option,
                correct_answer: x.correct_answer,
                student_answer: x.student_answer,
                mark: assignmentQuestion.mark === CONFIG.boolean[0] ? x.mark : null
            });
        } else {
            errorQuestion.push({ ...x, message: "Assignment Status was not matched!." });
        }
    }

    if (!isEmpty(errorQuestion)) {
        return ReE(res, { message: errorQuestion }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(question)) {
        return ReE(res, { message: "No vaild assignment student details!." }, HttpStatus.BAD_REQUEST)
    }

    assignmentQuestion.setDataValue("question", question)

    if (!isNull(assignmentQuestion)) {
        return ReS(res, { message: "Student Assignment details fetched!.", assignmentQuestion }, HttpStatus.OK)
    }
}

module.exports.updateAssignmentQuestionByStudent = async (req, res) => {
    const user = req.user;
    let body = req.body;

    let student = true;


    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let checkUserInfoDetails = await checkUserInf({ user_id: user._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        if (isNull(body.student_id)) {
            return ReE(res, { message: "Please select student details!." }, HttpStatus.BAD_REQUEST);
        }

        let checkUserInfoStudentDetails = await checkUserInf({ user_id: body.student_id });

        if (!checkUserInfoStudentDetails.success) {
            return ReE(res, { message: checkUserInfoStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        student = false;
        body = { ...body, student_id: checkUserInfoStudentDetails.userInfo.user_id }
    }

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        body = { ...body, student_id: checkUserInfoDetails.userInfo.user_id }
    }

    let field = ['assignment_bank_id'];

    let inVaildFields = await field.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please provide required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let assignmentOption = { assignment_bank_id: body.assignment_bank_id, section_id: checkUserInfoDetails.userInfo.section_id, student_id: body.student_id }

    if (!isNull(body.department_id) && isNull(checkUserInfoDetails.userInfo.section_id)) {
        assignmentOption = { ...assignmentOption, department_id: body.department_id };
    }

    let checkAssignmentBankDetails = await checkAssignmentBank(assignmentOption);

    if (!checkAssignmentBankDetails.success) {
        return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    const { getAssignmentBankTypes } = require('./assignment_bank_type');

    let getAssignmentBankTypesDetails = await getAssignmentBankTypes({ assignment_bank_id: body.assignment_bank_id });

    if (!getAssignmentBankTypesDetails.success) {
        return ReE(res, { message: getAssignmentBankTypesDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getAssignmentStudentQuestionsDetails = await getAssignmentStudentQuestions({ assignment_bank_id: body.assignment_bank_id, student_id: body.student_id });

    if (!getAssignmentStudentQuestionsDetails.success) {
        return ReE(res, { message: getAssignmentStudentQuestionsDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let { assignmentQuestion } = getAssignmentStudentQuestionsDetails;

    if (isEmpty(assignmentQuestion.question)) {
        return ReE(res, { message: "Student Assignment was not created!." }, HttpStatus.BAD_REQUEST);
    }

    let status = CONFIG.assignmentStatus;

    let assignmentQuestionData = assignmentQuestion.question;

    let questionStudentId = assignmentQuestionData.map(x => x.question_id);

    let checkAssignmentStatus = assignmentQuestion.status.filter((el, i) => {
        if (!isNull(el.action) && CONFIG.assignmentStatus.includes(el.action) && CONFIG.assignmentStatus[i] === el.action) {
            return true
        }
    });

    if (checkAssignmentStatus.length != assignmentQuestion.status.length) {
        return ReE(res, { message: "The status of student assignment does not match!." }, HttpStatus.BAD_REQUEST);
    }

    let assignmentStatus = [];

    checkAssignmentStatus.map(x => assignmentStatus.push(x.action));

    let questions = [], errorQuestion = [];

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let updateData = {
        where: {
            _id: assignmentQuestion._id,
            student_id: body.student_id,
            is_active: true,
            is_block: false
        },
        set: {
            updatedby: user._id
        }
    };

    let fDate = moment(checkAssignmentBankDetails.assignmentBank.from);

    let fDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes();

    if (fDuration > 0) {
        return ReE(res, { message: 'Assignment not yet started!.' }, HttpStatus.BAD_REQUEST);
    }

    if (student == CONFIG.boolean[1]) {
        if (!assignmentStatus.includes(status[1])) {
            return ReE(res, { message: "Student has not submitted the assignment yet!." }, HttpStatus.BAD_REQUEST);
        }

        if (assignmentStatus.includes(status[3])) {
            return ReE(res, { message: "The Score for student assignment has already been published!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.status) || !status.includes(body.status) || (status[2] != body.status && status[3] != body.status)) {
            return ReE(res, { message: "Please select vaild student assignment update status!." }, HttpStatus.BAD_REQUEST);
        }

        let index = status.findIndex(x => x == body.status);

        if (!assignmentStatus.includes(status[index - 1])) {
            return ReE(res, { message: `Student assignment was not in ${status[index - 1]} status!.` }, HttpStatus.BAD_REQUEST);
        }

        if (!assignmentStatus.includes(status[index])) {
            let array = [...assignmentQuestion.status];

            updateData.set = {
                ...updateData.set,
                status: array.concat({ action: status[index], date: today })
            }
        }

        if (assignmentQuestion.mark == CONFIG.boolean[0]) {

            if (!Array.isArray(body.questions)) {
                return ReE(res, { message: `Please select question to update student assignment status!.` }, HttpStatus.BAD_REQUEST);
            }

            if (questionStudentId.length !== body.questions.length) {
                return ReE(res, { message: "Mark the score for all the questions in the student assignment!." }, HttpStatus.BAD_REQUEST);
            }

            let ids = [], total_mark = 0;

            for (let index = 0; index < body.question.length; index++) {
                const element = body.question[index];

                if (!questionStudentId.includes(element.question_id)) {
                    errorQuestion.push({ ...element, message: "Please select vaild question details!." });
                }

                if (questionStudentId.includes(element.question_id)) {

                    if (ids.includes(element.question_id)) {
                        errorQuestion.push({ ...element, message: "Please remove dublicated question details!." });
                    }

                    if (!ids.includes(element.question_id)) {

                        let checkAssignmentBankTypeDetails = await checkAssignmentBankType({ assignment_bank_type_id: element.assignment_bank_type_id, question_bank_id: element.question_bank_id, question_type_id: element.question_bank_id });

                        if (!checkAssignmentBankTypeDetails.success) {
                            errorQuestion.push({ ...element, message: checkAssignmentBankTypeDetails.message });
                        }

                        if (checkAssignmentBankTypeDetails.success) {
                            if (isNull(body.mark) || isNaN(body.mark) || checkAssignmentBankTypeDetails.assignmentBankType.mark < Number(element.mark)) {
                                errorQuestion.push({ ...element, message: `Please select vaild student assignment question's mark details within ${checkAssignmentBankTypeDetails.assignmentBankType.mark}!.` });
                            } else {
                                questions.push({ ...element, mark: Number(mark) });
                                total_mark = total_mark + Number(body.mark);
                            }
                        }
                    }

                }

            }

            updateData.set = {
                ...updateData.set,
                mark: total_mark
            };
        }

        if (assignmentQuestion.mark == CONFIG.boolean[1]) {
            questions = assignmentQuestionData;
        }
    }

    if (student == CONFIG.boolean[0]) {

        let lDate = moment(checkAssignmentBankDetails.assignmentBank.to);

        let lDuration = moment.duration(moment(lDate._d).diff(today)).asMinutes();

        if (lDuration < 0) {
            return ReE(res, { message: 'Assignment was ended!.' }, HttpStatus.BAD_REQUEST);
        }

        if (!assignmentStatus.includes(status[0])) {
            return ReE(res, { message: "Please create your assignment first!." }, HttpStatus.BAD_REQUEST);
        }

        if (assignmentStatus.includes(status[1]) || assignmentStatus.includes(status[2]) || assignmentStatus.includes(status[3])) {
            return ReE(res, { message: `Your assignment was already in ${assignmentStatus[assignmentStatus.length - 1]} status!.` }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.status) || !status.includes(body.status) || (status[1] != body.status && status[0] != body.status)) {
            return ReE(res, { message: "Please select vaild assignment update status!." }, HttpStatus.BAD_REQUEST);
        }

        let index = status.findIndex(x => x == body.status);

        if (!assignmentStatus.includes(status[index])) {
            let array = [...assignmentQuestion.status];

            updateData.set = {
                ...updateData.set,
                status: array.concat({ action: status[index], date: today })
            }
        }

        if (status[1] != body.status) {

            if (!Array.isArray(body.question)) {
                return ReE(res, { message: `Please select question to update student assignment answers!.` }, HttpStatus.BAD_REQUEST);
            }

            let ids = [], total_mark = 0;

            for (let index = 0; index < body.question.length; index++) {
                const element = body.question[index];

                if (isNull(element) || isNull(element.question_id)) {
                    errorQuestion.push({ ...element, message: "Please select vaild question details!." });
                } else {
                    if (!questionStudentId.includes(element.question_id)) {
                        errorQuestion.push({ ...element, message: "Please select vaild question details!." });
                    }

                    if (questionStudentId.includes(element.question_id)) {

                        if (ids.includes(element.question_id)) {
                            errorQuestion.push({ ...element, message: "Please remove dublicated question details!." });
                        }

                        if (!ids.includes(element.question_id)) {
                            if (element.option.length > 0) {
                                if (isNull(element.student_answer)) {
                                    errorQuestion.push({ ...element, message: "Please select any answer!." });
                                }

                                if (!isNull(element.student_answer)) {
                                    let options = [];
                                    element.option.map(x => options.push(x.value));

                                    if (!options.includes(element.student_answer.value)) {
                                        errorQuestion.push({ ...element, message: "Please check , your answer was not exist on option details!." });
                                    }
                                    else {
                                        questions.push({ ...element });
                                    }
                                }
                            } else {
                                questions.push({ ...element });
                            }
                        }

                    }
                }

            };

        }

        if (!isEmpty(errorQuestion)) {
            return ReE(res, { message: errorQuestion }, HttpStatus.BAD_REQUEST);
        }

        if (status[0] == body.status) {
            if (isEmpty(questions)) {
                return ReE(res, { message: "No vaild questions have to add!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                question: questions
            };
        }

    }

    let update;

    [err, update] = await to(assignment_student.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, { message: err }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update student assignment details!." }, HttpStatus.BAD_REQUEST);
    }

    let updateAssignmentStudent = await studentAssignmentCountUpdate({ assignment_bank_id: body.assignment_bank_id, student_id: body.student_id });

    if (!updateAssignmentStudent.success) {
        return ReE(res, { message: updateAssignmentStudent.message }, HttpStatus.BAD_REQUEST);
    }

    if (updateAssignmentStudent.success) {
        return ReS(res, { message: updateAssignmentStudent.message }, HttpStatus.OK);
    }

}

module.exports.getAllAssignmentStudentQuestions = async (req, res) => {

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

    let checkUserInfoDetails = await checkUserInf({ user_id: body.student_id || user._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        body = { ...body, student_id: checkUserInfoDetails.userInfo.user_id };
    }

    let assignmentQuestions, optionAssignmentQuestion = {
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
                model: section,
                as: 'sectionId'
            },
            {
                model: assignment_bank,
                as: 'assignmentBankId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: user_data,
                as: 'studentId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
            },
            {
                model: user_data,
                as: 'facultyId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_student_id)) {
        if (!IsValidUUIDV4(body.assignment_student_id)) {
            return ReE(res, { message: "Please select vaild student assignment details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: body.assignment_student_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
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
            return ReE(res, { message: errors }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.student_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.student_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            student_id: body.student_id
        }
    }

    if (!isNull(body.faculty_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.faculty_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            faculty_id: body.faculty_id
        }
    }

    if (!isNull(body.topic_id)) {

        let topicId;

        if (!IsValidUUIDV4(body.topic_id) && !Array.isArray(body.topic_id)) {
            return ReE(res, { message: 'Please select vaild topic details!' }, HttpStatus.BAD_REQUEST);
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
            return ReE(res, { message: errors }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: { [Op.contains]: topicId }
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, assignmentQuestions] = await to(assignment_student.findAll(optionAssignmentQuestion));


    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(assignmentQuestions)) {
        return ReE(res, { message: "Student Assignment Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(assignmentQuestions)) {
        return ReS(res, { message: "Student Assignment Question was fatched!.", assignmentQuestions: assignmentQuestions }, HttpStatus.OK);
    }
}

module.exports.getAssignmentStudentQuestion = async (req, res) => {

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

    let checkUserInfoDetails = await checkUserInf({ user_id: body.student_id || user._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        body = { ...body, student_id: checkUserInfoDetails.userInfo.user_id };
    }

    let assignmentQuestion, optionAssignmentQuestion = {
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
                model: section,
                as: 'sectionId'
            },
            {
                model: assignment_bank,
                as: 'assignmentBankId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: user_data,
                as: 'studentId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
            },
            {
                model: user_data,
                as: 'facultyId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.assignment_student_id)) {
        return ReE(res, { message: "Please select student assignment details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(req.params.assignment_student_id)) {
        if (!IsValidUUIDV4(req.params.assignment_student_id)) {
            return ReE(res, { message: "Please select vaild student assignment details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: req.params.assignment_student_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
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
            return ReE(res, { message: errors }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.student_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.student_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            student_id: body.student_id
        }
    }

    if (!isNull(body.faculty_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.faculty_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            faculty_id: body.faculty_id
        }
    }

    if (!isNull(body.topic_id)) {

        let topicId;

        if (!IsValidUUIDV4(body.topic_id) && !Array.isArray(body.topic_id)) {
            return ReE(res, { message: 'Please select vaild topic details!' }, HttpStatus.BAD_REQUEST);
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
            return ReE(res, { message: errors }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: { [Op.contains]: topicId }
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return ReE(res, { message: checkSubTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }


    [err, assignmentQuestion] = await to(assignment_student.findOne(optionAssignmentQuestion));

    if (err) {
        return ReE(res, { message: err }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(assignmentQuestion)) {
        return ReE(res, { message: "Student Assignment Question was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(assignmentQuestion)) {
        return ReS(res, { message: "Student Assignment Question was fatched!.", assignmentQuestion: assignmentQuestion }, HttpStatus.OK);
    }
}

const studentAssignmentCountUpdate = async (body) => {

    if (isNull(body.assignment_bank_id)) {
        return { message: "Please select assignment details!.", success: false };
    }

    if (isNull(body.student_id)) {
        return { message: "Please select assignment student details!.", success: false };
    }

    let getAssignmentStudent = await getAssignmentStudentQuestions({ assignment_bank_id: body.assignment_bank_id, student_id: body.student_id });

    if (!getAssignmentStudent.success) {
        return { message: getAssignmentStudent.message, success: false };
    }

    let count = 0;

    for (let index = 0; index < getAssignmentStudent.assignmentQuestion.question.length; index++) {
        const element = getAssignmentStudent.assignmentQuestion.question[index];

        if (!isNull(element.student_answer)) {
            count = count + 1;
        }

    }

    let { assignmentQuestion } = getAssignmentStudent;

    let updateAssignment, optionAssignment = {
        where: {
            _id: assignmentQuestion._id,
            assignment_bank_id: assignmentQuestion.assignment_bank_id,
            student_id: body.student_id,
            is_active: true,
            is_block: false
        },
        set: {
            completed_count: count
        }
    };

    [err, updateAssignment] = await to(assignment_question.update(optionAssignment.set, { where: optionAssignment.where }));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(updateAssignment)) {
        return { message: "Student Assignment was updated but completed count not updated!.", success: false };
    }

    if (!isNull(updateAssignment)) {
        return { message: "Student Assignment was updated!.", success: true };
    }
}

const generateQuestion = async (body) => {

    if (isNull(body.assignment_bank_id)) {
        return { message: "Please select assignment details!", success: false };
    }

    let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

    if (!checkAssignmentBankDetails.success) {
        return { message: checkAssignmentBankDetails.message, success: false };
    }

    if (checkAssignmentBankDetails.assignmentBank.random !== CONFIG.boolean[0]) {
        return { message: "This Assignment question generation only for random type assignment!.", success: false };
    }

    if (!Array.isArray(body.question_bank_id)) {
        return { message: "Please select vaild question bank details!.", success: false };
    }

    if (isNull(body.question_type_id)) {
        return { message: "Please select assignment bank's type details!.", success: false };
    }

    let checkAssignmentBankTypeDetails = await checkAssignmentBankType({ assignment_bank_id: body.question_bank_id, question_type_id: body.question_type_id });

    if (!checkAssignmentBankTypeDetails.success) {
        return { message: checkAssignmentBankTypeDetails.message, success: false };
    }

    let getQuestionDetails = await getQuestion({ question_type_id: body.question_type_id, question_bank_id: checkAssignmentBankTypeDetails.assignmentBankType.question_bank_id, topic_id: checkAssignmentBankDetails.assignmentBankTypes.topic_id });

    if (!getQuestionDetails.success) {
        return { message: getQuestionDetails.message, success: false };
    }

    let count = Number(checkAssignmentBankTypeDetails.assignmentBankType.count);

    if (getQuestionDetails.questions.length < count) {
        return { message: "Available question count was less then your assignment bank's question count!. ", success: false };
    }

    let { questions } = getQuestionDetails;


    let Assignmentquestions = [], ids = [];

    for (let index = 0; index < count; index++) {

        let number;

        async function asQuestion() {
            number = await genrateNumber(1, count);

            if (ids.includes(questions[number]._id)) {
                asQuestion();
            }
        }

        asQuestion();

        if (number) {
            await Assignmentquestions.push(questions[number]);
            await ids.push(questions[number]._id);
        }

    }

    return { message: "Assignment question was generated by question types!. ", questions: Assignmentquestions, success: true };

}

const getAssignmentQuestionsMethod = async (body) => {

    let assignemnetQuestions, optionAssignmentQuestion = {
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
                model: question,
                as: 'questionId'
            },
            {
                model: assignment_bank,
                as: 'assignmentBankId'
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_question_id)) {
        if (!IsValidUUIDV4(body.assignment_question_id)) {
            return { message: "Please select vaild assignment bank details!.", success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: body.assignment_question_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return { message: checkAssignmentBankDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            assignment_bank_id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_id)) {
        if (!IsValidUUIDV4(body.question_id)) {
            return { message: "Please select vaild question details!.", success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_id: body.question_id
        };
    }

    if (!isNull(body.question_bank_id)) {

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: body.question_bank_id });

        if (!checkQuestionBankDetails.success) {
            return { message: checkQuestionBankDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: body.question_bank_id
        };
    }

    if (!isNull(body.question_type_id)) {

        let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: body.question_type_id });

        if (!checkQuestionTypeDetails.success) {
            return { message: checkQuestionTypeDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_type_id: body.question_type_id
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.topic_id)) {

        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return { message: checkTopicDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: body.topic_id
        }
    }

    if (!isNull(body.sub_topic_id)) {

        let checkSubTopicDetails = await checkSubTopic({ sub_topic_id: body.sub_topic_id });

        if (!checkSubTopicDetails.success) {
            return { message: checkSubTopicDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            sub_topic_id: body.sub_topic_id
        }
    }

    [err, assignemnetQuestions] = await to(assignment_question.findAll(optionAssignmentQuestion));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(assignemnetQuestions)) {
        return { message: "Assignment Question was not found!.", success: false };
    }

    if (!isEmpty(assignemnetQuestions)) {
        return { message: "Assignment Question was fatched!.", assignemnetQuestions: assignemnetQuestions, success: true };
    }
}

module.exports.getAssignmentQuestionsMethod = getAssignmentQuestionsMethod;

const getAssignmentStudentQuestions = async (body) => {

    let assignmentQuestion, optionAssignmentQuestion = {
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
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: subject,
                as: 'subjectId'
            },
            {
                model: section,
                as: 'sectionId'
            },
            {
                model: assignment_bank,
                as: 'assignmentBankId'
            },
            {
                model: user_data,
                as: 'studentId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
            },
            {
                model: user_data,
                as: 'facultyId',
                attributes: ['_id', 'username', 'f_name', 'l_name', 'email']
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
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentQuestion = {
            ...optionAssignmentQuestion,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_student_id)) {
        if (!IsValidUUIDV4(body.assignment_student_id)) {
            return { message: "Please select vaild student assignment details!.", success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            _id: body.assignment_student_id
        };
    }

    if (!isNull(body.assignment_bank_id)) {

        let checkAssignmentBankDetails = await checkAssignmentBank({ assignment_bank_id: body.assignment_bank_id });

        if (!checkAssignmentBankDetails.success) {
            return { message: checkAssignmentBankDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
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

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.student_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.student_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            student_id: body.student_id
        }
    }

    if (!isNull(body.faculty_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.faculty_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            faculty_id: body.faculty_id
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

        optionAssignmentQuestion.where = {
            ...optionAssignmentQuestion.where,
            topic_id: { [Op.contains]: topicId }
        }
    }

    [err, assignmentQuestion] = await to(assignment_student.findOne(optionAssignmentQuestion));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(assignmentQuestion)) {
        return { message: "Student Assignment Question was not found!.", success: false };
    }

    if (!isNull(assignmentQuestion)) {
        return { message: "Student Assignment Question was fatched!.", assignmentQuestion: assignmentQuestion, success: true };
    }
}

module.exports.getAssignmentStudentQuestions = getAssignmentStudentQuestions;