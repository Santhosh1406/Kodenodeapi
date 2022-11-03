const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline_master, program_master, department_master, course_master, organization, user_data, user_info } = require("../models");
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { Op } = require("sequelize");
const { CONFIG } = require("../config/confifData");
const { checkMenuAccess } = require('./common');

const allFields = ["_id", "name", "description", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["name", "description"];
const updateRequiredFields = ["_id"];

exports.addDisMaster = async (req, res) => {
    let err, disMas, disName, orgInfo, disAll;
    const user = req.user;
    let body = req.body;

    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[0]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if(isNull(body.name) || typeof body.name !== "string"){
        return ReE(res, { message: 'Discipline master name must be a string' }, BAD_REQUEST);
    }
    if (!isNull(body.name) && (body.name.length < 3 || body.name.length > 100)) {
        return ReE(res, { message: 'Discipline master name must have min 3 character or max 100 character' }, BAD_REQUEST);
    }
    if (isNull(body.description) || typeof body.description !== "string") {
        return ReE(res, { message: 'Discipline master description must be a string' }, BAD_REQUEST);
    }
    if (body.description.length < 3 || body.description.length > 200) {
        return ReE(res, { message: 'Discipline master description must have min 3 character or max 200 character' }, BAD_REQUEST);
    }
    let code = `DIMALL`;
    let org_id = null;
    body.name = firstCap(String(body.name));
    if(!isNull(body.org_id)){
        if(typeof body.org_id !== "string" || !IsValidUUIDV4(body.org_id)){
            return ReE(res, { message: 'Valid Organization id is must' }, BAD_REQUEST)
        }
        [err, orgInfo] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
        if(err){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(orgInfo)){
            return ReE(res, { message: 'organization not found' }, BAD_REQUEST);
        }
        org_id = { [Op.or]: [null,orgInfo._id] };
        code = `DIM${String(orgInfo.org_name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0,3).toUpperCase()}`;
    }
    let query = { name: body.name, is_active: true, is_block: false, org_id: org_id };
    [err, disName] = await to(discipline_master.findOne({ where: query }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!isNull(disName)) {
        return ReE(res, { message: 'Discipline master name already exist' }, BAD_REQUEST);
    }
    [err, disAll] = await to(discipline_master.findAll({ where: { code: { [Op.iLike]: `${code}%` } } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disAll)) {
        return ReE(res, { message: `Discipline master didn't found` }, BAD_REQUEST);
    }
    code = `${code}${(disAll.length + 1)}`;
    [err, disMas] = await to(discipline_master.create({ ...body, org_id: org_id, code: code, is_active: true, is_block: false, createdby: user._id }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMas)) {
        return ReE(res, { message: 'Discipline master creation failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Discipline master created successfully' }, OK);
}

exports.getAllDisciplineMaster = async (req, res) => {
    let err, disMas, data, query, filter, orgInfo;
    const user = req.user;
    data = req.query;

    
    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            data = checkMenuUserDetails.body;
        }
    }

    query = getQuery(data);
    query.org_id = null;
    if (!isNull(data.org_id)) {
        if (typeof data.org_id !== "string" || !IsValidUUIDV4(data.org_id)) {
            return ReE(res, { message: 'Valid Institution id is must' }, BAD_REQUEST);
        }
        [err, orgInfo] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
        if (err) {
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if (isNull(orgInfo)) {
            return ReE(res, { message: 'Institution not found' }, BAD_REQUEST);
        }
        query.org_id = { [Op.or]: [null, orgInfo._id] };
    }
    filter = {
        where: query,
        order: [['createddate', 'ASC']],
        include: [
            {
                model: organization,
                as: 'organization'
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
    if (!isNull(data.limit) && !isNull(data.page)) {
        filter.limit = data.limit;
        filter.offset = (data.page * (data.page - 1));
    };
    [err, disMas] = await to(discipline_master.findAll(filter));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!disMas || !Array.isArray(disMas) || disMas.length === 0) {
        return ReE(res, { message: "Discipline master are not found" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Discipline master founded", data: disMas }, OK);
}

exports.getOneDisciplineMaster = async (req, res) => {
    let err, disMas, data, query = { is_active: true, is_block: false };
    const user = req.user;
    data = req.query;

    
    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:data, menuId: req.query.menu_id, access: { [CONFIG.access[3]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            data = checkMenuUserDetails.body;
        }
    }

    if (!data.id || typeof data.id !== "string") {
        return ReE(res, { message: "Discipline master id is must" }, BAD_REQUEST);
    }
    if (data.id && !IsValidUUIDV4(data.id)) {
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    query._id = data.id;
    [err, disMas] = await to(discipline_master.findOne({ where: query }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMas)) {
        return ReE(res, { message: "Discipline master not found" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Discipline master founded", data: disMas }, OK);
};

exports.updateDisMaster = async (req, res) => {
    let err, disMas, disMasFind;
    const user = req.user;
    let body = req.body;

    
    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if(!body.id || typeof body.id !== "string"){
        return ReE(res, { message: 'Disicpline master is must be a string' }, BAD_REQUEST);
    }
    if (body.id && !IsValidUUIDV4(body.id)) {
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    if (!isNull(body.name) && typeof body.name !== "string") {
        return ReE(res, { message: 'Discipline master name must be a string' }, BAD_REQUEST);
    }
    if (!isNull(body.name) && (body.name.length < 3 || body.name.length > 100)) {
        return ReE(res, { message: 'Discipline master name must have min 3 character or max 100 character' }, BAD_REQUEST);
    }
    if (!isNull(body.description) && typeof body.description !== "string") {
        return ReE(res, { message: 'Discipline master description must be a string' }, BAD_REQUEST);
    }
    if (!isNull(body.description) && (body.description.length < 3 || body.description.length > 200)) {
        return ReE(res, { message: 'Discipline master description must have min 3 character or max 200 character' }, BAD_REQUEST);
    }
    body.name = firstCap(String(body.name));
    [err, disMasFind] = await to(discipline_master.findOne({ where: { _id: body.id, is_active: true, is_block: false } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMasFind)) {
        return ReE(res, { message: 'Discipline master not found' }, BAD_REQUEST);
    }
    [err, disMas] = await to(discipline_master.update({ name: body.name, description: body.description }, { where: { _id: body.id } }));
    if(err){
        return ReE(Res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMas)) {
        return ReE(res, { message: 'Discipline master update failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Discipline master updated successfully' }, OK);
}

exports.blockDisMaster = async (req, res) => {
    let err, disMas, disMasFind, proMas, depMas, couMas;
    const user = req.user;
    const id = req.params.id;

    let body=req.body;

    
    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[1]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if(!id || typeof id !== "string"){
        return ReE(res, { message: 'Disicpline master id must be a string' }, BAD_REQUEST);
    }
    if (id && !IsValidUUIDV4(id)) {
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    [err, disMasFind] = await to(discipline_master.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMasFind)) {
        return ReE(res, { message: 'Discipline master not found' }, BAD_REQUEST);
    }
    [err, proMas] = await to(program_master.update({ is_block: true }, { where: { discipline_master_id: id } }));
    [err, couMas] = await to(course_master.update({ is_block: true }, { where: { discipline_master_id: id } }));
    [err, depMas] = await to(department_master.update({ is_block: true }, { where: { discipline_master_id: id } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(proMas) || isNull(couMas) || isNull(depMas)) {
        return ReE(res, { message: 'Block failed' }, BAD_REQUEST);
    }
    [err, disMas] = await to(discipline_master.update({ is_block: true }, { where: { _id: id } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMas)) {
        return ReE(res, { message: 'Discipline master block failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Discipline master blocked successfully' }, OK);
}

exports.deleteDisMaster = async (req, res) => {
    let err, disMas, disMasFind, proMas, couMas, depMas;
    const user = req.user;
    const id = req.params.id;

    let body=req.body;

    
    if (!user.owner) {
        let checkMenuUserDetails = await checkMenuAccess({ user_id: user._id,body:body, menuId: req.query.menu_id, access: { [CONFIG.access[2]]: true } });

        if (!checkMenuUserDetails.success) {
            return ReE(res, { message: checkMenuUserDetails.message }, BAD_REQUEST);
        }

        if (checkMenuUserDetails.body) {
            body = checkMenuUserDetails.body;
        }
    }

    if(!id || typeof id !== "string"){
        return ReE(res, { message: 'Disicpline master id must be a string' }, BAD_REQUEST);
    }
    if (id && !IsValidUUIDV4(id)) {
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    [err, disMasFind] = await to(discipline_master.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMasFind)) {
        return ReE(res, { message: 'Discipline master not found' }, BAD_REQUEST);
    }
    [err, proMas] = await to(program_master.update({ is_active: false }, { where: { discipline_master_id: id } }));
    [err, couMas] = await to(course_master.update({ is_active: false }, { where: { discipline_master_id: id } }));
    [err, depMas] = await to(department_master.update({ is_active: false }, { where: { discipline_master_id: id } }));
    if (err) {
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(proMas) || isNull(couMas) || isNull(depMas)) {
        return ReE(res, { message: 'Delete failed' }, BAD_REQUEST);
    }
    [err, disMas] = await to(discipline_master.update({ is_active: false }, { where: { _id: id } }));
    if (err) {
        return ReE(Res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(disMas)) {
        return ReE(res, { message: 'Discipline master delete failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Discipline master deleted successfully' }, OK);
}