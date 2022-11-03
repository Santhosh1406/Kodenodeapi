const { user_track, organization, user_data } = require('../models');
const { CONFIG } = require('../config/confifData');
const HttpStatus = require('http-status');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, decrypt, isEmpty } = require('../service/util.service');
const moment = require('moment');
const { checkUser } = require('./common');
const { IsValidUUIDV4 } = require('../service/validation');


module.exports.getToken = async (req, res) => {
    const token = req.header('AuthorizationR')

    console.log(token);

    if (isNull(token)) {
        return ReE(res, { message: "Please send refresh token!." }, HttpStatus.BAD_REQUEST);
    }

    let dE = decrypt(token, CONFIG.sKey);

    dE = JSON.parse(dE);

    if (isNull(dE) || isNull(dE.key) || isNull(dE.id) || !IsValidUUIDV4(dE.id)) {
        return ReE(res, { message: "Please select vaild refresh token details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkUserDetails = await checkUser({ user_id: dE.id });

    if (!checkUserDetails.success) {
        return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkUserTrack, optionTrack = {
        where: {
            key: dE.key,
            is_active: true,
            is_block: false
        }
    };

    [err, checkUserTrack] = await to(user_track.findOne(optionTrack));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserTrack)) {
        return ReE(res, { message: "Refresh token details was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkUserTrack.logout_at) {
        return ReE(res, { message: "Token was expired!." }, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserTrack.logout_at)) {
        return ReS(res, { message: "Token verified!. ", token: checkUserDetails.user.getJWT() }, HttpStatus.OK);
    }
}

module.exports.logout = async (req, res) => {
    const token = req.header('AuthorizationR')

    console.log(token);

    if (isNull(token)) {
        return ReE(res, { message: "Please send refresh token!." }, HttpStatus.BAD_REQUEST);
    }

    let dE = decrypt(token, CONFIG.sKey);

    dE = JSON.parse(dE);

    if (isNull(dE) || isNull(dE.key) || isNull(dE.id) || !IsValidUUIDV4(dE.id)) {
        return ReE(res, { message: "Please select vaild refresh token details!." }, HttpStatus.BAD_REQUEST);
    }

    let checkUserDetails = await checkUser({ user_id: dE.id });

    if (!checkUserDetails.success) {
        return ReE(res, { message: checkUserDetails.message }, HttpStatus.BAD_REQUEST);
    }

    let checkUserTrack, optionTrack = {
        where: {
            key: dE.key,
            user_id: checkUserDetails.user._id,
            is_active: true,
            is_block: false
        }
    };

    [err, checkUserTrack] = await to(user_track.findOne(optionTrack));

    if (err) {
        return ReE(res, err, HttpStatus.BAD_REQUEST);
    }

    if (isNull(checkUserTrack)) {
        return ReE(res, { message: "Refresh token details was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (checkUserTrack.logout_at) {
        return ReE(res, { message: "Already you are logout the session!." }, HttpStatus.BAD_REQUEST);
    }

    let updateTrack, updateData = {
        where: {
            key: dE.key,
            user_id: checkUserDetails.user._id,
            is_active: true,
            is_block: false
        },
        set: {
            updatedby: checkUserDetails.user._id,
            logout_at: moment()._d
        }
    };

    [err, updateTrack] = await to(user_track.update(updateData.set, { where: updateData.where }));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isNull(updateTrack)) {
        return ReE(res, { message: "Something went wrong to update user track details!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isNull(updateTrack)) {
        return ReS(res, { message: "Logout successfully!" }, HttpStatus.OK);
    }
}

module.exports.getAllUserTrack = async (req, res) => {
    const user = req.user;

    let err;

    if (!user.owner) {
        return ReE(res, { message: "You are not allow access this menu!." }, HttpStatus.BAD_REQUEST);
    }

    let getUserTrack, optionTrack = {
        where: {
            is_active: true
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
            }
        ],
        order:[
            ['createddate','DESC']
        ]
    };

    if (!isNull(req.query.user_id)) {
        optionTrack.where = {
            ...optionTrack.where,
            user_id: req.query.user_id
        }
    }

    [err, getUserTrack] = await to(user_track.findAll(optionTrack));

    if (err) {
        return ReE(res, err, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (isEmpty(getUserTrack)) {
        return ReE(res, { message: "User tracking details was empty!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(getUserTrack)) {
        return ReS(res, { message: "User tracking details!.", userTracks: getUserTrack }, HttpStatus.OK)
    }
}