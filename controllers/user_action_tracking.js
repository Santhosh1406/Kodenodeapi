const { to, isNull } = require("../service/util.service");
const DeviceDetector = require('node-device-detector');
const { user_action_tracking } = require('../models');

exports.trackAction = async( req, before_action, after_action, user, action, model ) => {
    let err, create;
    const detector = new DeviceDetector({
        clientIndexes: true,
        deviceIndexes: true,
        deviceAliasCode: false,
    });
    const userAgent = req.header('User-Agent');
    const result = detector.detect(userAgent);
    let finalData = {
        before_action: before_action,
        after_action: after_action,
        user: user._id,
        action: action,
        model: model,
        device: { ...result.client, ...req.connection._peername },
        is_active: true,
        is_block: false
    };
    [err, create] = await to(user_action_tracking.create(finalData));
    if(err) return { message: err, success: false }; 
    else if(isNull(create)) return { message: 'Action Tracking failed', success: false };
    else return { message: 'Action Tracking successful', success: true };
}