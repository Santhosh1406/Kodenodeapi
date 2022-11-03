const { user_info, organization, user_data, discipline, menu, user_subject, section, course_batch, user_track, subject, program, role, role_menu_mapping, course_department_mapping, department, user_field, batch_sem, user_fields_mapping } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, isEmail, isEmpty, isPhone, generatePassword, firstLetterCap, genrateUserName, isPhoneCountry, encrypt, decrypt, firstCap } = require('../service/util.service');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const { checkMenu, getAllMappedFacultybySubject, checkUserInf, checkMenuAccess } = require('./common');
const { checkOrganizationCode } = require('./commonCode');
const { checkFieldsByMenu } = require('./user_fields_mapping');
const { checkCourseDepart } = require('./course_department_mapping');
const { checkProgram } = require('./program');
const { checkOrganization } = require('./common');
const { checkDiscipline } = require('./common');
const { checkRole, getCustomerRoleByKodeRole, checkKodeRole } = require('./role');
const { checkCourse } = require('./course');
const { checkSubjectByUser, mapSubjectUserMethod } = require('./user_subject');
const { checkMenuByUser, checkRolesByUser } = require('./role_menu_mapping');
const { checkGroup } = require('./group');
const { getQuery, IsValidUUIDV4 } = require('../service/validation');
const { checkDepartment } = require('./department');
const { userRegisterVerification } = require('./commonMutiple');
const { checkCourseBatch } = require('./course_batch');
const { checkSection } = require('./section');
const PincodeData = require('../service/store/pincode.json');


module.exports.createOwner = async (req, res) => {
    let body = req.body;

    const { age } = CONFIG;

    let err;

    let fields = ['f_name', 'l_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    body.email = String(body.email).toLowerCase();

    const { f_name, l_name, surname, email, countrycode, phone, address, city, state, dob, country, pincode } = body;

    if (String(f_name).length < 3) {
        return ReE(res, { message: "Enter vaild first name with more then 3 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmail(email)) {
        return ReE(res, { message: "Enter vaild email detail!." }, HttpStatus.BAD_REQUEST);
    }

    let phoneNo = `${String(countrycode).trim()}${String(phone).trim()}`;


    if (!isPhoneCountry(phoneNo)) {
        return ReE(res, { message: "Enter vaild phone and country code detail!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(address).length < 10 || String(address).length > 200) {
        return ReE(res, { message: "Enter vaild address within 10 to 200 character!." }, HttpStatus.BAD_REQUEST);
    }

    let name = `${f_name}${l_name}`;

    let username = '';

    const data = async () => {
        username = genrateUserName(String(name).replace(' ', ''));
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
        email: email,
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkEmail] = await to(user_data.findOne({
        where: optionEmail
    }));

    [err, checkOrganizationEmail] = await to(organization.findOne({
        where: optionEmail
    }));


    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkEmail) || !isNull(checkOrganizationEmail)) {
        return ReE(res, { message: "Email id already taken!." }, HttpStatus.BAD_REQUEST);
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
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkPhone) || !isNull(checkOrganizationPhone)) {
        return ReE(res, { message: "Phone already taken!." }, HttpStatus.BAD_REQUEST);
    }

    let dobDate = moment(dob, 'DD/MM/YYYY').format();

    if (!moment(dobDate).isValid()) {
        return ReE(res, { message: "Please enter vaild date of birth detail!." }, HttpStatus.BAD_REQUEST);
    }

    let dAge = moment().diff(moment(dobDate), 'years');

    if (dAge < age.owner || dAge > age.max) {
        return ReE(res, { message: "Please enter vaild date of birth details 70 to greater the 18!." }, HttpStatus.BAD_REQUEST);
    }

    let map = {};

    let checkPincode = await PincodeData.filter(x => {
        if (x.pincode == body.pincode && String(x.districtName).replace(' ', '').toLowerCase() == String(body.city).replace(' ', '').toLowerCase() && String(x.stateName).replace(' ', '').toLowerCase() == String(body.state).replace(' ', '').toLowerCase()) {
            map = { ...x }
            return true
        }
    });

    if (isEmpty(checkPincode)) {
        return ReE(res, { message: "Please select vaild pincode city state details!." }, HttpStatus.BAD_REQUEST);
    }

    body = {
        ...body,
        pincode: map.pincode,
        city: map.city,
        state: map.state
    };

    let password = 'POJTKQa@';
    //generatePassword();

    let passwordH;

    [err, passwordH] = await to(bcrypt.hash(password, bcrypt.genSaltSync(10)));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(passwordH)) {
        return ReE(res, { message: "Something went wrong to genrate password!." }, HttpStatus.BAD_REQUEST)
    }

    let userCreate = {
        f_name: firstLetterCap(String(f_name).trim()),
        l_name: firstLetterCap(String(l_name).trim()),
        username: String(username).trim(),
        countrycode: String(countrycode).trim(),
        surname,
        email: String(body.email).toLowerCase(),
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
        email_otp: 123456,
        phone_otp: 123456,
        owner: true,
        email_verified: true,
        phone_verified: true
    }

    let createUser;

    [err, createUser] = await to(user_data.create(userCreate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createUser)) {
        return ReE(res, { message: `Something went wrong to create owner user ${err}!` }, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(createUser)) {
        return ReS(res, { message: "Register Successfully!", user: createUser.toWeb(), password }, HttpStatus.OK);
    }

}

module.exports.loginUser = async (req, res) => {
    let body = req.body;

    const DeviceDetector = require('node-device-detector');
    const detector = new DeviceDetector({
        clientIndexes: true,
        deviceIndexes: true,
        deviceAliasCode: false,
    });
    const userAgent = req.header('User-Agent');
    const result = detector.detect(userAgent);

    let err;

    let validation = ['username', 'password'];

    let inVaild = await validation.filter(x => {
        if (isNull(body[x])) {
            return true;
        }
        return false
    });

    if (inVaild.length > 0) {
        return ReE(res, { message: `Please enter ${inVaild} !.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUser, optionUser = {
        where: {
            is_active: true,
            [Op.or]: [{ username: body.username }, { email: String(body.username).toLowerCase() }, { phone: body.username }]
        }
    };
    [err, checkUser] = await to(user_data.findOne(optionUser));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkUser)) {
        return ReE(res, { message: "Please enter vaild username and password!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkUser.is_block) {
        return ReE(res, { message: "Your account was blocked!" }, HttpStatus.BAD_REQUEST);
    }

    let checkPassword;

    [err, checkPassword] = await to(checkUser.comparePassword(body.password));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (!checkPassword) {
        return ReE(res, { message: 'Please check your user name and password!.' }, HttpStatus.BAD_REQUEST);
    }

    let key = generatePassword();

    let en = encrypt(JSON.stringify({ key, id: checkUser._id }), CONFIG.sKey)


    let usertrackData = {
        user_id: checkUser._id,
        key: key,
        owner: checkUser.owner,
        org_id: null,
        login_at: moment()._d,
        is_active: true,
        is_block: false,
        createdby: checkUser._id,
        updatedby: checkUser._id,
        device: { ...result.client, ...req.connection._peername }
    };

    let checkExistLogin, optionCheckTrack = {
        where: {
            device: { ...result.client, ...req.connection._peername },
            user_id: checkUser._id,
            is_active: true,
            is_block: false,
        },
        set: {
            logout_at: moment()._d,
            updatedby: checkUser._id,
        }
    };

    [err, checkExistLogin] = await to(user_track.update(optionCheckTrack.set, { where: optionCheckTrack.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    if (!checkUser.owner) {
        let checkUserDetails = await checkUserInf({ user_id: checkUser._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        usertrackData = {
            ...usertrackData,
            org_id: checkUserDetails.userInfo.org_id
        };
    }

    let createUserTrack;

    [err, createUserTrack] = await to(user_track.create(usertrackData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createUserTrack)) {
        return ReE(res, { message: "Something went wrong to track the user details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createUserTrack)) {
        return ReS(res, { message: `Welcome ${checkUser.username} `, token: checkUser.getJWT(), refreshToken: en }, HttpStatus.OK)
    }
}

module.exports.profile = async (req, res) => {
    const user = req.user;

    let err, getMenu, data;

    let menus = [], checkRoles, role;

    if (!user.owner) {
        checkRoles = await checkRolesByUser({ user_id: user._id });

        if (checkRoles.success) {
            role = checkRoles.role;
            await checkRoles.role_menu.map(x => menus.push({ access: x.access, ref_role_id: x.menuDetails.ref_role_id, role_id: x.roleDetails, _id: x.menuDetails._id, label: x.menuDetails.label, name: x.menuDetails.name }));
        }

        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        data = { message: "User Profile!.", role: { _id: role?._id, name: role?.name, code: role?.code }, userInfo: checkUserDetails?.userInfo, kodeRole: checkRoles?.role_menu[0]?.refRoleDetails, user: user.toWeb(), menus: { array: menus, arrayName: menus.map(x => x.label) } }
    }

    if (user.owner) {
        [err, getMenu] = await to(menu.findAll({
            where: { is_active: true, is_block: false }, order: [
                ['name', 'ASC'],
            ]
        }));

        if (err) {
            return ReE(res, err, HttpStatus.BAD_REQUEST);
        }

        if (!isEmpty(getMenu)) {
            getMenu.map(x => menus.push(x));
        }

        data = { message: "User Profile!.", role: role, user: user.toWeb(), menus: { array: menus, arrayName: menus.map(x => x.label) } }
    }

    return ReS(res, data, HttpStatus.OK);

}

module.exports.sdKLoginUser = async (req, res) => {
    let body = req.body;

    const DeviceDetector = require('node-device-detector');
    const detector = new DeviceDetector({
        clientIndexes: true,
        deviceIndexes: true,
        deviceAliasCode: false,
    });
    const userAgent = req.header('User-Agent');
    const result = detector.detect(userAgent);

    let err;

    let validation = ['username', 'password'];

    let inVaild = await validation.filter(x => {
        if (isNull(body[x])) {
            return true;
        }
        return false
    });

    if (inVaild.length > 0) {
        return ReE(res, { message: `Please enter ${inVaild} !.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUser, optionUser = {
        where: {
            is_active: true,
            [Op.or]: [{ username: body.username }, { email: String(body.username).toLowerCase() }, { phone: body.username }]
        }
    };
    [err, checkUser] = await to(user_data.findOne(optionUser));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkUser)) {
        return ReE(res, { message: "Please enter vaild username and password!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkUser.is_block) {
        return ReE(res, { message: "Your account was blocked!" }, HttpStatus.BAD_REQUEST);
    }

    let checkPassword;

    [err, checkPassword] = await to(checkUser.comparePassword(body.password));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (!checkPassword) {
        return ReE(res, { message: 'Please check your user name and password!.' }, HttpStatus.BAD_REQUEST);
    }

    let checkUserInfoDetails = await checkUserInf({ user_id: checkUser._id });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSubject, optionSubject = {
        where: {
            user_id: checkUser._id,
            is_active: true
        }
    };

    [err, checkSubject] = await to(user_subject.findAll(optionSubject));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkUserInfoDetails.userInfo.course_batch_id) && isEmpty(checkSubject)) {
        return ReE(res, { message: "This login only for student and faculty only!." }, HttpStatus.BAD_REQUEST);
    }

    let type = '';

    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        type = CONFIG.type[0];
    }

    if (!isNull(checkSubject) && isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        type = CONFIG.type[1];
    }


    let key = generatePassword();

    let en = encrypt(JSON.stringify({ key, id: checkUser._id }), CONFIG.sKey)


    let usertrackData = {
        user_id: checkUser._id,
        key: key,
        owner: checkUser.owner,
        org_id: null,
        login_at: moment()._d,
        is_active: true,
        is_block: false,
        createdby: checkUser._id,
        updatedby: checkUser._id,
        device: { ...result.client, ...req.connection._peername }
    };

    let checkExistLogin, optionCheckTrack = {
        where: {
            device: { ...result.client, ...req.connection._peername },
            user_id: checkUser._id,
            is_active: true,
            is_block: false,
        },
        set: {
            logout_at: moment()._d,
            updatedby: checkUser._id,
        }
    };

    [err, checkExistLogin] = await to(user_track.update(optionCheckTrack.set, { where: optionCheckTrack.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    if (!checkUser.owner) {
        let checkUserDetails = await checkUserInf({ user_id: checkUser._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        usertrackData = {
            ...usertrackData,
            org_id: checkUserDetails.userInfo.org_id
        };
    }

    let createUserTrack;

    [err, createUserTrack] = await to(user_track.create(usertrackData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createUserTrack)) {
        return ReE(res, { message: "Something went wrong to track the user details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(createUserTrack)) {
        return ReS(res, { message: `Welcome ${checkUser.username} `, token: checkUser.getJWT(), refreshToken: en }, HttpStatus.OK)
    }
}

module.exports.sdkProfile = async (req, res) => {
    const user = req.user;

    let err, getMenu, data;

    let menus = [], checkRoles, role;

    let checkUserInfoDetails = await checkUserInf({ user_id: user._id, type: 'sdk' });

    if (!checkUserInfoDetails.success) {
        return ReE(res, { message: checkUserInfoDetails.message }, HttpStatus.BAD_REQUEST);
    }

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


    if (isNull(checkUserInfoDetails.userInfo.course_batch_id) && isEmpty(checkSubject)) {
        return ReE(res, { message: "This login only for student and faculty only!." }, HttpStatus.BAD_REQUEST);
    }

    let type = '';


    if (!isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        type = CONFIG.type[0];
    }

    if (!isNull(checkSubject) && isNull(checkUserInfoDetails.userInfo.course_batch_id)) {
        type = CONFIG.type[1];
    }

    checkRoles = await checkRolesByUser({ user_id: user._id });

    if (checkRoles.success) {
        role = checkRoles.role;
        await checkRoles.role_menu.map(x => menus.push({ access: x.access, ref_role_id: x.menuDetails.ref_role_id, role_id: x.roleDetails, _id: x.menuDetails._id, label: x.menuDetails.label, name: x.menuDetails.name }));
    }

    checkUserInfoDetails.userInfo.setDataValue("type", type);

    let userDetails = checkUserInfoDetails.userInfo;

    data = { message: "User Profile!.", userDetails: userDetails, user: user.toWeb(), menus: { array: menus, arrayName: menus.map(x => x.label) } }


    return ReS(res, data, HttpStatus.OK);

}

module.exports.userRegister = async (req, res) => {
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

    const { age, gender } = CONFIG;

    const menu_id = req.query.menu_id;

    let err;

    let fields = ['f_name', 'l_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    body.email = String(body.email).toLowerCase();

    const { f_name, l_name, surname, email, countrycode, phone, address, city, state, dob, country, pincode } = body;

    let checkMenuDetails = await checkMenu({ menuId: menu_id });

    if (!checkMenuDetails.success) {
        return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getAllFields = await checkFieldsByMenu({ menuId: checkMenuDetails.checkMenu._id });

    if (!getAllFields.success) {
        return ReE(res, { message: getAllFields.message }, HttpStatus.BAD_REQUEST);
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
    //     return ReE(res, { message: `Please enter user fields ${inVaildField}!.` }, HttpStatus.BAD_REQUEST);
    // }

    let inVaildReqFields = await requiredFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildReqFields)) {
        return ReE(res, { message: `Please enter required user fields ${inVaildReqFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    if (String(f_name).length < 3) {
        return ReE(res, { message: "Enter vaild first name with more then 3 character!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmail(email)) {
        return ReE(res, { message: "Enter vaild email detail!." }, HttpStatus.BAD_REQUEST);
    }

    let phoneNo = `${String(countrycode).trim()}${String(phone).trim()}`;

    if (!isPhoneCountry(phoneNo)) {
        return ReE(res, { message: "Enter vaild phone and country code detail!." }, HttpStatus.BAD_REQUEST);
    }

    if (String(address).length < 10 || String(address).length > 200) {
        return ReE(res, { message: "Enter vaild address within 10 to 200 character!." }, HttpStatus.BAD_REQUEST);
    }

    let name = `${f_name}${l_name}`;

    let username = '', registerNo = '';

    const data = async () => {
        username = genrateUserName(String(name).replace(' ', ''));
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
        email: email,
        [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
    };

    [err, checkEmail] = await to(user_data.findOne({
        where: optionEmail
    }));

    [err, checkOrganizationEmail] = await to(organization.findOne({
        where: optionEmail
    }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkEmail) || !isNull(checkOrganizationEmail)) {
        return ReE(res, { message: "Email id already taken!." }, HttpStatus.BAD_REQUEST);
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
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!isNull(checkPhone) || !isNull(checkOrganizationPhone)) {
        return ReE(res, { message: "Phone already taken!." }, HttpStatus.BAD_REQUEST);
    }

    let dobDate = moment(dob, 'DD/MM/YYYY').format();

    if (!moment(dobDate).isValid()) {
        return ReE(res, { message: "Please enter vaild date of birth detail!." }, HttpStatus.BAD_REQUEST);
    }

    let dAge = moment().diff(moment(dobDate), 'years');

    let password = 'POJTKQa@'

    let passwordH;

    [err, passwordH] = await to(bcrypt.hash(password, bcrypt.genSaltSync(10)));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(passwordH)) {
        return ReE(res, { message: "Something went wrong to genrate password!." }, HttpStatus.BAD_REQUEST)
    }

    let map = {};

    let checkPincode = await PincodeData.filter(x => {
        if (x.pincode == body.pincode && String(x.districtName).replace(' ', '').toLowerCase() == String(body.city).replace(' ', '').toLowerCase() && String(x.stateName).replace(' ', '').toLowerCase() == String(body.state).replace(' ', '').toLowerCase()) {
            map = { ...x }
            return true
        }
    });

    if (isEmpty(checkPincode)) {
        return ReE(res, { message: "Please select vaild pincode city state details!." }, HttpStatus.BAD_REQUEST);
    }

    body = {
        ...body,
        pincode: map.pincode,
        city: map.city,
        state: map.state
    };

    let userCreate = {
        f_name: firstLetterCap(String(f_name).trim()),
        l_name: firstLetterCap(String(l_name).trim()),
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

    if (userFields.includes('emergency_contact')) {

        if (isNaN(body.emergency_contact)) {
            return ReE(res, { message: "Please select vaild emergency contact no!." }, HttpStatus.BAD_REQUEST);
        }

        let phoneNo = `${String(countrycode).trim()}${String(body.emergency_contact).trim()}`;

        if (!isPhoneCountry(phoneNo)) {
            return ReE(res, { message: "Enter vaild emergency contact and country code detail!." }, HttpStatus.BAD_REQUEST);
        }

        userCreate = {
            ...userCreate,
            emergency_contact: body.emergency_contact
        };
    }

    if (userFields.includes('mother_name') && !isNull(body.mother_name)) {

        if (String(body.mother_name).length < 3) {
            return ReE(res, { message: "Please enter user's mother name with more two characters!." }, HttpStatus.BAD_REQUEST);
        }

        userCreate = {
            ...userCreate,
            mother_name: firstCap(String(body.mother_name).trim())
        };
    }

    if (userFields.includes('father_name') && !isNull(body.father_name)) {

        if (String(body.father_name).length < 3) {
            return ReE(res, { message: "Please enter user's father name with more two characters!." }, HttpStatus.BAD_REQUEST);
        }

        userCreate = {
            ...userCreate,
            father_name: firstCap(String(body.father_name).trim())
        };
    }

    if (userFields.includes('blood_group')) {

        if (!CONFIG.bloodGroups.includes(body.blood_group)) {
            return ReE(res, { message: "Please enter vaild user's blood group details!." }, HttpStatus.BAD_REQUEST);
        }

        userCreate = {
            ...userCreate,
            blood_group: body.blood_group
        };
    }

    if (userFields.includes('gender')) {
        let gen = firstLetterCap(String(body['gender']).trim());
        if (!gender.includes(gen)) {
            return ReE(res, { message: "Please enter vaild gender details!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            gender: gen
        };
    }

    if (userFields.includes('designation')) {
        if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
            return ReE(res, { message: "Please enter designation within 10 to 200 characters!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            designation: firstCap(String(body.designation).trim())
        };
    }

    let checkOrganizationDetails;

    if (isNull(body.group_id) && isNull(body.org_id)) {
        return { message: "Please select institution or group details to create user details!.", success: false };
    }

    if (userFields.includes('org_id')) {

        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            org_id: body.org_id
        };
    }

    if (userFields.includes('group_id') && !isNull(body.group_id)) {

        let checkGroupDetails = await checkGroup({ group_id: body.group_id });

        if (!checkGroupDetails.success) {
            return ReE(res, { message: checkGroupDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            group_id: body.group_id
        };
    }

    if (userFields.includes('discipline_id')) {

        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: body.org_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            discipline_id: body.discipline_id
        };

        let df = ['org_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkDisciplineDetails.groupDetails[x] });
    }

    if (userFields.includes('program_id')) {

        let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            program_id: body.program_id
        };

        let df = ['org_id', 'discipline_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkProgramDetails.programDetails[x] });
    }

    if (userFields.includes('cdm_id')) {

        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            cdm_id: body.cdm_id,
            program_id: checkCDM.courseDepartment.program_id
        };
    }

    if (userFields.includes('course_batch_id')) {
        if (isNull(body.course_batch_id)) {
            return ReE(res, { message: "Please select vaild course batch!" }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            course_batch_id: body.course_batch_id
        };

        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { course_batch_id: body.course_batch_id, org_id: body.org_id, is_active: true } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        let count = 1;

        if (!isEmpty(userCount)) {
            count = userCount.length + 1;
        }

        function padLeadingZeros(num, size) {
            var s = num + "";
            while (s.length < size) s = "0" + s;
            return s;
        }
        count = padLeadingZeros(count, 3);

        let courseName = String(checkCourseBatchDetails.courseBatchData.cdmId.name).replace(/[&\/\\#,+()$~%.':*?<>{}-]/g, '').replace(' ', '');

        registerNo = `1${String(checkCourseBatchDetails.courseBatchData.programId.name)[0].toUpperCase()}${moment(checkCourseBatchDetails.courseBatchData.form).format('YY')}${courseName.slice(0, 2).toUpperCase()}${count}`;

        if (dAge < age.student || dAge > age.max) {
            return ReE(res, { message: `Please enter vaild date of birth details less ${age.max} to greater the ${age.student}!.` }, HttpStatus.BAD_REQUEST);
        }

        userCreate = { ...userCreate, dob: moment(dobDate)._d };

        let df = ['org_id', 'discipline_id', 'cdm_id', 'program_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkCourseBatchDetails.courseBatchData[x] });
    } else {
        if (dAge < age.owner || dAge > age.max) {
            return ReE(res, { message: `Please enter vaild date of birth details less ${age.max} to greater the ${age.owner}!.` }, HttpStatus.BAD_REQUEST);
        }

        let userCount;

        [err, userCount] = await to(user_info.findAll({ where: { org_id: body.org_id, is_active: true } }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        let count = 1;

        if (!isEmpty(userCount)) {
            count = userCount.length + 1;
        }

        registerNo = `EM${String(checkOrganizationDetails.organizationDetails.name).slice(0, 3).toUpperCase()}${moment(new Date()).format('YY')}${count}`;

        userCreate = { ...userCreate, dob: moment(dobDate)._d };

    }

    if (userFields.includes('year')) {
        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.course_batch_id)) {
            return ReE(res, { message: "Please select vaild course batch!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let year = Number(courseDuration.duration);

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let fromY = moment.duration(moment(checkCourseBatchDetails.courseBatchData.from).diff(new Date())).asYears();
        fromY = fromY + 1;

        if (year < 0 && isNaN(year)) {
            return ReE(res, { message: "Please enter vaild course duration!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNaN(body.year) || year < Number(body.year) || Number(body.year) <= 0 || Number(body.year) > fromY + 1) {
            return ReE(res, { message: "Please enter vaild course entry duration!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            year: body.year
        }

        let df = ['org_id', 'discipline_id', 'department_id', 'program_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkCDM.courseDepartment[x] });

    }

    if (userFields.includes('department_id')) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            department_id: body.department_id
        };

        let df = ['org_id', 'discipline_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkDepartmentDetails.departmentDetails[x] });
    }

    if (userFields.includes('enrollment')) {
        if (isNull(body.enrollment)) {
            return ReE(res, { message: "Please select enrollment details!." }, HttpStatus.BAD_REQUEST);
        }

        if (!CONFIG.enrollment.includes(String(body.enrollment))) {
            return ReE(res, { message: "Please select vaild enrollment details!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            enrollment: body.enrollment
        };
    }

    if (userFields.includes('lateral_entry') && body.lateral_entry == true) {

        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let year = Number(courseDuration.duration);

        if (year < 0 && isNaN(year)) {
            return ReE(res, { message: "Please enter vaild course duration!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNaN(body.lateral_year) || year < Number(body.lateral_year) || Number(body.lateral_year) <= 1) {
            return ReE(res, { message: "Please enter vaild lateral entry duration!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: body.lateral_entry,
            lateral_year: body.lateral_year
        }

    } else {
        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: body.lateral_entry
        }
    }


    if (userFields.includes('role_id')) {

        let roleDetails = await checkRole({ roleId: body.role_id, org_id: body.org_id });

        if (!roleDetails.success) {
            return ReE(res, { message: roleDetails.message }, HttpStatus.BAD_REQUEST);
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
    };

    let createUser;

    [err, createUser] = await to(user_data.create(userCreate));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createUser)) {
        return ReE(res, { message: `Something went wrong to create owner user ${err}!` }, HttpStatus.INTERNAL_SERVER_ERROR);
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
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let message = '';

    if (isNull(createInfo)) {
        message = `${checkMenuDetails.checkMenu.name} Register  Successfully but User info not add!.`;
    }

    let optionUser = { user_info: createInfo._id, updatedby: user._id }

    let mapSubjectByUser;

    if (userFields.includes('subject_id') && userFields.includes('department_id')) {

        let checkSubjectUserDetails = await checkSubjectByUser({ subject_id: body.subject_id, user_id: createUser._id });

        if (!checkSubjectUserDetails.success) {
            message = `${checkMenuDetails.checkMenu.name} Register Successfully but ${checkSubjectUserDetails.message}`;
        }

        mapSubjectByUser = await mapSubjectUserMethod({ subject_id: body.subject_id, department_id: body.department_id, user_id: createUser._id });

        if (!mapSubjectByUser.success) {
            message = `${checkMenuDetails.checkMenu.name} Register  Successfully but ${mapSubjectByUser.message}`;
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
        return ReS(res, { message: message ? message : `${checkMenuDetails.checkMenu.name} Register Successfully!`, user: createUser.toWeb(), password }, HttpStatus.OK);
    }

}

module.exports.creatUserInfo = async (req, res) => {
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

    const menu_id = req.query.menu_id;

    const { gender } = CONFIG;

    if (!user.owner) {

        let checkMenuUserDetails = await checkMenuByUser({ user_id: user._id, menuId: menu_id, access: { 'Create': true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

    }

    let fields = ['user_id'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }


    const { user_id } = body;

    let checkMenuDetails = await checkMenu({ menuId: menu_id });

    if (!checkMenuDetails.success) {
        return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkUserDetails = await checkUser({ user_id: user_id });

    if (!checkUserDetails.success) {
        return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let getAllFields = await checkFieldsByMenu({ menuId: checkMenuDetails.checkMenu._id });

    if (!getAllFields.success) {
        return ReE(res, { message: getAllFields.message }, HttpStatus.BAD_REQUEST);
    }

    let userFields = [], requiredFields = [];

    let availableFields = ['gender', 'year', 'designation', 'org_id', 'discipline_id', 'department_id', 'user_subject_id', 'program_id', 'cdm_id', 'lateral_entry', 'lateral_year', 'role_id', 'course_batch_id', 'enrollment'];

    for (var i = 0; i < getAllFields.fields.length; i++) {
        let x = getAllFields.fields[i];

        if (availableFields.includes(x.fieldDetails.name)) {
            userFields.push(x.fieldDetails.name);
            if (x.required) {
                requiredFields.push(x.fieldDetails.name);
            }
        }
    }

    let inVaildField = await userFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildField)) {
        return ReE(res, { message: `Please enter user fields ${inVaildField}!.` }, HttpStatus.BAD_REQUEST);
    }

    let inVaildReqFields = await requiredFields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildReqFields)) {
        return ReE(res, { message: `Please enter required user fields ${inVaildReqFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let userInfoCreate = {
        is_active: true,
        is_block: false
    }

    if (userFields.includes('gender')) {
        let gen = firstLetterCap(String(body['gender']).trim());
        if (!gender.includes(gen)) {
            return ReE(res, { message: "Please enter vaild gender details!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            gender: gen
        };
    }

    if (userFields.includes('designation')) {
        if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
            return ReE(res, { message: "Please enter designation within 10 to 200 characters!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            designation: firstCap(String(body.designation).trim())
        };
    }

    let checkOrganizationDetails;

    if (isNull(body.group_id) && isNull(body.org_id)) {
        return { message: "Please select institution or group details to create user details!.", success: false };
    }

    if (userFields.includes('org_id')) {

        checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

        if (!checkOrganizationDetails.success) {
            return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            org_id: body.org_id
        };
    }

    if (userFields.includes('group_id')) {

        let checkGroupDetails = await checkGroup({ group_id: body.group_id });

        if (!checkGroupDetails.success) {
            return ReE(res, { message: checkGroupDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            group_id: body.group_id
        };
    }

    if (userFields.includes('discipline_id')) {

        let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: body.org_id });

        if (!checkDisciplineDetails.success) {
            return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            discipline_id: body.discipline_id
        };
    }


    if (userFields.includes('program_id')) {

        let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

        if (!checkProgramDetails.success) {
            return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            program_id: body.program_id
        };
    }

    if (userFields.includes('cdm_id')) {

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        userInfoCreate = {
            ...userInfoCreate,
            cdm_id: body.cdm_id
        };
    }

    if (userFields.includes('course_batch_id')) {
        if (isNull(body.course_batch_id)) {
            return ReE(res, { message: "Please select vaild course batch!" }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, program_id: body.program_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            course_batch_id: body.course_batch_id
        };

        let df = ['org_id', 'discipline_id', 'cdm_id', 'program_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkCourseBatchDetails.courseBatchData[x] });
    }

    if (userFields.includes('year')) {
        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(body.course_batch_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        let { courseDuration } = checkCDM.courseDepartment;

        let year = Number(courseDuration.duration);

        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, program_id: body.program_id, from: 'present' });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let fromY = moment.duration(moment(checkCourseBatchDetails.courseBatchData.from).diff(new Date())).asYears();
        fromY = fromY + 1;

        if (year < 0 && isNaN(year)) {
            return ReE(res, { message: "Please enter vaild course duration!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNaN(body.year) || year < Number(body.year) || Number(body.year) <= 0 || Number(body.year) > fromY + 1) {
            return ReE(res, { message: "Please enter vaild course entry duration!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            year: body.year
        }

        let df = ['org_id', 'discipline_id', 'department_id', 'program_id'];

        await df.map(x => userInfoCreate = { ...userInfoCreate, [x]: checkCDM.courseDepartment[x] });

    }

    if (userFields.includes('enrollment')) {
        if (isNull(body.enrollment)) {
            return ReE(res, { message: "Please select enrollment details!." }, HttpStatus.BAD_REQUEST);
        }

        if (!CONFIG.enrollment.includes(String(body.enrollment))) {
            return ReE(res, { message: "Please select vaild enrollment details!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            enrollment: body.enrollment
        };
    }

    if (userFields.includes('lateral_entry') && body.lateral_entry == true) {

        if (isNull(body.cdm_id)) {
            return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
        }

        let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

        if (!checkCDM.success) {
            return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
        }

        let checkCourseDetails = await checkCourse({ course_id: checkCDM.course_id, program_id: body.program_id });

        if (!checkCourseDetails.success) {
            return ReE(res, { message: checkCourseDetails.message }, HttpStatus.BAD_REQUEST);
        }

        let { courseDuration } = checkCourseDetails;

        let year = Number(courseDuration.duration);

        if (year > 0) {
            return ReE(res, { message: "Please enter course duration!." }, HttpStatus.BAD_REQUEST);
        }

        if (isNaN(body.lateral_year)) {
            return ReE(res, { message: "Please enter vaild lateral entry duration!." }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: body.lateral_entry,
            lateral_year: lateral_year
        }

    } else {
        userInfoCreate = {
            ...userInfoCreate,
            lateral_entry: body.lateral_entry
        }
    }


    if (userFields.includes('department_id')) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            department_id: body.department_id
        };
    }

    if (userFields.includes('role_id')) {

        let roleDetails = await checkRole({ roleId: body.role_id, org_id: body.org_id });

        if (!roleDetails.success) {
            return ReE(res, { message: roleDetails.message }, HttpStatus.BAD_REQUEST);
        }

        userInfoCreate = {
            ...userInfoCreate,
            role_id: body.role_id
        };
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
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(createInfo)) {
        return ReE(res, { message: "Something went wrong to add user information!." }, HttpStatus.BAD_REQUEST);
    }

    let message = 'User Info was added';

    let mapSubjectByUser;

    if (userFields.includes('subject_id') && userFields.includes('department_id')) {

        let checkSubjectUserDetails = await checkSubjectByUser({ subject_id: body.subject_id, user_id: createUser._id });

        if (!checkSubjectUserDetails.success) {
            message = message + ` but ${checkSubjectUserDetails.message}`;
        }

        mapSubjectByUser = await mapSubjectUserMethod({ subject_id: body.subject_id, department_id: body.department_id, user_id: body.user_id });

        if (!mapSubjectByUser.success) {
            message = message + ` but ${mapSubjectByUser.message}`;
        }
    }

    let updateUser;

    [err, updateUser] = await to(user_data.update({ user_info: createInfo._id, updatedby: user._id }, { where: { _id: body.user_id, is_active: true, is_block: false } }));

    if (err) {
        message = err;
    }

    if (!updateUser) {
        message = message + " but Something went wrong to update user info!.";
    }


    if (!isNull(createUser)) {
        return ReS(res, { message: message, user: createUser.toWeb() }, HttpStatus.OK);
    }
}

module.exports.getAllUsers = async (req, res) => {
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

        if (checkMenuUserDetails.userInfo && !isNull(body.type)) {

            if (body.type == CONFIG.usertype[0]) {
                body = { ...body, program_id: '', discipline_id: '', department_id: '', course_batch_id: '', section_id: '', cdm_id: '' }
            }
            if (body.type == CONFIG.usertype[1]) {
                body = { ...body, program_id: '', department_id: '', course_batch_id: '', section_id: '', cdm_id: '' }
            }

            if (body.type == CONFIG.usertype[2]) {
                body = { ...body, program_id: '', course_batch_id: '', section_id: '', cdm_id: '' }
            }

            if (body.type == CONFIG.usertype[3]) {
                body = { ...body, program_id: '', course_batch_id: '', section_id: '', cdm_id: '' }
            }
        }

    }

    let getusers, optionUsers = {
        where: getQuery(body),
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

    if (!isNull(body.limit) && !isNaN(body.limit)) {
        optionUsers = {
            ...optionUsers,
            limit: Number(body.limit)
        };
    }

    if (!isNull(body.page) && !isNaN(body.page)) {
        optionUsers = {
            ...optionUsers,
            offset: (Number(body.page) * Number(body.page - 1))
        };
    }

    if (!isNull(body.owner) && user.owner) {
        let owner = false;

        if (body.owner == 'true') {
            owner = true
        }

        optionUsers.where = {
            ...optionUsers.where,
            owner: owner
        };
    }

    let getMenu;

    if (!isNull(body.ref_role_id) && !isNull(body.menuId)) {
        getMenu = await checkMenu({ menuId: body.menu_id });

        if (!getMenu.success) {
            return ReE(res, { message: getMenu.message }, HttpStatus.BAD_REQUEST);
        }

        if (!getMenu.checkMenu.ref_role_id || isNull(getMenu.checkMenu.user)) {
            return ReE(res, { message: "Please select vaild user menu!." }, HttpStatus.BAD_REQUEST);
        }

        let getRoles = await getCustomerRoleByKodeRole({ roleId: getMenu.checkMenu.ref_role_id });

        if (!getRoles.success) {
            return ReE(res, { message: getRoles.message }, HttpStatus.BAD_REQUEST);
        }

        let checkRoleMenu, optionRole = {
            where: {
                ref_role_id: body.ref_role_id
            }
        };

        [err, checkRoleMenu] = await to(menu.findAll(optionRole));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(checkRoleMenu)) {
            return ReE(res, { message: "Reference role Menu not found!." }, HttpStatus.BAD_REQUEST);
        }

        let menuIds = checkRoleMenu.map(x => x._id);

        let userFields, optionField = {
            where: {
                menu_id: { [Op.in]: menuIds }
            },
            include: [
                {
                    model: user_field,
                    as: 'fieldDetails',
                },
            ]
        };

        [err, userFields] = await to(user_fields_mapping.findAll(optionField));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isEmpty(userFields)) {
            return ReE(res, { message: "User field not yet mapped!." }, HttpStatus.BAD_REQUEST);
        }

        let rFields = userFields.map(x => x.fieldDetails.name);

        let fields = ['group_id', 'org_id', 'discipline_id', 'department_id', 'program_id', 'cdm_id', 'course_batch_id'];

        fields = fields.filter(x => !isNull(body[x]));

        fields.map(x => {
            if (!rFields.includes(x)) {
                body[x] = ''
            }
        });

        optionUsers.where = {
            ...optionUsers.where,
            role_id: { [Op.in]: getRoles.ids }
        }
    }

    if (!user.owner) {
        let checkUserInfo = await checkUserInf({ user_id: user._id });

        if (!checkUserInfo.success) {
            return ReE(res, { message: "You are not allow to access this page" }, HttpStatus.BAD_REQUEST);
        }

        optionUsers.where = {
            ...optionUsers.where,
            org_id: checkUserInfo.userInfo.org_id
        }
    }


    if (user.owner && !isNull(body.org_id)) {

        let checkOrg = await checkOrganization({ org_id: body.org_id });

        if (!checkOrg.message) {
            return ReE(res, { message: checkOrg.message }, HttpStatus.BAD_REQUEST);
        }

        optionUsers.where = {
            ...optionUsers.where,
            org_id: body.org_id
        }

    }

    if (!isNull(body.department_id)) {
        let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

        if (!checkDepartmentDetails.success) {
            return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionUsers.where = {
            ...optionUsers.where,
            department_id: body.department_id
        }
    }

    if (body.year == 'true') {

        optionUsers.where = {
            ...optionUsers.where,
            course_batch_id: { [Op.ne]: null }
        }

        if (!isNull(body.course_batch_id)) {
            let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id });

            if (!checkCourseBatchDetails.success) {
                return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
            }

            optionUsers.where = {
                ...optionUsers.where,
                course_batch_id: body.course_batch_id
            }
        }

        if (!isNull(body.cdm_id)) {
            let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id });

            if (!checkCourseDepartmentDetails.success) {
                return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
            }

            optionUsers.where = {
                ...optionUsers.where,
                cdm_id: body.cdm_id
            }
        }

        if (!isNull(body.section_id)) {
            let checkSectionDetails = await checkSection({ section_id: body.section_id });

            if (!checkSectionDetails.success) {
                return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
            }

            optionUsers.where = {
                ...optionUsers.where,
                section_id: body.section_id
            }
        }
    }

    if (body.subject == 'true') {
        if (isNull(body.subject_id)) {
            return ReE(res, { message: "Please select subject!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isNull(body.discipline_id)) {
            let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: body.org_id });

            if (!checkDisciplineDetails.success) {
                return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST);
            }

            optionUsers.where = {
                ...optionUsers.where,
                discipline_id: body.discipline_id
            };
        }

        let getSubject = await getAllMappedFacultybySubject({ subject_id: body.subject_id });

        if (!getSubject.success) {
            return ReE(res, { message: getSubject.message }, HttpStatus.BAD_REQUEST);
        }

        let ids = [];

        if (!isEmpty(getSubject.userSubject)) {
            getSubject.userSubject.map(x => ids.push(x.user_id));

            if (!isEmpty(ids)) {
                optionUsers.include = [
                    {
                        model: user_data,
                        as: 'userId',
                        attributes: { exclude: ['password', 'user_info', 'email_otp', 'phone_otp',] },
                        where: { _id: { [Op.notIn]: ids } }
                    },
                    {
                        model: organization,
                        as: 'orgId',
                        attributes: ['_id', 'org_id', 'org_name']
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
                        as: 'courseBatchId'
                    },
                    {
                        model: section,
                        as: 'sectionId',
                        attributes: ['_id', 'name', 'course_batch_id']
                    }
                ];
            }
        }
    }

    if (!isNull(body.course_batch_id)) {
        let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id });

        if (!checkCourseBatchDetails.success) {
            return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionUsers.where = {
            ...optionUsers.where,
            course_batch_id: body.course_batch_id
        }
    }

    if (body.section == 'true') {
        optionUsers.where = {
            ...optionUsers.where,
            section_id: { [Op.eq]: null }
        }
    }

    if (!isNull(body.section_id)) {

        let checkSectionDetails = await checkSection({ section_id: body.section_id });

        if (!checkSectionDetails.success) {
            return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
        }

        optionUsers.where = {
            ...optionUsers.where,
            section_id: body.section_id
        }
    }

    [err, getusers] = await to(user_info.findAll(optionUsers))

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getusers)) {
        return ReE(res, { message: "User details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    let users = [];

    if (body.subject == 'true') {
        getusers.map(x => users.push(x.userId));
    } else if (body.year == 'true') {

        for (let index = 0; index < getusers.length; index++) {
            let element = getusers[index];

            if (isNull(element.year) || Number(element.courseBatchId.currentSim.year) > Number(element.year)) {
                users.push(element);
            }
        }

        if (isEmpty(users)) {
            return ReE(res, { message: "No student details have to update year!." }, HttpStatus.BAD_REQUEST);
        }

    } else {
        users = getusers;
    }

    let userArr = users.sort((a, b) => (String(a.userId?.f_name).toLowerCase() > String(b.userId?.f_name).toLowerCase()) ? -1 : ((String(b.userId?.f_name).toLowerCase() < String(a.userId?.f_name).toLowerCase()) ? 1 : 0))

    if (!isEmpty(users)) {
        return ReS(res, { message: "User Fetched!", users: users }, HttpStatus.OK);
    }
}

module.exports.blukUserVerify = async (req, res) => {
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

    if (isNull(body.menu_id)) {
        return ReE(res, { message: "Please select menu!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.org_id)) {
        return ReE(res, { message: "Please enter institution details!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.UserManagement) || isEmpty(body.UserManagement)) {
        return ReE(res, { message: "Please add excel UserManagement data to verify!." }, HttpStatus.BAD_REQUEST);
    }

    const { menu_id } = body;

    let checkMenuDetails = await checkMenu({ menuId: body.menu_id });

    if (!checkMenuDetails.success) {
        return { message: checkMenuDetails.message, success: false };
    }

    let checkOrganizationDetails = await checkOrganizationCode({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!user.owner) {

        let checkMenuUserDetails = await checkMenuByUser({ user_id: user._id, menuId: menu_id, access: { 'Create': true } });

        if (!checkMenuUserDetails.success) {
            return { message: checkMenuUserDetails.message, success: false };
        }
    }

    let UserManagement = [], invalidUserManagement = [], email_ids = [], phones = [];
    body.UserManagement.map(x => {
        email_ids.push(String(x?.email).toLowerCase());
        let phoneNo = `${String(x?.countrycode).trim()}${String(x?.phone).trim()}`;
        phones.push(phoneNo);
    });


    for (let index = 0; index < body.UserManagement.length; index++) {
        const element = body.UserManagement[index];

        let checkUserDetails = await userRegisterVerification({ ...element, org_id: body.org_id, user, menu_id: menu_id, email_ids, phones, index: index });
        if (!checkUserDetails.success) {
            invalidUserManagement.push({ ...element, message: checkUserDetails.message });
        } else if (checkUserDetails.success) {
            UserManagement.push({ ...element });
        }
    }

    if (!isEmpty(UserManagement) || !isEmpty(invalidUserManagement)) {
        return ReS(res, { message: "User Management Verificaton process was completed!.", invalidUserManagement, UserManagement }, HttpStatus.OK)
    }
}

module.exports.bulkUserUpload = async (req, res) => {
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

    const menu_id = req.query.menu_id;

    if (isNull(body.org_id)) {
        return ReE(res, { message: "Please enter institution details!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(body.UserManagement) || isEmpty(body.UserManagement)) {
        return ReE(res, { message: "Please add excel UserManagement data to verify!." }, HttpStatus.BAD_REQUEST);
    }

    let checkMenuDetails = await checkMenu({ menuId: menu_id });

    if (!checkMenuDetails.success) {
        return { message: checkMenuDetails.message, success: false };
    }

    let checkOrganizationDetails = await checkOrganizationCode({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!user.owner) {

        let checkMenuUserDetails = await checkMenuByUser({ user_id: user._id, menuId: menu_id, access: { 'Create': true } });

        if (!checkMenuUserDetails.success) {
            return { message: checkMenuUserDetails.message, success: false };
        }
    }

    let UserManagement = [], invalidUserManagement = [], email_ids = [], phones = [];
    body.UserManagement.map(x => {
        email_ids.push(String(x?.email).toLowerCase());
        let phoneNo = `${String(x?.countrycode).trim()}${String(x?.phone).trim()}`;
        phones.push(phoneNo);
    });

    const fields = ['first_name', 'last_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    const availableFields = ['group_id', 'gender', 'year', 'designation', 'org_id', 'discipline_id', 'department_id', 'subject_id', 'program_id', 'cdm_id', 'lateral_entry', 'role_id', 'course_batch_id', 'enrollment', 'mother_name', 'father_name', 'blood_group', 'emergency_contact'];

    let getAllFields = await checkFieldsByMenu({ menuId: menu_id });

    if (!getAllFields.success) {
        return { message: getAllFields.message, success: false };
    }

    let userFields = [], requiredFields = [];

    for (var i = 0; i < getAllFields.fields.length; i++) {
        let x = getAllFields.fields[i];

        if (availableFields.includes(x.fieldDetails.name)) {
            userFields.push(x.fieldDetails.name);
            if (x.required) {
                requiredFields.push(x.fieldDetails.name);
            }
        }
    }

    for (let index = 0; index < body.UserManagement.length; index++) {
        const element = body.UserManagement[index];

        let checkUserDetails = await userRegisterVerification({ ...element, org_id: body.org_id, user, menu_id: menu_id, email_ids, phones, index: index });

        if (!checkUserDetails.success) {
            invalidUserManagement.push({ ...element, message: checkUserDetails.message });
        } else if (checkUserDetails.success) {

            let data = {};

            userFields.map(x => data = { ...data, [x]: checkUserDetails.data[x] });

            fields.map(x => {
                if (x != 'email') {
                    data = { ...data, [x]: element[x] }
                } else {
                    data = { ...data, [x]: String(element[x]).toLowerCase() }
                }
            });

            UserManagement.push(data);
        }
    }

    if (isEmpty(UserManagement)) {
        return ReE(res, { message: "No verfied Users are there!." }, HttpStatus.BAD_REQUEST);
    }

    let userCreationData = [], errUserCreation = [], errUserInfo = [], errSubject = [];

    for (var i = 0; i < UserManagement.length; i++) {
        const element = UserManagement[i];

        let data = {};

        fields.map(x => {
            if (x != 'email') {
                data = { ...data, [x]: element[x] }
            } else {
                data = { ...data, [x]: String(element[x]).toLowerCase() }
            }
        });

        let name = `${data.first_name}${data.last_name}`;

        let username = '';

        const dataFuc = async () => {
            username = genrateUserName(String(name).replace(' ', ''));
            if (String(username).length < 5) {
                dataFuc();
            } else {
                let checkUserName, userNameOption = {
                    username: username,
                    [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
                };

                [err, checkUserName] = await to(user_data.findOne({
                    where: userNameOption
                }));

                if (!isNull(checkUserName)) {
                    dataFuc();
                }

                if (userCreationData.length > 0) {

                    let filter = userCreationData.filter(x => x.username == username);

                    if (filter.length > 0) {
                        dataFuc();
                    }
                }
            }
        }

        dataFuc();

        let password = 'POJTKQa@'

        let passwordH;

        [err, passwordH] = await to(bcrypt.hash(password, bcrypt.genSaltSync(10)));

        if (err) {
            errUserCreation.push({ ...data, message: err })
        } else if (isNull(passwordH)) {
            errUserCreation.push({ ...data, message: "Something went wrong to generate password!." }, HttpStatus.BAD_REQUEST);
        } else {

            let dobDate = moment(data.dob, 'DD/MM/YYYY').format();

            data = {
                ...data,
                f_name: firstLetterCap(String(data.first_name).trim()),
                l_name: firstLetterCap(String(data.last_name).trim()),
                username: String(data.username).trim(),
                countrycode: String(data.countrycode).trim(),
                phone: String(data.phone).trim(),
                dob: moment(dobDate)._d,
                username: username,
                password: passwordH,
                createdby: user._id,
                updatedby: user._id,
                is_active: true,
                is_block: false,
                owner: false,
                email_verified: true,
                phone_verified: true
            };

            userFields.map(x => data = { ...data, [x]: element[x] });

            userCreationData.push(data);
        }
    }


    let createUsers;

    [err, createUsers] = await to(user_data.bulkCreate(userCreationData));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(createUsers)) {
        return ReE(res, { message: "Someting went wrong to create bulk of users!." }, HttpStatus.BAD_REQUEST);
    }

    let userInfoCreation = [], userSubjectCreateion = [];

    for (var i = 0; i < createUsers.length; i++) {

        const element = createUsers[i];

        let findIndex = UserManagement.findIndex(x => x.email == element.email);

        if (findIndex < 0) {
            errUserInfo.push({ ...UserManagement[findIndex], message: "Something went to create user info!." });
        } else {

            let userInfoCreate = {
                user_id: element._id,
                is_active: true,
                is_block: false,
                createdby: user._id,
                updatedby: user._id
            }

            let userSubject;

            userFields.map(x => {
                userInfoCreate = { ...userInfoCreate, [x]: userCreationData[i][x] }
            });

            if (userFields.includes('subject_id') && userFields.includes('department_id')) {
                userSubject = {
                    user_id: element._id,
                    is_active: true,
                    is_block: false,
                    createdby: user._id,
                    updatedby: user._id,
                    department_id: userCreationData[i].department_id,
                    subject_id: userCreationData[i].subject_id
                }
            }


            let createInfo;

            [err, createInfo] = await to(user_info.create(userInfoCreate));

            if (err) {
                errUserInfo.push({ ...UserManagement[findIndex], message: err })
            } else if (!isNull(createInfo)) {

                userInfoCreation.push(userInfoCreate);

                let updateUser, optionUser = { user_info: createInfo._id, updatedby: user._id };

                [err, updateUser] = await to(user_data.update(optionUser, { where: { _id: element._id, is_active: true, is_block: false } }));

                if (err) {
                    errUserInfo.push({ ...UserManagement[findIndex], message: 'User Info and User creation mapping error!.' })
                }

                if (userSubject) {
                    let mapSubjectByUser = await mapSubjectUserMethod({ subject_id: body.subject_id, department_id: body.department_id, user_id: element._id });

                    if (!mapSubjectByUser.success) {
                        errSubject.push(mapSubjectByUser.message);
                    } else {
                        userSubjectCreateion.push(userSubject);
                    }
                }

            }


        }

    }

    if (isEmpty(userCreationData) && isEmpty(userInfoCreation) && isEmpty(userSubjectCreateion)) {
        return ReE(res, { message: "Something went wrong to create user!.", errUserInfo, errUserCreation, errSubject }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(userCreationData) || !isEmpty(userInfoCreation) || !isEmpty(userSubjectCreateion)) {
        return ReS(res, { message: "Register user list!.", userCreationData, userInfoCreation, userSubjectCreateion, errUserCreation, errUserInfo, errSubject }, HttpStatus.OK);
    }
}

const checkUser = async (body) => {
    if (isNull(body.user_id) || !IsValidUUIDV4(body.user_id)) {
        return { message: "Please select user details!.", success: false };
    }

    let err;

    let checkUserDetails, optionUser = {
        where: getQuery(body)
    };


    optionUser.where = {
        ...optionUser.where,
        _id: body.user_id
    };

    [err, checkUserDetails] = await to(user_data.findOne(optionUser));

    if (err) {
        return { message: err, success: false };
    }

    if (isNull(checkUserDetails)) {
        return { message: "User not found!.", success: false };
    }

    if (!isNull(checkUserDetails)) {
        return { message: "User was fetched!.", user: checkUserDetails, success: true };
    }
}

module.exports.checkUser = checkUser;

// const checkUserInf = async (body) => {
//     let err;

//     let userInfo, optionUserInfo = {
//         where: {
//             user_id: body.user_id,
//             is_active: true
//         },
//         include: [
//             {
//                 model: user_data,
//                 as: 'userId',
//                 attributes: ['_id', 'username']
//             },
//             {
//                 model: organization,
//                 as: 'orgId'
//             }, {
//                 model: user_data,
//                 as: 'createdBy',
//                 attributes: ['_id', 'username']
//             },
//             {
//                 model: user_data,
//                 as: 'updatedBy',
//                 attributes: ['_id', 'username']
//             }]
//     };

//     [err, userInfo] = await to(user_info.findOne(optionUserInfo));

//     if (err) {
//         return { message: err, success: false };
//     }

//     if (isNull(userInfo)) {
//         return { message: "User details was not found.", success: false };
//     }

//     if (userInfo.is_block) {
//         return { message: "User details was blocked!.", success: false }
//     }

//     if (!isNull(userInfo)) {
//         return { message: "User details was found.", success: true, userInfo };
//     }

// }

// module.exports.checkUserInf = checkUserInf;

module.exports.mapSection = async (req, res) => {

    const user = req.user;
    let body = req.body;

    let org_id;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if (!user.owner) {
        let checkUserDetails = await checkUserInf({ user_id: user._id });

        if (!checkUserDetails.success) {
            return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        org_id = checkUserDetails.userInfo.org_id;
    }

    if (user.owner) {
        if (isNull(body.org_id)) {
            return ReE(res, { message: "Please select vaild organization details!." }, HttpStatus.BAD_REQUEST);
        }

        org_id = body.org_id;
    }

    let fields = ['discipline_id', 'program_id', 'cdm_id', 'course_batch_id', 'section_id', 'users'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
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

    let checkCourseDepartmentDetails = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

    if (!checkCourseDepartmentDetails.success) {
        return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, from: 'present' });

    if (!checkCourseBatchDetails.success) {
        return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSectionDetails = await checkSection({ course_batch_id: body.course_batch_id, org_id: org_id, cdm_id: body.cdm_id, program_id: body.program_id, section_id: body.section_id });

    if (!checkSectionDetails.success) {
        return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(body.users)) {
        return ReE(res, { message: "Please select users details to section and students!." }, HttpStatus.BAD_REQUEST);
    }

    let vaildUsers = [], inVaildUsers = [], inVaildUserType = [], alreadyMapped = [];

    for (let index = 0; index < body.users.length; index++) {
        const x = body.users[index];

        let checkUserDetails = await checkUser({ user_id: x });

        if (!checkUserDetails.success) {
            inVaildUsers.push(x);
        } else if (checkUserDetails.success) {
            let checkUserInfoDetails, optionUserInfo = {
                where: {
                    user_id: x,
                    is_active: true,
                    is_block: false,
                    course_batch_id: checkCourseBatchDetails.courseBatchData._id
                }
            };

            [err, checkUserInfoDetails] = await to(user_info.findOne(optionUserInfo));

            if (isNull(checkUserInfoDetails)) {
                inVaildUserType.push(x);
            } else if (checkUserInfoDetails.section_id) {
                alreadyMapped.push(x);
            } else if (!isNull(checkUserInfoDetails)) {
                vaildUsers.push(x);
            }
        }
    }

    if (!isEmpty(inVaildUsers)) {
        return ReE(res, { message: "Please select vaild student details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(inVaildUserType)) {
        return ReE(res, { message: "Please select vaild student only details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(alreadyMapped)) {
        return ReE(res, { message: "Please remove already mapped student details!." }, HttpStatus.BAD_REQUEST);
    }

    if (isEmpty(vaildUsers)) {
        return ReE(res, { message: "No student details have to map section!." }, HttpStatus.BAD_REQUEST);
    }

    let updateUser, optionUpdate = {
        where: {
            user_id: vaildUsers,
            course_batch_id: checkCourseBatchDetails.courseBatchData._id,
            section_id: { [Op.eq]: null }
        },
        set: {
            section_id: body.section_id,
            updatedby: user._id
        }
    };


    [err, updateUser] = await to(user_info.update(optionUpdate.set, { where: optionUpdate.where }));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(updateUser)) {
        return ReE(res, { message: "Something went wrong to update user section details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(updateUser)) {
        return ReS(res, { message: "User are mapped section!." }, HttpStatus.OK);
    }

}

module.exports.updateStudentYear = async (req, res) => {
    let body = req.body;
    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let fields = ['org_id', 'department_id', 'cdm_id', 'course_batch_id', 'section_id', 'student_id'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

    if (!checkOrganizationDetails.success) {
        return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST)
    }

    let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id, org_id: body.org_id });

    if (!checkDepartmentDetails.success) {
        return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseDepartmentDetails = await checkCourseDepart({ department_id: checkDepartmentDetails.departmentDetails._id, cdm_id: body.cdm_id });

    if (!checkCourseDepartmentDetails.success) {
        return ReE(res, { message: checkCourseDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkCourseBatchDetails = await checkCourseBatch({ cdm_id: body.cdm_id, course_batch_id: body.course_batch_id });

    if (!checkCourseBatchDetails.success) {
        return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkSectionDetails = await checkSection({ course_batch_id: checkCourseBatchDetails.courseBatchData._id, section_id: body.section_id });

    if (!checkSectionDetails.success) {
        return ReE(res, { message: checkSectionDetails.message }, HttpStatus.BAD_REQUEST);
    }

    if (!Array.isArray(body.student_id)) {
        return ReE(res, { message: "Please select vaild student details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkStudentDetails, optionStudent = {
        where: {
            user_id: { [Op.in]: body.student_id },
            course_batch_id: body.course_batch_id,
            cdm_id: body.cdm_id,
            is_active: true,
            is_block: false
        },
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
            }
        ]
    };

    [err, checkStudentDetails] = await to(user_info.findAll(optionStudent));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }


    if (isEmpty(checkStudentDetails)) {
        return ReE(res, { message: "Student details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    let vaildStudent = [], alreadyUpdated = [], noCurentSem = [];

    for (let index = 0; index < checkStudentDetails.length; index++) {
        let element = checkStudentDetails[index];

        if (isNull(element.courseBatchId) || isNull(element.courseBatchId.currentSim)) {
            noCurentSem.push(element)
        } else if (isNull(element.year) || (Number(element.courseBatchId.currentSim.year) > Number(element.year))) {
            vaildStudent.push(element);
        } else if (Number(element.courseBatchId.currentSim.year) <= Number(element.year)) {
            alreadyUpdated.push(element)
        }

    }

    if (!isEmpty(noCurentSem)) {
        return ReE(res, { message: "Please remove course semester not-started student details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(alreadyUpdated)) {
        return ReE(res, { message: "Please remove already batch year updated student details!." }, HttpStatus.BAD_REQUEST);
    }

    let ids = vaildStudent.map(x => x.user_id);

    let updateStudent, updateData = {
        where: {
            user_id: { [Op.in]: ids },
            is_active: true,
            is_block: false
        },
        set: {
            updatedby: user._id,
            year: checkCourseBatchDetails.courseBatchData.currentSim.year
        }
    };

    [err, updateStudent] = await to(user_info.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(updateStudent)) {
        return ReE(res, { message: "Something went wrong to updated student batch year details!." }, HttpStatus.BAD_REQUEST);
    }


    if (!isNull(updateStudent)) {
        return ReS(res, { message: "Student batch year was updated successfully!." }, HttpStatus.OK)
    }

}

module.exports.updateUser = async (req, res) => {
    let body = req.body;
    const user = req.user;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id, body: body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, HttpStatus.BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    let fields = ['org_id', 'user_id', 'active'];

    let inVaildFields = fields.filter(x => isNull(body[x]));

    if (!isEmpty(inVaildFields)) {
        return ReE(res, { message: `Please enter required fields ${inVaildFields}!.` }, HttpStatus.BAD_REQUEST);
    }

    let checkUserDetails = await checkUser({ user_id: body.user_id, status: 'all' });

    if (!checkUserDetails.success) {
        return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
    }

    const { age, gender } = CONFIG;

    const menu_id = req.query.menu_id;

    let checkMenuDetails = await checkMenu({ menuId: menu_id });

    if (!checkMenuDetails.success) {
        return ReE(res, { message: checkMenuDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkKodeRoleMenu = await checkKodeRole({ roleId: checkMenuDetails.checkMenu.ref_role_id });

    if (!checkKodeRoleMenu.success) {
        return ReE(res, { message: checkKodeRoleMenu.message }, HttpStatus.BAD_REQUEST);
    }

    let getCustomerRoles = await getCustomerRoleByKodeRole({ roleId: checkKodeRoleMenu.checkRole._id });

    if (!getCustomerRoles.success) {
        return ReE(res, { message: getCustomerRoles.message }, HttpStatus.BAD_REQUEST);
    }


    let checkUserInfoDetails, optionUserInfo = {
        where: {
            is_active: true,
            is_block: false,
            role_id: { [Op.in]: getCustomerRoles.ids },
            user_id: checkUserDetails.user._id
        }
    };

    [err, checkUserInfoDetails] = await to(user_info.findOne(optionUserInfo));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(checkUserInfoDetails)) {
        return ReE(res, { message: "You are select user professional details was not found!." }, HttpStatus.BAD_REQUEST);
    }

    let updateUser, updateData = {
        where: {
            _id: checkUserDetails.user._id,
            is_active: true,
        },
        set: {
            updatedby: user._id
        }
    };

    let updateUserInfo, updateDataInfo = {
        where: {
            is_active: true,
            user_id: checkUserDetails.user._id
        },
        set: {
            updatedby: user._id
        }
    };


    let userFields = [], requiredFields = [], updateVaildUser, updateVaildUserInfo;

    let availableFields = ['group_id', 'gender', 'year', 'designation', 'org_id', 'discipline_id', 'department_id', 'subject_id', 'program_id', 'cdm_id', 'lateral_entry', 'role_id', 'course_batch_id', 'enrollment', 'mother_name', 'father_name', 'blood_group', 'emergency_contact'];

    let updateAbleUserFields = ['f_name', 'l_name', 'surname', 'email', 'countrycode', 'phone', 'dob', 'address', 'city', 'state', 'country', 'pincode'];

    let eligibleUserFields;

    if (isNull(body.active)) {

        if (checkUserDetails.user.is_block == CONFIG.boolean[0]) {
            return ReE(res, { message: "User details was blocked!." })
        }

        let getAllFields = await checkFieldsByMenu({ menuId: checkMenuDetails.checkMenu._id });

        if (!getAllFields.success) {
            return ReE(res, { message: getAllFields.message }, HttpStatus.BAD_REQUEST);
        }


        for (var i = 0; i < getAllFields.fields.length; i++) {
            let x = getAllFields.fields[i];

            if (availableFields.includes(x.fieldDetails.name)) {
                userFields.push(x.fieldDetails.name);
                if (x.required) {
                    requiredFields.push(x.fieldDetails.name);
                }
            }
        }

        updateVaildUser = updateAbleUserFields.filter(x => {
            if (!isNull(body[x]) && checkUserDetails.user[x] !== body[x]) {
                return true;
            }
        });

        updateVaildUserInfo = userFields.filter(x => {
            if (!isNull(body[x]) && checkUserInfoDetails[x] !== body[x]) {
                return true;
            }
        });

        eligibleUserFields = updateVaildUser.concat(updateVaildUserInfo);

        if (isEmpty(eligibleUserFields)) {
            return ReE(res, { message: `Please edit something to update user details!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    if (!isNull(body.active)) {
        if (!CONFIG.block.includes(body.active)) {
            return ReE(res, { message: "Please select vaild active status!." }, HttpStatus.BAD_REQUEST);
        }

        let status = true;

        if (body.active == CONFIG.block[0]) {
            status = false;
        }

        if (checkUserDetails.user.is_block == status) {
            return ReE(res, { message: `User details was already ${!status ? 'Active' : 'Blocked'}!.` }, HttpStatus.BAD_REQUEST);
        }

        updateData.set = {
            ...updateData.set,
            is_block: status
        }
    } else {

        if (eligibleUserFields.includes('f_name')) {

            if (checkUserDetails.user.f_name == firstLetterCap(String(body.f_name).trim())) {
                return ReE(res, { message: "Please edit user first name to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (firstLetterCap(String(body.f_name).trim()).length < 3) {
                return ReE(res, { message: "Enter vaild first name with more then 3 character!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                f_name: firstLetterCap(String(body.f_name).trim())
            }
        }


        if (eligibleUserFields.includes('l_name')) {
            if (checkUserDetails.user.l_name == firstLetterCap(String(body.l_name).trim())) {
                return ReE(res, { message: "Please edit user last name to update!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                l_name: firstLetterCap(String(body.l_name).trim())
            }

        }

        if (eligibleUserFields.includes('email')) {
            if (checkUserDetails.user.email == body.email) {
                return ReE(res, { message: "Please edit user email details to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (!isEmail(body.email)) {
                return ReE(res, { message: "Enter vaild email detail!." }, HttpStatus.BAD_REQUEST);
            }

            let checkEmail, checkOrganizationEmail, optionEmail = {
                email: body.email,
                [Op.or]: [{ is_active: true, is_block: false }, { is_active: true, is_block: true }]
            };


            [err, checkEmail] = await to(user_data.findOne({
                where: optionEmail
            }));

            [err, checkOrganizationEmail] = await to(organization.findOne({
                where: optionEmail
            }));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (!isNull(checkEmail) || !isNull(checkOrganizationEmail)) {
                return ReE(res, { message: "Email id already taken!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                email: String(body.email).trim()
            }
        }

        if (eligibleUserFields.includes('pincode') || eligibleUserFields.includes('city') || eligibleUserFields.includes('state')) {

            let map = {}, pincode = checkUserDetails.user.pincode, city = checkUserDetails.user.city, state = checkUserDetails.user.state;

            if (isNull(body.pincode) && isNull(body.city) && isNull(body.state)) {
                return ReE(res, { message: "Please edit something on user state , city , pincode to update !." }, HttpStatus.BAD_REQUEST);
            }

            if (!isNull(body.pincode)) {
                pincode = body.pincode;
            }

            if (!isNull(body.city)) {
                city = body.city;
            }

            if (!isNull(body.state)) {
                state = body.state;
            }

            let checkPincode = await PincodeData.filter(x => {
                if (x.pincode == pincode && String(x.districtName).replace(' ', '').toLowerCase() == String(city).replace(' ', '').toLowerCase() && String(x.stateName).replace(' ', '').toLowerCase() == String(state).replace(' ', '').toLowerCase()) {
                    map = { ...x }
                    return true
                }
            });

            if (isEmpty(checkPincode)) {
                return ReE(res, { message: "Please select vaild pincode city state details!." }, HttpStatus.BAD_REQUEST);
            }

            body = {
                ...body,
                pincode: map.pincode,
                city: map.city,
                state: map.state
            };

            updateData.set = {
                ...updateData.set,
                phone: String(body.phone).trim(),
                pincode: map.pincode,
                city: map.city,
                state: map.state
            }

        }

        if (eligibleUserFields.includes('phone')) {

            if (checkUserDetails.user.phone == body.phone) {
                return ReE(res, { message: "Please edit user phone number details to update!." }, HttpStatus.BAD_REQUEST);
            }

            let phoneNo = `${String(checkUserDetails.user.countrycode).trim()}${String(phone).trim()}`;

            if (!isPhoneCountry(phoneNo)) {
                return ReE(res, { message: "Enter vaild phone and country code detail!." }, HttpStatus.BAD_REQUEST);
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
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (!isNull(checkPhone) || !isNull(checkOrganizationPhone)) {
                return ReE(res, { message: "Phone already taken!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                phone: String(body.phone).trim()
            }
        }

        if (eligibleUserFields.includes('address')) {

            if (checkUserDetails.user.address == body.address) {
                return ReE(res, { message: "Please edit user address details to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(address).length < 10 || String(address).length > 200) {
                return ReE(res, { message: "Enter vaild address within 10 to 200 character!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                address: String(body.address).trim()
            }
        }

        if (eligibleUserFields.includes('password') && body.password == CONFIG.boolean[0]) {

            let password = 'POJTKQa@'

            let passwordH;

            [err, passwordH] = await to(bcrypt.hash(password, bcrypt.genSaltSync(10)));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (isNull(passwordH)) {
                return ReE(res, { message: "Something went wrong to genrate password!." }, HttpStatus.BAD_REQUEST)
            }

            updateData.set = {
                ...updateData.set,
                password: String(passwordH).trim()
            }
        }

        if (eligibleUserFields.includes('emergency_contact')) {

            if (checkUserDetails.user.emergency_contact == body.emergency_contact) {
                return ReE(res, { message: "Please edit user emergency contact details to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNaN(body.emergency_contact)) {
                return ReE(res, { message: "Please select vaild emergency contact no!." }, HttpStatus.BAD_REQUEST);
            }

            let phoneNo = `${String(countrycode).trim()}${String(body.emergency_contact).trim()}`;

            if (!isPhoneCountry(phoneNo)) {
                return ReE(res, { message: "Enter vaild emergency contact and country code detail!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                emergency_contact: body.emergency_contact
            }
        }

        if (eligibleUserFields.includes('mother_name') && !isNull(body.mother_name)) {

            if (checkUserDetails.user.mother_name == body.mother_name) {
                return ReE(res, { message: "Please edit user mother name to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.mother_name).length < 3) {
                return ReE(res, { message: "Please enter user's mother name with more two characters!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                mother_name: firstCap(String(body.mother_name).trim())
            };
        }

        if (eligibleUserFields.includes('father_name') && !isNull(body.father_name)) {

            if (checkUserDetails.user.father_name == body.father_name) {
                return ReE(res, { message: "Please edit user father name to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body.father_name).length < 3) {
                return ReE(res, { message: "Please enter user's father name with more two characters!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                father_name: firstCap(String(body.father_name).trim())
            };
        }

        if (eligibleUserFields.includes('blood_group')) {

            if (checkUserDetails.user.blood_group == body.blood_group) {
                return ReE(res, { message: "Please edit user blood group to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (!CONFIG.bloodGroups.includes(body.blood_group)) {
                return ReE(res, { message: "Please enter vaild user's blood group details!." }, HttpStatus.BAD_REQUEST);
            }

            updateData.set = {
                ...updateData.set,
                blood_group: body.blood_group
            };
        }

        if (eligibleUserFields.includes('gender')) {

            if (checkUserInfoDetails.gender == body.gender) {
                return ReE(res, { message: "Please edit user gender details to update!." }, HttpStatus.BAD_REQUEST);
            }

            let gen = firstLetterCap(String(body['gender']).trim());
            if (!gender.includes(gen)) {
                return ReE(res, { message: "Please enter vaild gender details!." }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                gender: gen
            };
        }

        if (eligibleUserFields.includes('designation')) {

            if (checkUserInfoDetails.designation == body.designation) {
                return ReE(res, { message: "Please edit user designation details to update!." }, HttpStatus.BAD_REQUEST);
            }

            if (String(body['designation']).length < 10 && String(body['designation']).length > 200) {
                return ReE(res, { message: "Please enter designation within 10 to 200 characters!." }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                designation: firstCap(String(body.designation).trim())
            };
        }

        if (eligibleUserFields.includes('dob')) {

            let dobDate = moment(dob, 'DD/MM/YYYY').format();

            if (moment(dobDate).isSame(checkUserDetails.user.dob)) {
                return ReE(res, { message: "Please edit something to update user date of birth details!." }, HttpStatus.BAD_REQUEST);
            }

            if (!moment(dobDate).isValid()) {
                return ReE(res, { message: "Please enter vaild date of birth detail!." }, HttpStatus.BAD_REQUEST);
            }

            let dAge = moment().diff(moment(dobDate), 'years');

            if (!isNull(checkUserInfoDetails.course_batch_id)) {
                if (dAge < age.student || dAge > age.max) {
                    return ReE(res, { message: `Please enter vaild date of birth details less ${age.max} to greater the ${age.student}!.` }, HttpStatus.BAD_REQUEST);
                }
            } else {

                if (dAge < age.owner || dAge > age.max) {
                    return ReE(res, { message: `Please enter vaild date of birth details less ${age.max} to greater the ${age.owner}!.` }, HttpStatus.BAD_REQUEST);
                }

            }

            updateDataInfo.set = { ...updateDataInfo.set, dob: moment(dobDate)._d };
        }


        let checkOrganizationDetails;

        if (eligibleUserFields.includes('org_id')) {

            if (checkUserInfoDetails.org_id == body.org_id) {
                return ReE(res, { message: "Please edit something to update user organization details!." }, HttpStatus.BAD_REQUEST);
            }

            checkOrganizationDetails = await checkOrganization({ org_id: body.org_id });

            if (!checkOrganizationDetails.success) {
                return ReE(res, { message: checkOrganizationDetails.message }, HttpStatus.BAD_REQUEST)
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                org_id: body.org_id
            };
        }

        if (eligibleUserFields.includes('group_id') && !isNull(body.group_id)) {

            if (checkUserInfoDetails.group_id == body.group_id) {
                return ReE(res, { message: "Please edit something to update user group details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkGroupDetails = await checkGroup({ group_id: body.group_id });

            if (!checkGroupDetails.success) {
                return ReE(res, { message: checkGroupDetails.message }, HttpStatus.BAD_REQUEST)
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                group_id: body.group_id
            };
        }

        if (eligibleUserFields.includes('discipline_id')) {

            if (checkUserInfoDetails.discipline_id == body.discipline_id) {
                return ReE(res, { message: "Please edit something to update user discipline details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkDisciplineDetails = await checkDiscipline({ discipline_id: body.discipline_id, org_id: body.org_id });

            if (!checkDisciplineDetails.success) {
                return ReE(res, { message: checkDisciplineDetails.message }, HttpStatus.BAD_REQUEST)
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                discipline_id: body.discipline_id
            };

            let df = ['org_id'];

            await df.map(x => updateDataInfo.set = { ...updateDataInfo.set, [x]: checkDisciplineDetails.groupDetails[x] });
        }

        if (eligibleUserFields.includes('program_id')) {

            if (checkUserInfoDetails.program_id == body.program_id) {
                return ReE(res, { message: "Please edit something to update user program details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkProgramDetails = await checkProgram({ program_id: body.program_id, discipline_id: body.discipline_id });

            if (!checkProgramDetails.success) {
                return ReE(res, { message: checkProgramDetails.message }, HttpStatus.BAD_REQUEST)
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                program_id: body.program_id
            };

            let df = ['org_id', 'discipline_id'];

            await df.map(x => updateDataInfo.set = { ...updateDataInfo.set, [x]: checkProgramDetails.programDetails[x] });
        }

        if (eligibleUserFields.includes('cdm_id')) {

            if (checkUserInfoDetails.cdm_id == body.cdm_id) {
                return ReE(res, { message: "Please edit something to update user course department details!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.cdm_id)) {
                return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
            }

            let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

            if (!checkCDM.success) {
                return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                cdm_id: body.cdm_id,
                program_id: checkCDM.courseDepartment.program_id
            };
        }

        if (eligibleUserFields.includes('course_batch_id')) {

            if (checkUserInfoDetails.course_batch_id == body.course_batch_id) {
                return ReE(res, { message: "Please edit something to update user course batch details!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.course_batch_id)) {
                return ReE(res, { message: "Please select vaild course batch!" }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.cdm_id)) {
                return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
            }

            let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, from: 'present' });

            if (!checkCourseBatchDetails.success) {
                return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                course_batch_id: body.course_batch_id
            };

            let userCount;

            [err, userCount] = await to(user_info.findAll({ where: { course_batch_id: body.course_batch_id, org_id: body.org_id, is_active: true } }));

            if (err) {
                return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            let count = 1;

            if (!isEmpty(userCount)) {
                count = userCount.length + 1;
            }

            function padLeadingZeros(num, size) {
                var s = num + "";
                while (s.length < size) s = "0" + s;
                return s;
            }
            count = padLeadingZeros(count, 3);

            let courseName = String(checkCourseBatchDetails.courseBatchData.cdmId.name).replace(/[&\/\\#,+()$~%.':*?<>{}-]/g, '').replace(' ', '');

            registerNo = `1${String(checkCourseBatchDetails.courseBatchData.programId.name)[0].toUpperCase()}${moment(checkCourseBatchDetails.courseBatchData.form).format('YY')}${courseName.slice(0, 2).toUpperCase()}${count}`;

            let df = ['org_id', 'discipline_id', 'cdm_id', 'program_id'];

            await df.map(x => updateDataInfo.set = { ...updateDataInfo.set, [x]: checkCourseBatchDetails.courseBatchData[x] });
        }


        if (eligibleUserFields.includes('year')) {

            if (Number(checkUserInfoDetails.year) === Number(body.year)) {
                return ReE(res, { message: "Please edit something to update user year details!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.cdm_id)) {
                return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.course_batch_id)) {
                return ReE(res, { message: "Please select vaild course batch!" }, HttpStatus.BAD_REQUEST);
            }

            let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

            if (!checkCDM.success) {
                return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
            }

            let { courseDuration } = checkCDM.courseDepartment;

            let year = Number(courseDuration.duration);

            let checkCourseBatchDetails = await checkCourseBatch({ course_batch_id: body.course_batch_id, org_id: body.org_id, cdm_id: body.cdm_id, from: 'present' });

            if (!checkCourseBatchDetails.success) {
                return ReE(res, { message: checkCourseBatchDetails.message }, HttpStatus.BAD_REQUEST);
            }

            let fromY = moment.duration(moment(checkCourseBatchDetails.courseBatchData.from).diff(new Date())).asYears();
            fromY = fromY + 1;

            if (year < 0 && isNaN(year)) {
                return ReE(res, { message: "Please enter vaild course duration!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNaN(body.year) || year < Number(body.year) || Number(body.year) <= 0 || Number(body.year) > fromY + 1) {
                return ReE(res, { message: "Please enter vaild course entry duration!." }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                year: body.year
            }

            let df = ['org_id', 'discipline_id', 'department_id', 'program_id'];

            await df.map(x => updateDataInfo.set = { ...updateDataInfo.set, [x]: checkCDM.courseDepartment[x] });

        }

        if (eligibleUserFields.includes('department_id')) {

            if (checkUserInfoDetails.department_id == body.department_id) {
                return ReE(res, { message: "Please edit something to update user department details!." }, HttpStatus.BAD_REQUEST);
            }

            let checkDepartmentDetails = await checkDepartment({ department_id: body.department_id });

            if (!checkDepartmentDetails.success) {
                return ReE(res, { message: checkDepartmentDetails.message }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                department_id: body.department_id
            };

            let df = ['org_id', 'discipline_id'];

            await df.map(x => updateDataInfo.set = { ...updateDataInfo.set, [x]: checkDepartmentDetails.departmentDetails[x] });
        }

        if (eligibleUserFields.includes('enrollment')) {

            if (checkUserInfoDetails.enrollment == body.enrollment) {
                return ReE(res, { message: "Please edit something to update user enrollment details!." }, HttpStatus.BAD_REQUEST);
            }


            if (isNull(body.enrollment)) {
                return ReE(res, { message: "Please select enrollment details!." }, HttpStatus.BAD_REQUEST);
            }

            if (!CONFIG.enrollment.includes(String(body.enrollment))) {
                return ReE(res, { message: "Please select vaild enrollment details!." }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                enrollment: body.enrollment
            };
        }

        if (eligibleUserFields.includes('lateral_entry') && checkUserInfoDetails.lateral_entry == true) {

            if (checkUserInfoDetails.lateral_entry == body.lateral_entry) {
                return ReE(res, { message: "Please edit something to update user lateral entry year details!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNull(body.cdm_id)) {
                return ReE(res, { message: "Please select vaild course department!" }, HttpStatus.BAD_REQUEST);
            }

            let checkCDM = await checkCourseDepart({ cdm_id: body.cdm_id, program_id: body.program_id });

            if (!checkCDM.success) {
                return ReE(res, { message: checkCDM.message }, HttpStatus.BAD_REQUEST)
            }

            let { courseDuration } = checkCDM.courseDepartment;

            let year = Number(courseDuration.duration);

            if (year < 0 && isNaN(year)) {
                return ReE(res, { message: "Please enter vaild course duration!." }, HttpStatus.BAD_REQUEST);
            }

            if (isNaN(body.lateral_year) || year < Number(body.lateral_year) || Number(body.lateral_year) <= 1) {
                return ReE(res, { message: "Please enter vaild lateral entry duration!." }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                lateral_entry: body.lateral_entry,
                lateral_year: body.lateral_year
            }

        } else {
            updateDataInfo.set = {
                ...updateDataInfo.set,
                lateral_entry: body.lateral_entry,
                lateral_year: ''
            }
        }

        if (eligibleUserFields.includes('role_id')) {

            if (checkUserInfoDetails.role_id == body.role_id) {
                return ReE(res, { message: "Please edit something to update user role details!." }, HttpStatus.BAD_REQUEST);
            }

            let roleDetails = await checkRole({ roleId: body.role_id, org_id: body.org_id });

            if (!roleDetails.success) {
                return ReE(res, { message: roleDetails.message }, HttpStatus.BAD_REQUEST);
            }

            updateDataInfo.set = {
                ...updateDataInfo.set,
                role_id: body.role_id
            };
        }

    }

    let message = '';

    let commonDetails = ['mother_name', 'father_name', 'blood_group', 'emergency_contact'];

    commonDetails.map(x => {
        if (!isNull(updateData.set[x])) {
            updateVaildUser.push(x);
        }
    });

    if ((!isNull(updateVaildUser) && !isEmpty(updateVaildUser)) || !isNull(body.active)) {

        [err, updateUser] = await to(user_data.update(updateData.set, { where: updateData.where }));

        if (err) {
            return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (isNull(updateUser)) {
            return ReE(res, { message: "Something went wrong to update user personal details!." }, HttpStatus.BAD_REQUEST);
        }

        if (!isNull(updateUser)) {
            message = "User personal details was updated";
        }
    }

    if (!isNull(updateVaildUserInfo) && !isEmpty(updateVaildUserInfo)) {

        [err, updateUserInfo] = await to(user_info.update(updateDataInfo.set, { where: updateDataInfo.where }));

        if (err) {
            return ReE(res, { message: `${message} but ${err}!.` }, HttpStatus.BAD_REQUEST);
        }

        if (isNull(updateUserInfo)) {
            return ReE(res, { message: `${message} but something went wrong to update user professional details!.` }, HttpStatus.BAD_REQUEST);
        }

        if (!isNull(updateUserInfo)) {
            message = `User personal and professional details was updated`;
        }
    }

    if (!isNull(updateUserInfo) || !isNull(updateUser) || !isNull(body.active)) {
        return ReS(res, { message: message }, HttpStatus.OK);
    }

}