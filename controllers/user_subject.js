const { to, ReE, ReS, isNull, isEmpty } = require("../service/util.service");
const { discipline, organization, user_data, subject, department, user_subject, user_info } = require("../models");
const HttpStatus = require('http-status');
const { checkUser, checkOrganization, checkUserInf, checkMenuAccess } = require("./common");
const { checkDepartment } = require("./department");
const { checkSubject } = require("./subject");
const { CONFIG } = require("../config/confifData");
const { getQuery, IsValidUUIDV4 } = require("../service/validation");
const { getAllTimeTableMethod } = require("./time_table");
const { Op } = require("sequelize");

module.exports.mapSubjectUser = async (req, res) => {

    let body = req.body;

    const user = req.user;

    let checkOrganizationDetails, org_id;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select institution!." }, HttpStatus.BAD_REQUEST);
        }

        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
        }
        org_id = body.org_id;
    }

    let checkUserInfo;

    if (!user.owner) {
        checkUserInfo = await checkUserInf({ user_id: user._id });

        console.log(checkUserInfo);

        if (!checkUserInfo.success) {
            return ReE(res, { message: checkUserInfo.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserInfo.userInfo.org_id;
    }

    let err;

    let fields = ['subject_id', 'user_id', 'department_id'];

    let inVaildField = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildField)) {
        return ReE(res, { message: `Please enter required fields ${inVaildField}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUserDetails = await checkUser({ user_id: body.user_id });

    if (!checkUserDetails.success) {
        return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkUserInfoDetails = await checkUserInf({ user_id: body.user_id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (checkUserInfoDetails.userInfo.org_id !== org_id) {
        return ReE(res, { message: "This User not present on mentioned Institution!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserInfoDetails.userInfo.department_id)) {
        return ReE(res, { message: "User doesn't have any department!." }, HttpStatus.BAD_REQUEST);
    }

    let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

    if (!checkDepartmentDetails.success) {
        return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSubjectDetails = await checkSubject({ department_id: checkDepartmentDetails.departmentDetails._id, subject_id: body.subject_id });

    if (!checkSubjectDetails.success) {
        return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkUserSubject, optionUserSubject = {
        where: {
            user_id: body.user_id,
            is_active: true,
            is_block: false
        }
    };

    [err, checkUserSubject] = await to(user_subject.findAll(optionUserSubject));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isEmpty(checkUserSubject)) {

        let existSubject = await checkUserSubject.filter(x => x.subject_id == body.subject_id);

        if (!isEmpty(existSubject)) {
            return ReE(res, { message: "Subject was already mapped on this faculty!." }, HttpStatus.BAD_REQUEST);
        }

        if (checkUserSubject.length >= CONFIG.subjectUser) {
            return ReE(res, { message: "Already the user reached mapping subject limit!." }, HttpStatus.BAD_REQUEST);
        }
    }

    let mapSubject, createData = {
        department_id: body.department_id,
        subject_id: body.subject_id,
        user_id: body.user_id,
        is_active: true,
        is_block: false,
        createdby: body.user_id,
        updatedby: body.user_id
    };

    [err, mapSubject] = await to(user_subject.create(createData));


    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(mapSubject)) {
        return ReE(res, { message: "Something went wrong to map user and subject!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(mapSubject)) {
        return ReS(res, { message: "Subject was mapped successfully!.", userSubject: mapSubject }, HttpStatus.OK);
    }

}

module.exports.getAllSubjectUser = async (req, res) => {

    let body = req.query;

    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let query = {
        where: getQuery(body),
        include: [
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
                attributes: ['_id', 'f_name', 'l_name', 'username']
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
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }


    let checkUserInfo, org_id = '';

    if (!user.owner) {
        checkUserInfo = await checkUserInf({ user_id: user._id });

        if (!checkUserInfo.success) {
            return ReE(res, { message: checkUserInfo.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkUserInfo.userInfo.department_id) {
            query.where = {
                ...query.where,
                department_id: checkUserInfo.userInfo.department_id
            }
        }

        org_id = checkUserInfo.userInfo.org_id;
    }

    if (user.owner && !isNull(body.org_id)) {

        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.message) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkOrg.organizationDetails._id;

    }

    if (!isNull(org_id)) {
        let getUser, optionUsers = {
            where: {
                is_active: true,
                is_block: false,
                org_id: org_id
            }
        };

        [err, getUser] = await to(user_info.findAll(optionUsers));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR)
        }

        if (isEmpty(getUser)) {
            return ReE(res, { message: 'User details was empty!.' }, HttpStatus.BAD_REQUEST);
        }

        if (!isEmpty(getUser)) {
            let ids = getUser.map(x => x.user_id);
            query.where = {
                ...query.where,
                user_id: { [Op.in]: ids }
            };
        }
    }


    if (!isNull(body.department_id)) {

        let getSubjects;

        [err, getSubjects] = await to(user_subject.findAll({
            where: { user_id: query.where.user_id || user._id, is_active: true, is_block: false },
            include: [
                {
                    model: subject,
                    as: 'subjectId'
                }]
        }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (!isEmpty(getSubjects)) {

            let department = [];

            await getSubjects.map(x => {
                if (x.subjectId.department_id && !department.includes(x.subjectId.department_id)) department.push(x.subjectId.department_id);
            });

            if (department.length > 0) {
                query.where = {
                    ...query.where,
                    department_id: { [Op.in]: department }
                };
            }
        };

        if (isEmpty(getSubjects)) {
            let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

            if (!checkDepartmentDetails.success) {
                return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
            }

            query.where = {
                ...query.where,
                department_id: body.department_id
            };
        }

        console.log(query, "sdd");
    }

    if (!isNull(body.user_id)) {

        let checkUserDetails = await checkUser({ user_id: body.user_id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            user_id: body.user_id
        };
    }

    if (!isNull(body.subject_id)) {

        let checkSubjectDetails = await checkSubject({ department_id: body.department_id, subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return ReE(res, { message: checkSubjectDetails.message }, HttpStatus.BAD_REQUEST);
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        };
    }

    if (body.time == 'true') {

        let fieldsData = ['subject_id', 'time_frame_id', 'time_day_id', 'batch_sem_id'];

        let inVailDataField = await fieldsData.filter(x => {
            if ((isNull(body[x]) || !IsValidUUIDV4(body[x]))) {
                return true;
            }
        });

        if (!isEmpty(inVailDataField)) {
            return ReE(res, { message: `Please select required vaild data ${inVailDataField}!.` }, HttpStatus.BAD_REQUEST);
        }

        let getAllTimeTableDetails = await getAllTimeTableMethod({ time_frame_id: body.time_frame_id, time_day_id: body.time_day_id, active: true });

        if (getAllTimeTableDetails.success) {
            if (!isNull(getAllTimeTableDetails.timeTable) && !isEmpty(getAllTimeTableDetails.timeTable)) {
                let userIds = [];
                getAllTimeTableDetails.timeTable.map(x => {
                    if (!userIds.includes(x.user_id)) {
                        userIds.push(x.user_id);
                    }
                });

                if (!isEmpty(userIds)) {
                    query.where = {
                        ...query.where,
                        user_id: { [Op.notIn]: userIds }
                    }
                }

            }
        }
    }

    let existSubjects;

    [err, existSubjects] = await to(user_subject.findAll(query));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(existSubjects)) {
        return ReE(res, { message: "User mapped subject was empty!." }, HttpStatus.BAD_REQUEST)
    }

    if (!isEmpty(existSubjects)) {
        return ReS(res, { message: "Uaer mapped subject was fetched!.", userSubject: existSubjects }, HttpStatus.OK);
    }

}

const mappedSubjectbyUser = async (body) => {

    let query = {
        where: getQuery(body),
        include: [
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
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.department_id)) {

        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return { message: checkDepartmentDetails.message, success: false };
        }
        query.where = {
            ...query.where,
            department_id: body.department_id
        };
    }

    if (!isNull(body.user_id)) {

        let checkUserDetails = await checkUser({ user_id: body.user_id });

        if (!checkUserDetails.success) {
            return { message: checkUserDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            user_id: body.user_id
        };
    }

    if (isNull(body.subject_id)) {

        let checkSubjectDetails = await checkSubject({ department_id: body.department_id, subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        };
    }

    let existSubjects;

    [err, existSubjects] = await to(user_subject.findAll(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(existSubjects)) {
        return { message: "User mapped subject was empty!.", success: false }
    }

    if (!isEmpty(existSubjects)) {
        return { message: "Uaer mapped subject was fetched!.", userSubject: existSubjects, success: true };
    }

}

module.exports.mappedSubjectbyUser = mappedSubjectbyUser;

const checkSubjectByUser = async (body) => {

    let query = {
        where: getQuery(body),
        include: [
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
        ]
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        query = {
            ...query,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        query = {
            ...query,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    query.where = {
        ...query.where,
        user_id: body.user_id
    };

    if (!isNull(body.subject_id)) {

        let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        query.where = {
            ...query.where,
            subject_id: body.subject_id
        };
    }

    let existSubjects;

    [err, existSubjects] = await to(user_subject.findOne(query));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(existSubjects)) {
        return { message: "User mapped subject was already mapped!.", success: false }
    }

    if (isNull(existSubjects)) {
        return { message: " subject was facted!.", success: true };
    }

}

module.exports.checkSubjectByUser = checkSubjectByUser;

const mapSubjectUserMethod = async (body) => {

    let err;

    let fields = ['subject_id', 'user_id', 'department_id'];

    let inVaildField = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildField)) {
        return { message: `Please enter required fields ${inVaildField}!.` };
    }

    let checkUserD;

    [err, checkUserD] = await to(user_data.findOne({ where: { _id: body.user_id, is_active: true, is_block: false, } }));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkUserD)) {
        return { message: "Please select vaild user details!.", success: false };
    }

    let checkUserDetails;

    [err, checkUserDetails] = await to(user_info.findOne({ where: { user_id: checkUserD._id, is_active: true, is_block: false } }));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkUserDetails)) {
        return { message: "Please select vaild user information!.", success: false };
    }

    if (isNull(checkUserDetails.department_id)) {
        return { message: "User doesn't have any department!.", success: false };
    }

    let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

    if (!checkDepartmentDetails.success) {
        return { message: checkDepartmentDetails.message, success: false };
    }

    let checkSubjectDetails = await checkSubject({ department_id: body.department_id, subject_id: body.subject_id });

    if (!checkSubjectDetails.success) {
        return { message: checkSubjectDetails.message, success: false };
    }

    let checkUserSubject, optionUserSubject = {
        where: {
            user_id: body.user_id,
            is_active: true,
            is_block: false
        }
    };

    [err, checkUserSubject] = await to(user_subject.findAll(optionUserSubject));

    if (err) {
        return { message: err, success: false };
    }

    if (!isEmpty(checkUserSubject)) {
        if (checkUserSubject.length >= CONFIG.subjectUser) {
            return { message: "Already the user reached mapping subject limit!.", success: false };
        }
    }

    let mapSubject, createData = {
        department_id: body.department_id,
        subject_id: body.subject_id,
        user_id: body.user_id,
        is_active: true,
        is_block: false,
        createdby: body.user_id,
        updatedby: body.user_id
    };

    [err, mapSubject] = await to(user_subject.create(createData));


    if (err) {
        return { message: err, success: false };
    }

    if (isNull(mapSubject)) {
        return { message: "Something went wrong to map user and subject!.", success: false };
    }

    if (!isNull(mapSubject)) {
        return { message: "Subject was mapped successfully!.", userSubject: mapSubject, success: true };
    }

}

module.exports.mapSubjectUserMethod = mapSubjectUserMethod;
