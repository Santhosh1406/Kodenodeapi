const { user_info, organization, user_data, discipline, menu, user_subject } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, isEmail, isEmpty, isPhone, generatePassword, firstLetterCap, genrateUserName, isPhoneCountry, firstCap } = require('../service/util.service');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const { checkMenu } = require('./common');
const { checkOrganizationCode, checkGroupCode, checkDisciplineCode, checkProgramCode, checkCourseDepartCode, checkSubjectCode, checkRoleCode, checkDepartmentCode, checkCourseBatchCode } = require('./commonCode');
const { checkFieldsByMenu } = require('./user_fields_mapping');
const { checkSubjectByUser, mapSubjectUserMethod } = require('./user_subject');
const { checkMenuByUser, getKodeMenuByRole } = require('./role_menu_mapping');
const { checkCourseBatch } = require('./course_batch');
const PincodeData = require('../service/store/pincode.json');

const userRegisterVerification = async (body) => {

    const user = body.user;

    let data = {};

    const { age, gender } = CONFIG;

    const { menu_id, first_name, last_name, surname, email, countrycode, phone, address, city, state, dob, country, pincode } = body;

    let err;

    let fields = ['menu_id', 'first_name', 'last_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return { message: `Please enter required fields ${inVaildFields}!.`, success: false };
    }

    body.email = String(body.email).toLowerCase();

    let getAllFields = await checkFieldsByMenu({ menuId: menu_id });

    if (!getAllFields.success) {
        return { message: getAllFields.message, success: false };
    }

    let userFields = [], requiredFields = [];

    let availableFields = ['group_id', 'gender', 'year', 'designation', 'org_id', 'discipline_id', 'department_id', 'subject_id', 'program_id', 'cdm_id', 'lateral_entry', 'role_id', 'course_batch_id', 'enrollment', 'mother_name', 'father_name', 'blood_group', 'emergency_contact'];

    for (var i = 0; i < getAllFields.fields.length; i++) {
        let x = getAllFields.fields[i];

        if (availableFields.includes(x.fieldDetails.name)) {
            userFields.push(x.fieldDetails.name);
            if (x.required) {
                requiredFields.push(x.fieldDetails.name);
            }
        }
    }

    // let inVaildField = await userFields.filter(x => isNull(body[x]));

    // if (!isEmpty(inVaildField)) {
    //     return { message: `Please enter user fields ${inVaildField}!.` , success:false };
    // }

    let inVaildReqFields = await requiredFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildReqFields)) {
        return { message: `Please enter required user fields ${inVaildReqFields}!.`, success: false };
    }

    if (String(first_name).length < 3) {
        return { message: "Enter vaild first name with more then 3 character!.", success: false };
    }

    if (!isEmail(email)) {
        return { message: "Enter vaild email detail!.", success: false };
    }

    let checkEmail, checkOrganizationEmail, optionEmail = {
        email: String(email).toLowerCase(),
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkEmail] = await to(user_data.findOne({
        where: optionEmail
    }));

    [err, checkOrganizationEmail] = await to(organization.findOne({
        where: optionEmail
    }));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkEmail) || !isNull(checkOrganizationEmail)) {
        return { message: "Email id already taken!.", success: false };
    }

    let e = body.email_ids.filter(x => x == String(email).toLowerCase());

    if (e.length >= 2) {
        return { message: "Please remove dublicate email details!.", success: false };
    }

    let phoneNo = `${String(countrycode).trim()}${String(phone).trim()}`;

    if (!isPhoneCountry(phoneNo)) {
        return { message: "Enter vaild phone and country code detail!.", success: false };
    }

    let checkPhone, checkOrganizationPhone, optionPhone = {
        phone: String(phone),
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkPhone] = await to(user_data.findOne({
        where: optionPhone
    }));

    [err, checkOrganizationPhone] = await to(organization.findOne({
        where: {
            alternate_contact_no: String(phone),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    }));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkPhone) || !isNull(checkOrganizationPhone)) {
        return { message: "Phone already taken!.", success: false };
    }

    let pf = body.phones.filter(x => x == phoneNo);

    if (pf.length >= 2) {
        return { message: "Please remove dublicate phone number details!.", success: false };
    }

    if (String(address).length < 10 || String(address).length > 200) {
        return { message: "Enter vaild address within 10 to 200 character!.", success: false };
    }

    let dobDate = moment(dob, 'DD/MM/YYYY').format();

    if (!moment(dobDate).isValid()) {
        return { message: "Please enter vaild date of birth detail!.", success: false };
    }

    let dAge = moment().diff(moment(dobDate), 'years');

    if (dAge < age.owner || dAge > age.max) {
        return { message: "Please enter vaild date of birth details for owner!.", success: false };
    }

    let registerNo = '';

    if (userFields.includes('emergency_contact')) {

        if (isNaN(body.emergency_contact)) {
            return { message: "Please select vaild emergency contact no!.", success: false };
        }

        let phoneNo = `${String(countrycode).trim()}${String(body.emergency_contact).trim()}`;

        if (!isPhoneCountry(phoneNo)) {
            return { message: "Enter vaild emergency contact and country code detail!.", success: false };
        }
    }

    if (userFields.includes('mother_name') && !isNull(body.mother_name)) {

        if (String(body.mother_name).length < 3) {
            return { message: "Please enter user's mother name with more two characters!.", success: false };
        }
    }

    if (userFields.includes('father_name') && !isNull(body.mother_name)) {

        if (String(body.father_name).length < 3) {
            return { message: "Please enter user's father name with more two characters!.", success: false };
        }
    }

    if (userFields.includes('blood_group')) {

        if (!CONFIG.bloodGroups.includes(body.blood_group)) {
            return { message: "Please enter vaild user's blood group details!.", success: false };
        }
    }

    if (userFields.includes('gender')) {
        let gen = firstLetterCap(String(body['gender']).trim());
        if (!gender.includes(gen)) {
            return { message: "Please enter vaild gender details!.", success: false };
        }

        data = {
            ...data,
            gender: gen
        };
    }

    if (userFields.includes('designation')) {
        if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
            return { message: "Please enter designation within 10 to 200 characters!.", success: false };
        }

        data = {
            ...data,
            designation: firstCap(String(body.designation).trim())
        };
    }

    if (userFields.includes('gender')) {
        let gen = firstLetterCap(String(body['gender']).trim());
        if (!gender.includes(gen)) {
            return { message: "Please enter vaild gender details!.", success: false };
        }

        data = { ...data, gender: body.gender };
    }

    if (userFields.includes('designation')) {
        if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
            return { message: "Please enter designation within 10 to 200 characters!.", success: false };
        }

        data = { ...data, designation: firstCap(String(body.designation).trim()) };

    }

    if (isNull(body.group_id) && isNull(body.org_id)) {
        return { message: "Please select institution or group details to create user details!.", success: false };
    }

    let checkOrganizationDetails;

    if (userFields.includes('org_id')) {

        checkOrganizationDetails = await checkOrganizationCode({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        data = { ...data, org_id: checkOrganizationDetails.organizationDetails._id };
    }

    if (userFields.includes('group_id') && !isNull(body.group_id)) {

        if (isNull(data.org_id)) {
            return { message: "Please select vaild institution details!.", success: false };
        }

        let checkGroupDetails = await checkGroupCode({ group_id: body.group_id, org_id: data.org_id });

        if (!checkGroupDetails.success) {
            return { message: checkGroupDetails.message, success: false };
        }

        data = { ...data, group_id: checkGroupDetails.groupDetails._id };

    }

    if (userFields.includes('discipline_id')) {

        if (isNull(data.org_id)) {
            return { message: "Please select vaild institution details!.", success: false };
        }

        let checkDisciplineDetails = await checkDisciplineCode({ discipline_id: body.discipline_id, org_id: data.org_id });

        if (!checkDisciplineDetails.success) {
            return { message: checkDisciplineDetails.message, success: false };
        }

        data = { ...data, discipline_id: checkDisciplineDetails.groupDetails._id };

    }


    if (userFields.includes('program_id')) {

        if (isNull(data.org_id)) {
            return { message: "Please select vaild institution details!.", success: false };
        }

        let checkProgramDetails = await checkProgramCode({ program_id: body.program_id, org_id: data.org_id });

        if (!checkProgramDetails.success) {
            return { message: checkProgramDetails.message, success: false };
        }

        data = { ...data, program_id: checkProgramDetails.programDetails._id };
    }

    if (userFields.includes('cdm_id')) {

        if (isNull(data.program_id)) {
            return { message: "Please select vaild program details!.", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id, program_id: data.program_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        data = { ...data, cdm_id: checkCDM.courseDepartment._id };
    }
    data = { ...data, lateral_entry: false };

    if (userFields.includes('course_batch_id')) {

        if (isNull(data.cdm_id)) {
            return { message: "Please select vaild course department  details!.", success: false };
        }

        let checkCourseBatchDetails = await checkCourseBatchCode({ cdm_id: data.cdm_id, course_batch_id: body.course_batch_id, org_id: body.org_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return { message: checkCourseBatchDetails.message, success: false };
        }

        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { course_batch_id: checkCourseBatchDetails.courseBatchData._id, org_id: body.org_id, is_active: true } }));

        if (err) {
            return { message: err, success: false };
        }

        let count = 1 + body.index + 1;

        if (!isEmpty(userCount)) {
            count = userCount.length + body.index + 1;
        }

        function padLeadingZeros(num, size) {
            var s = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }
        count = padLeadingZeros(count, 3)

        let courseName = String(checkCourseBatchDetails.courseBatchData.cdmId.name).replace(/[&\/\\#,+()$~%.':*?<>{}-]/g, '').replace(' ', '');

        registerNo = `1${String(checkCourseBatchDetails.courseBatchData.programId.name)[0].toUpperCase()}${moment(checkCourseBatchDetails.courseBatchData.form).format('YY')}${courseName.slice(0, 2).toUpperCase()}${count}`;


        data = { ...data, course_batch_id: checkCourseBatchDetails.courseBatchData._id };
    } else {


        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { org_id: body.org_id, is_active: true } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        let count = 1 + body.index;

        if (!isEmpty(userCount)) {
            count = userCount.length + 1 + body.index;
        }

        registerNo = `EM${String(checkOrganizationDetails.organizationDetails.name).slice(0, 3).toUpperCase()}${moment(new Date()).format('YY')}${count}`;

    }


    if (userFields.includes('year')) {
        if (isNull(body.cdm_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        if (isNull(body.course_batch_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let checkCourseBatchDetails = await checkCourseBatchCode({ course_batch_id: body.course_batch_id, org_id: checkCDM.courseDepartment.org_id, cdm_id: checkCDM.courseDepartment.cdm_id, program_id: checkCDM.courseDepartment.program_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return { message: checkCourseBatchDetails.message, success: false };
        }

        let fromY = moment.duration(moment(checkCourseBatchDetails.courseBatchData.from).diff(new Date())).asYears();
        fromY = fromY + 1;

        let year = Number(courseDuration.duration);

        if (year < 0 && isNaN(year)) {
            return { message: "Please enter vaild course duration!.", success: false };
        }

        if (isNaN(body.year) || year < Number(body.year) || Number(body.year) <= 0 || Number(body.year) > fromY + 1) {
            return { message: "Please enter vaild course entry duration!.", success: false };
        }

        data = { ...data, cdm_id: checkCDM.courseDepartment._id, year: body.year };

    }


    if (userFields.includes('department_id')) {

        if (isNull(data.discipline_id)) {
            return { message: "Please select vaild discipline details!.", success: false };
        }

        let checkDepartmentDetails = await checkDepartmentCode({ discipline_id: data.discipline_id, department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return { message: checkDepartmentDetails.message, success: false };
        }

        data = { ...data, department_id: checkDepartmentDetails.departmentDetails._id };

    }

    if (userFields.includes('enrollment')) {
        if (isNull(body.enrollment)) {
            return { message: "Please select enrollment details!.", success: false };
        }

        if (!CONFIG.enrollment.includes(String(body.enrollment))) {
            return { message: "Please select vaild enrollment details!.", success: false };
        }

        data = { ...data, enrollment: body.enrollment };
    }

    if (userFields.includes('lateral_entry') && (body.lateral_entry == true || body.lateral_entry == 'true')) {

        if (isNull(body.cdm_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let year = Number(courseDuration.duration);

        if (year < 0 && isNaN(year)) {
            return { message: "Please enter vaild course duration!.", success: false };
        }

        if (isNaN(body.lateral_year) || year < Number(body.lateral_year) || Number(body.lateral_year) <= 1) {
            return { message: "Please enter vaild lateral entry duration!.", success: false };
        }

        data = { ...data, lateral_entry: true, cdm_id: checkCDM.courseDepartment._id };
    }

    if (userFields.includes('pincode')) {
        let map = {}
        let checkPincode = await PincodeData.filter(x => {
            if (x.pincode == body.pincode && String(x.districtName).replace(' ', '').toLowerCase() == String(body.city).replace(' ', '').toLowerCase() && String(x.stateName).replace(' ', '').toLowerCase() == String(body.state).replace(' ', '').toLowerCase()) {
                map = { ...x }
                return true
            }
        });

        if (isEmpty(checkPincode)) {
            return { message: "Please select vaild pincode city state details!.", success: false };
        }

        data = {
            ...data,
            pincode: map.pincode,
            city: map.city,
            state: map.state
        };
    }


    if (userFields.includes('role_id')) {

        let roleDetails = await checkRoleCode({ roleId: body.role_id, menuId: body.menu_id });

        if (!roleDetails.success) {
            return { message: roleDetails.message, success: false };
        }

        data = { ...data, role_id: roleDetails.checkRole._id };

    }

    if (userFields.includes('subject_id') && userFields.includes('department_id')) {

        let checkSubjectDetails = await checkSubjectCode({ subject_id: body.subject_id });

        if (!checkSubjectDetails.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        data = { ...data, subject_id: checkSubjectDetails.subjectDetails._id };

    }
    
    return { message: "Verified!", success: true, data: { ...data, user_unique_id: registerNo, } };

}

const userRegisterMethod = async (req, res) => {
    let body = req.body;

    const user = req.user;

    const { age, gender } = CONFIG;

    const { menu_id, first_name, last_name, surname, email, countrycode, phone, address, city, state, dob, country, pincode } = body;

    let checkMenuDetails = await checkMenu({ menuId: menu_id });

    if (!checkMenuDetails.success) {
        return { message: checkMenuDetails.message, success: false };
    }

    if (!user.owner) {

        let checkMenuUserDetails = await checkMenuByUser({ user_id: user._id, menuId: body.menu_id, access: { 'Create': true } });

        if (!checkMenuUserDetails.success) {
            return { message: checkMenuUserDetails.message, success: false };
        }
    }

    let err;

    let fields = ['menu_id', 'first_name', 'last_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return { message: `Please enter required fields ${inVaildFields}!.`, success: false };
    }

    body.email = String(body.email).toLowerCase();

    let getAllFields = await checkFieldsByMenu({ menuId: menu_id });

    if (!getAllFields.success) {
        return { message: getAllFields.message, success: false };
    }

    let userFields = [], requiredFields = [];

    let availableFields = ['group_id', 'gender', 'year', 'designation', 'org_id', 'discipline_id', 'department_id', 'subject_id', 'program_id', 'cdm_id', 'lateral_entry', 'role_id', 'course_batch_id', 'enrollment', 'mother_name', 'father_name', 'blood_group', 'emergency_contact'];

    for (var i = 0; i < getAllFields.fields.length; i++) {
        let x = getAllFields.fields[i];

        if (availableFields.includes(x.fieldDetails.name)) {
            userFields.push(x.fieldDetails.name);
            if (x.required) {
                requiredFields.push(x.fieldDetails.name);
            }
        }
    }

    // let inVaildField = await userFields.filter(x => isNull(body[x]));

    // if (!isEmpty(inVaildField)) {
    //     return { message: `Please enter user fields ${inVaildField}!.` , success:false };
    // }

    let inVaildReqFields = await requiredFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildReqFields)) {
        return { message: `Please enter required user fields ${inVaildReqFields}!.`, success: false };
    }

    if (String(first_name).length < 3) {
        return { message: "Enter vaild first name with more then 3 character!.", success: false };
    }

    if (!isEmail(email)) {
        return { message: "Enter vaild email detail!.", success: false };
    }

    let phoneNo = `${String(countrycode).trim()}${String(phone).trim()}`;

    if (!isPhoneCountry(phoneNo)) {
        return { message: "Enter vaild phone and country code detail!.", success: false };
    }

    if (String(address).length < 10 || String(address).length > 200) {
        return { message: "Enter vaild address within 10 to 200 character!.", success: false };
    }

    let name = `${first_name}${last_name}`;

    let username;

    const data = async () => {
        username = genrateUserName(String(name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, ""));
        if (String(username).length < 5) {
            data();
        } else {
            let checkUserName, userNameOption = {
                username: username,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };

            [err, checkUserName] = await to(user_data.findOne({
                where: userNameOption
            }));

            if (!isNull(checkUserName)) {
                data();
            }
        }
    }

    data();

    let checkEmail, checkOrganizationEmail, optionEmail = {
        email: String(email).toLowerCase(),
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkEmail] = await to(user_data.findOne({
        where: optionEmail
    }));

    [err, checkOrganizationEmail] = await to(organization.findOne({
        where: optionEmail
    }));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkEmail) || !isNull(checkOrganizationEmail)) {
        return { message: "Email id already taken!.", success: false };
    }

    let checkPhone, checkOrganizationPhone, optionPhone = {
        phone: phone,
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkPhone] = await to(user_data.findOne({
        where: optionPhone
    }));

    [err, checkOrganizationPhone] = await to(organization.findOne({
        where: {
            alternate_contact_no: phone,
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    }));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkPhone) || !isNull(checkOrganizationPhone)) {
        return { message: "Phone already taken!.", success: false };
    }

    let dobDate = moment(dob, 'DD/MM/YYYY').format();

    if (!moment(dobDate).isValid()) {
        return { message: "Please enter vaild date of birth detail!.", success: false };
    }

    let dAge = moment().diff(moment(dobDate), 'years');

    if (dAge < age.owner || dAge > age.max) {
        return { message: "Please enter vaild date of birth details for owner!.", success: false };
    }

    let password = 'POJTKQa@'

    let passwordH;

    [err, passwordH] = await to(bcrypt.hash(password, bcrypt.genSaltSync(10)));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(passwordH)) {
        return { message: "Something went wrong to genrate password!.", success: false };
    }


    let userCreate = {
        f_name: firstLetterCap(String(first_name).trim()),
        l_name: firstLetterCap(String(last_name).trim()),
        username: String(username).trim(),
        countrycode: String(countrycode).trim(),
        surname,
        email: String(email).toLowerCase(),
        phone: String(phone).trim(),
        address,
        dob: moment(dobDate)._d,
        city,
        state,
        country,
        pincode,
        password: passwordH,
        is_active: true,
        is_block: false,
        owner: false,
        email_verified: true,
        phone_verified: true
    };

    let userInfoCreate = {
        is_active: true,
        is_block: false
    }

    let registerNo = '';

    if (userFields.includes('emergency_contact')) {

        if (isNaN(body.emergency_contact)) {
            return { message: "Please select vaild emergency contact no!.", success: false };
        }

        let phoneNo = `${String(countrycode).trim()}${String(body.emergency_contact).trim()}`;

        if (!isPhoneCountry(phoneNo)) {
            return { message: "Enter vaild emergency contact and country code detail!.", success: false };
        }

        userCreate = {
            ...userCreate,
            emergency_contact: body.emergency_contact
        };
    }

    if (userFields.includes('mother_name') && !isNull(body.mother_name)) {

        if (String(body.mother_name).length < 3) {
            return { message: "Please enter user's mother name with more two characters!.", success: false };
        }

        userCreate = {
            ...userCreate,
            mother_name: firstCap(String(body.mother_name).trim())
        };
    }

    if (userFields.includes('father_name') && !isNull(body.father_name)) {

        if (String(body.father_name).length < 3) {
            return { message: "Please enter user's father name with more two characters!.", success: false };
        }

        userCreate = {
            ...userCreate,
            father_name: firstCap(String(body.father_name).trim())
        };
    }

    if (userFields.includes('blood_group')) {

        if (!CONFIG.bloodGroups.includes(body.blood_group)) {
            return { message: "Please enter vaild user's blood group details!.", success: false };
        }

        userCreate = {
            ...userCreate,
            blood_group: body.blood_group
        };
    }

    if (userFields.includes('gender')) {
        let gen = firstLetterCap(String(body['gender']).trim());
        if (!gender.includes(gen)) {
            return { message: "Please enter vaild gender details!.", success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            gender: gen
        };
    }

    if (userFields.includes('designation')) {
        if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
            return { message: "Please enter designation within 10 to 200 characters!.", success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            designation: firstCap(String(body.designation).trim())
        };
    }

    if (userFields.includes('pincode')) {

        let map = {}
        let checkPincode = await PincodeData.filter(x => {
            if (x.pincode == body.pincode && String(x.districtName).replace(' ', '').toLowerCase() == String(body.city).replace(' ', '').toLowerCase() && String(x.stateName).replace(' ', '').toLowerCase() == String(body.state).replace(' ', '').toLowerCase()) {
                map = { ...x }
                return true
            }
        });

        if (isEmpty(checkPincode)) {
            return { message: "Please select vaild pincode city state details!.", success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            pincode: map.pincode,
            city: map.city,
            state: map.state
        };

    }

    if (isNull(body.group_id) && isNull(body.org_id)) {
        return { message: "Please select institution or group details to create user details!.", success: false };
    }

    let checkOrganizationDetails;

    if (userFields.includes('org_id')) {

        checkOrganizationDetails = await checkOrganizationCode({ code: body.org_id });

        if (!checkOrganizationDetails.success) {
            return { message: checkOrganizationDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            org_id: checkOrganizationDetails.organizationDetails._id
        };
    }

    if (userFields.includes('group_id') && !isNull(body.group_id)) {

        let checkGroupDetails = await checkGroupCode({ code: body.group_id, group_id: body.group_id });

        if (!checkGroupDetails.success) {
            return { message: checkGroupDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            group_id: checkGroupDetails.groupDetails._id
        };
    }

    if (userFields.includes('discipline_id')) {

        if (isNull(userInfoCreate.org_id)) {
            return { message: "Please select vaild institution  details!.", success: false };
        }

        let checkDisciplineDetails = await checkDisciplineCode({ code: body.discipline_id, discipline_id: body.discipline_id, org_id: userInfoCreate.org_id });

        if (!checkDisciplineDetails.success) {
            return { message: checkDisciplineDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            discipline_id: checkDisciplineDetails.groupDetails._id
        };

        let df = ['org_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkDisciplineDetails.groupDetails[x] });
    }


    if (userFields.includes('program_id')) {

        if (isNull(userInfoCreate.org_id)) {
            return { message: "Please select vaild institution  details!.", success: false };
        }

        let checkProgramDetails = await checkProgramCode({ code: body.program_id, program_id: body.program_id, org_id: userInfoCreate.org_id });

        if (!checkProgramDetails.success) {
            return { message: checkProgramDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            program_id: checkProgramDetails.programDetails._id
        };

        let df = ['org_id', 'discipline_id', 'program_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkProgramDetails.programDetails[x] });
    }

    if (userFields.includes('cdm_id')) {

        if (isNull(userInfoCreate.program_id)) {
            return { message: "Please select vaild program  details!.", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id, name: body.cdm_id, program_id: userInfoCreate.program_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            cdm_id: checkCDM.courseDepartment._id,
            program_id: checkCDM.courseDepartment.program_id
        };
    }

    if (userFields.includes('course_batch_id')) {

        if (isNull(userInfoCreate.cdm_id)) {
            return { message: "Please select vaild course department details!.", success: false };
        }

        let checkCourseBatchDetails = await checkCourseBatchCode({ course_batch_id: body.course_batch_id, from: 'present', cdm_id: userInfoCreate.cdm_id });

        if (!checkCourseBatchDetails.success) {
            return { message: checkCourseBatchDetails.message, success: false };
        }


        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { course_batch_id: checkCourseBatchDetails.courseBatchData._id, is_active: true } }));

        if (err) {
            return { message: err, success: false };
        }

        let count = 1 + body.index + 1;

        if (!isEmpty(userCount)) {
            count = userCount.length + body.index + 1;
        }

        function padLeadingZeros(num, size) {
            var s = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }
        count = padLeadingZeros(count, 3)

        let courseName = String(checkCourseBatchDetails.courseBatchData.cdmId.name).replace(/[&\/\\#,+()$~%.':*?<>{}-]/g, '').replace(' ', '');

        registerNo = `1${String(checkCourseBatchDetails.courseBatchData.programId.name)[0].toUpperCase()}${moment(checkCourseBatchDetails.courseBatchData.form).format('YY')}${courseName.slice(0, 2).toUpperCase()}${count}`;

        userInfoCreate = { ...userInfoCreate, course_batch_id: checkCourseBatchDetails.courseBatchData._id };
    } else {


        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { org_id: body.org_id, is_active: true } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        let count = 1 + body.index;

        if (!isEmpty(userCount)) {
            count = userCount.length + 1 + body.index;
        }

        registerNo = `EM${String(checkOrganizationDetails.organizationDetails.name).slice(0, 3).toUpperCase()}${moment(new Date()).format('YY')}${count}`;

    }

    if (userFields.includes('year')) {
        if (isNull(body.cdm_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        if (isNull(body.course_batch_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let checkCourseBatchDetails = await checkCourseBatchCode({ course_batch_id: body.course_batch_id, org_id: checkCDM.courseDepartment.org_id, cdm_id: checkCDM.courseDepartment.cdm_id, program_id: checkCDM.courseDepartment.program_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return { message: checkCourseBatchDetails.message, success: false };
        }

        let fromY = moment.duration(moment(checkCourseBatchDetails.courseBatchData.from).diff(new Date())).asYears();
        fromY = fromY + 1;

        let year = Number(courseDuration.duration);

        if (year < 0 && isNaN(year)) {
            return { message: "Please enter vaild course duration!.", success: false };
        }

        if (isNaN(body.year) || year < Number(body.year) || Number(body.year) <= 0 || Number(body.year) > fromY + 1) {
            return { message: "Please enter vaild course entry duration!.", success: false };
        }

        userInfoCreate = { ...userInfoCreate, cdm_id: checkCDM.courseDepartment._id, year: body.year };

    }

    if (userFields.includes('department_id')) {

        if (isNull(userInfoCreate.discipline_id)) {
            return { message: "Please select vaild discipline  details!.", success: false };
        }

        let checkDepartmentDetails = await checkDepartmentCode({ department_id: body.department_id, discipline_id: userInfoCreate.discipline_id });

        if (!checkDepartmentDetails.success) {
            return { message: checkDepartmentDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            department_id: checkDepartmentDetails.departmentDetails._id
        };

        let df = ['org_id', 'discipline_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkDepartmentDetails.departmentDetails[x] });
    }

    if (userFields.includes('enrollment')) {
        if (isNull(body.enrollment)) {
            return { message: "Please select enrollment details!.", success: false };
        }

        if (!CONFIG.enrollment.includes(String(body.enrollment))) {
            return { message: "Please select vaild enrollment details!.", success: false };
        }

        userInfoCreate = { ...userInfoCreate, enrollment: body.enrollment };
    }

    if (userFields.includes('lateral_entry') && (body.lateral_entry == true || body.lateral_entry == 'true')) {

        if (isNull(body.cdm_id)) {
            return { message: "Please select vaild course department!", success: false };
        }

        let checkCDM = await checkCourseDepartCode({ cdm_id: body.cdm_id, name: body.cdm_id });

        if (!checkCDM.success) {
            return { message: checkCDM.message, success: false };
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let year = Number(courseDuration.duration);

        if (year < 0 && isNaN(year)) {
            return { message: "Please enter vaild course duration!.", success: false };
        }

        if (isNaN(body.lateral_year) || year < Number(body.lateral_year) || Number(body.lateral_year) <= 1) {
            return { message: "Please enter vaild lateral entry duration!.", success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: true,
            lateral_year: body.lateral_year
        }

    } else {
        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: false
        }
    }


    if (userFields.includes('role_id')) {

        let roleDetails = await checkRoleCode({ roleId: body.role_id, code: body.role_id });

        if (!roleDetails.success) {
            return { message: roleDetails.message, success: false };
        }

        userInfoCreate = {
            ...userInfoCreate,
            role_id: body.role_id
        };
    }

    userCreate = {
        ...userCreate,
        user_unique_id: registerNo,
        createdby: user._id,
        updatedby: user._id
    }

    let createUser;

    [err, createUser] = await to(user_data.create(userCreate));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(createUser)) {
        return { message: `Something went wrong to create owner user ${err}!`, success: false };
    }

    userInfoCreate = {
        ...userInfoCreate,
        user_id: createUser._id,
        createdby: user._id,
        updatedby: user._id
    }

    let createInfo;

    [err, createInfo] = await to(user_info.create(userInfoCreate));

    if (err) {
        return { message: err, success: false };
    }

    let message = '';

    if (isNull(createInfo)) {
        message = `Register Successfully but User info not add!.`;
    }

    let optionUser = { user_info: createInfo._id, updatedby: user._id }

    let mapSubjectByUser;

    if (userFields.includes('subject_id') && userFields.includes('department_id')) {

        let checkSubjectDetails = await checkSubjectCode({ subject_id: body.subject_id });

        if (!checkSubject.success) {
            return { message: checkSubjectDetails.message, success: false };
        }

        let checkSubjectUserDetails = await checkSubjectByUser({ subject_id: checkSubjectDetails.subjectDetails._id, user_id: createUser._id });

        if (!checkSubjectUserDetails.success) {
            message = `Register Successfully but ${checkSubjectUserDetails.message}`;
        }

        mapSubjectByUser = await mapSubjectUserMethod({ subject_id: checkSubjectDetails.subjectDetails._id, department_id: checkSubjectDetails.subjectDetails.department_id, user_id: createUser._id });

        if (!mapSubjectByUser.success) {
            message = `Register Successfully but ${mapSubjectByUser.message}`;
        }
    }

    let updateUser;

    [err, updateUser] = await to(user_data.update(optionUser, { where: { _id: createUser._id, is_active: true, is_block: false } }));

    if (err) {
        message = err;
    }

    if (!updateUser) {
        message = "Something went wrong to update user info!.";
    }

    if (!isNull(createUser)) {
        return ReS(res, { message: message ? message : " Register Successfully!", user: createUser.toWeb(), password }, HttpStatus.OK);
    }

}

const MenuBulkCheck = async (body) => {
    let fields = ['name', 'user', 'userDetails'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return { message: `Please enter required fields ${inVaildFields}!.`, success: false };
    }

    const { userDetails } = body;

    if (String(body.name).length < 4) {
        return { message: "Please enter vaild type with more then 4 character!.", success: false };
    }

    if (String(body.label).length < 4) {
        return { message: "Please enter vaild type with more then 4 character!.", success: false };
    }

    let checkMenu, optionMenu = {
        where: {
            name: firstLetterCap(String(body.name).trim()),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkMenu] = await to(menu.findOne(optionMenu));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkMenu)) {
        return { message: "Menu already exits!.", success: false };
    }

    let checkMenuLabel, optionMenuLabel = {
        where: {
            label: String(body.label).trim(),
            [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
        }
    };

    [err, checkMenuLabel] = await to(menu.findOne(optionMenuLabel));

    if (err) {
        return { message: err, success: false };
    }

    if (!isNull(checkMenuLabel)) {
        return { message: "Menu label was already exits!.", success: false };
    }

    let createData = {
        name: firstLetterCap(String(body.name).trim()),
        label: String(body.label).trim(),
        user: false,
        is_block: false,
        is_active: true,
        createdby: userDetails._id,
        updatedby: userDetails._id
    };

    if (!isNull(body.user)) {
        if (!CONFIG.boolean.includes(body.user)) {
            return { message: "Please select vaild menu user fields data!.", success: false };
        }

        createData = {
            ...createData,
            user: body.user
        }

        if (!isNull(body.ref_role_id)) {

            let checkKodeRoleDetails = await getKodeMenuByRole({ roleId: body.ref_role_id });

            if (!checkKodeRoleDetails.success) {
                return { message: checkKodeRoleDetails.message, success: false };
            }

            createData = {
                ...createData,
                user: body.user,
                ref_role_id: body.ref_role_id
            }
        }

    }

    return { message: "Verified menu", createData, success: true };
}

module.exports = { userRegisterVerification, userRegisterMethod, MenuBulkCheck };