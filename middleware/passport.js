const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const user_data = require('../models').user_data;
const { to, isNull } = require('../service/util.service');
const { CONFIG } = require('../config/confifData');

module.exports = function (passport) {

    let attributes = {
        exclude: [
            "email_otp",
            "phone_otp",
            "email_verified",
            "phone_verified",
        ]
    };

    var opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = CONFIG.jwt_encryption;
    passport.use('user', new JwtStrategy(opts, async function (jwt_payload, done) {
        let err, users;
        [err, users] = await to(user_data.findOne({ where: { _id: jwt_payload._id, is_active: true, is_block: false, email_verified: true, phone_verified: true }, attributes }));
        if (err) return done(err, false);
        if (!isNull(users)) {
            return done(null, users);
        } else {
            return done(null, false);
        }
    }));
    passport.use('owner', new JwtStrategy(opts, async function (jwt_payload, done) {
        let err, users;
        [err, users] = await to(user_data.findOne({ where: { _id: jwt_payload._id, is_active: true, is_block: false, email_verified: true, phone_verified: true, owner: true }, attributes }));
        if (err) return done(err, false);
        if (!isNull(users)) {
            return done(null, users);
        } else {
            return done(null, false);
        }
    }));
};