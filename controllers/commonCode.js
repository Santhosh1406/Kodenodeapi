const { isNull, to, ReE, isEmpty } = require("../service/util.service");
const { getQuery, IsValidUUIDV4 } = require("../service/validation");
const { user_data, organization, discipline, department, subject, program, role, role_menu_mapping, course, course_sem_duration, course_department_mapping, course_batch, course_duration, group } = require('../models');
const { Op } = require("sequelize");
const { checkMenu, checkOrganization, checkDiscipline } = require("./common");
const moment = require('moment');
const { checkProgram } = require("./program");
const { checkCourseDepart } = require("./course_department_mapping");
const { checkDepartment } = require("./department");

const checkOrganizationCode = async (body) => {

    if (isNull(body.org_id)) {
        return { message: "Please select Institution details!.", success: false };
    }

    let checkOrganizationDetails, optionOrganization = {
        where: {
            org_id: body.org_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.org_id)) {
        optionOrganization = {
            where: {
                _id: body.org_id,
                is_active: true
            }
        };
    }

    [err, checkOrganizationDetails] = await to(organization.findOne(optionOrganization))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkOrganizationDetails)) {
        return { message: "Please enter vaild institution details!.", success: false };
    }

    if (checkOrganizationDetails.is_block) {
        return { message: "Institution details was blocked!.", success: false };
    }

    if (!isNull(checkOrganizationDetails)) {
        return { message: "Institution was fetched!.", organizationDetails: checkOrganizationDetails, success: true };
    }
}

const checkGroupCode = async (body) => {

    if (isNull(body.group_id)) {
        return { message: "Please enter group details!.", success: false };
    }

    let checkGroupDetails, optionGroup = {
        where: {
            code: body.group_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.group_id)) {
        optionGroup = {
            where: {
                _id: body.group_id,
                is_active: true
            }
        };
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

const checkDisciplineCode = async (body) => {

    if (isNull(body.discipline_id)) {
        return { message: "Please enter discipline details!.", success: false };
    }

    let checkDisciplineDetails, optionDiscipline = {
        where: {
            discipline_id: body.discipline_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.discipline_id)) {
        optionDiscipline = {
            where: {
                _id: body.discipline_id,
                is_active: true
            }
        };
    }

    if (!isNull(body.org_id)) {
        let organizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!organizationDetails.success) {
            return { message: "Please select vaild Institution details!.", success: false };
        }

        optionDiscipline.where = {
            ...optionDiscipline.where,
            org_id: body.org_id
        }
    }

    [err, checkDisciplineDetails] = await to(discipline.findOne(optionDiscipline))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkDisciplineDetails)) {
        return { message: "Please select vaild discipline details!.", success: false };
    }

    if (checkDisciplineDetails.is_block) {
        return { message: "Discipline details was blocked!.", success: false };
    }

    if (!isNull(checkDisciplineDetails)) {
        return { message: "Discipline was fetched!.", groupDetails: checkDisciplineDetails, success: true };
    }
}

const checkProgramCode = async (body) => {

    if (isNull(body.program_id)) {
        return { message: "Please select program details!.", success: false };
    }

    let checkProgramDetails, optionProgram = {
        where: {
            program_id: body.program_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.program_id)) {
        optionProgram = {
            where: {
                program_id: body.program_id,
                is_active: true
            }
        };
    }

    if (!isNull(body.discipline_id)) {
        let disciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!disciplineDetails.success) {
            return { message: "Please select vaild discipline details!.", success: false };
        }

        optionProgram.where = {
            ...optionProgram.where,
            discipline_id: body.discipline_id
        }
    }

    [err, checkProgramDetails] = await to(program.findOne(optionProgram))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkProgramDetails)) {
        return { message: "Please select program details!.", success: false };
    }

    if (checkProgramDetails.is_block) {
        return { message: "Program details was blocked!.", success: false };
    }

    if (!isNull(checkProgramDetails)) {
        return { message: "Program was fetched!.", programDetails: checkProgramDetails, success: true };
    }
}

const checkCourseDepartCode = async (body) => {

    if (isNull(body.cdm_id)) {
        return { message: "Please select course department details!.", success: false };
    }

    let checkCdm, optionCdm = {
        where: {
            code: body.cdm_id,
            is_active: true
        },
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
                model: course_duration,
                as: 'courseDuration'
            },
            {
                model: course_sem_duration,
                as: 'courseSemDuration'
            },
            {
                model: program,
                as: 'programId'
            },
            {
                model: course,
                as: 'courseId'
            },
            {
                model: department,
                as: 'departmentId'
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

    if (IsValidUUIDV4(body.cdm_id)) {
        optionCdm.where = {
            _id: body.cdm_id,
            is_active: true
        };
    }

    if (!isNull(body.program_id)) {
        let progamDetails = await checkProgram({ program_id: body.program_id });

        if (!progamDetails.success) {
            return { message: "Please select vaild program details!.", success: false };
        }

        optionCdm.where = {
            ...optionCdm.where,
            program_id: body.program_id
        }
    }

    [err, checkCdm] = await to(course_department_mapping.findOne(optionCdm))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkCdm)) {
        return { message: "Please select course department details!.", success: false };
    }

    if (checkCdm.is_block) {
        return { message: "Course department details was blocked!.", success: false };
    }

    if (!isNull(checkCdm)) {
        return { message: "Course department details was fetched!.", courseDepartment: checkCdm, success: true };
    }
}

const checkDepartmentCode = async (body) => {

    if (isNull(body.department_id)) {
        return { message: "Please select department details!.", success: false };
    }

    let checkDepartmentDetails, optionDepartment = {
        where: {
            department_id: body.department_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.department_id)) {
        optionDepartment = {
            where: {
                _id: body.department_id,
                is_active: true
            }
        };
    }

    if (!isNull(body.discipline_id)) {
        let disciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!disciplineDetails.success) {
            return { message: "Please select vaild discipline details!.", success: false };
        }

        optionDepartment.where = {
            ...optionDepartment.where,
            discipline_id: body.discipline_id
        }
    }

    [err, checkDepartmentDetails] = await to(department.findOne(optionDepartment))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkDepartmentDetails)) {
        return { message: "Please select department details!.", success: false };
    }

    if (checkDepartmentDetails.is_block) {
        return { message: "Department details was blocked!.", success: false };
    }

    if (!isNull(checkDepartmentDetails)) {
        return { message: "Department was fetched!.", departmentDetails: checkDepartmentDetails, success: true };
    }
}

const checkRoleCode = async (body) => {

    if (isNull(body.roleId)) {
        return { message: "Please select role!.", success: false };
    }

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let checkMenuDetails = await checkMenu({ menuId: body.menuId });

    if (!checkMenuDetails.success) {
        return { message: checkMenuDetails.message, success: false };
    }

    if (isNull(checkMenuDetails.checkMenu.ref_role_id)) {
        return { message: "Pleaes select vaild user menu!.", success: false };
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
        code: body.roleId,
    };

    if (IsValidUUIDV4(body.roleId)) {
        optionRole.where = {
            ...optionRole.where,
            _id: body.roleId,
            is_active: true
        };
    }

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


    let checkRoleAndMenuDetails, optionRoleAndMenu = {
        where: {
            ref_role_id: checkMenuDetails.checkMenu.ref_role_id,
            role_id: checkRole._id,
            is_active: true
        }
    };

    [err, checkRoleAndMenuDetails] = await to(role_menu_mapping.findOne(optionRoleAndMenu));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkRoleAndMenuDetails)) {
        return { message: "Please select valid kode role under role details!.", success: false };
    }

    if (!isNull(checkRole)) {
        return { message: "Customer Roles was exists!", checkRole, success: true };
    }
}

const checkSubjectCode = async (body) => {

    if (isNull(body.subject_id)) {
        return { message: "Please select subject details!.", success: false };
    }

    let checkSubjectDetails, optionSubject = {
        where: {
            code: body.subject_id,
            is_active: true
        }
    };

    if (IsValidUUIDV4(body.subject_id)) {
        optionSubject.where = {
            _id: body.subject_id,
            is_active: true
        };
    }

    if (!isNull(body.department_id)) {
        let departmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!departmentDetails.success) {
            return { message: "Please select vaild department details!.", success: false };
        }

        optionSubject.where = {
            ...optionSubject.where,
            department_id: body.department_id
        }
    }

    [err, checkSubjectDetails] = await to(subject.findOne(optionSubject))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkSubjectDetails)) {
        return { message: "Please select subject details!.", success: false };
    }

    if (checkSubjectDetails.is_block) {
        return { message: "Subject details was blocked!.", success: false };
    }

    if (!isNull(checkSubjectDetails)) {
        return { message: "Subject was fetched!.", subjectDetails: checkSubjectDetails, success: true };
    }
}

const checkCourseBatchCode = async (body) => {

    if (isNull(body.course_batch_id)) {
        return { message: "Please select course batch details!.", success: false };
    }

    let query = {
        where: {
            code: body.course_batch_id,
            is_active: true
        },
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
                model: course_department_mapping,
                as: 'cdmId',
                include: [
                    {
                        model: department,
                        as: 'departmentId'
                    },
                    {
                        model: course,
                        as: 'courseId'
                    }
                ]
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
            ['from', 'ASC']
        ]
    }

    if (IsValidUUIDV4(body.course_batch_id)) {
        query.where = {
            _id: body.course_batch_id,
            is_active: true
        }
    }


    if (!isNull(body.org_id)) {
        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            org_id: body.org_id
        }
    }

    if (!isNull(body.discipline_id)) {

        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id });

        if (!checkDisciplineDetails.success) {
            return { message: checkDisciplineDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            discipline_id: body.discipline_id
        }
    }

    if (!isNull(body.program_id)) {
        let checkProgramDetails = await checkProgram({ program_id: body.program_id });

        if (!checkProgramDetails.success) {
            return { message: checkProgramDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            program_id: body.program_id
        }

    }

    if (!isNull(body.cdm_id)) {
        let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id });

        if (!checkCourseDepartmentDetails.success) {
            return { message: checkCourseDepartmentDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            cdm_id: body.cdm_id
        }
    }

    if (!isNull(body.from)) {

        const { from } = body;

        let currentYear = moment(`31/12/${moment().format('YYYY')}`, 'DD/MM/YYYY').format();

        if (from == 'present') {
            query.where = {
                ...query.where,
                from: { [Op.lte]: moment(currentYear)._d },
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'past') {
            query.where = {
                ...query.where,
                to: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'notpast') {
            query.where = {
                ...query.where,
                to: { [Op.gte]: moment()._d }
            }
        }

        if (from == 'notfuture') {
            query.where = {
                ...query.where,
                from: { [Op.lt]: moment()._d }
            }
        }

        if (from == 'future') {
            query.where = {
                ...query.where,
                from: { [Op.gte]: moment()._d }
            }
        }
    }

    let getCourseBatch;

    [err, getCourseBatch] = await to(course_batch.findOne(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(getCourseBatch)) {
        return { message: "Batch was not found!.", success: false };
    }

    if (getCourseBatch.is_block) {
        return { message: "Batch was blocked!.", success: false };
    }

    if (!isNull(getCourseBatch)) {
        return { message: "Batch was exists!.", courseBatchData: getCourseBatch, success: true };
    }
}


module.exports = {
    checkOrganizationCode,
    checkGroupCode,
    checkDisciplineCode,
    checkProgramCode,
    checkCourseDepartCode,
    checkDepartmentCode,
    checkRoleCode,
    checkSubjectCode,
    checkCourseBatchCode
}