const { dateCount, ReE, todays } = require('./util.service');

const isValidUUIDV4 = require('is-valid-uuid-v4').isValidUUIDV4;
const hasSpecial = /[`~!@#$%^*()_|+\-=?;:'",<>\{\}\[\]\\\/]/;
const hasNumber = /[`\d/]/;
const hasAlphapet = /[a-zA-Z]/;
const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validURL = (str) => {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
  }

const IsValidUUIDV4 = val => isValidUUIDV4(val);

exports.getQuery = (status) => {
    let query = {};
    query.is_active = true;
    query.is_block = false;
    // if(status === "inactive") {
    //     query.is_active = false;
    // }
    if(status === "inactive") {
        query.is_block = true;
        query.is_active= true;
    }
    if(status === "all") {
        query.is_active= true;
    }
    // if(status === "inactiveblocked"){
    //     query.is_active = false;
    //     query.is_block = true;
    // }
    // if(status === "inactiveunblocked"){
    //     query.is_active = false;
    //     query.is_block = false;
    // }
    // if(status === "activeblocked"){
    //     query.is_active = true;
    //     query.is_block = true;
    // }
    // if(status === "activeunblocked"){
    //     query.is_active = true;
    //     query.is_block = false;
    // }
    // if(status === "All") {
    //     query = {};
    // }
    return query;
}

exports.IsValidUUIDV4 = IsValidUUIDV4;

exports.validator = (model, method, data) => {
    if(model === "discipline"){
        if(method === "create"){
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Discipline Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Discipline Description must have min 3 and max 200 character' };
            }
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Discipline Name must be a string' };
            }
            if(data.name.length < 3 || data.name.length > 100){
                return { message: 'Discipline must have min 3 and max 100 charcter' };
            }
            if(hasNumber.test(data.name) || hasSpecial.test(data.name)){
                return { message: 'Invalid Discipline name' };
            }
            if(!data.master_code || typeof data.master_code !== "string"){
                return { message: 'Discipline Master Code must be a string' };
            }
            if(data.master_code.length < 3 || data.master_code.length > 50){
                return { message: 'Discipline Master Code must have min 3 and max 50 charcter' };
            }
            if(data.logo && typeof data.logo !== "string"){
                return { message: 'Discipline Logo must be a string' };
            }
            if(data.logo && !validURL(data.logo)){
                return { message: 'Invalid logo' };
            }
        }
    }
    if(model === "program"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Program name must be a string' };
            }
            if(data.name.length < 2 || data.name.length > 100){
                return { message: 'Program name must have min 2 character' };
            }
            if(hasNumber.test(data.name) || hasSpecial.test(data.name)){
                return { message: 'Invalid Program name' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Program description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Program description must have min 3 and max 200 character' };
            }
            if(data.logo && typeof data.logo !== "string"){
                return { message: 'Program logo must be a string' };
            }
            if(data.logo && !validURL(data.logo)){
                return { message: 'Invalid Program Logo URL' };
            }
            if(!data.discipline_master_code || typeof data.discipline_master_code !== "string"){
                return { message: 'Discipline Master Code must be a string' };
            }
            if(data.discipline_master_code.length < 3 || data.discipline_master_code.length > 50){
                return { message: 'Discipline Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.master_code || typeof data.master_code !== "string"){
                return { message: 'Program Master Code must be a string' };
            }
            if(data.master_code.length < 3 || data.master_code.length > 50){
                return { message: 'Program Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
        }
    }
    if(model === "course"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Course Name must be a string' };
            }
            if(data.name.length < 2 || data.name.length > 100){
                return { message: 'Course Name must have min 2 and max 100 character'};
            }
            if(hasNumber.test(data.name)){
                return { message: 'Invalid Course name' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Course Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Course Description must have min 3 and max 200 character'};
            }
            if(!data.discipline_master_code || typeof data.discipline_master_code !== "string"){
                return { message: 'Discipline Master Code must be a string' };
            }
            if(data.discipline_master_code.length < 3 || data.discipline_master_code.length > 50){
                return { message: 'Discipline Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.program_master_code || typeof data.program_master_code !== "string"){
                return { message: 'Program Master Code must be a string' };
            }
            if(data.program_master_code.length < 3 || data.program_master_code.length > 50){
                return { message: 'Program Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.master_code || typeof data.master_code !== "string"){
                return { message: 'Course Master Code must be a string' };
            }
            if(data.master_code.length < 3 || data.master_code.length > 50){
                return { message: 'Course Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
            if(!data.program || typeof data.program !== "string"){
                return { message: 'Program name is must' };
            }
        }
    }
    if(model === "department"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Department Name must be a string' };
            }
            if(data.name.length < 2 || data.name.length > 100){
                return { message: 'Department Name must have min 2 and max 100 character'};
            }
            if(hasNumber.test(data.name) || hasSpecial.test(data.name)){
                return { message: 'Invalid Department name' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Department Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Department Description must have min 3 and max 200 character'};
            }
            if(data.logo && typeof data.logo !== "string"){
                return { message: 'Department Logo must be a string' };
            }
            if(data.logo && !validURL(data.logo)){
                return { message: 'Invalid Department Logo' };
            }
            if(!data.discipline_master_code || typeof data.discipline_master_code !== "string"){
                return { message: 'Discipline Master Code must be a string' };
            }
            if(data.discipline_master_code.length < 3 || data.discipline_master_code.length > 50){
                return { message: 'Discipline Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.master_code || typeof data.master_code !== "string"){
                return { message: 'Department Master Code must be a string' };
            }
            if(data.master_code.length < 3 || data.master_code.length > 50){
                return { message: 'Department Master Code must have min 3 and max 50 charcter' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
        }
    }
    if(model === "subject"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Subject name is must be a string' };
            }
            if(data.name.length < 3 || data.name.length > 100){
                return { message: 'Subject name musbt have min 5 and max 100 character' };
            }
            if(!data.code || typeof data.code !== "string"){
                return { message: 'Subject code must be a string' };
            }
            if(data.code.length < 3 || data.code.length > 50){
                return { message: 'Subject code must have min 3 character' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Course Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Course Description must have min 3 and max 200 character'};
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
            if(!data.department || typeof data.department !== "string"){
                return { message: 'Department name is must' };
            }
        }
    }
    if(model === "topic"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Topic name must be string' };
            }
            if(data.name.length < 3 || data.name.length >  100){
                return { message: 'Topic name must have min 3 or max 100 character' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Topic Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length >  200){
                return { message: 'Topic description must have min 5 and max 200 character' };
            }
            if(!data.subject || typeof data.subject !== "string"){
                return { message: 'Subject name must be a string' };
            }
            if(!data.subject_code || typeof data.subject_code !== "string"){
                return { message: 'Subject code must be a string' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
            if(!data.department || typeof data.department !== "string"){
                return { message: 'Department name is must' };
            }
        }
    }
    if(model === "sub_topic"){
        if(method === "create"){
            if(!data.name || typeof data.name !== "string"){
                return { message: 'Sub Topic name must be string' };
            }
            if(data.name.length < 3 || data.name.length >  100){
                return { message: 'Sub Topic name must have min 3 or max 100 character' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Sub Topic Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length >  200){
                return { message: 'Sub Topic description must have min 5 and max 200 character' };
            }
            if(!data.subject || typeof data.subject !== "string"){
                return { message: 'Subject name must be a string' };
            }
            if(!data.subject_code || typeof data.subject_code !== "string"){
                return { message: 'Subject code must be a string' };
            }
            if(!data.topic || typeof data.topic !== "string"){
                return { message: 'Topic name must be a string' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name is must' };
            }
            if(!data.department || typeof data.department !== "string"){
                return { message: 'Department name is must' };
            }
        }
    }
    if(model === "time_frame"){
        if(method === "create"){
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Time frame description must be string' };
            }
            if(data.description.length < 3 || data.description.length >  200){
                return { message: 'time frame description must have min 5 and max 200 character' };
            }
            if(!data.session_start_time || typeof data.session_start_time !== "string"){
                return { message: 'time frame session start time must be a string' };
            }
            if(`${new Date(`${todays()} ${data.session_start_time}`)}` === "Invalid Date"){
                return { message: 'Invalid session start time' };
            }
            if(!data.session_end_time || typeof data.session_end_time !== "string"){
                return { message: 'time frame session end time must be a string' };
            }
            if(`${new Date(`${todays()} ${data.session_end_time}`)}` === "Invalid Date"){
                return { message: 'Invalid session end time' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name must be a string' };
            }
            if(!data.program || typeof data.program !== "string"){
                return { message: 'Program name must be a string' };
            }
        }
    }
    if(model === "course_department_mapping"){
        if(method === "create"){
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Course Department Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Course Department Description must have min 3 and max 200 character' };
            }
            if(!data.cd_code || typeof data.cd_code !== "string"){
                return { message: 'Course Department code must be a string' };
            }
            if(!data.csd_code || typeof data.cd_code !== "string"){
                return { message: 'Course Sem Duration code must be a string' };
            }
            if(!data.department || typeof data.department !== "string"){
                return { message: 'Department name must be a string' };
            }
            if(!data.course || typeof data.course !== "string"){
                return { message: 'Course name must be a string' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Discipline name must be a string' };
            }
            if(!data.program || typeof data.program !== "string"){
                return { message: 'Program name must be a string' };
            }
        }
    }
    if(model === "subject_mapping"){
        if(method === "create"){
            if(!data.sem || typeof data.sem !== "string"){
                return { message: 'Subject mapping semester must be a string' };
            }
            if(!Number.isInteger(parseInt(data.sem))){
                return { message: 'Invalid Subject mapping semester' };
            }
            if(!data.description || typeof data.description !== "string"){
                return { message: 'Subject Mapping Description must be a string' };
            }
            if(data.description.length < 3 || data.description.length > 200){
                return { message: 'Subject Mapping Description must have min 3 and max 200 character'};
            }
            if(!data.subject_department || typeof data.subject_department !== "string"){
                return  { message: 'Subject Department name must be a string' };
            }
            if(!data.subject || typeof data.subject !== "string"){
                return  { message: 'Subject name must be a string' };
            }
            if(!data.department || typeof data.department !== "string"){
                return { message: 'department must be a string' };
            }
            if(!data.course || typeof data.course !== "string"){
                return { message: 'Course must be a string' };
            }
            if(!data.program || typeof data.program !== "string"){
                return { message: 'Program must be a string' };
            }
            if(!data.discipline || typeof data.discipline !== "string"){
                return { message: 'Course must be a string' };
            }
        }
    }
    
    return null;
}