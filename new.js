const { organization, discipline, program, course, department, subject, topic, sub_topic, time_frame, discipline_master, program_master, course_master, department_master, course_department_mapping } = require('../models');
const { CONFIG } = require('../config/confifData');
const { Op } = require("sequelize");
const { isNull, ReE, to, ReS, isEmpty, firstLetterCap } = require('../service/util.service');
const { IsValidUUIDV4, validator } = require('../service/bulkValidation');
const { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } = require('http-status');
const { todays } = require('./service/util.service');

const allFields = ["_id", "discipline_id", "description", "name", "logo", "org_id", "is_active", "is_block", "createdby", "updatedby", "createddate", "updateddate"];
const createRequiredFields = ["description", "name", "org_id", "logo"];
const updateRequiredFields = ["_id", "discipline_id"];
const updateAbleFields = ["description", "name"];

exports.bulkValidate = async(req,res) => {
    let errO, orgId;
    const body = req.body;
    const user = req.user;
    if(isNull(body.org_id) || typeof body.org_id !== "string"){
        return ReE(res, { message: 'Organization id must be a string' }, BAD_REQUEST);
    }
    [errO, orgId] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
    if(isNull(errO) || isEmpty(errO)){
        return ReE(res, errO, INTERNAL_SERVER_ERROR);
    }
    if(isNull(orgId)){
        return ReE(res, { message: 'Organization not found' }, BAD_REQUEST);
    }
    let validDiscipline = [], invalidDiscipline = [], validProgram = [], invalidProgram = [], validCourse = [], invalidCourse =[], validDepartment = [], invalidDepartment =[];
    if(!isNull(body.Discipline)){
        if(Array.isArray(body.Discipline) && body.Discipline.length > 0){
            for (let index = 0; index < body.Discipline.length; index++) {
                const element = body.Discipline[index];
                let duplicate = validDiscipline.filter(x=> x.name === element.name);
                if(duplicate.length > 0){
                   invalidDiscipline.push({ ...element, message: 'Duplicate Discipline', success: false });
                } else {
                    const validation = await validator('discipline', 'create', element);
                    if(validation){
                        invalidDiscipline.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disFind;
                        [errD, disFind] = await to(discipline.findOne({ where: { name: element.name, org_id: orgId._id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidDiscipline.push({ ...element, message: errD, success: false });
                        } else if(!isNull(disFind)){
                            invalidDiscipline.push({ ...element, message: 'Discipline already already exist',success: false });
                        } else if(isNull(disFind)){
                            let errDI, disId;
                            let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                            let dis_Id = `${String(removeSpl).replace(" ", "").substring(0, 3).toUpperCase()}${String(orgId.org_id).substring(3, String(orgId.org_id).length).toUpperCase()}`;
                            [errDI, disId] = await to(discipline.findAll({ where: { discipline_id: { [Op.iLike]: `${dis_Id}%` } } }));
                            if (errDI) {
                                invalidDiscipline.push({ ...element, message: errDI, success: false});
                            } else if (!disId || !Array.isArray(disId)) {
                              invalidDiscipline.push({ ...element, message: 'Something went wrong', success: false });
                            }else{
                                let newId = validDiscipline.filter(x=> String(x.discipline_id).includes(`${dis_Id}`));
                                let idSub = disId.length===0?newId.length===0?`${dis_Id}`:`${dis_Id}${newId.length}`:`${dis_Id}${(disId.length)+(newId.length)}`;
                                validDiscipline.push({ ...element, discipline_id: idSub, org_id: orgId._id });``
                            }
                        }
                    }
                }
            }
        }
    }
    if(!isNull(body.Program)){
        if(Array.isArray(body.Program) && body.Program.length > 0){
            for (let index = 0; index < body.Program.length; index++) {
                const element = body.Program[index];
                let duplicate = validProgram.filter(q=> q.name === element.name && q.discipline === element.discipline);
                if(duplicate.length>0){
                    invalidProgram.push({ ...element, message: 'Duplicate Program', success: false })
                }else{
                    const validation = await validator('program', 'create', element);
                    if(validation){
                        invalidProgram.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disPFind
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        [errD, disPFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: orgId._id, is_active: true, is_block: false }}));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidProgram.push({ ...element, message: errD, success: false });
                        }else if(!isNull(disPFind)){
                            let errP, proFind;
                            [errP, proFind] = await to(program.findOne({ where: { name: element.name, org_id: orgId._id, discipline_id: disPFind._id, is_active: true, is_block: false } }));
                            if(isNull(errP) || isEmpty(errP)){
                                invalidProgram.push({ ...element, message: errP, success: false });
                            }
                            else if(!isNull(proFind)){
                                invalidProgram.push({ ...element, message: 'Program already already exist',success: false });
                            }
                            else{
                                let err, programId;
                                let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                                let program_Id = `${String(removeSpl).replace(" ", "").substring(0, 3).toUpperCase()}${String(orgId.org_id).substring(3, String(orgId.org_id).length)}`;
                                [err, programId] = await to(program.findAll({ where: { program_id: { [Op.iLike]: `${program_Id}%` } } }));
                                if (err) {
                                    invalidProgram.push({ ...element, message: err, success: false });
                                }
                                else if (!programId && !Array.isArray(programId)) {
                                    invalidProgram.push({ ...element, message: 'Something went wrong', success: false });
                                }else{
                                    let newId = validProgram.filter(x=> String(x.program_id).includes(`${program_Id}`))
                                    let idSub = programId?.length===0?newId.length===0?`${program_Id}`:`${program_Id}${newId.length}`:`${program_Id}${(programId.length)+(newId.length)}`;
                                    validProgram.push({ ...element, program_id: idSub, discipline_code: disPFind.discipline_id, org_id: orgId._id });
                                }
                            }
                        } else if(isNull(disPFind) && !isNull(val)){
                            let err, programId;
                            let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                            let program_Id = `${String(removeSpl).replace(" ", "").substring(0, 3).toUpperCase()}${String(val.discipline_id).substring(3, String(val.discipline_id).length)}`;
                            [err, programId] = await to(program.findAll({ where: { program_id: { [Op.iLike]: `${program_Id}%` } } }));
                            if (err) {
                                invalidProgram.push({ ...element, message: err, success: false });
                            }
                            else if (!programId && !Array.isArray(programId)) {
                                invalidProgram.push({ ...element, message: 'Something went wrong', success: false });
                            }
                            else{
                                let newId = validProgram.filter(x=> String(x.program_id).includes(`${program_Id}`));
                                let idSub = programId?.length===0?newId.length===0?`${program_Id}`:`${program_Id}${newId.length}`:`${program_Id}${(programId.length)+(newId.length)}`;
                                validProgram.push({ ...element, program_id: idSub, discipline_code: val.discipline_id, org_id: orgId._id });
                            }
                        } else {
                            invalidProgram.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    if(!isNull(body.Course)){
        if(Array.isArray(body.Course) && body.Course.length > 0){
            for (let index = 0; index < body.Course.length; index++) {
                const element = body.Course[index];
                let duplicate = validCourse.filter(q=> q.name === element.name && q.discipline === element.discipline && q.program === element.program);
                if(duplicate.length>0){
                    invalidCourse.push({ ...element, message: 'Duplicate Course', success: false });
                }else{
                    element.total_year = `${element.total_year}`;
                    const validation = await validator('course', 'create', element);
                    if(validation){
                        invalidCourse.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disCFind;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validProgram.find(y=> y.name === element.program && y.discipline === element.discipline);
                        [errD, disCFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: orgId._id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidProgram.push({ ...element, message: errD, success: false });
                        }else if(!isNull(disCFind)){
                            let errPs, proFinds;
                            [errPs, proFinds] = await to(program.findOne({ where: { name: element.program, discipline_id: disCFind._id, org_id: orgId._id, is_active: true, is_block: false } }));
                            if(isNull(errPs) || isEmpty(errPs)){
                                invalidCourse.push({ ...element, message: errPs, success: false });
                            } else if(!isNull(proFinds)){
                                let errC, couFind;
                                [errC, couFind] = await to(course.findOne({ where: { name: element.name, program_id: proFinds._id, discipline_id: disCFind._id, org_id: orgId._id, is_active: true, is_block: false } }));
                                if(isNull(errC) || isEmpty(errC)){
                                    invalidCourse.push({ ...element, message: errC, success: false });
                                }
                                else if(!isNull(couFind)){
                                    invalidCourse.push({ ...element, message: 'Course name already exist', success: false });
                                }
                                else if(isNull(couFind)){
                                    let errCDU, couserId;
                                    let removeSpl = String(`${data.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                                    let course_id = `${String(removeSpl).substring(0,3).toUpperCase()}${String(orgId.org_id).substring(3,String(orgId.org_id).length)}`;
                                    [errCDU, couserId] = await to(course.findAll({ where: { course_id: { [Op.iLike]: `${course_id}%` }}}));
                                    if(isNull(errCDU) || isEmpty(errCDU)){
                                      invalidCourse.push({ ...element, message: errCDU, success: false });
                                    }
                                    if(isNull(couserId)){
                                      invalidCourse.push({ ...element, message: 'Something went wrong', success: false });
                                    }
                                    let newId = validCourse.filter(x=> String(x.course_id).includes(`${course_id}`));
                                    let idSub = couserId.length===0?newId.length===0?`${course_id}`:`${course_id}${newId.length}`:`${couser_id}${(couserId.length)+(newId.length)}`;
                                    validCourse.push({ ...element, course_id: idSub, discipline_code: disCFind.discipline_id, program_code: proFinds.program_id, org_id: orgId._id });
                                }
                            } else if(isNull(proFinds) && !isNull(val1)){
                                let errCDU, couserId;
                                let removeSpl = String(`${data.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                                let course_id = `${String(removeSpl).substring(0,3).toUpperCase()}${String(orgId.org_id).substring(3,String(orgId.org_id).length)}`;
                                [errCDU, couserId] = await to(course.findAll({ where: { course_id: { [Op.iLike]: `${course_id}%` }}}));
                                if(isNull(errCDU) || isEmpty(errCDU)){
                                  invalidCourse.push({ ...element, message: errCDU, success: false });
                                }
                                if(isNull(couserId)){
                                  invalidCourse.push({ ...element, message: 'Something went wrong', success: false });
                                }
                                let newId = validCourse.filter(x=> String(x.course_id).includes(`${course_id}`));
                                let idSub = couserId.length===0?newId.length===0?`${course_id}`:`${couser_id}${newId.length}`:`${couser_id}${(couserId.length)+(newId.length)}`;
                                validCourse.push({ ...element, course_id: idSub, discipline_code: disCFind.discipline_id, program_code: val1.program_id, org_id: orgId._id });
                            }else{
                                invalidCourse.push({ ...element, message: 'Program not found', success: false });
                            }
                        }else if(isNull(disCFind) && !isNull(val)){
                            if(isNull(val1)){
                                invalidCourse.push({ ...element, message: 'Program not found', success: false });
                            }else{
                                let errCDU, couserId;
                                let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                                let course_id = `${String(removeSpl).substring(0,3).toUpperCase()}${String(orgId.org_id).substring(3,String(orgId.org_id).length)}`;
                                [errCDU, couserId] = await to(course.findAll({ where: { course_id: { [Op.iLike]: `${course_id}%` }}}));
                                if(isNull(errCDU) || isEmpty(errCDU)){
                                  invalidCourse.push({ ...element, message: errCDU, success: false });
                                }
                                if(isNull(couserId)){
                                  invalidCourse.push({ ...element, message: 'Something went wrong', success: false });
                                }
                                let newId = validCourse.filter(x=> String(x.course_id).includes(`${course_id}`));
                                let idSub = couserId.length===0?newId.length===0?`${course_id}`:`${course_id}${newId.length}`:`${course_id}${(couserId.length)+(newId.length)}`;
                                validCourse.push({ ...element, course_id: idSub, discipline_code: val.discipline_id, program_code: val1.program_id, org_id: orgId._id });
                            }
                        }else{
                            invalidCourse.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    if(!isNull(body.Department)){
        if(Array.isArray(body.Department) && body.Department.length > 0){
            for (let index = 0; index < body.Department.length; index++) {
                const element = body.Department[index];
                let duplicate = validDepartment.filter(q=> q.name === element.name && q.discipline === element.discipline);
                if(duplicate.length>0){
                    invalidDepartment.push({ ...element, message: 'Duplicate Department', success: false })
                }else{
                    const validation = await validator('department', 'create', element);
                    if(validation){
                        invalidDepartment.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disDFind
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        [errD, disDFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: orgId._id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidDepartment.push({ ...element, message: errD, success: false });
                        }else if(!isNull(disDFind)){
                            let errD, depFind;
                            [errD, depFind] = await to(department.findOne({ where: { name: element.name, org_id: orgId._id, discipline_id: disDFind._id, is_active: true, is_block: false } }));
                            if(isNull(errD) || isEmpty(errD)){
                                invalidDepartment.push({ ...element, message: errD, success: false });
                            }
                            else if(!isNull(depFind)){
                                invalidDepartment.push({ ...element, message: 'Department already already exist',success: false });
                            }
                            else{
                                let err, departmentId;
                                let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                                let department_Id = `${String(removeSpl).replace(" ", "").substring(0, 3).toUpperCase()}${String(orgId.org_id).substring(3, String(orgId.org_id).length)}`;
                                [err, departmentId] = await to(department.findAll({ where: { department_id: { [Op.iLike]: `${department_Id}%` } } }));
                                if (err) {
                                    invalidDepartment.push({ ...element, message: err, success: false });
                                }
                                else if (isNull(departmentId) && !Array.isArray(departmentId)) {
                                    invalidDepartment.push({ ...element, message: 'Something went wrong', success: false });
                                }else{
                                    let newId = validDepartment.filter(x=> String(x.department_id).includes(`${department_Id}`))
                                    let idSub = departmentId?.length===0?newId.length===0?`${department_Id}`:`${department_Id}${newId.length}`:`${department_Id}${(departmentId.length)+(newId.length)}`;
                                    validDepartment.push({ ...element, department_id: idSub, discipline_code: disDFind.discipline_id, org_id: orgId._id });
                                }
                            }
                        } else if(isNull(disDFind) && !isNull(val)){
                            let err, departmentId;
                            let removeSpl = String(`${element.name}`).replace(/[`~!@#$%^&*()_|+\-=?;:'",.< >\{\}\[\]\\\/]/gi, "");
                            let department_Id = `${String(removeSpl).replace(" ", "").substring(0, 3).toUpperCase()}${String(val.discipline_id).substring(3, String(val.discipline_id).length)}`;
                            [err, departmentId] = await to(department.findAll({ where: { department_id: { [Op.iLike]: `${department_Id}%` } } }));
                            if (err) {
                                invalidDepartment.push({ ...element, message: err, success: false });
                            }
                            else if (!departmentId && !Array.isArray(departmentId)) {
                                invalidDepartment.push({ ...element, message: 'Something went wrong', success: false });
                            }
                            else{
                                let newId = validDepartment.filter(x=> String(x.department_id).includes(`${department_Id}`));
                                let idSub = departmentId?.length===0?newId.length===0?`${department_Id}`:`${department_Id}${newId.length}`:`${department_Id}${(departmentId.length)+(newId.length)}`;
                                validDepartment.push({ ...element, department_id: idSub, discipline_code: val.discipline_id, org_id: orgId._id });
                            }
                        } else {
                            invalidDepartment.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    let validSubject = [], invalidSubject = [];
    if(!isNull(body.Subject)){
        if(Array.isArray(body.Subject) && body.Subject.length > 0){
            for (let index = 0; index < body.Subject.length; index++) {
                const element = body.Subject[index];
                let duplicate = validSubject.filter(q=> q.discipline === element.discipline && q.department === element.department && ( q.code === element.code || q.name === element.name ));
                if(duplicate.length>0){
                    invalidSubject.push({ ...element, message: 'Duplicate Subject', success: false });
                }else{
                    const validation = validator("subject", "create", element);
                    if (validation) {
                        invalidSubject.push({ ...element, message: validation.message, success: false});
                    }else{
                        let errD, disciplines;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validDepartment.find(y=> y.name === element.department && y.discipline === element.discipline);
                        [ errD, disciplines] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidSubject.push({ ...element, message: errD, success: false });
                        } else if(!isNull(disciplines)){
                            let errDE, depFind;
                            [errDE, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disciplines._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errDE) || isEmpty(errDE)){
                                invalidSubject.push({ ...element, message: errDE, success: false });
                            }
                            else if(!isNull(depFind)){
                                let errS, subFind;
                                [errS, subFind] = await to(subject.findOne({ where: { name: element.name, department_id: depFind._id, discipline_id: discipline._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errS) || isEmpty(errS)){
                                    invalidSubject.push({ ...element, message: errS, success: false });
                                }
                                else if(!isNull(subFind)){
                                    invalidSubject.push({ ...element, message: 'Subject not found', success: false });
                                }else{
                                    let errSID, subjectId;
                                    [errSID, subjectId] = await to(subject.findOne({ where: { code: element.code, org_id: body.org_id, is_active: true, is_block: false } }));
                                    if(isNull(errSID) || isEmpty(errSID)){
                                        invalidSubject.push({ ...element, message: errSID, success: false });
                                    } else if(!isNull(subjectId)){
                                        invalidSubject.push({ ...element, message: 'Subject code already exist', success: false });
                                    } else {
                                        validSubject.push({ ...element });
                                    }
                                }
                            } else if(isNull(depFind) && !isNull(val1)){
                                let errSID, subjectId;
                                [errSID, subjectId] = await to(subject.findOne({ where: { code: element.code, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errSID) || isEmpty(errSID)){
                                    invalidSubject.push({ ...element, message: errSID, success: false });
                                } else if(!isNull(subjectId)){
                                    invalidSubject.push({ ...element, message: 'Subject code already exist', success: false });
                                } else {
                                    validSubject.push({ ...element });
                                }
                            }else{
                                invalidSubject.push({ ...element, message: 'Department not found', success: false });
                            }
                        } else if(isNull(disciplines) && !isNull(val)){
                            if(!isNull(val1)){
                                let errSID, subjectId;
                                [errSID, subjectId] = await to(subject.findOne({ where: { code: element.code, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errSID) || isEmpty(errSID)){
                                    invalidSubject.push({ ...element, message: errSID, success: false });
                                } else if(!isNull(subjectId)){
                                    invalidSubject.push({ ...element, message: 'Subject code already exist', success: false });
                                 } else {
                                    validSubject.push({ ...element });
                                }
                            }else{
                                invalidSubject.push({ ...element, message: 'Department not found', success: false });
                            }
                        }else{
                            invalidSubject.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    let validTopic = [], invalidTopic = [];
    if(!isNull(body.Topic)){
        if(Array.isArray(body.Topic) && body.Topic.length>0){
            for (let index = 0; index < body.Topic.length; index++) {
                const element = body.Topic[index];
                let duplicate = validTopic.filter(q=> q.name === element.name && q.discipline === element.discipline && q.department === element.department && (q.subject === q.subject || q.subject_code === element.subject_code));
                if(duplicate.length>0){
                    invalidTopic.push({ ...element, message: 'Duplicate Topic', success: false });
                }else{
                    let finalVal = {};
                    const validation = validator("topic", "create", element);
                    if(validation){
                        invalidTopic.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disFind;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validDepartment.find(y=> y.name === element.department && y.discipline === element.discipline);
                        let val2 = validSubject.find(z=> z.name === element.subject && z.department === element.department && z.discipline === element.discipline);
                        [errD, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidTopic.push({ ...element, message: err, success: false });
                        } else if(!isNull(disFind)){
                            let errDE, depFind;
                            [errDE, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errDE) || isEmpty(errDE)){
                                invalidTopic.push({ ...element, message: errDE, success: false });
                            }else if(!isNull(depFind)){
                                let errS, subFind;
                                [errS, subFind] = await to(subject.findOne({ where: { name: element.subject, code: element.subject_code, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errS) || isEmpty(errS)){
                                    invalidTopic.push({ ...element, message: 'Subject not found', success: false });
                                } else if (!isNull(subFind)){
                                    let errT, topFind;
                                    [errT, topFind] = await to(topic.findOne({ where: { name: element.name, code: element.subject_code, subject_id: subFind._id, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                    if(isNull(errT) || isEmpty(errT)){
                                        invalidTopic.push({ ...element, message: errT, success: false });
                                    } else if (!isNull(topFind)){
                                        invalidTopic.push({ ...element, message: 'Topic already exist', success:  false })
                                    } else{
                                        finalVal = element;
                                    }
                                } else if (isNull(subFind) && !isNull(val2)){
                                    finalVal = element;
                                } else {
                                    invalidTopic.push({ ...element, message: 'Topic not found', success: false });
                                }
                            } else if (isNull(depFind) && !isNull(val1)){
                                if(!isNull(val2)){
                                    finalVal = element;
                                }else{
                                    invalidTopic.push({ ...element, message: 'Subject not found', success: false });
                                }
                            } else {
                                invalidTopic.push({ ...element, message: 'Department not found', success: false });
                            }
                        } else if(isNull(disFind) && !isNull(val)) {
                            if(!isNull(val1)){
                                if(isNull(val2)){
                                    invalidTopic.push({ ...element, message: 'Subject not found', success: false });
                                }else{
                                    finalVal = element;
                                }
                            }else{
                                invalidTopic.push({ ...element, message: 'Department not found', success: false });
                            }
                        } else {
                            invalidTopic.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                    if(finalVal.name){
                        let errTo, findTop;
                        [errTo, findTop] = await to(topic.findAll({ where: { code: { [Op.iLike]: `${finalVal.subject_code}%` }, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errTo) || isEmpty(errTo)){
                            invalidTopic.push({ ...finalVal, message: errTo, success: false});
                        } else if(isNull(findTop)){
                            invalidTopic.push({ ...finalVal, message: 'Something went wrong', success: false});
                        }else{
                            finalVal.code = `${finalVal.subject_code}-${findTop.length}`;
                            validTopic.push({ ...finalVal });
                        }
                    }
                }
            }
        }
    }
    let validSubTopic = [], invalidSubTopic = [];
    if(!isNull(body.Subtopic)){
        if(Array.isArray(body.Subtopic) && body.Subtopic.length>0){
            for (let index = 0; index < body.Subtopic.length; index++) {
                const element = body.Subtopic[index];
                let duplicate = validSubTopic.filter(q=> q.name === element.name && q.topic === element.topic && q.discipline === element.discipline && q.department === element.department && (q.subject === element.subject || q.subject_code === element.subject_code))
                if(duplicate.length > 0){
                    invalidSubTopic.push({ ...element, message: 'Duplicate Sutopic', success: false });
                }else{
                    let finalVal = {};
                    const validation = validator("sub_topic", "create", element);
                    if(validation){
                        invalidSubTopic.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disFind;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validDepartment.find(y=> y.name === element.department && y.discipline === element.discipline);
                        let val2 = validSubject.find(z=> z.name === element.subject && z.department === element.department && z.discipline === element.discipline);
                        let val3 = validTopic.find(z=> z.name === element.topic && z.subject === element.subject && z.department === element.department && z.discipline === element.discipline);
                        [errD, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidSubTopic.push({ ...element, message: err, success: false });
                        } else if(!isNull(disFind)){
                            let errDE, depFind;
                            [errDE, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errDE) || isEmpty(errDE)){
                                invalidSubTopic.push({ ...element, message: errDE, success: false });
                            }else if(!isNull(depFind)){
                                let errS, subFind;
                                [errS, subFind] = await to(subject.findOne({ where: { name: element.subject, code: element.subject_code, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errS) || isEmpty(errS)){
                                    invalidSubTopic.push({ ...element, message: 'Subject not found', success: false });
                                } else if (!isNull(subFind)){
                                    let errT, topFind;
                                    [errT, topFind] = await to(topic.findOne({ where: { name: element.topic, subject_code: element.subject_code, subject_id: subFind._id, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                    if(isNull(errT) || isEmpty(errT)){
                                        invalidSubTopic.push({ ...element, message: errT, success: false });
                                    } else if (!isNull(topFind)){
                                        let errST, stFind;
                                        [errST, stFind] = await to(sub_topic.findOne({ where: { name: element.name, subject_id: subFind._id, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                        if(isNull(errST) || isEmpty(errST)){
                                            invalidSubTopic.push({ ...element, message: errST, success: false });
                                        }else if(!isNull(stFind)){
                                            invalidSubTopic.push({ ...element, message: 'Suptopic already exist', success: false });
                                        }else{
                                            finalVal = { ...element, topic_code: topFind.code };
                                        }
                                    } else if (isNull(topFind) && !isNull(val3)){
                                        finalVal = { ...element, code: val3.code };
                                    }else{
                                        invalidSubTopic.push({ ...element, message: 'Topic not found1', success: false })
                                    }
                                } else if (isNull(subFind) || !isNull(val2)){
                                    if(!isNull(val3)){
                                        finalVal = { ...element, topic_code: val3.code };;
                                    }else{
                                        invalidSubTopic.push({ ...element, message: 'Topic not found2', success: false });
                                    }
                                } else {
                                    invalidSubTopic.push({ ...element, message: 'Subject not found', success: false });
                                }
                            } else if (isNull(depFind) || !isNull(val1)){
                                if(!isNull(val2)){
                                    if(!isNull(val3)){
                                        finalVal = { ...element, topic_code: val3.code };
                                    }else{
                                        invalidSubTopic.push({ ...element, message: 'Topic not found', success: false });
                                    }
                                }else{
                                    invalidSubTopic.push({ ...element, message: 'Subject not found', success: false });
                                }
                            } else {
                                invalidSubTopic.push({ ...element, message: 'Department not found', success: false });
                            }
                        } else if(isNull(disFind) && !isNull(val)) {
                            if(!isNull(val1)){
                                if(!isNull(val2)){
                                    if(!isNull(val3)){
                                        finalVal = { ...element, topic_code: val3.code };;
                                    }else{
                                        invalidSubTopic.push({ ...element, message: 'Topic not found', success: false });
                                    }
                                }else{
                                    invalidSubTopic.push({ ...element, message: 'Subject not found', success: false });
                                }
                            }else{
                                invalidSubTopic.push({ ...element, message: 'Department not found', success: false });
                            }
                        } else {
                            invalidSubTopic.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                    if(finalVal.name){
                        let errTo, findTop;
                        [errTo, findTop] = await to(sub_topic.findAll({ where: { code: { [Op.iLike]: `${finalVal.topic_code}%` }, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errTo) || isEmpty(errTo)){
                            invalidSubTopic.push({ ...finalVal, message: 'Something went wrong', success: false});
                        }
                        finalVal.code = `${finalVal.topic_code}-${findTop.length}`;
                        validSubTopic.push({ ...finalVal });
                    }
                }
            }
        }
    }
    let validTimeframe = [], invalidTimeframe = [];
    if(!isNull(body.Timeframe)){
        if(Array.isArray(body.Timeframe) && body.Timeframe.length>0){
            for (let index = 0; index < body.Timeframe.length; index++) {
                let element = body.Timeframe[index];
                let duplicate = validTimeframe.filter(q=> q.period === element.period && q.discipline === element.discipline && q.program === element.program);
                if(duplicate.length>0){
                    invalidTimeframe.push({ ...element, message: 'Duplicate time frame', success: false });
                }else{
                    element.period = String(element.period);
                    element.session_start_time = String(element.session_start_time).replace('"','').replace('"','');
                    element.session_end_time = String(element.session_end_time).replace('"','').replace('"','');
                    const validation = validator("time_frame", "create", element);
                    if(validation){
                        invalidTimeframe.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disFind;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validProgram.find(y=> y.name === element.program && y.discipline === element.discipline);
                        [errD, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidTimeframe.push({ ...element, message: errD, success: false });
                        }else if(!isNull(disFind)){
                            let errP, proFind;
                            [errP, proFind] = await to(program.findOne({ where: { name: element.program, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errP) || isEmpty(errP)){
                                invalidTimeframe.push({ ...element, message: errP, success: false });
                            }else if(!isNull(proFind)){
                                let errT, timeFind;
                                [errT, timeFind] = await to(time_frame.findOne({ where: { period: element.period, program_id: proFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errT) || isEmpty(errT)){
                                    invalidTimeframe.push({ ...element, message: errT, success: false });
                                } else if (!isNull(timeFind)){
                                    invalidTimeframe.push({ ...element, message: 'Time Frame period already exist', success: false });
                                } else {
                                    let errET, allFrame;
                                    let comFrame = [ ...body.Timeframe ];
                                    [errET, allFrame] = await to(time_frame.findAll({ where: { org_id: body.org_id, discipline_id: disFind._id, program_id: proFind._id } }));
                                    if(isNull(errET) || isEmpty(errET)){
                                        invalidTimeframe.push({ ...element, message: errET, success: false });
                                    }
                                    if(!isNull(allFrame) || Array.isArray(allFrame)){
                                        comFrame = [ ...comFrame, ...allFrame ];
                                    }
                                    let s1Date = new Date(`${todays()} ${element.session_start_time}`).getTime();
                                    let e1Date = new Date(`${todays()} ${element.session_end_time}`).getTime();
                                    let Invalid = comFrame.filter(x=>{
                                        let sDate = new Date(`${todays()} ${x.session_start_time}`).getTime();
                                        let eDate = new Date(`${todays()} ${x.session_end_time}`).getTime();
                                        return ((((s1Date>=sDate) && (s1Date<=eDate)))||(((e1Date>=sDate) && (e1Date<=eDate))));
                                    })
                                    if(Invalid.length>1){
                                        invalidTimeframe.push({ ...element, message: 'Session already exist on this time', success: false });
                                    }else{
                                        validTimeframe.push({ ...element });
                                    }
                                }
                            } else if(isNull(proFind) && !isNull(val1)){
                                validTimeframe.push({ ...element });
                            }else{
                                invalidTimeframe.push({ ...element, message: 'Program not found', success: false });
                            }
                        }else if(isNull(disFind) || !isNull(val)){
                            validTimeframe.push({ ...element });
                        }else{
                            invalidTimeframe.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    let invalidCourseMapping = [], validCourseMapping =[];
    if(!isNull(body.CourseMapping)){
        if(Array.isArray(body.CourseMapping) && body.CourseMapping.length > 0){
            for (let index = 0; index < body.CourseMapping.length; index++) {
                const element = body.CourseMapping[index];
                let duplicate = validCourseMapping.filter(q=> q.discipline === element.discipline && q.department === element.department && q.program === element.program && q.course === element.course);
                if(duplicate.length>0){
                    invalidCourseMapping.push({ ...element, message: 'Duplicate Course Mapping', success: false });
                }else{
                    const validation = validator("", "create", element);
                    if(validation){
                        invalidCourseMapping.push({ ...element, message: validation.message, success: false });
                    }else{
                        let errD, disFind;
                        let val = validDiscipline.find(x=> x.name === element.discipline);
                        let val1 = validProgram.find(y=> y.name === element.program && y.discipline === element.discipline);
                        let val2 = validCourse.find(w=> w.name === element.course && w.program === element.program && w.discipline === element.discipline);
                        let val3 = validDepartment.find(z=> z.name === element.department && z.discipline === element.discipline);
                        [errD, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errD) || isEmpty(errD)){
                            invalidCourseMapping.push({ ...element, message: errD, success: false });
                        }else if(!isNull(disFind)){
                            let errP, proFind;
                            [errP, proFind] = await to(program.findOne({ where: { name: element.program, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errP) || isEmpty(errP)){
                                invalidCourseMapping.push({ ...element, message: errP, success: false });
                            }else if(!isNull(proFind)){
                                let errC, couFind;
                                [errC, couFind] = await to(course.findOne({ where: { name: element.course, program_id: proFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errC) || isEmpty(errC)){
                                    invalidCourseMapping.push({ ...element, message: errC, success: false });
                                }else if(!isNull(couFind)){
                                    let errD, depFind;
                                    [errD, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                    if(isNull(errD) || isEmpty(errD)){
                                        invalidCourseMapping.push({ ...element, message: errD, success: false });
                                    }else if(!isNull(depFind)){
                                        let errCD, couDepFind;
                                        [errCD, couDepFind] = await to(course_department_mapping.findOne({ where: { department_id: depFind._id, course_id: couFind._id, program_id: proFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                        if(isNull(errCD) || isEmpty(errCD)){
                                            invalidCourseMapping.push({ ...element, message: errCD, success: false });
                                        }else if(!isNull(couDepFind)){
                                            invalidCourseMapping.push({ ...element, message: 'Course and Department already mapped', success: false });
                                        }else if(isNull(couDepFind)){
                                            validCourseMapping.push({ ...element, name: `${element.course}-${element.department}` });
                                        }
                                    }else if(isNull(depFind) && !isNull(val3)){
                                        validCourseMapping.push({ ...element, name: `${element.course}-${element.department}` });
                                    }else{
                                        invalidCourseMapping.push({ ...element, message: 'Department not found', success: false });
                                    }
                                }else if(isNull(couFind) && !isNull(val2)){
                                    if(isNull(val3)){
                                        invalidCourseMapping.push({ ...element, message: 'Department not found', success: false })
                                    }else{
                                        validCourseMapping.push({ ...element, name: `${element.course}-${element.department}` });
                                    }
                                } else {
                                    invalidCourseMapping.push({ ...element, message: 'Course not found', success: false });
                                }
                            }else if(isNull(proFind) && !isNull(val1)){
                                if(isNull(val2)){
                                    invalidCourseMapping.push({ ...element, message: 'Course not found', success: false })
                                }else{
                                    if(isNull(val3)){
                                        invalidCourseMapping.push({ ...element, message: 'Department not found', success: false })
                                    }else{
                                        validCourseMapping.push({ ...element, name: `${element.course}-${element.department}` });
                                    }
                                }
                            }else{
                                invalidCourseMapping.push({ ...element, message: 'Program not found', success: false });
                            }
                        }else if(isNull(disFind) && !isNull(val)){
                            if(isNull(val1)){
                                invalidCourseMapping.push({ ...element, message: 'Program not found', success: false })
                            }else{
                                if(isNull(val2)){
                                    invalidCourseMapping.push({ ...element, message: 'Course not found', success: false })
                                }else{
                                    if(isNull(val3)){
                                        invalidCourseMapping.push({ ...element, message: 'Department not found', success: false })
                                    }else{
                                        validCourseMapping.push({ ...element, name: `${element.course}-${element.department}` });
                                    }
                                }
                            }
                        }else{
                            invalidCourseMapping.push({ ...element, message: 'Discipline not found', success: false });
                        }
                    }
                }
            }
        }
    }
    let invalidSubjectMapping = [], validSubjectMapping =[];
    if(!isNull(body.SubjectMapping)){
        if(Array.isArray(body.SubjectMapping) && body.SubjectMapping.length>0){
            for (let index = 0; index < body.SubjectMapping.length; index++) {
                const element = body.SubjectMapping[index];
                let duplicate = validSubjectMapping.filter(q=> q.discipline === element.discipline && q.program === element.program && q.course === element.course && q.department === element.department && q.subject_department === element.subject_department && q.subject === element.subject);
                if(duplicate.length>0){
                    invalidSubjectMapping.push({ ...element, message: 'Duplicate Subject mapping', success: false })
                }else{
                    element.sem = String(element.sem);
                let validation = validator("subject_mapping","create", element)
                if(validation){
                    invalidSubjectMapping.push({ ...element, message: validation.message, success: false });
                }else{
                    let errD, disFind;
                    let val = validDiscipline.find(x=> x.name === element.discipline);
                    let val1 = validProgram.find(y=> y.name === element.program && y.discipline === element.discipline);
                    let val2 = validCourse.find(w=> w.name === element.course && w.program === element.program && w.discipline === element.discipline);
                    let val3 = validDepartment.find(z=> z.name === element.department && z.discipline === element.discipline);
                    let val4 = validCourseMapping.find(v => v.department === element.department && v.course === element.course && v.program === element.program && v.discipline === element.discipline)
                    let val5 = validDepartment.find(u=> u.name === element.subject_department && u.discipline === element.discipline);
                    let val6 = validSubject.find(t=> t.name === element.subject && t.department === element.subject_department && t.discipline === element.discipline);
                    [errD, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
                    if(isNull(errD) || isEmpty(errD)){
                        invalidSubjectMapping.push({ ...element, message: errD, success: false });
                    }
                    else if(!isNull(disFind)){
                        let errP, proFind;
                        [errP, proFind] = await to(program.findOne({ where: { name: element.program, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errP) || isEmpty(errP)){
                            invalidSubjectMapping.push({ ...element, message: errP, success: false });
                        }else if(!isNull(proFind)){
                            let errC, couFind;
                            [errC, couFind] = await to(course.findOne({ where: { name: element.course, program_id: proFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                            if(isNull(errC) || isEmpty(errC)){
                                invalidSubjectMapping.push({ ...element, message: 'Course not found', success: false });
                            } else if( !isNull(couFind) ){
                                let errDe, depFind;
                                [errDe, depFind] = await to(department.findOne({ where: { name:  element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                if(isNull(errDe) || isEmpty(errDe)){
                                    invalidSubjectMapping.push({ ...element, message: errDe, success: false });
                                }else if(!isNull(depFind)){
                                    let errCdm, cdmFind;
                                    [errCdm, cdmFind] = await to(course_department_mapping.findOne({ where: { department_id: depFind._id, course_id: couFind._id, program_id: proFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                                    if(isNull(errCdm) || isEmpty(errCdm)){
                                        invalidSubjectMapping.push({ ...element, message: errCdm, success: false });
                                    } else if(!isNull(cdmFind)){
                                        let errSD, subDepFind;
                                        [errSD, subDepFind] = await to(department.findOne({ where: { name: element.subject_department, discipline_id: disFind._id, org_id: body.org_id, is_acitve: true, is_block: false } }));
                                        if(isNull(errSD) || isEmpty(errSD)){
                                            invalidSubjectMapping.push({ ...element, message: errSD, success: false });
                                        }else if(!isNull(subDepFind)){
                                            let errSub, subFind;
                                            [errSub, subFind] = await to(subject.findOne({ where: { name: element.subject, department_id: subDepFind._id, discipline_id: disFind._id, org_id: body.org_id, is_acitve: true, is_block: false } }));
                                            if(isNull(errSub) || isEmpty(errSub)){
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false });
                                            }else if(!isNull(subFind)){
                                                if(parseInt(element.sem) <= (couFind.total_year*2)){
                                                    let semCount = (parseInt(data.sem)%2)===0?2:1;
                                                    let yearCount = Math.floor(parseInt(data.sem)/2);
                                                    let errE, findExist;
                                                    [errE, findExist] = await to(subject_mapping.findOne({ year: yearCount, semester: semCount, cdm_id: cdmFind._id, subject_id: subFind._id, sub_department_id: subDepFind._id, org_id: body.org_id, discipline_id: disFind._id, program_id: proFind._id, department_id: depFind._id, course_id: couFind._id, is_active: true, is_block: false }));
                                                    if(isNull(errE) || isEmpty(errE)){
                                                        invalidSubjectMapping.push({ ...element, message: errE, success: false });
                                                    } else if(!isNull(findExist)){
                                                        invalidSubjectMapping.push({ ...element, message: 'Subject mapping not found', success: false});
                                                    } else {
                                                        validSubjectMapping.push({ ...element });
                                                    }
                                                }else{
                                                    invalidSubjectMapping.push({ ...element, message: 'Invalid semester', success: false })
                                                }
                                            }else if(isNull(subFind) && !isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else if(isNull(subDepFind) && !isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else if(isNull(cdmFind) && !isNull(val4)){
                                        if(!isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else{
                                        invalidSubjectMapping.push({ ...element, message: 'Course mapping not found', success: false })
                                    }
                                }else if(isNull(depFind) && !isNull(val3)){
                                    if(!isNull(val4)){
                                        if(!isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else{
                                        invalidSubjectMapping.push({ ...element, message: 'Course mapping not found', success: false })
                                    }
                                }else{
                                    invalidSubjectMapping.push({ ...element, message: 'Department not found', success: false })
                                }
                            } else if( isNull(couFind) && !isNull(val2) ){
                                if(!isNull(val3)){
                                    if(!isNull(val4)){
                                        if(!isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else{
                                        invalidSubjectMapping.push({ ...element, message: 'Course mapping not found', success: false })
                                    }
                                }else{
                                    invalidSubjectMapping.push({ ...element, message: 'Department not found', success: false })
                                }
                            }else{
                                invalidSubjectMapping.push({ ...element, message: 'Course not found', success: false });
                            }
                        }else if(isNull(proFind) && !isNull(val1)){
                            if(!isNull(val2) ){
                                if(!isNull(val3)){
                                    if(!isNull(val4)){
                                        if(!isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else{
                                        invalidSubjectMapping.push({ ...element, message: 'Course mapping not found', success: false })
                                    }
                                }else{
                                    invalidSubjectMapping.push({ ...element, message: 'Department not found', success: false })
                                }
                            }else{
                                invalidSubjectMapping.push({ ...element, message: 'Course not found', success: false });
                            }
                        }else{
                            invalidSubjectMapping.push({ ...element, message: 'Program not found', success: false })
                        }
                    } else if(isNull(disFind) && !isNull(val)){
                        if(!isNull(val1)){
                            if(!isNull(val2) ){
                                if(!isNull(val3)){
                                    if(!isNull(val4)){
                                        if(!isNull(val5)){
                                            if(!isNull(val6)){
                                                validSubjectMapping.push({ ...element });
                                            }else{
                                                invalidSubjectMapping.push({ ...element, message: 'Subject not found', success: false })
                                            }
                                        }else{
                                            invalidSubjectMapping.push({ ...element, message: 'Subject department not found', success: false });
                                        }
                                    }else{
                                        invalidSubjectMapping.push({ ...element, message: 'Course mapping not found', success: false })
                                    }
                                }else{
                                    invalidSubjectMapping.push({ ...element, message: 'Department not found', success: false })
                                }
                            }else{
                                invalidSubjectMapping.push({ ...element, message: 'Course not found', success: false });
                            }
                        }else{
                            invalidSubjectMapping.push({ ...element, message: 'Program not found', success: false })
                        }
                    }else{
                        invalidCourseMapping.push({ ...element, message: 'Discipline not found', success: false });
                    }
                }
                }
            }
        }
    }
    return ReS(res, { 
        message: 'validation ended',
        Discipline: validDiscipline,
        invalidDiscipline: invalidDiscipline,
        Program: validProgram,
        invalidProgram: invalidProgram,
        Course: validCourse,
        invalidCourse: invalidCourse,
        Department: validDepartment,
        invalidDepartment: invalidDepartment,
        Subject: validSubject,
        invalidSubject: invalidSubject,
        Topic: validTopic,
        invalidTopic: invalidTopic,
        Subtopic: validSubTopic,
        invalidSubtopic: invalidSubTopic,
        Timeframe: validTimeframe,
        invalidTimeframe: invalidTimeframe,
        CourseMapping: validCourseMapping,
        invalidCourseMapping: invalidCourseMapping,
        SubjectMapping: validSubjectMapping,
        invalidSubjectMapping: invalidSubjectMapping
    }, OK);
};

exports.bulkUpload = async(req,res) => {
    let errO, orgId;
    const body = req.body;
    const user = req.user;
    if(isNull(body.org_id) || typeof body.org_id !== "string"){
        return ReE(res, { message: 'Organization id must be a string' }, BAD_REQUEST);
    }
    [errO, orgId] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
    if(isNull(errO) || isEmpty(errO)){
        return ReE(res, errO, INTERNAL_SERVER_ERROR);
    }
    if(isNull(orgId)){
        return ReE(res, { message: 'Organization not found' }, BAD_REQUEST);
    }
    if(!isNull(body.Discipline) && Array.isArray(body.Discipline) && body.Discipline.length !== 0){
        let err, disUpload;
        let writeData = body.Discipline.filter(x=> {
            x.org_id = body.org_id;
            x.is_active = true;
            x.is_block = false;
            x.createdby = user._id;
            return true;
        });
        [err, disUpload] = await to(discipline.bulkCreate([...writeData]));
        if(isNull(err) || isEmpty(err)){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(disUpload)){
            return ReE(res, { message: 'Discipline upload failed' }, BAD_REQUEST)
        }
    }
    let programData = [], errorProgram =[];
    if(!isNull(body.Program) && Array.isArray(body.Program) && body.Program.length !== 0){
        for (let index = 0; index < body.Program.length; index++) {
            const element = body.Program[index];
            let errP, disFind;
            [errP, disFind] = await to(discipline.findOne({ where: { discipline_id: element.discipline_code, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errP) || isEmpty(errP)){
                errorProgram.push({ ...element, message:errP, success: false })
            }
            else if(isNull(disFind)){
                errorProgram.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                programData.push({ ...element, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
            }
        }
    }
    if(programData.length > 0){
        let errPD, programUpload;
        [errPD, programUpload] = await to(program.bulkCreate([ ...programData ]));
        if(isNull(errPD) || isEmpty(errPD)){
            return ReE(res, errPD, INTERNAL_SERVER_ERROR);
        }
        if(isNull(programUpload)){
            return ReE(res, { message: 'Program upload failed' }, BAD_REQUEST)
        }
    }
    let courseData = [], errorCourse = [];
    if(!isNull(body.Course) && Array.isArray(body.Course) && body.Course.length !== 0){
        for (let index = 0; index < body.Course.length; index++) {
            const element = body.Course[index];
            let errC, proFind;
            [errC, proFind] = await to(program.findOne({ where: { program_id: element.program_code, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errC) || isEmpty(errC)){
                errorCourse.push({ ...element, message: errC, success: false });
            }
            else if(isNull(proFind)){
                errorCourse.push({ ...element, message: 'Program not found', success: false });
            }else{
                delete element.program;
                delete element.discipline;
                delete element.discipline_code;
                delete element.program_code;
                courseData.push({ ...element, program_id: proFind._id, discipline_id: proFind.discipline_id, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
            }
        }
    }
    if(courseData.length>0){
        let errCD, courseUpload;
        [errCD, courseUpload] = await to(course.bulkCreate([ ...courseData ]));
        if(isNull(errCD) || isEmpty(errCD)){
            return ReE(res, errCD, INTERNAL_SERVER_ERROR);
        }
        if(isNull(courseUpload)){
            return ReE(res, { message: 'Course upload failed' }, BAD_REQUEST);
        }
    }
    let departmentData = [], errorDepartment = [];
    if(!isNull(body.Department) && Array.isArray(body.Department) && body.Department.length !== 0){
        for (let index = 0; index < body.Department.length; index++) {
            const element = body.Department[index];
            let errP, disFind;
            [errP, disFind] = await to(discipline.findOne({ where: { discipline_id: element.discipline_code, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errP) || isEmpty(errP)){
                console.log(1, errP);
                errorDepartment.push({ ...element, message:errP, success: false })
            }
            else if(isNull(disFind)){
                console.log(2);
                errorDepartment.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                console.log(3);
                departmentData.push({ ...element, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
            }
        }
    }
    if(departmentData.length>0){
        let errDD, departmentUpload;
        [errDD, departmentUpload] = await to(department.bulkCreate([...departmentData]));
        if(isNull(errDD) || isEmpty(errDD)){
            return ReE(res, errDD, INTERNAL_SERVER_ERROR);
        }
        if(isNull(departmentUpload)){
            return ReE(res, { message: 'Department upload failed' }, BAD_REQUEST);
        }
    }
    let subjectData = [], errorSubject = [];
    if(!isNull(body.Subject) && Array.isArray(body.Subject) && body.Subject.length !== 0 ){
        for (let index = 0; index < body.Subject.length; index++) {
            const element = body.Subject[index];
            let errS, disFind;
            [errS, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errS) || isEmpty(errS)){
                errorSubject.push({ ...element, message: errS, success: false })
            }
            else if(isNull(disFind)){
                errorSubject.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                // departmentData.push({ ...element, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
                let errP, depFind;
                [errP, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                if(isNull(errP) || isEmpty(errP)){
                    errorSubject.push({ ...element, message: errP, success: false });
                } else if(isNull(depFind)){
                    errorSubject.push({ ...element, message: 'Department not found', success: false });
                }else{
                    subjectData.push({ ...element, discipline_id: disFind._id, department_id: depFind._id, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
                }
            }
        }
    }
    if(subjectData.length>0){
        let errSU, subjectUpload;
        [errSU, subjectUpload] = await to(subject.bulkCreate([ ...subjectData ]));
        if(isNull(errSU) || isEmpty(errSU)){
            return ReE(res, errSU, INTERNAL_SERVER_ERROR);
        }
        if(isNull(subjectUpload)){
            return ReE(res, { message: 'Subject upload Failed' }, BAD_REQUEST)
        }
    }
    let topicData = [], errorTopic = [];
    if(!isNull(body.Topic) && Array.isArray(body.Topic) && body.Topic.length > 0){
        for (let index = 0; index < body.Topic.length; index++) {
            const element = body.Topic[index];
            let errDis ,disFind;
            [errDis, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errDis) || isEmpty(errDis)){
                errorTopic.push({ ...element, message: errDis, success: false });
            }else if(isNull(disFind)){
                errorTopic.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                let errDep, depFind;
                [errDep, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                if(isNull(errDep) || isEmpty(errDep)){
                    errorTopic.push({ ...element, message: errDep, success: false });
                }else if(isNull(depFind)){
                    errorTopic.push({ ...element, message: 'Department not found', success: false });
                }else{
                    let errS, subFind;
                    [errS, subFind] = await to(subject.findOne({ where:{ name: element.subject, code: element.subject_code, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                    if(isNull(errS) || isEmpty(errS)){
                        errorTopic.push({ ...element, message: errS, success: false });
                    } else if(isNull(subFind)){
                        errorTopic.push({ ...element, message: 'Subject not found', success: false });
                    } else {
                        topicData.push({ ...element, discipline_id: disFind._id, department_id: depFind._id, subject_id: subFind._id, subject_code: subFind.code, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
                    }
                }
            }
        }
    }
    if(topicData.length>0){
        let errT, topicUpload;
        [errT, topicUpload] = await to(topic.bulkCreate([ ...topicData ]));
        if(isNull(errT) || isEmpty(errT)){
            return ReE(res, errSU, INTERNAL_SERVER_ERROR);
        }
        if(isNull(topicUpload)){
            return ReE(res, { message: 'Topic upload Failed' }, BAD_REQUEST)
        }
    }
    let subtopicData = [], errorSubtopic = [];
    if(!isNull(body.Subtopic) && Array.isArray(body.Subtopic) && body.Subtopic.length > 0){
        for (let index = 0; index < body.Subtopic.length; index++) {
            const element = body.Subtopic[index];
            let errDis ,disFind;
            [errDis, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errDis) || isEmpty(errDis)){
                errorSubtopic.push({ ...element, message: errDis, success: false });
            }else if(isNull(disFind)){
                errorSubtopic.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                let errDep, depFind;
                [errDep, depFind] = await to(department.findOne({ where: { name: element.department, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                if(isNull(errDep) || isEmpty(errDep)){
                    errorSubtopic.push({ ...element, message: errDep, success: false });
                }else if(isNull(depFind)){
                    errorSubtopic.push({ ...element, message: 'Department not found', success: false });
                }else{
                    let errS, subFind;
                    [errS, subFind] = await to(subject.findOne({ where:{ name: element.subject, code: element.subject_code, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                    if(isNull(errS) || isEmpty(errS)){
                        errorSubtopic.push({ ...element, message: errS, success: false });
                    } else if(isNull(subFind)){
                        errorSubtopic.push({ ...element, message: 'Subject not found', success: false });
                    } else {
                        let errTo, topFind;
                        [errTo, topFind] = await to(topic.findOne({ where: { name: element.topic, code: element.topic_code, subject_id: subFind._id, subject_code: subFind.code, department_id: depFind._id, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                        if(isNull(errTo) || isEmpty(errTo)){
                            errorSubtopic.push({ ...element, message: errTo, success: false });
                        } else if (isNull(topFind)){
                            errorSubtopic.push({ ...element, message: 'Topic not found', success: false });
                        }else{
                            subtopicData.push({ ...element, discipline_id: disFind._id, department_id: depFind._id, subject_id: subFind._id, topic_id: topFind._id, subject_code: subFind.code, topic_code: topFind.code, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
                        }
                    }
                }
            }
        }
    }
    if(subtopicData.length>0){
        let errSu, subtopicUpload;
        [errSu, subtopicUpload] = await to(sub_topic.bulkCreate([ ...subtopicData ]));
        if(isNull(errSu) || isEmpty(errSu)){
            return ReE(res, errSu, INTERNAL_SERVER_ERROR);
        }
        if(isNull(subtopicUpload)){
            return ReE(res, { message: 'Subtopic upload failed' }, BAD_REQUEST);
        }
    }
    let timeframeData = [], errorTimeframe = [];
    if(!isNull(body.Timeframe) && Array.isArray(body.Timeframe) && body.Timeframe.length > 0){
        for (let index = 0; index < body.Timeframe.length; index++) {
            const element = body.Timeframe[index];
            let errDis ,disFind;
            [errDis, disFind] = await to(discipline.findOne({ where: { name: element.discipline, org_id: body.org_id, is_active: true, is_block: false } }));
            if(isNull(errDis) || isEmpty(errDis)){
                errorTimeframe.push({ ...element, message: errDis, success: false });
            }else if(isNull(disFind)){
                errorTimeframe.push({ ...element, message: 'Discipline not found', success: false });
            }else{
                let errP, proFind;
                [errP, proFind] = await to(program.findOne({ where: { name: element.program, discipline_id: disFind._id, org_id: body.org_id, is_active: true, is_block: false } }));
                if(isNull(errP) || isEmpty(errP)){
                    errorTimeframe.push({ ...element, message: errP, success: false });
                }else if(isNull(proFind)){
                    errorTimeframe.push({ ...element, message: 'Program not found', success: false });
                }else{
                    timeframeData.push({ ...element, discipline_id: disFind._id, program_id: proFind._id, success: false, org_id: body.org_id, is_active: true, is_block: false, createdby: user._id });
                }
            }
        }
    }
    if(timeframeData.length>0){
        let errT, timeUpload;
        [errT, timeUpload] = await to(time_frame.bulkCreate([ ...timeframeData ]));
        if(isNull(errT) || isEmpty(errT)){
            return ReE(res, errT, INTERNAL_SERVER_ERROR);
        }
        if(isNull(timeUpload)){
            return ReE(res, { message: 'Time frame upload faoled' }, BAD_REQUEST);
        }
    }
    return ReS(res, { message: 'Upload success', error: { 
        errorProgram: errorProgram,
        errorCourse: errorCourse,
        errorDepartment: errorDepartment,
        errorSubject: errorSubject,
        errorTopic: errorTopic,
        errorSubtopic: errorSubtopic,
        errorTimeframe: errorTimeframe
    } }, OK);
}

exports.bulkValidateConfig = async(req,res) => {
    let errO, orgId;
    const body = req.body;
    const user = req.user;
    if(!isNull(body.org_id)){
        if(typeof body.org_id !== "string"){
            return ReE(res, { message: 'Organization id must be a string' }, BAD_REQUEST);
        }
        [errO, orgId] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
        if(isNull(errO) || isEmpty(errO)){
            return ReE(res, errO, INTERNAL_SERVER_ERROR);
        }
        if(isNull(orgId)){
            return ReE(res, { message: 'Organization not found' }, BAD_REQUEST);
        }
    }
    let validDiscipline = [], invalidDiscipline =[], validProgram =[], invalidProgram = [], validCourse =[], invalidCourse =[], validDepartment =[], invalidDepartment =[];
    if(!isNull(body.Discipline)){
        if(Array.isArray(body.Discipline) && body.Discipline.length > 0){
            for (let index = 0; index < body.Discipline.length; index++) {
                const element = body.Discipline[index];
                if(isNull(element.name) || typeof element.name !== "string"){
                    invalidDiscipline.push({ ...element, message: 'Discipline master name must be a string', success: false });
                }
                else if(element.name.length < 3 || element.name.length > 100){
                    invalidDiscipline.push({ ...element, message: 'Discipline master name must have min 3 character or max 100 character', success: false });
                }
                else if(isNull(element.description) || typeof element.description !== "string"){
                    invalidDiscipline.push({ ...element, message: 'Discipline master description must be a string', success: false });
                }
                else if(element.description.length < 3 || element.description.length > 200){
                    invalidDiscipline.push({ ...element, message: 'Discipline master description must have min 3 character or max 200 character', success: false });
                }
                else{
                    let query = { name: element.name, org_id: null, is_active: true, is_block: false };
                    if(!isNull(body.org_id)){
                        query.org_id = { [Op.or]: [ null, body.org_id ] };
                    }
                    let err, disName;
                    [err, disName] = await to(discipline_master.findOne({ where: query }));
                    if(isNull(err) || isEmpty(err)){
                        invalidDiscipline.push({ ...element, message: err, success: false});
                    } else if(!isNull(disName)){
                        invalidDiscipline.push({ ...element, message: 'Discipline master name already exist', success: false });
                    }else{
                        validDiscipline.push({ ...element });
                    }
                }
            }
        }
    }
    if(!isNull(body.Program)){
        if(Array.isArray(body.Program) && body.Program.length > 0){
            for (let index = 0; index < body.Program.length; index++) {
                const element = body.Program[index];
                if(isNull(element.name) || typeof element.name !== "string"){
                    invalidProgram.push({ ...element, message: 'Program master name must be a string', success: false });
                }
                else if(element.name.length < 2 || element.name.length > 100){
                    invalidProgram.push({ ...element, message: 'Program master name must have min 2 character or max 100 character', success: false });
                }
                else if(isNull(element.description) || typeof element.description !== "string"){
                    invalidProgram.push({ ...element, message: 'Program master description must be a string', success: false });
                }
                else if(element.description.length < 3 || element.description.length > 200){
                    invalidProgram.push({ ...element, message: 'Program master description must have min 3 character or max 200 character', success: false });
                }
                else if (isNull(element.discipline_master) || typeof element.discipline_master !== "string") {
                    invalidProgram.push({ ...element, message: "Discipline master is must", success: false });
                }else{
                    let err, disName, proName;
                    let val = validDiscipline.find(x=> (x.name === element.discipline_master && (x.org_id === element.org_id || x.org_id === null)));
                    let query = { name: element.discipline_master, org_id: null, is_active: true, is_block:false };
                    if(!isNull(body.org_id)){
                        query.org_id = { [Op.or]: [ null, body.org_id ] };
                    }
                    [err, disName] = await to(discipline_master.findOne({ where: query }));
                    if(isNull(err) || isEmpty(err)){
                        invalidProgram.push({ ...element, message: err, success: false});
                    } else if(!isNull(disName)){
                        query.name = element.name;
                        query.discipline_master_id = disName._id;
                        [err, proName] = await to(program_master.findOne({ where: query }));
                        if(isNull(err) || isEmpty(err)){
                            invalidProgram.push({ ...element, message: err, success: false });
                        } else if(!isNull(proName)){
                            invalidProgram.push({ ...element, message: 'Program already exist', success: false });
                        }else{
                            validProgram.push({ ...element });
                        }
                    }else if(isNull(disName) && !isNull(val)){
                        validProgram.push({ ...element });
                    }else{
                        invalidProgram.push({ ...element, message: 'Disicpline not found', success: false });
                    }
                }
            }
        }
    }
    if(!isNull(body.Course)){
        if(Array.isArray(body.Course) && body.Course.length > 0){
            for (let index = 0; index < body.Course.length; index++) {
                const element = body.Course[index];
                if(isNull(element.name) || typeof element.name !== "string"){
                    invalidCourse.push({ ...element, message: 'Course master name must be a string', success: false });
                }
                else if(element.name.length < 2 || element.name.length > 100){
                    invalidCourse.push({ ...element, message: 'Course master name must have min 2 character or max 100 character', success: false });
                }
                else if(isNull(element.description) || typeof element.description !== "string"){
                    invalidCourse.push({ ...element, message: 'Course master description must be a string', success: false });
                }
                else if(element.description.length < 3 || element.description.length > 200){
                    invalidCourse.push({ ...element, message: 'Course master description must have min 3 character or max 200 character', success: false });
                }
                else if (!element.discipline_master || typeof element.discipline_master !== "string") {
                    invalidCourse.push({ ...element, message: "Discipline master is must", success: false });
                }
                else if (!element.program_master || typeof element.program_master !== "string") {
                    invalidCourse.push({ ...element, message: "Program master is must", success: false });
                }else{
                    let err, disName, proName, couName;
                    let val = validDiscipline.find(x=> (x.name === element.discipline_master && (x.org_id === element.org_id || x.org_id === null)));
                    let val1 = validDiscipline.find(x=> (x.name === element.program_master && x.discipline_master === element.discipline_master && (x.org_id === element.org_id || x.org_id === null)));
                    let query = { name: element.discipline_master, org_id: null, is_active: true, is_block:false };
                    if(!isNull(body.org_id)){
                        query.org_id = { [Op.or]: [ null, body.org_id ] };
                    }
                    [err, disName] = await to(discipline_master.findOne({ where: query }));
                    if(isNull(err) || isEmpty(err)){
                        invalidCourse.push({ ...element, message: err, success: false});
                    } else if(!isNull(disName)){
                        query.name = element.program_master;
                        query.discipline_master_id = disName._id;
                        [err, proName] = await to(program_master.findOne({ where: query }));
                        if(isNull(err) || isEmpty(err)){
                            invalidCourse.push({ ...element, message: err, success: false });
                        } else if(!isNull(proName)){
                            query.name = element.name;
                            query.discipline_master_id = proName._id;
                            [err, couName] = await to(course_master.findOne({ where: query }));
                            if(isNull(err) || isEmpty(err)){
                                invalidCourse.push({ ...element, message: err, success: false });
                            }
                            else if(!isNull(couName)){
                                invalidCourse.push({ ...element, message: 'Course master already exist', success: false });
                            }else{
                                validCourse.push({ ...element });
                            }
                        }else if(isNull(proName) && !isNull(val1)){
                            validCourse.push({ ...element });
                        }else{
                            invalidCourse.push({ ...element, message: 'Program master not found', success: false });
                        }
                    }else if(isNull(disName) && !isNull(val)){
                        if(!isNull(val1)){
                            validCourse.push({ ...element });
                        }else{
                            invalidCourse.push({ ...element, message: 'Program master not found', success: false });
                        }
                    }else{
                        invalidCourse.push({ ...element, message: 'Disicpline master not found', success: false });
                    }
                }
            }
        }
    }
    if(!isNull(body.Department)){
        if(Array.isArray(body.Department) && body.Department.length > 0){
            for (let index = 0; index < body.Department.length; index++) {
                const element = body.Department[index];
                if(isNull(element.name) || typeof element.name !== "string"){
                    invalidDepartment.push({ ...element, message: 'Department master name must be a string', success: false });
                }
                else if(element.name.length < 2 || element.name.length > 100){
                    invalidDepartment.push({ ...element, message: 'Department master name must have min 2 character or max 100 character', success: false });
                }
                else if(isNull(element.description) || typeof element.description !== "string"){
                    invalidDepartment.push({ ...element, message: 'Department master description must be a string', success: false });
                }
                else if(element.description.length < 3 || element.description.length > 200){
                    invalidDepartment.push({ ...element, message: 'Department master description must have min 3 character or max 200 character', success: false });
                }
                else if (isNull(element.discipline_master) || typeof element.discipline_master !== "string") {
                    invalidDepartment.push({ ...element, message: "Discipline master is must", success: false });
                }else{
                    let err, disName, depName;
                    let val = validDiscipline.find(x=> (x.name === element.discipline_master && (x.org_id === element.org_id || x.org_id === null)));
                    let query = { name: element.discipline_master, org_id: null, is_active: true, is_block:false };
                    if(!isNull(body.org_id)){
                        query.org_id = { [Op.or]: [ null, body.org_id ] };
                    }
                    [err, disName] = await to(discipline_master.findOne({ where: query }));
                    if(isNull(err) || isEmpty(err)){
                        invalidDepartment.push({ ...element, message: err, success: false});
                    } else if(!isNull(disName)){
                        query.name = element.name;
                        query.discipline_master_id = disName._id;
                        [err, depName] = await to(department_master.findOne({ where: query }));
                        if(isNull(err) || isEmpty(err)){
                            invalidDepartment.push({ ...element, message: err, success: false });
                        } else if(!isNull(depName)){
                            invalidDepartment.push({ ...element, message: 'Department already exist', success: false });
                        }else{
                            validDepartment.push({ ...element });
                        }
                    }else if(isNull(disName) && !isNull(val)){
                        validCourse.push({ ...element });
                    }else{
                        invalidDepartment.push({ ...element, message: 'Discipline master not found', success: false });
                    }
                }
            }
        }
    }
    return ReS(res, { 
        message: 'Validation ended',
        Discipline: validDiscipline,
        Program: validProgram,
        Course: validCourse,
        Department: validDepartment,
        invalidDiscipline: invalidDiscipline,
        invalidProgram: invalidProgram,
        invalidCourse: invalidCourse,
        invalidDepartment: invalidDepartment
    }, OK);
}

exports.bulkMasterUpload = async(req,res) => {
    let err, orgId, disUpload, proUpload, couUpload, depUpload;
    const body = req.body;
    const user = req.user;
    if(!isNull(body.org_id)){
        if(typeof body.org_id !== "string"){
            return ReE(res, { message: 'Organization id must be a string' }, BAD_REQUEST);
        }
        [err, orgId] = await to(organization.findOne({ where: { _id: body.org_id, is_active: true, is_block: false } }));
        if(isNull(errO) || isEmpty(errO)){
            return ReE(res, errO, INTERNAL_SERVER_ERROR);
        }
        if(isNull(orgId)){
            return ReE(res, { message: 'Organization not found' }, BAD_REQUEST);
        }
    }
    let Disciplines = [];
    if(!isNull(body.Discipline)){
        if(Array.isArray(body.Discipline) && body.Discipline.length>0){
            for (let index = 0; index < body.Discipline.length; index++) {
                let element = body.Discipline[index];
                element.org_id = null;
                if(!isNull(body.org_id)){
                    element.org_id = body.org_id;
                }
                Disciplines.push({ ...element, is_active: true, is_block: false, createdby: user._id });
            }
        }
    }
    if(Disciplines.length > 0){
        [err, disUpload] = await to(discipline_master.bulkCreate(Disciplines));
        if(isNull(err) || isEmpty(err)){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(disUpload)){
            return ReE(res, { message: 'Discipline upload failed' }, BAD_REQUEST);
        }
    }
    let Programs = [], errorProgram = [];
    if(!isNull(body.Program)){
        if(Array.isArray(body.Program) && body.Program.length>0){
            for (let index = 0; index < body.Program.length; index++) {
                let element = body.Program[index];
                element.org_id = null;
                let query = { name: element.discipline_master, org_id: null, is_active: true, is_block: false };
                if(!isNull(body.org_id)){
                    element.org_id = body.org_id;
                    query.org_id = { [Op.or]: [ null, body.org_id ] };
                }
                let err1, disFind;
                [err1, disFind] = await to(discipline_master.findOne({ where: query }));
                if(isNull(err1) || isEmpty(err1)){
                    errorProgram.push({ ...element, message: err1, success: false })
                }
                else if(isNull(disFind)){
                    errorProgram.push({ ...element, message: 'Discipline not found', success: false })
                }else{
                    Programs.push({ ...element, discipline_master_id: disFind._id, is_active: true, is_block: false, createdby: user._id })
                }
            }
        }
    }
    if(Programs.length > 0){
        [err, proUpload] = await to(program_master.bulkCreate(Programs));
        if(isNull(err) || isEmpty(err)){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(proUpload)){
            return ReE(res, { message: 'Program upload failed' }, BAD_REQUEST);
        }
    }
    let Courses = [], errorCourse = [];
    if(!isNull(body.Course)){
        if(Array.isArray(body.Course) && body.Course.length > 0){
            for (let index = 0; index < body.Course.length; index++) {
                let element = body.Course[index];
                element.org_id = null;
                let query = { name: element.discipline_master, org_id: null, is_active: true, is_block: false };
                let query1 = { name: element.program_master, org_id: null, is_active: true, is_block: false };
                if(!isNull(body.org_id)){
                    element.org_id = body.org_id;
                    query.org_id = { [Op.or]: [ null, body.org_id ] };
                    query1.org_id = { [Op.or]: [ null, body.org_id ] };
                }
                let err1, disFind, proFind;
                [err1, disFind] = await to(discipline_master.findOne({ where: query }));
                if(isNull(err1) || isEmpty(err1)){
                    errorCourse.push({ ...element, message: err1, success: false })
                }
                else if(isNull(disFind)){
                    errorCourse.push({ ...element, message: 'Discipline not found', success: false })
                }else{
                    query1.discipline_master_id = disFind._id;
                    [err1, proFind] = await to(program_master.findOne({ where: query1 }));
                    if(isNull(err1) || isEmpty(err1)){
                        errorCourse.push({ ...element, message: err1, success: false });
                    }else if(isNull(proFind)){
                        errorCourse.push({ ...element, message: 'Program not found', success: false });
                    }else{
                        Courses.push({ ...element, discipline_master_id: disFind._id, program_master_id: proFind._id, is_active: true, is_block: false, createdby: user._id });
                    }
                }
            }
        }
    }
    if(Courses.length>0){
        [err, couUpload] = await to(course_master.bulkCreate(Courses));
        if(isNull(err) || isEmpty(err)){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(couUpload)){
            return ReE(res, { message: 'Course Upload failed' }, BAD_REQUEST)
        }
    }
    let Departments = [], errorDepartment = [];
    if(!isNull(body.Department)){
        if(Array.isArray(body.Department) && body.Department.length>0){
            for (let index = 0; index < body.Department.length; index++) {
                let element = body.Department[index];
                element.org_id = null;
                let query = { name: element.discipline_master, org_id: null, is_active: true, is_block: false };
                if(!isNull(body.org_id)){
                    element.org_id = body.org_id;
                    query.org_id = { [Op.or]: [ null, body.org_id ] };
                }
                let err1, disFind;
                [err1, disFind] = await to(discipline_master.findOne({ where: query }));
                if(isNull(err1) || isEmpty(err1)){
                    errorDepartment.push({ ...element, message: err1, success: false })
                }
                else if(isNull(disFind)){
                    errorDepartment.push({ ...element, message: 'Discipline not found', success: false })
                }else{
                    Departments.push({ ...element, discipline_master_id: disFind._id, is_active: true, is_block: false, createdby: user._id })
                }
            }
        }
    }
    if(Departments.length>0){
        [err, depUpload] = await to(department_master.bulkCreate(Departments));
        if(isNull(err) || isEmpty(err)){
            return ReE(res, err, INTERNAL_SERVER_ERROR);
        }
        if(isNull(depUpload)){
            return ReE(res, { message: 'Department Upload failed' }, BAD_REQUEST)
        }
    }
    return ReS(res, { message: 'Uploaded Successfully', error: { errorProgram: errorProgram, errorCourse: errorCourse, errorDepartment: errorDepartment } }, OK);
}