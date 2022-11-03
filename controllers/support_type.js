const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap, isEmpty } = require("../service/util.service");
const { support_type } = require("../models");
const { Op } = require("sequelize");

exports.createSupportType = async(req,res) => {
    let err, exist, createST;
    const user = req.user;
    const body = req.body;
    if(isNull(body) || isEmpty(body) || isNull(body.name)){
        return ReE(res, { message: 'Support type name is must' }, BAD_REQUEST);
    }
    [err, exist] = await to(support_type.findOne({ name: body.name, is_active: true, is_block: false }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(!isNull(exist)){
        return ReE(res, { message: 'This type already exist' }, BAD_REQUEST);
    }
    [err, createST] = await to(support_type.create({ name: body.name, is_active: true, is_block: false, createdby: user._id }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(createST)){
        return ReE(res, { message: 'Support type creation failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Support type created successfully' }, OK);
}

exports.getAllST = async(req,res) => {
    let err, findST;
    const user = req.user;
    [err, findST] = await to(support_type.findAll({ where: { is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(findST)){
        return ReE(res, { message: 'Support Type not found' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Support Type founded', data: findST }, OK);
}

exports.getOneST = async(req,res) => {
    let err, findST;
    const id = req.query.id;
    const user = req.user;
    if(isNull(id)){
        return ReE(res, { message: 'Id must' }, BAD_REQUEST);
    }
    [err, findST] = await to(support_type.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(findST)){
        return ReE(res, { message: 'Support Type not found' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Support Type founded', data: findST }, OK);
}