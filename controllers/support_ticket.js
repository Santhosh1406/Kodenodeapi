const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap, isEmpty } = require("../service/util.service");
const { support_type, support_ticket } = require("../models");
const { Op, INET } = require("sequelize");
const { IsValidUUIDV4 } = require("../service/bulkValidation");
const moment = require('moment');
const DeviceDetector = require('node-device-detector');

exports.createTicket = async(req,res) => {
    let err, existAll, create, ticket_no, supportType;
    const body = req.body;
    const user = req.user;

    const detector = new DeviceDetector({
        clientIndexes: true,
        deviceIndexes: true,
        deviceAliasCode: false,
    });
    const userAgent = req.header('User-Agent');
    const result = detector.detect(userAgent);

    if(isNull(body) || isEmpty(body)){
        return ReE(res, { message: 'No data available' }, BAD_REQUEST);
    }
    if(!isNull(body.support_type) && !IsValidUUIDV4(body.support_type)){
       return ReE(res, { message: 'Invalid Support type' }, BAD_REQUEST) 
    }
    if(isNull(body.remarks) || body.remarks.length > 200 || body.remarks.length < 10){
        return ReE(res, { message: 'Remarks is must have mininmu 10 and maximum 200 character' }, BAD_REQUEST)
    }

    if(!isNull(body.support_type)){
        [err, supportType] = await to(support_type.findOne({ where: { _id: body.support_type, is_active: true, is_block: false } }));
        if(err){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(supportType)){
            return ReE(res, { message: 'Support Type not found' }, BAD_REQUEST);
        }
    }

    [err, existAll] = await to(support_ticket.findAll({ order: ['ticket_no', 'ASC'] }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(existAll)){
        return ReE(res, { message: 'ticket not found' }, BAD_REQUEST);
    }
    if(existAll.length === 0){
        ticket_no = String(1).padStart(12, '0');
    }
    ticket_no = String(parseInt(existAll[0].ticket_no)+1).padStart(12, '0');
    let data = {
        ticket_no: ticket_no,
        support_type: body.support_type,
        device: { ...result.client, ...req.connection._peername },
        remarks: body.remarks,
        status: 'NOT-ASSIGNED',
        opendate: null,
        closedate: null,
        resolve_remarks: null, 
        is_active: true,
        is_block: false,
        createdby: user._id
    }
    [err, create] = await to(support_ticket.create(data));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(create)){
        return ReE(res, { message: 'Support Ticket raise failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Support ticket raised Success' }, OK);
}

exports.getAllTicket = async(req,res) => {
    let err, find;
    const user = req.user;
    let query = req.query;
    let filter = {
        is_active: true,
        is_block: false
    };
    if(user.owner === false){
        filter.createdby = user._id;
    }
    if(!isNull(query.status)){
        filter.status = query.status;
    }
    [err, find] = await to(support_ticket.findAll({ where: filter }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR)
    }
    if(isNull(find)){
        return ReE(res, { message: 'Tickets not found' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Ticket Founded Successfully', data: find }, OK)
}

exports.assignTicket = async(req, res) => {
    let err, getExist, updateTicket;
    const user = req.user;
    const id = req.params.id;
    if(!IsValidUUIDV4(id)){
        return ReE(res, { message: 'Invalid ticket id' }, BAD_REQUEST);
    }
    if(user.owner === false){
        return ReE(res, { message: 'Owner only can access this menu' }, BAD_REQUEST);
    }
    [err, getExist] = await to(support_ticket.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(getExist)){
        return ReE(res, { message: 'Ticket not found' }, BAD_REQUEST)
    }
    if(getExist.status !== 'NOT-ASSIGNED'){
        return ReE(res, { message: 'Invalid Ticket' }, BAD_REQUEST);
    }
    [err, updateTicket] = await to(support_ticket.update({ assignedto: user._id, status: 'PENDING', opendate: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm') }, { where: { _id: getExist._id, is_active: true, is_block: false }}));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(updateTicket)){
        return ReE(res, { message: 'Ticket assign failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Ticket assigned successfully' }, OK);
}

exports.closeTicket = async(req, res) => {
    let err, getExist, updateTicket;
    const user = req.user;
    const id = req.body.id;
    if(!IsValidUUIDV4(id)){
        return ReE(res, { message: 'Invalid ticket id' }, BAD_REQUEST);
    }
    if(isNull(req.body.resolve_remarks) || req.body.resolve_remarks.length < 10 || req.body.resolve_remarks.length > 200 ){
        return ReE(res, { message: 'Resolve remark must have mion 10 or max 200 character' }, BAD_REQUEST);
    }
    [err, getExist] = await to(support_ticket.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(getExist)){
        return ReE(res, { message: 'Ticket not found' }, BAD_REQUEST)
    }
    if(getExist.status !== 'PENDING' &&  getExist.status !== 'Not-Assigned'){
        return ReE(res, { message: 'Invalid Ticket' }, BAD_REQUEST);
    }
    if(getExist.assignedto !== user._id){
        return ReE(res, { message: `You cann't have access to close this ticket` }, BAD_REQUEST);
    }
    [err, updateTicket] = await to(support_ticket.update({ status: getExist.status === 'PENDING'? 'CLOSED': 'REJECTED', resolve_remarks: req.body.resolve_remarks, opendate: getExist.status === 'PENDING'? getExist.opendate: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm'), closedate: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm') }, { where: { _id: getExist._id, is_active: true, is_block: false }}));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(updateTicket)){
        return ReE(res, { message: 'Ticket assign failed' }, BAD_REQUEST)
    }
    return ReS(res, { message: 'Ticket assigned successfully' }, OK);
}

exports.completeTicket = async(req, res) => {
    let err, getExist, updateTicket;
    const user = req.user;
    const id = req.params.id;
    if(!IsValidUUIDV4(id)){
        return ReE(res, { message: 'Invalid ticket id' }, BAD_REQUEST);
    }
    [err, getExist] = await to(support_ticket.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(getExist)){
        return ReE(res, { message: 'Ticket not found' }, BAD_REQUEST)
    }
    if(getExist.status !== 'REJECTED' &&  getExist.status !== 'CLOSED'){
        return ReE(res, { message: 'Invalid Ticket' }, BAD_REQUEST);
    }
    if(getExist.createdby !== user._id){
        return ReE(res, { message: `You cann't have access to complete this ticket` }, BAD_REQUEST);
    }
    [err, updateTicket] = await to(support_ticket.update({ status: 'COMPLETED'}, { where: { _id: getExist._id, is_active: true, is_block: false }}));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(updateTicket)){
        return ReE(res, { message: 'Ticket assign failed' }, BAD_REQUEST)
    }
    return ReS(res, { message: 'Ticket assigned successfully' }, OK);
}