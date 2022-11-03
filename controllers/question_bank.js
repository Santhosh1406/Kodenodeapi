const { question_type, question_bank, question_bank_type, discipline, department, organization, program, user_data, subject, course_department_mapping } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const moment = require('moment');
const { isNull, ReE, to, ReS, isEmpty, firstCap, generateCode, generateCodeName } = require('../service/util.service');
const { checkMenuAccess, checkOrganization, checkDiscipline, checkUserInf } = require('./common');
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const { checkProgram } = require('./program');
const { checkDepartment } = require('./department');
const { checkSubject } = require('./subject');
const { checkQuestionTypeValue } = require('./question_type');

module.exports.createQuestionBank = async (req, res) => {
    let body = req.body;
    const user = req.user;

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

    let fields = ['name', 'year', 'org_id', 'discipline_id', 'program_id', 'department_id', 'subject_id', 'questions'];

    let inVaildFields = await fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
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

    let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id, department_id: body.department_id });

    if (!checkSubjectDetails.success) {
        return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (String(body.name).length < 4) {
        return ReE(res, { message: "Please enter vaild question bank name with more then 4 character!." }, HttpStatus.BAD_REQUEST);
    }

    let yDate = moment(body.year, 'DD/MM/YYYY');

    if (!moment(yDate._d).isValid()) {
        return ReE(res, { message: "Please enter vaild question bank year details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkDuration = moment.duration(moment(yDate._d).diff(new Date())).asYears();

    if (Math.floor(checkDuration) < -1 || 1 < Math.floor(checkDuration)) {
        return ReE(res, { message: "Question Bank year must with pervious or next year from current year!." }, HttpStatus.BAD_REQUEST);
    }

    let checkQuestionBankDetails = await checkQuestionBank({ name: body.name, status: 'all', year: yDate._d, subject_id: body.subject_id });

    if (checkQuestionBankDetails.success) {
        return ReE(res, { message: "Question Bank name was already exits!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.description)) {
        if (String(body.description).length > 300 || String(body.description).length < 100) {
            return ReE(res, { message: `Please enter question bank description with in 100 to 300 characters!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    if (isNull(body.questions) && isEmpty(body.questions)) {
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

            let checkQuestionTypeDetails = await checkQuestionTypeValue({ question_type_id: element.question_type_id });

            if (!checkQuestionTypeDetails.success) {
                errQuestion.push({ ...element, message: checkQuestionTypeDetails.message });
            }

            if (checkQuestionTypeDetails.success) {
                if (isNull(element.count) || isNaN(element.count) || Number(element.count) < 0 || Number(element.count) > CONFIG.question.questionMax) {
                    errQuestion.push({ ...element, message: `Please enter vaild question count must within 0 to ${CONFIG.question.questionMax}!.` })
                } else {
                    vaildQuestion.push({ question_type_id: element.question_type_id, count: Number(element.count), is_active: true, is_block: false, user_id: user._id, createdby: user._id, updatedby: user._id });
                    total_count = total_count + Number(element.count);
                    vaildIds.push(element.question_type_id);
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

    let codeName = `${String(yDate.format('YYYY')).slice(2)}${checkSubjectDetails.subjectDetails.name}`;

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

    let year = `01/${moment(body.year, 'DD/MM/YYYY').format('MM')}/${moment(body.year, 'DD/MM/YYYY').format('YYYY')}`;

    let create, createData = {
        name: firstCap(String(body.name)),
        year: moment(year, 'DD/MM/YYYY').format(),
        org_id: body.org_id,
        code: code,
        discipline_id: body.discipline_id,
        program_id: body.program_id,
        department_id: body.department_id,
        subject_id: body.subject_id,
        total_count: total_count,
        is_active: true,
        is_block: false,
        user_id: user._id,
        createdby: user._id,
        updatedby: user._id
    };

    [err, create] = await to(question_bank.create(createData));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(create)) {
        return ReE(res, { message: "Something went wrong to create question Bank!." }, HttpStatus.BAD_REQUEST);
    }

    let message = 'Question bank created';

    let createQuestionType, optionQuestion = vaildQuestion.map(x => ({ ...x, question_bank_id: create._id }));


    [err, createQuestionType] = await to(question_bank_type.bulkCreate(optionQuestion));

    if (err) {
        message = message + err;
    }

    if (isNull(createQuestionType) || isEmpty(createQuestionType)) {
        return ReE(res, { message: message + " but Something went wrong to create question bank type details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createQuestionType)) {
        return ReS(res, { message: message }, HttpStatus.OK)
    }

}

module.exports.getAllQuestionBank = async (req, res) => {

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

    let questionBanks, optionQuestionBank = {
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
            ['year', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_bank_id)) {
        if (!IsValidUUIDV4(body.question_bank_id)) {
            return { message: "Please select vaild question bank details!.", success: false };
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            _id: body.question_bank_id
        };
    }

    if (!isNull(body.discipline_id)) {
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            discipline_id: body.discipline_id
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            program_id: body.program_id
        }
    }

    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            department_id: body.department_id
        }
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.user_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.year)) {
        let yDate = moment(body.year);

        if (!moment(yDate._d).isValid()) {
            return ReE(res, { message: "Please enter vaild question bank year details!.", }, HttpStatus.BAD_REQUEST);
        }

        let fDate = moment(`01/01/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        let lDate = moment(`31/12/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            year: {
                [Op.and]: [{ [Op.gte]: fDate._d }, { [Op.lte]: lDate._d }]
            }
        };

    }

    [err, questionBanks] = await to(question_bank.findAll(optionQuestionBank));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(questionBanks)) {
        return ReE(res, { message: "Question Bank was not found!." }, HttpStatus.BAD_REQUEST);
    }

    let questions = [];

    for (var i = 0; i < questionBanks.length; i++) {
        let x = questionBanks[i];

        let array, option = {
            where: {
                question_bank_id: x._id,
                is_active: true
            }
        };

        [err, array] = await to(question_bank_type.findAll(option));

        if (!isEmpty(array)) {
            x.setDataValue("question_bank_type", array)
        }
        questions.push(x);
    };

    if (!isEmpty(questions)) {
        return ReS(res, { message: "Question bank was fatched!.", questionBanks: questions }, HttpStatus.OK);
    }


}

module.exports.getQuestionBank = async (req, res) => {

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

    let questionBanks, optionQuestionBank = {
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
            ['year', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
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

    if (isNull(req.params.question_bank_id) || !IsValidUUIDV4(req.params.question_bank_id)) {
        return ReE(res, { message: "Please select vaild question bank details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(org_id)) {
        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.success) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            org_id: org_id
        };
    }



    optionQuestionBank.where = {
        ...optionQuestionBank.where,
        _id: req.params.question_bank_id
    };

    if (!isNull(body.discipline_id)) {

        const { checkDiscipline } = require('./discipline');
        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            discipline_id: body.discipline_id
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            program_id: body.program_id
        }
    }

    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            department_id: body.department_id
        }
    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            subject_id: body.subject_id
        }
    }

    if (!isNull(body.user_id)) {

        let checkUserSubjectDetails = await checkUserSubject({ user_id: body.user_id });

        if (!checkUserSubjectDetails.success) {
            return { message: checkUserSubjectDetails.message, success: false };
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            user_id: body.user_id
        }
    }

    if (!isNull(body.year)) {
        let yDate = moment(body.year);

        if (!moment(yDate._d).isValid()) {
            return ReE(res, { message: "Please enter vaild question bank year details!.", }, HttpStatus.BAD_REQUEST);
        }

        let fDate = moment(`01/01/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        let lDate = moment(`31/12/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            year: {
                [Op.and]: [{ [Op.gte]: fDate._d }, { [Op.lte]: lDate._d }]
            }
        };

    }

    [err, questionBanks] = await to(question_bank.findOne(optionQuestionBank));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(questionBanks)) {
        return ReE(res, { message: "Question Bank was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(questionBanks)) {
        return ReS(res, { message: "Question bank was fatched!.", questionBanks }, HttpStatus.OK);
    }


}

module.exports.updateQuestionBank = async (req, res) => {
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

    let fields = ['name', 'active', 'year'];

    let existFields = fields.filter(x => !isNull(body[x]));

    if (isEmpty(existFields)) {
        return ReE(res, { message: `Please enter something to updated Question type!.` }, HttpStatus.BAD_REQUEST);
    }

    let updatedData = {
        where: {
            _id: body.question_bank_id,
            is_active: true
        },
        set: {
            updatedby: user._id
        }
    };

    let checkQuestionBankDetails = await checkQuestionBank({ _id: body.question_bank_id, status: 'all' });

    if (!checkQuestionBankDetails.success) {
        return ReE(res, { message: checkQuestionBankDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkQuestionBankDetails.questionBank.is_block == status) {
            return ReE(res, { message: `Question bank was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updatedData.set = {
            ...updatedData.set,
            is_block: status
        }
    } else {

        let { questionBank } = checkQuestionBankDetails;

        let updateAbleFields = existFields.filter(x => body[x] != questionBank[x]);

        if (isEmpty(updateAbleFields)) {
            return ReE(res, { message: "Please edit something to update question type!." }, HttpStatus.BAD_REQUEST);
        }

        if (updateAbleFields.includes('name')) {

            if (body.name === questionBank.name) {
                return ReE(res, { message: "Please edit question bank name to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.name).length < 3) {
                return ReE(res, { message: "Please enter vaild quetion bank name with more then 2 character!" }, HttpStatus.BAD_REQUEST);
            }

            let checkName = await checkQuestionBank({ name: body.name, year: questionBank.year, status: 'all' });

            if (checkName.success) {
                return ReE(res, { message: "Question Bank name was already exists on this year!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: firstCap(String(body.name).trim())
            }
        }

        if (updateAbleFields.includes('year')) {

            let year = moment(questionBank.year);

            let bYear = moment(body.year, 'DD/MM/YYYY');

            if (!moment(bYear._d).isValid()) {
                return ReE(res, { message: "Please enter vaild question bank year details!." }, HttpStatus.BAD_REQUEST);
            }

            if (moment(year._d).isSame(bYear._id)) {
                return ReE(res, { message: "Please edit question bank name to update!." }, HttpStatus.BAD_REQUEST);
            }

            let checkDuration = moment.duration(moment(bYear._d).diff(new Date())).asYears();

            if (Math.floor(checkDuration) < -1 || 1 < Math.floor(checkDuration)) {
                return ReE(res, { message: "Question Bank year must with pervious or next year from current year!." }, HttpStatus.BAD_REQUEST);
            }

            let checkName = await checkQuestionBank({ name: updatedData.set.name ? updatedData.set.name : questionBank.name, year: bYear, status: 'all' });

            if (checkName.success) {
                return ReE(res, { message: "Question Bank year was already exists!." }, HttpStatus.BAD_REQUEST);
            }

            updatedData.set = {
                ...updatedData.set,
                name: firstCap(String(body.name).trim())
            }
        }
    }


    let update;

    [err, update] = await to(question_bank.update(updatedData.set, { where: updatedData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(update)) {
        return ReE(res, { message: "Something went wrong to update question bank!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(update)) {
        return ReS(res, { message: "Question bank was updated!." }, HttpStatus.OK);
    }
}

const checkQuestionBank = async (body) => {

    let questionBank, optionQuestionBank = {
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
            ['year', 'ASC']
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionQuestionBank = {
            ...optionQuestionBank,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.question_bank_id)) {
        if (!IsValidUUIDV4(body.question_bank_id)) {
            return { message: "Please select vaild question bank details!.", success: false };
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            _id: body.question_bank_id
        };
    }

    if (!isNull(body.name)) {
        if (String(body.name).length < 4) {
            return { message: "Please enter vaild question bank name with more then 4 character!.", success: false };
        }

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            name: firstCap(String(body.name).trim())
        };

    }

    if (!isNull(body.year)) {
        let yDate = moment(body.year);

        console.log(yDate);

        if (!moment(yDate._d).isValid()) {
            return { message: "Please enter vaild question bank year details!.", success: false };
        }

        let fDate = moment(`01/01/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        let lDate = moment(`31/12/${yDate.format('YYYY')}`, 'DD/MM/YYYY');

        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            year: {
                [Op.and]: [{ [Op.gte]: fDate._d }, { [Op.lte]: lDate._d }]
            }
        };

    }

    if (!isNull(body.subject_id)) {
        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false }
        }
        optionQuestionBank.where = {
            ...optionQuestionBank.where,
            subject_id: body.subject_id
        }
    }

    [err, questionBank] = await to(question_bank.findOne(optionQuestionBank));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(questionBank)) {
        return { message: "Question Bank was not found!.", success: false };
    }

    if (!isNull(questionBank)) {
        return { message: "Question bank was fatched!.", questionBank, success: true };
    }

}

module.exports.checkQuestionBank = checkQuestionBank;