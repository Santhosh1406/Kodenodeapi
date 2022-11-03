const { INTERNAL_SERVER_ERROR, BAD_REQUEST, OK } = require("http-status");
const { to, ReE, ReS, isNull, firstCap } = require("../service/util.service");
const { discipline_master, department_master, organization, user_data, user_info } = require("../models");;
const { validator, IsValidUUIDV4, getQuery } = require('../service/validation');
const { Op } = require("sequelize");
const { checkMenuAccess } = require('./common');
const { CONFIG } = require("../config/confifData");

exports.addDepMaster = async(req,res)=> {
    let err, depMas, depName, orgInfo, disMas, depAll;
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
        return ReE(res, { message: 'Department master name must be a string' }, BAD_REQUEST);
    }
    if(body.name.length < 2 || body.name.length > 100){
        return ReE(res, { message: 'Department master name must have min 2 character or max 200 character' }, BAD_REQUEST);
    }
    if(isNull(body.description) || typeof body.description !== "string"){
        return ReE(res, { message: 'Department master description must be a string' }, BAD_REQUEST);
    }
    if(body.description.length < 3 || body.description.length > 200){
        return ReE(res, { message: 'Department master description must have min 3 character or max 200 character' }, BAD_REQUEST);
    }
    if (!body.discipline_master_id || typeof body.discipline_master_id !== "string") {
        return ReE(res, { message: "Discipline master id is must" }, BAD_REQUEST);
    }
      if (body.discipline_master_id && !IsValidUUIDV4(body.discipline_master_id)) {
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    let code = `DMALL`;
    body.name = firstCap(String(body.name));
    let query = { _id: body.discipline_master_id, org_id: null, is_active: true, is_block: false };
    let query1 = { name: body.name, discipline_master_id: body.discipline_master_id, org_id: null, is_active: true, is_block: false };
    if(!isNull(body.org_id)){
        if( typeof body.org_id !== "string" || !IsValidUUIDV4(body.org_id)){
            return ReE(res, { message: 'Valid Organization id is must' }, BAD_REQUEST)
        }
        [err, orgInfo] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
        if(err){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(orgInfo)){
            return ReE(res, { message: 'organization not found' }, BAD_REQUEST);
        }
        code = `DM${String(orgInfo.org_name).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "").substring(0,3).toUpperCase()}`;
        query.org_id = { [Op.or]: [ null, orgInfo._id ] };
        query1.org_id = { [Op.or]: [ null, orgInfo._id ] };
    }
    if(isNull(body.org_id)){
        body.org_id = null;
    }
    [err, disMas] = await to(discipline_master.findOne({ where: query }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(disMas)){
        return ReE(res, { message: 'Discipline master not found' }, BAD_REQUEST);
    }
    [err, depName] = await to(department_master.findOne({ where: query1 }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(!isNull(depName)){
        return ReE(res, { message: 'Department master name already exist' }, BAD_REQUEST);
    }
    [err, depAll] = await to(department_master.findAll({ where: { code: { [Op.iLike]: `${code}%` } } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depAll)){
        return ReE(res, { message: `Department master didn't found` }, BAD_REQUEST);
    }
    code = `${code}${(depAll.length+1)}`;
    [err,depMas] = await to(department_master.create({ ...body, code: code, is_active: true, is_block: false, createdby: user._id }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMas)){
        return ReE(res, { message: 'Department master creation failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Department master created successfully' }, OK);
}

exports.getAllDepartmentMaster = async(req,res) => {
    let err, depMas, data, query, filter, orgInfo;
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
    if(!isNull(data.org_id)){
        if(typeof data.org_id !== "string" || !IsValidUUIDV4(data.org_id)){
            return ReE(res, { message: 'Valid Organization id is must' }, BAD_REQUEST)
        }
        [err, orgInfo] = await to(organization.findOne({ where: { _id: data.org_id, is_active: true, is_block: false } }));
        if(err){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(orgInfo)){
            return ReE(res, { message: 'organization not found' }, BAD_REQUEST);
        }
        query.org_id = { [Op.or]: [ null, orgInfo._id] };
    }
    if(!isNull(data.discipline_master_id)){
        query.discipline_master_id = data.discipline_master_id;
    }
    filter = {
      where: query,
      order: [['code', 'ASC']],
      include: [
          {
              model: discipline_master,
              as: 'disciplineMaster'
          },
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
    if(!isNull(data.limit) && !isNull(data.page)){
      filter.limit = data.limit;
      filter.offset = (data.page*(data.page-1));
    };
    [err, depMas] = await to(department_master.findAll(filter));
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (!depMas || !Array.isArray(depMas) || depMas.length === 0) {
      return ReE(res, { message: "Department master are not found" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Department master founded", data: depMas }, OK);
}

exports.getOneDepartmentMaster = async (req, res) => {
    let err, depMas, data, query = { is_active: true, is_block: false };
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
      return ReE(res, { message: "Department master id is must" }, BAD_REQUEST);
    }
    if (data.id && !IsValidUUIDV4(data.id)) {
      return ReE(res, { message: 'Invalid Department master id' }, BAD_REQUEST);
    }
    query._id = data.id;
    [err, depMas] = await to(department_master.findOne({ where: query, include: [
        {
            model: discipline_master,
            as: 'disciplineMaster'
        },
        {
            model: organization,
            as: 'organization'
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
    ] }));
    if (err) {
      return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if (isNull(depMas)) {
      return ReE(res, { message: "Department master not found" }, BAD_REQUEST);
    }
    return ReS(res, { message: "Department master founded", data: depMas }, OK);
};

exports.updateDepMaster = async(req,res) => {
    let err, depMas, depMasFind;
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
        return ReE(res, { message: 'Department master is must be a string' }, BAD_REQUEST);
    }
    if(body.id && !IsValidUUIDV4(body.id)){
        return ReE(res, { message: 'Invalid Department master id' }, BAD_REQUEST);
    }
    if(!isNull(body.name) && typeof body.name !== "string"){
        return ReE(res, { message: 'Department master name must be a string' }, BAD_REQUEST);
    }
    if(!isNull(body.name) && ( body.name.length < 2 || body.name.length > 100 )){
        return ReE(res, { message: 'Department master name must have min 2 character or max 200 character' }, BAD_REQUEST);
    }
    if(!isNull(body.description) && typeof body.description !== "string"){
        return ReE(res, { message: 'Department master description must be a string' }, BAD_REQUEST);
    }
    if(!isNull(body.description) && ( body.description.length < 3 || body.description.length > 200 )){
        return ReE(res, { message: 'Department master description must have min 3 character or max 200 character' }, BAD_REQUEST);
    }
    if(body.discipline_master_id && typeof body.discipline_master_id !== "string"){
        return ReE(res, { message: 'Discipline master is must be a string' }, BAD_REQUEST);
    }
    if(body.discipline_master_id && !IsValidUUIDV4(body.discipline_master_id)){
        return ReE(res, { message: 'Invalid Discipline master id' }, BAD_REQUEST);
    }
    body.name = firstCap(String(body.name));
    [err, depMasFind] = await to(department_master.findOne({ where: { _id: body.id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMasFind)){
        return ReE(res, { message: 'Department master not found' }, BAD_REQUEST);
    }
    [err, depMas] = await to(department_master.update({ ...body }, { where: { _id: body.id } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMas)){
        return ReE(res, { message: 'Department master update failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Department master updated successfully' }, OK);
}

exports.blockDepMaster = async(req,res) => {
    let err, depMas, depMasFind;
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
        return ReE(res, { message: 'Department master id must be a string' }, BAD_REQUEST);
    }
    if(id && !IsValidUUIDV4(id)){
        return ReE(res, { message: 'Invalid Department master id' }, BAD_REQUEST);
    }
    [err, depMasFind] = await to(department_master.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMasFind)){
        return ReE(res, { message: 'Department master not found' }, BAD_REQUEST);
    }
    [err, depMas] = await to(department_master.update({ is_block: true }, { where: { _id: id } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMas)){
        return ReE(res, { message: 'Department master block failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Department master blocked successfully' }, OK);
}

exports.deleteDepMaster = async(req,res) => {
    let err, depMas, depMasFind;
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
        return ReE(res, { message: 'Department master id must be a string' }, BAD_REQUEST);
    }
    if(id && !IsValidUUIDV4(id)){
        return ReE(res, { message: 'Invalid Department master id' }, BAD_REQUEST);
    }
    [err, depMasFind] = await to(department_master.findOne({ where: { _id: id, is_active: true, is_block: false } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMasFind)){
        return ReE(res, { message: 'Department master not found' }, BAD_REQUEST);
    }
    [err, depMas] = await to(department_master.update({ is_active: false }, { where: { _id: id } }));
    if(err){
        return ReE(res, err, INTERNAL_SERVER_ERROR);
    }
    if(isNull(depMas)){
        return ReE(res, { message: 'Department master delete failed' }, BAD_REQUEST);
    }
    return ReS(res, { message: 'Department master deleted successfully' }, OK);
}