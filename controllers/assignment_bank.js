const { assignment_bank, assignment_bank_type, discipline, department, organization, program, user_data, subject, question_topic, section, user_info, assignment_question, course_batch, course_department_mapping, question_bank, topic, batch_sem, subject_mapping, assignment_student, user_subject } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, generateCode, generateCodeName } = require('../service/util.service');
const { checkMenuAccess, checkOrganization, checkDiscipline, checkUser, checkUserInf } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkProgram } = require('./program');
const { checkDepartment } = require('./department');
const { checkSubject } = require('./subject');
const { checkQuestionBank } = require('./question_bank');
const { checkQuestionBankType } = require('./question_bank_type');
const { checkQuestionTopic, checkQuestion, getQuestion } = require('./question');
const { checkCourseDepart } = require('./course_department_mapping');
const { checkCourseBatch } = require('./course_batch');
const { checkBatchSemester } = require('./batch_sem');
const { checkSection } = require('./section');
const { checkTopic } = require('./topic');
const { checkSubjectMapping } = require('./subject_mapping');

module.exports.createAssignmentBank = async (req, res) => {
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

    let err;

    let fields = ['org_id', 'discipline_id', 'program_id', 'department_id', 'question_bank_id', 'assignment_bank_type', 'cdm_id', 'course_batch_id', 'batch_sem_id', 'section_id', 'student_id', 'subject_id', 'mark', 'random', 'name', 'from', 'to'];

    let inVaildField = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildField)) {
        return ReE(res, { message: `Please enter the required fields ${inVaildField}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let checkOrg = await checkOrganization({ org_id: body.org_id });

    if (!checkOrg.success) {
        return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
    }

    let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: checkOrg.organizationDetails._id });

    if (!checkDisciplineDetails.success) {
        return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

    if (!checkProgramDetails.success) {
        return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkDepartmentDetails = await checkDepartment({ discipline_id: body.discipline_id, department_id: body.department_id });

    if (!checkDepartmentDetails.success) {
        return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseDepartmentDetails = await checkCourseDepart({ department_id: body.department_id, cdm_id: body.cdm_id });

    if (!checkCourseDepartmentDetails.success) {
        return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseBatchDetails = await checkCourseBatch({ cdm_id: body.cdm_id, course_batch_id: body.course_batch_id, from: 'present' });

    if (!checkCourseBatchDetails.success) {
        return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseSemesterDetails = await checkBatchSemester({ cdm_id: body.cdm_id, course_batch_id: body.course_batch_id, batch_sem_id: body.batch_sem_id, from: 'notfuture' })

    if (!checkCourseSemesterDetails.success) {
        return ReE(res, { message: checkCourseSemesterDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSubjectDetails = await checkSubjectMapping({ subject_id: body.subject_id, department_id: body.department_id, cdm_id: body.cdm_id, course_batch_id: body.course_batch_id });

    if (!checkSubjectDetails.success) {
        return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
    }


    if (String(body.name).length < 4) {
        return ReE(res, { message: "Please enter vaild question bank name with more then 4 character!." }, HttpStatus.BAD_REQUEST);
    }

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let yDate = moment(body.from, 'DD/MM/YYYY hh:mm');
    yDate = moment.tz(yDate._d, 'Asia/Calcutta');

    if (!moment(yDate._d).isValid()) {
        return ReE(res, { message: "Please enter vaild assignment bank start time details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkDuration = moment.duration(moment(yDate._d).diff(today)).asHours();

    if (Math.floor(checkDuration) < 1) {
        return ReE(res, { message: "Assignment Bank start time must with more then on hour from currect time!." }, HttpStatus.BAD_REQUEST);
    }

    let lDate = moment(body.to, 'DD/MM/YYYY hh:mm');
    lDate = moment.tz(yDate._d, 'Asia/Calcutta');

    if (!moment(lDate._d).isValid()) {
        return ReE(res, { message: "Please enter vaild assignment bank end time details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkDurationL = moment.duration(moment(lDate._d).diff(yDate._d)).asHours();

    if (Math.floor(checkDurationL) < 1) {
        return ReE(res, { message: "Assignment Bank end time must with greater 1 hour assignment start time!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.description)) {
        if (String(body.description).length > 300 || String(body.description).length < 100) {
            return ReE(res, { message: `Please enter question bank description with in 100 to 300 characters!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    let errSection = [], vaildSection = [];

    if (Array.isArray(body.section_id)) {
        if (!isEmpty(body.section_id)) {
            for (let index = 0; index < body.section_id.length; index++) {
                const element = body.section_id[index];

                let checkSectionetails = await checkSection({ section_id: element, course_batch_id: body.course_batch_id });

                if (!checkSectionetails.success) {
                    errSection.push({ message: `Please select vaild course section details!.` });
                } else {
                    vaildSection.push(element);
                }
            }

            if (!isEmpty(errSection)) {
                return ReE(res, { message: "Please select vaild course section details!." }, HttpStatus.BAD_REQUEST);
            }
        }

        if (isEmpty(body.section_id)) {
            let getSections, optionSection = {
                where: {
                    course_batch_id: body.course_batch_id,
                    is_active: true,
                    is_block: false
                }
            };

            [err, getSections] = await to(section.findAll(optionSection));

            if (err) {
                return ReE(res, err, HttpStatus.BAD_REQUEST);
            }

            if (isEmpty(getSections)) {
                return ReE(res, { message: "Section not yet mapped in this course batch!." }, HttpStatus.BAD_REQUEST);
            }

            getSections.map(x => vaildSection.push(x._id));
        }

        if (isEmpty(vaildSection)) {
            return ReE(res, { message: "Section details was empty!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let checkQuestionBankDetails = await checkAssignmentBank({ name: body.name, status: 'all', subject_id: body.subject_id, cdm_id: body.cdm_id, course_batch_id: body.course_batch_id, section_id: vaildSection });

    if (checkQuestionBankDetails.success) {
        return ReE(res, { message: "Assignment Bank name was already exits for this course subject details!." }, HttpStatus.BAD_REQUEST);
    }

    let vaildStudent = [];

    if (Array.isArray(body.student_id)) {

        let inVaildStudent = [];
        await body.student_id.map(x => {
            if (IsValidUUIDV4(x) && !vaildStudent.includes(x)) {
                vaildStudent.push(x);
            } else {
                inVaildStudent.push(x);
            }
        });

        if (!isEmpty(inVaildStudent)) {
            return ReE(res, { message: "Please remove Invaild student details!." }, HttpStatus.BAD_REQUEST);
        }

    }

    let checkUser, optionUser = {
        where: {
            is_active: true,
            is_block: false
        }
    };

    if (!isEmpty(body.student_id)) {
        optionUser.where = {
            ...optionUser.where,
            user_id: { [Op.in]: body.student_id }
        };
    }

    if (!isEmpty(vaildSection)) {
        optionUser.where = {
            ...optionUser.where,
            section_id: { [Op.in]: vaildSection }
        };
    }

    [err, checkUser] = await to(user_info.findAll(optionUser))

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(checkUser) || (vaildStudent.length !== 0 && checkUser.length !== vaildStudent.length)) {
        return ReE(res, { message: "Please select vaild student details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(checkUser)) {
        await checkUser.map(x => {
            if (!vaildStudent.includes(x.user_id)) {
                vaildStudent.push(x.user_id);
            }
        });
    }

    if (isEmpty(vaildStudent)) {
        return ReE(res, { message: "No vaild student details have to create assignment!." }, HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(body.question_bank_id)) {
        return ReE(res, { message: "Please select vaild question bank details!." }, HttpStatus.BAD_REQUEST);
    }

    if (body.question_bank_id.length <= 0 || body.question_bank_id.length > 3) {
        return ReE(res, { message: "Please select question bank reference mast within 1 to 3!." }, HttpStatus.BAD_REQUEST);
    }

    let errQuestionBank = [], vaildQuestionBank = [];

    for (let index = 0; index < body.question_bank_id.length; index++) {
        const element = body.question_bank_id[index];

        let checkQuestionBankDetails = await checkQuestionBank({ question_bank_id: element, subject_id: body.subject_id, department_id: body.department_id });

        if (!checkQuestionBankDetails.success) {
            errQuestionBank.push({ message: checkQuestionBankDetails.message });
        } else {
            vaildQuestionBank.push(element);
        }
    }

    if (!isEmpty(errQuestionBank)) {
        return ReE(res, { message: errQuestionBank }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildQuestionBank)) {
        return ReE(res, { message: "No vaild question bank details!." }, HttpStatus.BAD_REQUEST);
    }

    let errTopic = [], vaildTopic = [];

    if (Array.isArray(body.topic_id)) {

        if (!isEmpty(body.topic_id)) {

            for (let index = 0; index < body.topic_id.length; index++) {
                const element = body.topic_id[index];

                let checkTopicDetails = await checkQuestionTopic({ subject_id: body.subject_id, topic_id: element });

                if (!checkTopicDetails.success) {
                    errTopic.push({ message: `Please select vaild assignment subject topic details!.` });
                } else {
                    vaildTopic.push(element);
                }
            }

        }
    }

    if (isNull(body.topic_id) || isEmpty(body.topic_id)) {
        let getTopics, optionsTopic = {
            where: {
                is_active: true,
                is_block: false,
                question_bank_id: { [Op.in]: vaildQuestionBank }
            }
        };

        [err, getTopics] = await to(question_topic.findAll(optionsTopic));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(getTopics)) {
            return ReE(res, { message: "Topic was not yet mapped in this question banks!." }, HttpStatus.BAD_REQUEST);
        }

        getTopics.map(x => {
            if (!vaildTopic.includes(x.topic_id)) {
                vaildTopic.push(x.topic_id);
            }
        });
    }

    if (!isEmpty(errTopic)) {
        return ReE(res, { message: "Please select vaild subjcet topic details!." }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildTopic)) {
        return ReE(res, { message: "No Vaild topic details have to add!." }, HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(body.assignment_bank_type)) {
        return ReE(res, { message: "Please select vaild assignment bank question type details!." }, HttpStatus.BAD_REQUEST);
    }

    if (body.assignment_bank_type.length <= 0 || body.assignment_bank_type.length > 3) {
        return ReE(res, { message: "Please select assignment bank question type reference mast within 1 to 3!." }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.boolean.includes(body.mark)) {
        return ReE(res, { message: "Please enter vaild assignment mark status!." }, HttpStatus.BAD_REQUEST);
    }

    let errQuestionBankType = [], vaildQuestionBankType = [], total_count = 0, total_mark = 0;

    for (let index = 0; index < body.assignment_bank_type.length; index++) {
        const element = body.assignment_bank_type[index];

        let checkAssignmentQuestionTypeDetails = await checkAssignmentQuestionType({ vaildQuestionBankType, vaildQuestionBank, mark: body.mark, ...element, user: user, vaildTopic });

        if (!checkAssignmentQuestionTypeDetails.success) {
            errQuestionBankType.push(checkAssignmentQuestionTypeDetails.message);
        } else {
            total_count = total_count + Number(element.count);
            total_mark = total_mark + (Number(element.count) * Number(element.mark));
            vaildQuestionBankType.push({ ...checkAssignmentQuestionTypeDetails.questiontype });
        }
    }

    if (!isEmpty(errQuestionBankType)) {
        return ReE(res, { message: errQuestionBankType }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildQuestionBankType)) {
        return ReE(res, { message: "No vaild question type data to add  into assignment bank's" }, HttpStatus.BAD_REQUEST);
    }

    if (!CONFIG.boolean.includes(body.random)) {
        return ReE(res, { message: "Please select vaild Assignment Making random!." }, HttpStatus.BAD_REQUEST);
    }

    let assignment_question_type = {}, questionTypes = [], errQuestion = [], vaildQuestion = [];

    if (body.random == CONFIG.boolean[1]) {
        if (!Array.isArray(body.questions)) {
            return ReE(res, { message: "Please select assignment questions!." }, HttpStatus.BAD_REQUEST);
        }

        await vaildQuestionBankType.map(x => {
            questionTypes.push(x.question_type_id);
            assignment_question_type = { ...assignment_question_type, [x.question_type_id]: [] };
        });

        let field = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id', 'cdm_id', 'course_batch_id', 'batch_sem_id',];

        let questionData = {};

        field.map(x => questionData[x] = body[x]);

        for (let index = 0; index < body.questions.length; index++) {
            const element = body.questions[index];

            let checkAssignmentQuestionDetails = await checkAssignmentQuestion({ question_id: element, vaildQuestionBankType, vaildQuestionBank, vaildTopic, questionTypes, assignment_question_type });

            let obj = checkAssignmentQuestionDetails.questionObj ? checkAssignmentQuestionDetails.questionObj : {};
            if (!checkAssignmentQuestionDetails.success) {
                errQuestion.push({ message: checkAssignmentQuestionDetails.message, ...obj })
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

        if (!isEmpty(errQuestion)) {
            return ReE(res, { message: errQuestion }, HttpStatus.BAD_REQUEST);
        }

        if (isEmpty(vaildQuestion) || vaildQuestion.length != total_count) {
            return ReE(res, { message: `Assignment total question count was must equal to ${total_count} But vaild question count was ${vaildQuestion.length}!` }, HttpStatus.BAD_REQUEST);
        }
    }

    let codeName = `${String(moment(checkCourseSemesterDetails.batchSemesters.from).format('YYYY')).slice(2)}${String(body.name).trim().toLowerCase()}`;

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

            [err, checkCode] = await to(assignment_bank.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    let create, createData = {
        name: firstCap(String(body.name).trim()),
        from: yDate._d,
        to: lDate._d,
        org_id: body.org_id,
        code: code,
        discipline_id: body.discipline_id,
        program_id: body.program_id,
        department_id: body.department_id,
        subject_id: body.subject_id,
        question_bank_id: vaildQuestionBank,
        topic_id: vaildTopic,
        section_id: vaildSection,
        student_id: vaildStudent,
        cdm_id: body.cdm_id,
        course_batch_id: body.course_batch_id,
        batch_sem_id: body.batch_sem_id,
        mark: body.mark,
        total_mark: body.mark ? body.total_mark : 0,
        total_count: total_count,
        random: body.random,
        is_active: true,
        is_block: false,
        user_id: user._id,
        createdby: user._id,
        updatedby: user._id
    };

    [err, create] = await to(assignment_bank.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong to create assignment Bank!." }, HttpStatus.BAD_REQUEST);
    }

    let message = 'Assignment bank created';

    let createQuestionType, optionQuestionType = vaildQuestionBankType.map(x => ({ ...x, assignment_bank_id: create._id }));

    [err, createQuestionType] = await to(assignment_bank_type.bulkCreate(optionQuestionType));

    if (err) {
        message = message + err;
    }

    if (isNull(createQuestionType) || isEmpty(createQuestionType)) {
        return ReE(res, { message: message + " but Something went wrong to create assignment bank type details!." }, HttpStatus.BAD_REQUEST);
    }

    if (body.random == CONFIG.boolean[1]) {

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

    if (!isNull(createQuestionType)) {
        return ReS(res, { message: message }, HttpStatus.OK);
    }
}

module.exports.getAllAssigmentBank = async (req, res) => {

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

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: body.student_id || user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(checkUserDetails.userInfo.section_id)) {
            let checkSubject, optionSubject = {
                where: {
                    user_id: user._id,
                    is_active: true
                }
            };

            [err, checkSubject] = await to(user_subject.findAll(optionSubject));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }


            if (!isEmpty(checkSubject)) {
                body = { ...body, subject_id: checkSubject.map(x => x.subject_id) }
            }

        }

        if (!isNull(checkUserDetails.userInfo.section_id)) {
            body = { ...body, program_id: '', department_id: "", discipline_id: "", student_id: checkUserDetails.userInfo.user_id };
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (!isNull(body.org_id)) {
            org_id = body.org_id;
        }
    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }
    }

    let assignmentBanks, optionAssignmentBank = {
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
                model: course_batch,
                as: 'courseBatchId'
            },
            {
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: subject,
                as: 'subjectId'
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
        order: [
            ['createddate', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    if (!isNull(body.assignment_bank_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_id)) {
            return ReE(res, { message: "Please select vaild assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            _id: body.assignment_bank_id
        };
    }

    if (!isNull(body.question_bank_id)) {
        if (!IsValidUUIDV4(body.question_bank_id)) {
            return ReE(res, { message: "Please select vaild question bank details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            question_bank_id: { [Op.contains]: [body.question_bank_id] }
        };
    }

    if (!isNull(body.discipline_id)) {
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            discipline_id: body.discipline_id
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            program_id: body.program_id
        }
    }

    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            department_id: body.department_id
        }
    }

    if (!isNull(body.user_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id });

        if (!checkUserSubjectDetails.success) {
            return ReE(res, { message: checkUserSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.subject_id)) {

        if (!IsValidUUIDV4(body.subject_id) && !Array.isArray(body.subject_id)) {
            return { message: 'Please select vaild subject bank details!', success: false };
        }

        let subjectId;

        if (Array.isArray(body.subject_id)) {
            subjectId = body.subject_id
        } else {
            subjectId = [body.subject_id]
        }

        let errors = [];

        for (let index = 0; index < subjectId.length; index++) {
            const element = subjectId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild subject bank details!.');
            }

            let checkSubjectDetails = await checkSubject({ subject_id: element });

            if (!checkSubjectDetails.success) {
                errors.push(checkSubjectDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            subject_id: { [Op.in]: subjectId }
        };
    }

    if (!isNull(body.section_id)) {
        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            section_id: { [Op.contains]: [body.section_id] }
        }
    }

    if (!isNull(body.topic_id)) {
        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            topic_id: { [Op.contains]: [body.topic_id] }
        }
    }

    if (!isNull(body.student_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.student_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            student_id: { [Op.contains]: [body.student_id] }
        }
    }

    if (!isNull(body.user_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.user_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.from)) {

        const { from } = body;
        let today = moment.tz(new Date(), 'Asia/Calcutta')._d;
        let currentYear = moment(today, 'DD/MM/YYYY').format();

        if (from == 'present') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lte]: currentYear },
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'past') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.lt]: currentYear }
            }
        }

        if (from == 'notpast') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'notfuture') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lt]: currentYear }
            }
        }

        if (from == 'future') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.gte]: currentYear }
            }
        }
    }

    [err, assignmentBanks] = await to(assignment_bank.findAll(optionAssignmentBank));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(assignmentBanks)) {
        return ReE(res, { message: "Assignment Bank was not found!." }, HttpStatus.BAD_REQUEST);
    }
    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let questions = [];

    for (var i = 0; i < assignmentBanks.length; i++) {
        let x = assignmentBanks[i];

        let array, option = {
            where: {
                assignment_bank_id: x._id,
                is_active: true
            }
        };

        [err, array] = await to(assignment_bank_type.findAll(option));

        if (!isEmpty(array)) {
            x.setDataValue("assignment_bank_type", array)
        }

        let student, optionStudent = {
            where: {
                _id: { [Op.in]: x.student_id },
                is_active: true
            },
            attributes: ['_id', 'username', 'f_name', 'l_name']
        };

        [err, student] = await to(user_data.findAll(optionStudent));

        if (!isEmpty(student)) {

            let assignmentStudent, optionAssignmentStudent = {
                where: {
                    student_id: { [Op.in]: x.student_id },
                    assignment_bank_id: x._id,
                    is_active: true
                },
                attributes: ['_id', 'username', 'f_name', 'l_name']
            };

            [err, assignmentStudent] = await to(assignment_student.findAll(optionAssignmentStudent));

            if (!isNull(assignmentStudent) && !isEmpty(assignmentStudent)) {
                let ids = assignmentStudent.map(as => as.subject_id);
                student.map(sa => {
                    if (ids.includes(sa._id)) {
                        sa.setDataValue("started", true);
                        let ind = assignmentStudent.findIndex(x => x.student_id == sa._id);
                        if (assignmentStudent[ind].completed_count == assignmentStudent[ind].total_count) {
                            sa.setDataValue("completed", true);
                        } else {
                            sa.setDataValue("completed", false);
                        }
                    } else {
                        sa.setDataValue("started", false);
                        sa.setDataValue("completed", false);
                    }
                });
            }

            x.setDataValue("student_id", student);
        }

        let topics, optionTopic = {
            where: {
                _id: { [Op.in]: x.topic_id },
                is_active: true
            },
            attributes: ['_id', 'name']
        };

        [err, topics] = await to(topic.findAll(optionTopic));

        if (!isEmpty(topics)) {
            x.setDataValue("topic_id", topics);
        }


        let sections, optionSection = {
            where: {
                _id: { [Op.in]: x.section_id },
                is_active: true
            },
            attributes: ['_id', 'name']
        };

        [err, sections] = await to(section.findAll(optionSection));

        if (!isEmpty(sections)) {
            x.setDataValue("section_id", sections);
        }

        let started = false, available = true, completed = false, update = false;

        let fDate = moment(x.from);

        let fDuration = moment.duration(moment(fDate._d).diff(today)).asSeconds()

        let ufDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes()

        let lDate = moment(x.to);

        let lDuration = moment.duration(moment(lDate._d).diff(today)).asSeconds();

        if (ufDuration > 59) {
            update = true;
        }

        if (fDuration < 0 && lDuration > 0) {
            available = true;
            started = true;
        }

        if (lDuration < 0) {
            completed = true;
            available = false;
        }

        x.setDataValue("available", available);
        x.setDataValue("started", started);
        x.setDataValue("completed", completed);
        x.setDataValue("update", update);
        questions.push(x);
    };

    if (!isEmpty(questions)) {
        return ReS(res, { message: "Assignment bank was fatched!.", assignmentBank: questions }, HttpStatus.OK);
    }


}

module.exports.getAllAssigmentBankSubject = async (req, res) => {

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

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(checkUserDetails.userInfo.section_id) && isNull(checkUserDetails.userInfo.cdm_id)) {
            let checkSubject, optionSubject = {
                where: {
                    user_id: user._id,
                    is_active: true
                }
            };

            [err, checkSubject] = await to(user_subject.findAll(optionSubject));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (!isEmpty(checkSubject)) {
                let subjectIds = checkSubject.map(x => x.subject_id);
                body = { ...body, subject_id: subjectIds };
            }

        }

        if (!isNull(checkUserDetails.userInfo.section_id) || !isNull(checkUserDetails.userInfo.cdm_id)) {
            return ReE(res, { message: "Student not allow to access this service!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }



    if (user.owner) {
        if (!isNull(body.org_id)) {
            org_id = body.org_id;
        }
    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }
    }



    let assignmentSubject, optionAssignmentSubject = {
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
                model: batch_sem,
                as: 'batchSemId'
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: subject,
                as: 'subjectId'
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
        order: [
            ['createddate', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionAssignmentSubject = {
            ...optionAssignmentSubject,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentSubject = {
            ...optionAssignmentSubject,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    if (!isNull(body.discipline_id)) {
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            discipline_id: body.discipline_id
        }
    }


    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            program_id: body.program_id
        }
    }


    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            department_id: body.department_id
        }
    }


    if (!isNull(body.subject_id)) {

        if (!IsValidUUIDV4(body.subject_id) && !Array.isArray(body.subject_id)) {
            return { message: 'Please select vaild subject bank details!', success: false };
        }

        let subjectId;

        if (Array.isArray(body.subject_id)) {
            subjectId = body.subject_id
        } else {
            subjectId = [body.subject_id]
        }

        let errors = [];

        for (let index = 0; index < subjectId.length; index++) {
            const element = subjectId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild subject bank details!.');
            }

            let checkSubjectDetails = await checkSubject({ subject_id: element });

            if (!checkSubjectDetails.success) {
                errors.push(checkSubjectDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            subject_id: { [Op.in]: subjectId }
        };

    }

    if (!isNull(body.cdm_id)) {
        let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id });

        if (!checkCourseDepartmentDetails.success) {
            return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            cdm_id: body.cdm_id
        }
    }


    if (!isNull(body.course_batch_id)) {
        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            course_batch_id: body.course_batch_id
        }
    }


    if (!isNull(body.batch_sem_id)) {
        let checkBatchSemDetails = await checkBatchSemester({ batch_sem_id: body.batch_sem_id });

        if (!checkBatchSemDetails.success) {
            return ReE(res, { message: checkBatchSemDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            batch_sem_id: body.batch_sem_id
        }
    }


    [err, assignmentSubject] = await to(subject_mapping.findAll(optionAssignmentSubject));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(assignmentSubject)) {
        return ReE(res, { message: "Subject  was not yet mapped!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.from)) {

        const { from } = body;
        let today = moment.tz(new Date(), 'Asia/Calcutta')._d;
        let currentYear = moment(today, 'DD/MM/YYYY').format();

        if (from == 'present') {
            optionAssignmentSubject.where = {
                ...optionAssignmentSubject.where,
                from: { [Op.lte]: currentYear },
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'past') {
            optionAssignmentSubject.where = {
                ...optionAssignmentSubject.where,
                to: { [Op.lt]: currentYear }
            }
        }

        if (from == 'notpast') {
            optionAssignmentSubject.where = {
                ...optionAssignmentSubject.where,
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'notfuture') {
            optionAssignmentSubject.where = {
                ...optionAssignmentSubject.where,
                from: { [Op.lt]: currentYear }
            }
        }

        if (from == 'future') {
            optionAssignmentSubject.where = {
                ...optionAssignmentSubject.where,
                from: { [Op.gte]: currentYear }
            }
        }
    }

    let errSubject = [], vaildAssignmentDetails = [];

    for (let index = 0; index < assignmentSubject.length; index++) {
        let element = assignmentSubject[index], option = { subjectId: element.subjectId, total: 0, completed: 0, pending: 0, student_count: 0, total_mark: 0, total_question: 0 };

        let assignmentBanks;

        optionAssignmentSubject.where = {
            ...optionAssignmentSubject.where,
            subject_id: element.subject_id
        };

        [err, assignmentBanks] = await to(assignment_bank.findAll(optionAssignmentSubject));

        if (err) {
            errSubject.push({ message: err, subject: element.subjectId });
        }

        if (!isEmpty(assignmentBanks)) {
            option = { ...option, assignmentBanks, total: assignmentBanks.length, completed: 0, pending: 0 };

            for (let index = 0; index < assignmentBanks.length; index++) {
                let assignment = assignmentBanks[index], studentAssignment, optionStudent = {
                    where: {
                        assignment_bank_id: assignment._id
                    }
                };

                [err, studentAssignment] = await to(assignment_student.findAll(optionStudent));

                if (err) {
                    errSubject.push({ message: err, subject: element.subjectId });
                } else if (isEmpty(studentAssignment)) {
                    option = { ...option, total: assignmentBanks.length, completed: option.completed, pending: option.pending + 1 };
                } else if (!isEmpty(studentAssignment)) {

                    let studentAss = studentAssignment.filter(x => {
                        if (!Array.isArray(x.status)) {
                            return false
                        }

                        if (!Array.isArray(x.status)) {
                            let status = x.status.filter(x.action)

                            if (status.includes(CONFIG.assignmentStatus[3])) {
                                return true
                            } else {
                                return false
                            }
                        }
                    });

                    if (studentAss.length !== assignment.student_id.length) {
                        option = { ...option, total: assignmentBanks.length, completed: option.completed, pending: option.pending + 1 };
                    } else {
                        option = { ...option, total: assignmentBanks.length, completed: option.completed + 1, pending: option.pending + 1 };
                    }

                }
            }
            vaildAssignmentDetails.push(option);
        }

    }

    if (!isEmpty(errSubject)) {
        return ReE(res, { message: errSubject }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildAssignmentDetails)) {
        return ReE(res, { message: "Assignment data was empty!." }, HttpStatus.BAD_REQUEST);
    }


    if (!isEmpty(vaildAssignmentDetails)) {
        return ReS(res, { message: "Assignment was fatched!.", assignmentSubject: vaildAssignmentDetails }, HttpStatus.OK);
    }
}

module.exports.getAssigmentBank = async (req, res) => {

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

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (!isNull(body.org_id)) {
            org_id = body.org_id;
        }

    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }
    }

    let assignmentBanks, optionAssignmentBank = {
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
        order: [
            ['createddate', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (isNull(req.params.assignment_bank_id)) {
        return ReE(res, { message: "Please select assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(req.params.assignment_bank_id)) {
        if (!IsValidUUIDV4(req.params.assignment_bank_id)) {
            return ReE(res, { message: "Please select vaild assignemnet bank details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            _id: req.params.assignment_bank_id
        };
    }


    if (!isNull(body.question_bank_id)) {
        if (!IsValidUUIDV4(body.question_bank_id)) {
            return ReE(res, { message: "Please select vaild question bank details!." }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            question_bank_id: { [Op.contains]: [body.question_bank_id] }
        };
    }

    if (!isNull(body.discipline_id)) {
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            discipline_id: body.discipline_id
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            program_id: body.program_id
        }
    }

    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            department_id: body.department_id
        }
    }

    if (!isNull(body.subject_id)) {

        if (!IsValidUUIDV4(body.subject_id) && !Array.isArray(body.subject_id)) {
            return { message: 'Please select vaild subject bank details!', success: false };
        }

        let subjectId;

        if (Array.isArray(body.subject_id)) {
            subjectId = body.subject_id
        } else {
            subjectId = [body.subject_id]
        }

        let errors = [];

        for (let index = 0; index < subjectId.length; index++) {
            const element = subjectId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild subject bank details!.');
            }

            let checkSubjectDetails = await checkSubject({ subject_id: element });

            if (!checkSubjectDetails.success) {
                errors.push(checkSubjectDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            subject_id: { [Op.in]: subjectId }
        };
    }

    if (!isNull(body.user_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id });

        if (!checkUserSubjectDetails.success) {
            return ReE(res, { message: checkUserSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.section_id)) {
        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            section_id: { [Op.contains]: [body.section_id] }
        }
    }

    if (!isNull(body.topic_id)) {
        let checkTopicDetails = await checkTopic({ topic_id: body.topic_id });

        if (!checkTopicDetails.success) {
            return ReE(res, { message: checkTopicDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            topic_id: { [Op.contains]: [body.topic_id] }
        }
    }

    if (!isNull(body.student_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.student_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            student_id: { [Op.contains]: [body.student_id] }
        }
    }

    if (!isNull(body.user_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.user_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.from)) {

        const { from } = body;
        let today = moment.tz(new Date(), 'Asia/Calcutta')._d;
        let currentYear = moment(today, 'DD/MM/YYYY').format();

        if (from == 'present') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lte]: currentYear },
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'past') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.lt]: currentYear }
            }
        }

        if (from == 'notpast') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'notfuture') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lt]: currentYear }
            }
        }

        if (from == 'future') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.gte]: currentYear }
            }
        }
    }

    [err, assignmentBanks] = await to(assignment_bank.findOne(optionAssignmentBank));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(assignmentBanks)) {
        return ReE(res, { message: "Question Bank was not found!." }, HttpStatus.BAD_REQUEST);
    }

    let questions;

    let x = assignmentBanks;

    let array, option = {
        where: {
            assignment_bank_id: x._id,
            is_active: true
        }
    };

    [err, array] = await to(assignment_bank_type.findAll(option));

    if (!isEmpty(array)) {
        x.setDataValue("assignment_bank_type", array)
    }

    let student, optionStudent = {
        where: {
            _id: { [Op.in]: x.student_id },
            is_active: true
        },
        attributes: ['_id', 'username', 'f_name', 'l_name']
    };

    [err, student] = await to(user_data.findAll(optionStudent));

    if (!isEmpty(student)) {
        x.setDataValue("student_id", student);
    }

    let topics, optionTopic = {
        where: {
            _id: { [Op.in]: x.topic_id },
            is_active: true
        },
        attributes: ['_id', 'name']
    };

    [err, topics] = await to(topic.findAll(optionTopic));

    if (!isEmpty(topics)) {
        x.setDataValue("topic_id", topics);
    }


    let sections, optionSection = {
        where: {
            _id: { [Op.in]: x.section_id },
            is_active: true
        },
        attributes: ['_id', 'name']
    };

    [err, sections] = await to(section.findAll(optionSection));

    if (!isEmpty(sections)) {
        x.setDataValue("section_id", sections);
    }

    questions = x;

    if (!isNull(questions)) {
        return ReS(res, { message: "Assignment bank was fatched!.", assignmentBank: questions }, HttpStatus.OK);
    }
}

module.exports.updateAssignmentBank = async (req, res) => {
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

    let org_id;

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (!isNull(body.org_id)) {
            org_id = body.org_id;
        }

    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }
    }

    if (isNull(body.assignment_bank_id) || !IsValidUUIDV4(body.assignment_bank_id)) {
        return ReE(res, { message: "Please select vaild assignment bank details!" }, HttpStatus.BAD_REQUEST);
    }

    let checkAssignmentBankDetails = await checkAssignmentBank({ _id: body.assignment_bank_id, status: 'all' });

    if (!checkAssignmentBankDetails.success) {
        return ReE(res, { message: checkAssignmentBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let today = moment.tz(moment()._d, 'Asia/Calcutta')._d;

    let fields = ['name', 'active', 'to', 'from', 'mark'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated Question type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.assignment_bank_id,
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

        if (checkAssignmentBankDetails.assignmentBank.is_block == status) {
            return ReE(res, { message: `Assignment bank was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { assignmentBank } = checkAssignmentBankDetails;

        let updateAbleFields = await existFields.filter(x => assignmentBank[x] != body[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update assignment bank details!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('name')) {

            if (assignmentBank.name === String(firstCap(body.name)).trim()) {
                return ReE(res, { message: "Please edit assignment name to update assignment details!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.name).length < 4) {
                return ReE(res, { message: "Please enter vaild question bank name with more then 4 character!." }, HttpStatus.BAD_REQUEST);
            }

            let checkQuestionBankDetails = await checkAssignmentBank({ name: body.name, status: 'all', subject_id: assignmentBank.subject_id, cdm_id: assignmentBank.cdm_id, course_batch_id: assignmentBank.course_batch_id, section_id: assignmentBank.section_id });

            if (checkQuestionBankDetails.success) {
                return ReE(res, { message: "Assignment Bank name was already exits for this course subject details!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: String(firstCap(body.name).trim())
            }
        }

        if (updateAbleFields.includes('from')) {

            let fDate = moment(assignmentBank.from);

            fDate = moment(fDate._d, 'DD/MM/YYYY hh:mm');

            let fDuration = moment.duration(moment(fDate._d).diff(today)).asHours();

            if (Math.floor(fDuration) < 1) {
                return ReE(res, { message: "You can edit assignment start time before a hour, so you can't edit now!." }, HttpStatus.BAD_REQUEST);
            }

            let yDate = moment(body.from, 'DD/MM/YYYY hh:mm');
            yDate = moment.tz(yDate._d, 'Asia/Calcutta');

            if (!moment(yDate._d).isValid()) {
                return ReE(res, { message: "Please enter vaild assignment bank start time details!." }, HttpStatus.BAD_REQUEST);
            }

            if (fDate.isSame(yDate)) {
                return ReE(res, { message: "Please edit assignment start date to update assignment details!." }, HttpStatus.BAD_REQUEST);
            }

            if (!moment(yDate._d).isValid()) {
                return ReE(res, { message: "Please enter vaild assignment bank start date details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkDuration = moment.duration(moment(yDate._d).diff(today)).asHours();

            if (Math.floor(checkDuration) < 1) {
                return ReE(res, { message: "Assignment Bank start date must with more then on a hour from currect time!." }, HttpStatus.BAD_REQUEST);
            }

            let lDate = moment(assignmentBank.to, 'DD/MM/YYYY hh:mm');
            lDate = moment.tz(yDate._d, 'Asia/Calcutta');

            if (!moment(lDate._d).isValid()) {
                return ReE(res, { message: "Please enter vaild assignment bank end time details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkDurationL = moment.duration(moment(lDate._d).diff(yDate._d)).asHours();

            if (Math.floor(checkDurationL) < 1) {
                return ReE(res, { message: "Assignment Bank end time must with greater 1 hour assignment start time!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                from: yDate._d,
            }

        }

        if (updateAbleFields.includes('mark')) {

            let fDate = moment(checkAssignmentBankDetails.assignmentBank.to);

            let fDuration = moment.duration(moment(fDate._d).diff(today)).asMinutes();

            if (fDuration <= 30) {
                let message = fDuration < 0 ? "Sorry you can't update already started assignments!." : "You can update assignment start time before 30 mins!."
                return ReE(res, { message: message }, HttpStatus.BAD_REQUEST);
            }

            if (!CONFIG.boolean.includes(body.mark)) {
                return ReE(res, { message: "Please select vaild assignment bank mark details!." }, HttpStatus.BAD_REQUEST);
            }

            if (body.mark == assignmentBank.mark) {
                return ReE(res, { message: "Please edit something to assignment mark details!." }, HttpStatus.BAD_REQUEST);
            }

            let total_mark = 0;

            if (body.mark == CONFIG.boolean[0]) {
                let getQuestionBankTypeDetails = await getAssignmentBankTypes({ assignment_bank_id: assignmentBank.assignment_bank_id });


                if (getQuestionBankTypeDetails.success) {
                    let { assignmentBankTypes } = getQuestionBankTypeDetails;

                    assignmentBankTypes.map(x => {
                        total_mark = total_mark + (Number(x.count) * Number(x.mark));
                    });
                }
            }

            updatedData.set = {
                ...updatedData.set,
                total_mark: total_mark,
                mark: body.mark
            };
        }

        if (updateAbleFields.includes('to')) {

            let TDate = moment(assignmentBank.from);

            let lDate = moment(body.to, 'DD/MM/YYYY hh:mm');

            lDate = moment.tz(lDate._d, 'Asia/Calcutta');

            if (!moment(lDate._d).isValid()) {
                return ReE(res, { message: "Please enter vaild assignment bank end time details!." }, HttpStatus.BAD_REQUEST);
            }

            if (TDate.isSame(lDate)) {
                return ReE(res, { message: "Please edit assignment end date to update assignment details!." }, HttpStatus.BAD_REQUEST);
            }

            let yDate = moment(assignmentBank.from);

            if (updatedData.set.from) {
                yDate = moment(updatedData.set.from);
            }

            let checkDurationL = moment.duration(moment(lDate._d).diff(yDate._d)).asHours();

            if (Math.floor(checkDurationL) < 1) {
                return ReE(res, { message: "Assignment Bank end time must with greater 1 hour assignment start time!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                to: lDate._d,
            }

        }

        let update;

        [err, update] = await to(assignment_bank.update(updatedData.set, { where: updatedData.where }));

        if (err) {
            return ReE(res, err, HttpStatus.BAD_REQUEST);
        }

        if (isNull(update)) {
            return ReE(res, { message: "Something went wrong to update assignment bank!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isNull(update)) {
            return ReS(res, { message: "Assignment bank was updated!." }, HttpStatus.OK);
        }
    }
}

const checkAssignmentBank = async (body) => {

    let assignmentBank, optionAssignmentBank = {
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
                model: subject,
                as: 'subjectId'
            },
            {
                model: department,
                as: 'departmentId'
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
        order: [
            ['createddate', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionAssignmentBank = {
            ...optionAssignmentBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.assignment_bank_id)) {
        if (!IsValidUUIDV4(body.assignment_bank_id)) {
            return { message: "Please select vaild assignment bank details!.", success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            _id: body.assignment_bank_id
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

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            question_bank_id: { [Op.contains]: questionBankId }
        };
    }

    if (!isNull(body.name)) {
        if (String(body.name).length < 4) {
            return { message: "Please enter vaild question bank name with more then 4 character!.", success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            name: firstCap(String(body.name).trim())
        };

    }

    if (!isNull(body.subject_id)) {

        if (!IsValidUUIDV4(body.subject_id) && !Array.isArray(body.subject_id)) {
            return { message: 'Please select vaild subject bank details!', success: false };
        }

        let subjectId;

        if (Array.isArray(body.subject_id)) {
            subjectId = body.subject_id
        } else {
            subjectId = [body.subject_id]
        }

        let errors = [];

        for (let index = 0; index < subjectId.length; index++) {
            const element = subjectId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild subject bank details!.');
            }

            let checkSubjectDetails = await checkSubject({ subject_id: element });

            if (!checkSubjectDetails.success) {
                errors.push(checkSubjectDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            subject_id: { [Op.in]: subjectId }
        };
    }

    if (!isNull(body.section_id)) {

        let sectionId;

        if (!IsValidUUIDV4(body.section_id) && !Array.isArray(body.section_id)) {
            return { message: 'Please select vaild section details!', success: false };
        }

        if (Array.isArray(body.section_id)) {
            sectionId = body.section_id
        } else {
            sectionId = [body.section_id]
        }

        let errors = [];

        for (let index = 0; index < sectionId.length; index++) {
            const element = sectionId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild section details!.');
            }

            let checkSectionDetails = await checkSection({ section_id: element });

            if (!checkSectionDetails.success) {
                errors.push(checkSectionDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            section_id: { [Op.contains]: sectionId }
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

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            topic_id: { [Op.contains]: topicId }
        }
    }

    if (!isNull(body.student_id)) {

        let studentId;

        if (!IsValidUUIDV4(body.student_id) && !Array.isArray(body.student_id)) {
            return { message: 'Please select vaild student details!', success: false };
        }

        if (Array.isArray(body.student_id)) {
            studentId = body.student_id
        } else {
            studentId = [body.student_id]
        }

        let errors = [];

        for (let index = 0; index < studentId.length; index++) {
            const element = studentId[index];

            if (!IsValidUUIDV4(element)) {
                errors.push('Please select vaild students details!.');
            }

            let checkStudentDetails = await checkUser({ user_id: element });

            if (!checkStudentDetails.success) {
                errors.push(checkStudentDetails.message);
            }

        }

        if (!isEmpty(errors)) {
            return { message: errors, success: false };
        }

        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            student_id: { [Op.contains]: studentId }
        }
    }

    if (!isNull(body.user_id)) {
        let checkStudentDetails = await checkUser({ user_id: body.user_id });

        if (!checkStudentDetails.success) {
            return ReE(res, { message: checkStudentDetails.message }, HttpStatus.BAD_REQUEST);
        }
        optionAssignmentBank.where = {
            ...optionAssignmentBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.from)) {

        const { from } = body;
        let today = moment.tz(new Date(), 'Asia/Calcutta')._d;
        let currentYear = moment(today, 'DD/MM/YYYY').format();

        if (from == 'present') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lte]: currentYear },
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'past') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.lt]: currentYear }
            }
        }

        if (from == 'notpast') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                to: { [Op.gte]: currentYear }
            }
        }

        if (from == 'notfuture') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.lt]: currentYear }
            }
        }

        if (from == 'future') {
            optionAssignmentBank.where = {
                ...optionAssignmentBank.where,
                from: { [Op.gte]: currentYear }
            }
        }
    }

    [err, assignmentBank] = await to(assignment_bank.findOne(optionAssignmentBank));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(assignmentBank)) {
        return { message: "Assignment Bank was not found!.", success: false };
    }

    if (!isNull(assignmentBank)) {
        return { message: "Assignment bank was fatched!.", assignmentBank: assignmentBank, success: true };
    }

}

module.exports.checkAssignmentBank = checkAssignmentBank;

const checkAssignmentQuestion = async (body) => {

    const { question_id, vaildQuestionBankType, vaildQuestionBank, vaildTopic, questionTypes, assignment_question_type } = body;

    let checkQuestionDetails = await checkQuestion({ question_id: question_id });

    if (!checkQuestionDetails.success) {
        return { message: checkQuestionDetails.message, success: false };
    }

    let { question } = checkQuestionDetails;

    let questionObj = {
        question_id: question._id,
        question: firstCap(String(question.question).trim()),
        option: question.option,
        correct_answer: question.correct_answer,
        code: question.code,
        is_active: true,
        is_block: false
    };

    let eFields = ['org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'topic_id', 'sub_topic_id', 'question_type_id', 'question_bank_id', 'question'];

    eFields.map(x => questionObj[x] = question[x]);

    let index = await vaildQuestionBankType.findIndex(x => x.question_type_id == question.question_type_id);

    if (!vaildQuestionBank.includes(question.question_bank_id)) {
        return { message: "Assignment Question is not exist on you are selected question bank's!.", questionObj, success: false };
    }

    if (!vaildTopic.includes(question.topic_id)) {
        return { message: "Assignment Question topic is not exist on you are selected topic's!.", questionObj, success: false };
    }

    if (!questionTypes.includes(question.question_type_id)) {
        return { message: "Assignment Question type is not exist  on you are select question type's!.", questionObj, success: false };
    }

    if (assignment_question_type[question.question_type_id].length > vaildQuestionBankType[index].count) {
        return { message: "You are already reached assignment question limit for this question types, so please remove excess questions!.", questionObj, success: false };
    }

    if (assignment_question_type[question.question_type_id].includes(question_id)) {
        return { message: "Assignment Question don't allow dublicate questions!.", questionObj, success: false };
    }

    let codeName = `${question.code}ASS`;

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

            [err, checkCode] = await to(question_bank.findOne({
                where: codeOption
            }));

            if (!isNull(checkCode)) {
                data();
            }
        }
    }

    data();

    return { message: "Question ready to add!.", success: true, questionObj: { ...questionObj, code: code } };
}

module.exports.checkAssignmentQuestion = checkAssignmentQuestion;

const checkAssignmentQuestionType = async (body) => {

    const { vaildQuestionBankType, vaildQuestionBank, mark, count, vaildTopic } = body;

    let typeFields = ['question_bank_id', 'question_type_id', 'count'];

    let inVaildType = typeFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildType)) {
        return { message: `Please enter required assignment bank question type details ${typeFields}!.`, success: false };
    }

    let isDublicate = vaildQuestionBankType.filter(x => x.question_type_id == body.question_type_id);

    if (!isEmpty(isDublicate)) {
        return { message: `Please remove dublicate assignment question bank's type details!.`, success: false };
    }

    let error = [], vaildQuestionTypeBanks = [];
    if (!Array.isArray(body.question_bank_id)) {
        return { message: "Please select vaild question type's bank details!.", success: false };
    }

    for (let index = 0; index < body.question_bank_id.length; index++) {
        const element = body.question_bank_id[index];

        if (!vaildQuestionBank.includes(element)) {
            error.push(`Please select vaild assignment question bank's type details!.`);
        } else {

            let checkQuestionTypeDetails = await checkQuestionBankType({ question_type_id: body.question_type_id, question_bank_id: element });

            if (!checkQuestionTypeDetails.success) {
                error.push(`Please select vaild assignment bank's type details!.`);
            } else {
                vaildQuestionTypeBanks.push(checkQuestionTypeDetails.questionBankType?.question_bank_id);
            }
        }
    }

    if (!isEmpty(error)) {
        return { message: error, success: false };
    }

    if (isEmpty(vaildQuestionTypeBanks) || vaildQuestionTypeBanks.length !== body.question_bank_id.length) {
        return { message: "Please check your question type's bank details and remove invaild  bank's details!.", success: false };
    }


    if (isNaN(count)) {
        return { message: `Please select vaild assignment bank's type count details!.`, success: false };
    }

    let getAllQuestionDetails = await getQuestion({ question_type_id: body.question_type_id, question_bank_id: vaildQuestionTypeBanks, topic_id: vaildTopic });

    if (!getAllQuestionDetails.success) {
        return { message: "Please add questions  first for your are select question bank's type!.", success: false };
    }

    if (Number(count) > getAllQuestionDetails.questions.length) {
        return { message: `You Assignment bank's question type count must with in avalible questions ${getAllQuestionDetails.questions.length}!.`, success: false };
    }

    if (mark == true && (isNull(mark) || isNaN(mark) || Number(mark) <= 0 || Number(mark) >= 100)) {
        return { message: `Please select vaild assignment bank's type mark within 1 to 100!.`, success: false };
    }

    return {
        message: "Assignment bank type was vailded!", success: true,
        questiontype: {
            question_type_id: body.question_type_id,
            count: Number(body.count),
            question_bank_id: body.question_bank_id,
            is_active: true,
            is_block: false,
            user_id: body.user._id,
            createdby: body.user._id,
            updatedby: body.user._id
        }
    };

}
