const HttpStatus = require("http-status");
const { Op } = require("sequelize");
const { CONFIG } = require("../config/confifData");
const moment = require("moment");
const {
    organization,
    institution_type,
    group,
    affiliated_type,
    organization_type,
    university_type,
    user_data,
    course_department_mapping,
    user_subject,
    user_info,
    discipline,
    program,
    course_batch,
    section,
    department,
    course_sem_duration,
    course,
    course_duration,
    batch_sem,
    role

} = require("../models");
const { ReE, ReS, to, isNull, isEmpty } = require("../service/util.service");
const { getQuery } = require("../service/validation");
const { checkMenuAccess, checkUserInf } = require("./common");

exports.getDashboardOrganization = async (req, res) => {
    let err, data, query, filter, groupQuery, userQuery, courseQuery;
    const user = req.user;
    data = req.query;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            data = checkMenuUserDetails.body;
        }
    };

    query = getQuery(data);
    groupQuery = getQuery(data);
    userQuery = getQuery(data);
    courseQuery = getQuery(data);
    if (!isNull(data.org_id) ) {
        query = { ...query, _id: data.org_id };
        groupQuery = { ...groupQuery, org_id: data.org_id };
    }

    if (!isNull(data.group_id)) {
        query = { ...query, group_id: data.group_id }
        groupQuery = { ...groupQuery, _id: data.group_id };
    }
    if (!isNull(data.group)) {
        query = {
            ...query, group_id: data.group
        };
    }

    if (!isNull(data.department_id)) {
        courseQuery = { ...courseQuery, department_id: data.department_id };
        userQuery = {
            ...userQuery, department_id: data.department_id
        };
    }

    if (!isNull(data.program_id) || !isNull(data.course_batch_id)) {

        return ReE(res, { message: "You are not allow to access this module!." }, HttpStatus.BAD_REQUEST);

    }

    filter = {
        where: query,
        order: [['org_name', 'ASC'], ['createddate', 'ASC']],
        include: [
            {
                model: institution_type,
                as: 'institution_typeId'
            },
            {
                model: group,
                as: 'groupId'
            },
            {
                model: affiliated_type,
                as: 'affiliated_typeId'
            },
            {
                model: university_type,
                as: 'universityRef'
            },
            {
                model: organization_type,
                as: 'orgType'
            },
            {
                model: user_data,
                as: 'createdBy'
            },
            {
                model: user_data,
                as: 'updatedBy'
            }
        ]
    };

    let groupFilter = {
        where: groupQuery
    };



    let getOrganization, getGroup, getUsers, getCousreDepartment;

    [err, getOrganization] = await to(organization.findAll(filter));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getOrganization)) {
        return ReE(res, { message: "Organization details was not found!." }, HttpStatus.BAD_REQUEST);
    }

    [err, getGroup] = await to(group.findAll(groupFilter));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let orgIds = getOrganization.map(x => x._id);

    userQuery = { ...userQuery, org_id: { [Op.in]: orgIds } };

    courseQuery = { ...courseQuery, org_id: { [Op.in]: orgIds } };

    let userFiler = {
        where: userQuery,
        include: [
            {
                model: user_data,
                as: 'userId',
                attributes: { exclude: ['password', 'user_info', 'email_otp', 'phone_otp',] }
            },
            {
                model: organization,
                as: 'orgId',
                attributes: ['_id', 'org_id', 'org_name']
            },
            {
                model: program,
                as: 'programId',
                attributes: ['_id', 'program_id', 'name']
            },
            {
                model: discipline,
                as: 'disciplineId',
                attributes: ['_id', 'discipline_id', 'name']
            },
            {
                model: department,
                as: 'departmentId',
                attributes: ['_id', 'discipline_id', 'name']
            },
            {
                model: course_department_mapping,
                as: 'cdmId'
            },
            {
                model: course_batch,
                as: 'courseBatchId',
                include: [{ model: batch_sem, as: 'currentSim' }]
            },
            {
                model: section,
                as: 'sectionId',
                attributes: ['_id', 'name', 'course_batch_id']
            },
            {
                model: role,
                as: 'roleId'
            }
        ]
    };

    let cousrFilter = {
        where: courseQuery,
        order: [['createddate', 'ASC']],
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
                as: "programId"
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
                model: course_duration,
                as: 'courseDuration'
            },
            {
                model: course_sem_duration,
                as: 'courseSemDuration'
            },
            {
                model: user_data,
                as: 'createdBy'
            },
            {
                model: user_data,
                as: 'updatedBy'
            }
        ]
    };

    [err, getUsers] = await to(user_info.findAll(userFiler));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    [err, getCousreDepartment] = await to(course_department_mapping.findAll(cousrFilter));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    let employees = [], student = [];

    if (!isEmpty(getUsers)) {

        let uIds = getUsers.map(x => x.user_id);

        userFiler.where = {
            ...userFiler.where, user_id: { [Op.in]: uIds }, cdm_id: { [Op.ne]: null }
        };

        [err, student] = await to(user_info.findAll(userFiler));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        userFiler.where = {
            ...userFiler.where, user_id: { [Op.in]: uIds }, cdm_id: { [Op.eq]: null }
        };

        [err, employees] = await to(user_info.findAll(userFiler));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    return ReS(res, { message: "User Dashboard details!.", organization: getOrganization, group: getGroup, user: getUsers, faculty: employees, student: student || 0, course: getCousreDepartment }, HttpStatus.OK);

};