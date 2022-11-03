const upassport = require('passport');

const needsAuth = upassport.authenticate('user', { session: false });

const express = require('express');
const { loginUser, profile, userRegister, creatUserInfo, getAllUsers, blukUserVerify, bulkUserUpload, mapSection, sdKLoginUser, sdkProfile, updateStudentYear, updateUser } = require('../controllers/user_data');
const { getAllOrganizationType } = require('../controllers/organization_type');
const { getAllInstitutionType } = require('../controllers/institution_type');
const { getAllAffiliatedType } = require('../controllers/affiliated_type');
const { getAllUniversityType } = require('../controllers/university_type');
const { getAllGroup } = require('../controllers/group');
const { createRole, getRole, getAllRole, getAllKodeRole, getKodeRole } = require('../controllers/role');
const { roleMenuMapping, getAllRoleMenu, getAllKodeRoleMenu, updateRoleMenu } = require('../controllers/role_menu_mapping');
const { getAllOrganization, getOneOrganization, addOrganization } = require('../controllers/organization');
const { getOneDiscipline, getAllDiscipline, addDiscipline } = require('../controllers/discipline');
const { getAllProgram, getOneProgram, createProgram } = require('../controllers/program');
const { getAllCourse, getOneCourse, addCourse } = require('../controllers/course');
const { getAllDepartment, getOneDepartment, addDepartment } = require('../controllers/department');
const { getAllSubject, getOneSubject, addSubject, updateSub } = require('../controllers/subject');
const { getAllCourseDepartment, getOneCourseDepartment, addCDM } = require('../controllers/course_department_mapping');
const { getAllSubjectMapping, getOneSubjectMapping, addSubjectMapping } = require('../controllers/subject_mapping');
const { getAllFieldData } = require('../controllers/user_field');
const { getAllFieldsByMenu } = require('../controllers/user_fields_mapping');
const { getAllTopic, getOneTopic, addTopic, updateTop } = require('../controllers/topic');
const { getAllSubTopic, getOneSubTopic, addSubTopic, updateSubTop } = require('../controllers/sub_topic');
const { getAllSection, getOneSection, addSection, updateSec } = require('../controllers/section');
const { getAllTimeFrame, getOneTimeFrame, addTimeFrame, updateTimeFrame } = require('../controllers/time_frame');
const { addDisMaster, getAllDisciplineMaster, getOneDisciplineMaster, updateDisMaster, blockDisMaster, deleteDisMaster } = require('../controllers/discipline_master');
const { addProMaster, getAllProgramMaster, getOneProgramMaster, updateProMaster, blockProMaster, deleteProMaster } = require('../controllers/program_master');
const { addCouMaster, getAllCourseMaster, getOneCourseMaster, updateCouMaster, blockCouMaster, deleteCouMaster } = require('../controllers/course_master');
const { getAllDepartmentMaster, addDepMaster, getOneDepartmentMaster, updateDepMaster, blockDepMaster, deleteDepMaster } = require('../controllers/department_master');
const { bulkValidate, bulkUpload, bulkValidateConfig, bulkMasterUpload } = require('../controllers/bulkValidation');
const { mapSubjectUser, getAllSubjectUser } = require('../controllers/user_subject');
const { createDurationMaster, getAllCourseDurationMaster, getCourseDurationMaster } = require('../controllers/course_duration');
const { createCourseBatch, getAllCourseBatch, getCourseBatch } = require('../controllers/course_batch');
const { createSemDurationMaster, getAllCourseSemDurationMaster, getCourseSemDurationMaster } = require('../controllers/course_sem_duration');
const { createSem, getAllSem, getSem } = require('../controllers/batch_sem');
const { createDayDurationMaster, getAllDayDurationMaster, getDayDurationMaster } = require('../controllers/time_day');
const { createTable, verifyTable, getAllTimeTable, updateTable } = require('../controllers/time_table');
const { getSession, updateSessionDetails, sessionEntry } = require('../controllers/session');
const { markAttendance, updateAttendance, autoAttendance } = require('../controllers/student_attendance');
const { logout, getToken, getAllUserTrack } = require('../controllers/user_track');
const { getAllState, getAllDistrict, getAllPincode, getAllCountry } = require('../controllers/pincode');
const { createQuestionType, getAllQuestionType, getQuestionType, updateQuestionType } = require('../controllers/question_type');
const { createQuestionBank, getAllQuestionBank, getQuestionBank, updateQuestionBank } = require('../controllers/question_bank');
const { getAllQuestionBankType, getQuestionBankType, addQuestionBankType, updateQuestionBankType } = require('../controllers/question_bank_type');
const { getAllQuestionTopic, questionVerification, createQuestionBulk, getAllQuestions, getQuestions } = require('../controllers/question');
const { getAllST, getOneST } = require('../controllers/support_type');
const { getAllTicket, createTicket, completeTicket } = require('../controllers/support_ticket');
const { createAssignmentBank, getAllAssigmentBank, getAssigmentBank, updateAssignmentBank, getAllAssigmentBankSubject } = require('../controllers/assignment_bank');
const { getReport, enrollmentReport, institutionReport, courseDuration, courseDurationReport, semesterPerCourseReport, topicsPerSubject, subjectPerCourse, sessionPerSubject, sessionPerTopic, getAttendanceReport, deleteAllDataOfOrganization, sessionsByFacultyByCourse, sessionsByFacultyBySubjectOrTopic, sessionsByFacultyByCourseBySubjectOrTopic } = require('../controllers/report');
const { getAllAssignmentBankType, getAssignmentBankType, updateAssignmentBankType } = require('../controllers/assignment_bank_type');
const { getAllAssignmentQuestions, getAssignmentQuestions, studentAssignmentQuestion, getAllAssignmentStudentQuestions, updateAssignmentQuestionByStudent, getAssignmentQuestionByStudent, getAssignmentStudentQuestion } = require('../controllers/assignment_question');
const { createLeave, updateLeave, getAllLeave, getLeave } = require('../controllers/leave');
const { createEvents, getEvent, getAllEvents, updateEvent } = require('../controllers/event');
const { getDashboardOrganization } = require('../controllers/dashboard');
const router = express.Router();


//users api's

router.post('/user/create', needsAuth, userRegister);

//common user api's

router.post('/login', loginUser);
router.post('/device/login', sdKLoginUser);
router.post('/logout', logout);

//user track 


router.get('/token/get', getToken);
router.get('/track/get/all', needsAuth, getAllUserTrack);

//user multiple 

router.post('/user/bulk/verify', needsAuth, blukUserVerify);
router.post('/user/bulk/upload', needsAuth, bulkUserUpload);

//user info

router.post('/user/info/create', needsAuth, creatUserInfo);
router.put('/user/student/batch/year/update', needsAuth, updateStudentYear);
router.put('/user/update', needsAuth, updateUser);
router.get('/user/get/all', needsAuth, getAllUsers);

//user section mapping

router.put('/user/section/mapping', needsAuth, mapSection);

//user subject 

router.post('/user/subject/map', needsAuth, mapSubjectUser);
router.get('/user/subject/get/all', needsAuth, getAllSubjectUser);

//user field 

router.get('/user/field/get/all', needsAuth, getAllFieldData);

//user fields mapping

router.get('/user/field/get', needsAuth, getAllFieldsByMenu);


//profile

router.get('/profile', needsAuth, profile);
router.get('/device/profile', needsAuth, sdkProfile);


//group api's

router.get('/group/get/all', needsAuth, getAllGroup);

//organization type

router.get('/organization/type/get/all', needsAuth, getAllOrganizationType);

//affiliated type

router.get('/affiliated/type/get/all', needsAuth, getAllAffiliatedType);

//institution type

router.get('/institution/type/get/all', needsAuth, getAllInstitutionType);

//university type

router.get('/university/type/get/all', needsAuth, getAllUniversityType);

//discipline master
router.post('/disciplinemaster/create', needsAuth, addDisMaster);
router.get('/disciplinemaster/get/all', needsAuth, getAllDisciplineMaster);
router.get('/disciplinemaster/get/one', needsAuth, getOneDisciplineMaster);
router.put('/disciplinemaster/update', needsAuth, updateDisMaster);
router.put('/disciplinemaster/block/:id', needsAuth, blockDisMaster);
router.put('/disciplinemaster/delete/:id', needsAuth, deleteDisMaster);

//program master
router.post('/programmaster/create', needsAuth, addProMaster);
router.get('/programmaster/get/all', needsAuth, getAllProgramMaster);
router.get('/programmaster/get/one', needsAuth, getOneProgramMaster);
router.put('/programmaster/update', needsAuth, updateProMaster);
router.put('/programmaster/block/:id', needsAuth, blockProMaster);
router.put('/programmaster/delete/:id', needsAuth, deleteProMaster);

//course master
router.post('/coursemaster/create', needsAuth, addCouMaster);
router.get('/coursemaster/get/all', needsAuth, getAllCourseMaster);
router.get('/coursemaster/get/one', needsAuth, getOneCourseMaster);
router.put('/coursemaster/update', needsAuth, updateCouMaster);
router.put('/coursemaster/block/:id', needsAuth, blockCouMaster);
router.put('/coursemaster/delete/:id', needsAuth, deleteCouMaster);

//department master
router.post('/departmentmaster/create', needsAuth, addDepMaster);
router.get('/departmentmaster/get/all', needsAuth, getAllDepartmentMaster);
router.get('/departmentmaster/get/one', needsAuth, getOneDepartmentMaster);
router.put('/departmentmaster/update', needsAuth, updateDepMaster);
router.put('/departmentmaster/block/:id', needsAuth, blockDepMaster);
router.put('/departmentmaster/delete/:id', needsAuth, deleteDepMaster);

//organization

router.get("/organization/get/all", needsAuth, getAllOrganization);
router.get("/organization/get/one", needsAuth, getOneOrganization);
router.post("/organization/create", needsAuth, addOrganization);

//discipline

router.get("/discipline/get/all", needsAuth, getAllDiscipline);
router.get("/discipline/get/one", needsAuth, getOneDiscipline);
router.post("/discipline/create", needsAuth, addDiscipline);

//program

router.get("/program/get/all", needsAuth, getAllProgram);
router.get("/program/get/one", needsAuth, getOneProgram);
router.post("/program/create", needsAuth, createProgram);

//course

router.get("/course/get/all", needsAuth, getAllCourse);
router.get("/course/get/one", needsAuth, getOneCourse);
router.post("/course/create", needsAuth, addCourse);

//department

router.get("/department/get/all", needsAuth, getAllDepartment);
router.get("/department/get/one", needsAuth, getOneDepartment);
router.post("/department/create", needsAuth, addDepartment);

//subject

router.get("/subject/get/all", needsAuth, getAllSubject);
router.get("/subject/get/one", needsAuth, getOneSubject);
router.post("/subject/create", needsAuth, addSubject);
router.put("/subject/update", needsAuth, updateSub)

//course duration

router.post('/course/duration/create', needsAuth, createDurationMaster);
router.get('/course/duration/get/all', needsAuth, getAllCourseDurationMaster);
router.get('/course/duration/get/:courseId', needsAuth, getCourseDurationMaster);

//course semester duration

router.post('/course/semester/duration/create', needsAuth, createSemDurationMaster);
router.get('/course/semester/duration/get/all', needsAuth, getAllCourseSemDurationMaster);
router.get('/course/semester/duration/get/:courseId', needsAuth, getCourseSemDurationMaster);

//time table day

router.post('/day/create', needsAuth, createDayDurationMaster);
router.get('/day/get/all', needsAuth, getAllDayDurationMaster);
router.get('/day/get/:courseId', needsAuth, getDayDurationMaster);

//course batch

router.post('/course/batch/create', needsAuth, createCourseBatch);
router.get('/course/batch/get/all', needsAuth, getAllCourseBatch);
router.get('/course/batch/get/:batchId', needsAuth, getCourseBatch);


//course semester

router.post('/course/semester/create', needsAuth, createSem);
router.get('/course/semester/get/all', needsAuth, getAllSem);
router.get('/course/semester/get/:semId', needsAuth, getSem);

//course department mapping

router.get("/coursedepartment/get/all", needsAuth, getAllCourseDepartment);
router.get("/coursedepartment/get/one", needsAuth, getOneCourseDepartment);
router.post("/coursedepartment/create", needsAuth, addCDM);

//subject mapping

router.get("/subjectmapping/get/all", needsAuth, getAllSubjectMapping);
router.get("/subjectmapping/get/one", needsAuth, getOneSubjectMapping);
router.post("/subjectmapping/create", needsAuth, addSubjectMapping);

//topic

router.get("/topic/get/all", needsAuth, getAllTopic);
router.get("/topic/get/one", needsAuth, getOneTopic);
router.post("/topic/create", needsAuth, addTopic);
router.put("/topic/update", needsAuth, updateTop);

//subtopic

router.get("/subtopic/get/all", needsAuth, getAllSubTopic);
router.get("/subtopic/get/one", needsAuth, getOneSubTopic);
router.post("/subtopic/create", needsAuth, addSubTopic);
router.put("/subtopic/update", needsAuth, updateSubTop);

//section

router.get("/section/get/all", needsAuth, getAllSection);
router.get("/section/get/one", needsAuth, getOneSection);
router.post("/section/create", needsAuth, addSection);
router.put("/section/update", needsAuth, updateSec);

//session
router.get("/session/get/all", needsAuth, getSession);
router.put("/session/update", needsAuth, updateSessionDetails);
router.get("/session/entry/:id", needsAuth, sessionEntry);
// router.get("/session/student/:id", needsAuth, studentEntry);

//student attendance
router.post("/attendance/:id", needsAuth, markAttendance);
router.put("/attendance/:id", needsAuth, updateAttendance);

//time frame

router.get("/timeframe/get/all", needsAuth, getAllTimeFrame);
router.get("/timeframe/get/one", needsAuth, getOneTimeFrame);
router.post("/timeframe/create", needsAuth, addTimeFrame);
router.put("/timeframe/update", needsAuth, updateTimeFrame);

//role

router.post('/role/create', needsAuth, createRole);
router.get('/role/get/all', needsAuth, getAllRole);
router.get('/role/get/:roleId', needsAuth, getRole);


//kode role

router.get('/kode/role/get/all', needsAuth, getAllKodeRole);
router.get('/kode/role/get/:roleId', needsAuth, getKodeRole);

//role menu mapping

router.post('/role/menu/mapping', needsAuth, roleMenuMapping);
router.get('/role/menu/get/all', needsAuth, getAllRoleMenu);
router.put('/role/menu/update', needsAuth, updateRoleMenu);

// kode role menu mappping

router.get('/kode/role/menu/get/all', needsAuth, getAllKodeRoleMenu);

//bulk upload

router.post('/bulk/validate', needsAuth, bulkValidate);
router.post('/bulk/upload', needsAuth, bulkUpload);
router.post('/bulk/master/validate', needsAuth, bulkValidateConfig);
router.post('/bulk/master/upload', needsAuth, bulkMasterUpload);

//time table mapping

router.post('/time/table/session/mapping', needsAuth, createTable);
router.post('/time/table/session/verify', needsAuth, verifyTable);
router.get('/time/table/session/get/all', needsAuth, getAllTimeTable);
router.put('/time/table/session/update', needsAuth, updateTable);

//country

router.get('/country/get/all', needsAuth, getAllCountry);

//state

router.get('/state/get/all', needsAuth, getAllState);

//district

router.get('/district/get/all', needsAuth, getAllDistrict);

//pincode

router.get('/pincode/get/all', needsAuth, getAllPincode);

//question 

//question type

router.post('/question/type/create', needsAuth, createQuestionType);
router.get('/question/type/get/all', needsAuth, getAllQuestionType);
router.put('/question/type/update', needsAuth, updateQuestionType);
router.get('/question/type/get/:question_type_id', needsAuth, getQuestionType);

//question bank

router.post('/question/bank/create', needsAuth, createQuestionBank);
router.get('/question/bank/get/all', needsAuth, getAllQuestionBank);
router.put('/question/bank/update', needsAuth, updateQuestionBank);
router.get('/question/bank/get/:question_bank_id', needsAuth, getQuestionBank);

//question bank type

router.get('/question/bank/type/get/all', needsAuth, getAllQuestionBankType);
router.get('/question/bank/type/get/:question_bank_type_id', needsAuth, getQuestionBankType);
router.post('/question/bank/type/add', needsAuth, addQuestionBankType);
router.put('/question/bank/type/update', needsAuth, updateQuestionBankType);

//question bank topic

router.get('/question/bank/topic/get/all', needsAuth, getAllQuestionTopic);

//question

router.post('/question/bulk/verify', needsAuth, questionVerification);
router.post('/question/bulk/create', needsAuth, createQuestionBulk);
router.get('/question/get/all', needsAuth, getAllQuestions);
router.get('/question/get/:question_id', needsAuth, getQuestions);

//support type

router.get("/support/type/get/all", needsAuth, getAllST);
router.get("/support/type/get/one", needsAuth, getOneST);

//support ticket

router.post("/support/ticket/create", needsAuth, createTicket);
router.get("/support/ticket/get/all", needsAuth, getAllTicket);
router.put("/support/ticket/complete/:id", needsAuth, completeTicket);


//assignment 

//assignment bank

router.post("/assignment/bank/create", needsAuth, createAssignmentBank);
router.get("/assignment/bank/get/all", needsAuth, getAllAssigmentBank);
router.get("/assignment/bank/get/:assignment_bank_id", needsAuth, getAssigmentBank);
router.put("/assignment/bank/update", needsAuth, updateAssignmentBank);

//assignment bank type

router.get('/assignment/bank/type/get/all', needsAuth, getAllAssignmentBankType);
router.get('/assignment/bank/type/get/:assignment_bank_type_id', needsAuth, getAssignmentBankType);
router.put('/assignment/bank/type/update', needsAuth, updateAssignmentBankType);

//assignment question

router.get('/assignment/question/get/all', needsAuth, getAllAssignmentQuestions);
router.get('/assignment/question/get/:assignment_question_id', needsAuth, getAssignmentQuestions);

//assignment student 

router.get('/assignment/student/question/get', needsAuth, getAssignmentQuestionByStudent);
router.post('/assignment/student/create', needsAuth, studentAssignmentQuestion);
router.put('/assignment/student/update', needsAuth, updateAssignmentQuestionByStudent);
router.get('/assignment/student/get/all', needsAuth, getAllAssignmentStudentQuestions);
router.get('/assignment/student/get/:assignment_student_id', needsAuth, getAssignmentStudentQuestion);

//assignment subject

router.get('/assignment/subject/get/all', needsAuth, getAllAssigmentBankSubject);

//report
router.post("/report/enrollment", needsAuth, enrollmentReport);
router.post("/report/institution", needsAuth, institutionReport);
router.post("/report/course_duration", needsAuth, courseDurationReport);
router.post("/report/semster_course", needsAuth, semesterPerCourseReport);
router.post("/report/topic_subject", needsAuth, topicsPerSubject);
router.post("/report/subject_course", needsAuth, subjectPerCourse);
router.post("/report/session_subject", needsAuth, sessionPerSubject);
router.post("/report/session_topic", needsAuth, sessionPerTopic);
router.post("/report/attendance", needsAuth, getAttendanceReport)
router.post("/report/session_fc", needsAuth, sessionsByFacultyByCourse);
router.post("/report/session_fst", needsAuth, sessionsByFacultyBySubjectOrTopic);
router.post("/report/session_fcst", needsAuth, sessionsByFacultyByCourseBySubjectOrTopic);

//Delete Data
router.post("/delete/:id", deleteAllDataOfOrganization);

//events

router.post('/event/create', needsAuth, createEvents);
router.get('/event/get/all', needsAuth, getAllEvents);
router.get('/event/get/:event_id', needsAuth, getEvent);
router.put('/event/update', needsAuth, updateEvent);


//leaves

router.post('/leave/create', needsAuth, createLeave);
router.get('/leave/get/all', needsAuth, getAllLeave);
router.get('/leave/get/:leave_id', needsAuth, getLeave);
router.put('/leave/update', needsAuth, updateLeave);


//dashboard

router.get('/dashboard/organization/all', needsAuth, getDashboardOrganization);

module.exports = router;