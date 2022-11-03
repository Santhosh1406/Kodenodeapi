const { isNull, to, ReE, isEmpty } = require("../service/util.service");
const HttpStatus = require('http-status');
const { getQuery, IsValidUUIDV4 } = require("../service/validation");
const { menu, user_data, user_info, organization, discipline, department, user_subject, subject, program, role, role_menu_mapping, course_department_mapping, group, course_batch, section, kode_role, batch_sem } = require('../models');
const { Op, where } = require("sequelize");
const { checkSubject } = require("./subject");
const { CONFIG } = require("../config/confifData");

const checkMenu = async (body) => {

    if (isNull(body.menuId)) {
        return { message: "Please select menu!.", success: false };
    }

    let err;

    let checkMenuDetails, optionMenu = {
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

    optionMenu.where = {
        ...optionMenu.where,
        _id: body.menuId
    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionMenu = {
            ...optionMenu,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionMenu = {
            ...optionMenu,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.user)) {
        let userF = false;
        if (!isNull(body.user)) {
            if (body.user !== false && body.user !== true) {
                return { message: "Please select vaild menu user fields data!.", success: false };
            }

            userF = body.user;
        }

        optionMenu.where = {
            ...optionMenu.where,
            user: userF
        }
    }

    [err, checkMenuDetails] = await to(menu.findOne(optionMenu));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkMenuDetails)) {
        return { message: "Menus was not found!.", success: false };
    }

    if (!isNull(checkMenuDetails)) {
        return { message: "Menus was exists!", checkMenu: checkMenuDetails, success: true };
    }
};

const checkOrganization = async (body) => {

    if (isNull(body.org_id) || !IsValidUUIDV4(body.org_id)) {
        return { message: "Please select Institution details!.", success: false };
    }

    let checkOrganizationDetails, optionOrganization = {
        where: {
            _id: body.org_id,
            is_active: true
        }
    };

    [err, checkOrganizationDetails] = await to(organization.findOne(optionOrganization))

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkOrganizationDetails)) {
        return { message: "Please select vaild institution details!.", success: false };
    }

    if (checkOrganizationDetails.is_block) {
        return { message: "Institution details was blocked!.", success: false };
    }

    if (!isNull(checkOrganizationDetails)) {
        return { message: "Institution was fetched!.", organizationDetails: checkOrganizationDetails, success: true };
    }
}

const checkDiscipline = async (body) => {

    if (isNull(body.discipline_id) || !IsValidUUIDV4(body.discipline_id)) {
        return { message: "Please select discipline details!.", success: false };
    }

    let checkDisciplineDetails, optionDiscipline = {
        where: {
            _id: body.discipline_id,
            is_active: true
        }
    };

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
        return { message: "Please select discipline details!.", success: false };
    }

    if (checkDisciplineDetails.is_block) {
        return { message: "Discipline details was blocked!.", success: false };
    }

    if (!isNull(checkDisciplineDetails)) {
        return { message: "Discipline was fetched!.", groupDetails: checkDisciplineDetails, success: true };
    }
}

const checkUserInf = async (body) => {
    let err;
    if (isNull(body.user_id) || !IsValidUUIDV4(body.user_id)) {
        return { message: "Please select user details!.", success: false };
    }

    let userInfo, optionUserInfo = {
        where: getQuery(body),
        include: [
            {
                model: user_data,
                as: 'userId',
                attributes: ['_id', 'username']
            },
            {
                model: group,
                as: 'groupId'
            },
            {
                model: organization,
                as: 'orgId',
                attributes: ['_id', 'org_name', 'org_id', 'sortname', 'logo', 'url']
            },
            {
                model: discipline,
                as: 'disciplineId',
                attributes: ['_id', 'name', 'discipline_id', 'logo', 'description']
            },
            {
                model: department,
                as: 'departmentId',
                attributes: ['_id', 'name', 'department_id', 'logo', 'description']
            },
            {
                model: program,
                as: 'programId',
                attributes: ['_id', 'name', 'program_id', 'logo', 'description']
            },
            {
                model: course_batch,
                as: 'courseBatchId',
                attributes: ['_id', 'cdm_id', 'from', 'to', 'code', 'current_sim'],
                include: [{ model: batch_sem, as: 'currentSim' }]
            },
            {
                model: course_department_mapping,
                as: 'cdmId',
                attributes: ['_id', 'name', 'course_duration_id', 'code', 'total_year', 'course_sem_duration_id', 'department_id', 'course_id']
            },
            {
                model: role,
                as: 'roleId',
                attributes: ['_id', 'name', 'org_id', 'code']
            },
            {
                model: section,
                as: 'sectionId',
                attributes: ['_id', 'name', 'course_batch_id', 'cdm_id']
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
            }],

    };

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionUserInfo = {
            ...optionUserInfo,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionUserInfo = {
            ...optionUserInfo,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (body.type && body.type === 'sdk') {
        optionUserInfo = {
            ...optionUserInfo,
            attributes: {
                exclude: [
                    'discipline_id',
                    'cdm_id',
                    'program_id',
                    'group_id',
                    'department_id',
                    'org_id',
                    'section_id',
                    'role_id',]
            }
        }
    }

    optionUserInfo.where = {
        ...optionUserInfo.where,
        user_id: body.user_id
    };

    [err, userInfo] = await to(user_info.findOne(optionUserInfo));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(userInfo)) {
        return { message: "User details was not found.", success: false };
    }

    if (userInfo.is_block) {
        return { message: "User details was blocked!.", success: false }
    }

    if (!isNull(userInfo)) {
        return { message: "User details was found.", success: true, userInfo };
    }

}

const checkUser = async (body) => {
    if (isNull(body.user_id) || !IsValidUUIDV4(body.user_id)) {
        return { message: "Please select user details!.", success: false };
    }

    let err;

    let checkUserDetails, optionUser = {
        where: {
            _id: body.user_id,
            is_active: true
        }
    };

    [err, checkUserDetails] = await to(user_data.findOne(optionUser));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkUserDetails)) {
        return { message: "User not found!.", success: false };
    }

    if (checkUserDetails.is_block) {
        return { message: "User was block!.", success: false };
    }

    if (!isNull(checkUserDetails)) {
        return { message: "User was fetched!.", user: checkUserDetails, success: true };
    }
}

const getAllMappedFacultybySubject = async (body) => {

    if (isNull(body.subject_id) || !IsValidUUIDV4(body.subject_id)) {
        return { message: "Please select subject details!.", success: false };
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


    let checkSubjectDetails = await checkSubject({ subject_id: body.subject_id });

    if (!checkSubjectDetails.success) {
        return { message: checkSubjectDetails.message, success: false };
    }

    query.where = {
        ...query.where,
        subject_id: body.subject_id
    };

    let existSubjects;

    [err, existSubjects] = await to(user_subject.findAll(query));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(existSubjects)) {
        return { message: "User mapped subject was empty!.", userSubject: existSubjects, success: true };
    }

    if (!isEmpty(existSubjects)) {
        return { message: "User mapped subject was fetched!.", userSubject: existSubjects, success: true };
    }
}

const checkUserSubject = async (body) => {

    if (isNull(body.subject_id) && isNull(body.user_id)) {
        return { message: "Please select user or subject details!.", success: false }
    }

    if (!isNull(body.user_id)) {
        if (!IsValidUUIDV4(body.user_id)) {
            return { message: "Please select user details!.", success: false }
        }
    }

    if (!isNull(body.subject_id)) {
        if (!IsValidUUIDV4(body.subject_id)) {
            return { message: "Please select subject details!.", success: false }
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

    if (!isNull(body.user_id)) {

        query.where = {
            ...query.where,
            user_id: body.user_id
        };
    }


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

    if (isNull(existSubjects)) {
        return { message: "Subject was not mapped to this user!.", success: false }
    }

    if (!isNull(existSubjects)) {
        return { message: "subject was fetched!.", success: true };
    }

}


const checkMenuAccess = async (body) => {

    let err;

    let checkUserInfo = await checkUserInf({ user_id: body.user_id });

    if (!checkUserInfo.success) {
        return { message: checkUserInfo.message, success: false };
    }

    if (isNull(body.menuId) || !IsValidUUIDV4(body.menuId)) {
        return { message: "Please select vaild menu!.", success: false };
    }

    let getRoleMenus, optionRoleMenus = {
        where: getQuery(body),
        include: [
            {
                model: menu,
                as: 'menuDetails',
                attributes: ['_id', 'name', 'label', 'user']
            },
            {
                model: role,
                as: 'roleDetails',
                attributes: ['_id', 'name']
            },
            {
                model: kode_role,
                as: 'refRoleDetails',
                attributes: ['_id', 'name']
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
        optionRoleMenus = {
            ...optionRoleMenus,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionRoleMenus = {
            ...optionRoleMenus,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (checkUserInfo.userInfo && checkUserInfo.userInfo.org_id) {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            org_id: checkUserInfo.userInfo.org_id,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    } else {
        optionRoleMenus.where = {
            ...optionRoleMenus.where,
            role_id: checkUserInfo.userInfo.role_id,
            menu_id: body.menuId,
        }
    }

    [err, getRoleMenus] = await to(role_menu_mapping.findOne(optionRoleMenus));

    if (err) {
        return { message: err, success: false }
    }

    if (isNull(getRoleMenus)) {
        return { message: "You not allow to access this menu!.", success: false };
    }

    if (!isNull(body.access)) {
        let accessInvaild = await CONFIG.access.filter(x => (getRoleMenus.access[x] == true));

        if (accessInvaild.length == 0) {
            return { message: "You don't have any access on this menu!.", success: false };
        }

        let exist = accessInvaild.filter(x => body.access[x] == true);

        if (isEmpty(exist)) {
            return { message: `You don't have ${exist.map(x => `${x} `)} access on this menu!.`, success: false };
        }

    }

    let data = body.body;

    let fields = ['group_id', 'org_id', 'discipline_id', 'department_id', 'program_id', 'cdm_id', 'course_batch_id', 'section_id'];

    await fields.map(x => {
        if (checkUserInfo.userInfo[x]) {
            if ((x == 'org_id' && isNull(data.group_id)) || (x != 'org_id')) data[x] = checkUserInfo.userInfo[x]
        }
    });

    if (!isNull(data.group_id)) {
        let checkGroupDetails, optionGroup = {
            where: {
                _id: data.group_id,
                is_active: true
            }
        };

        [err, checkGroupDetails] = await to(group.findOne(optionGroup));

        if (err) {
            return { message: err, success: false };
        }

        if (isNull(checkGroupDetails)) {
            return { message: "Group not found!.", success: false };
        }

        if (checkGroupDetails.is_block) {
            return { message: "Group was blocked!.", success: false };
        }

        if (!isNull(body.body.org_id)) {
            let checkOrganizationDetails, optionOrganization = {
                where: {
                    _id: body.body.org_id,
                    group_id: data.group_id,
                    is_active: true
                }
            };

            [err, checkOrganizationDetails] = await to(organization.findOne(optionOrganization));

            if (err) {
                return { message: err, success: false };
            }

            if (isNull(checkOrganizationDetails)) {
                return { message: "Group Organization not found!.", success: false }
            }

            if (checkOrganizationDetails.is_block) {
                return { message: "Group Organization was blocked!.", success: false }
            }

            data.org_id = body.body.org_id;
        }
    }

    if (!isNull(getRoleMenus)) {
        return { message: "Menu was fetched !.", role_menu: getRoleMenus, body: data, userInfo: checkUserInfo.userInfo, success: true };
    }

}



module.exports = {
    checkMenu,
    checkOrganization,
    checkDiscipline,
    checkUserInf,
    checkUser,
    getAllMappedFacultybySubject,
    checkUserSubject,
    checkMenuAccess
}
