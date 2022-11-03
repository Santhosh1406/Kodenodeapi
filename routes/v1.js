const upassport = require('passport');

const needsAuth = upassport.authenticate('owner', { session: false });

const express = require('express');
const { createOwner, userRegister, creatUserInfo } = require('../controllers/user_data');
const { createAffiliate, updatedAffiliatedType } = require('../controllers/affiliated_type');
const { createInstitutionType, updatedInstitutionType } = require('../controllers/institution_type');
const { createOrganizationType, updateOrganizationType } = require('../controllers/organization_type');
const { createUniversityType, updatedUniversityType } = require('../controllers/university_type');
const { createGroup, mapGroupOrganization } = require('../controllers/group');
const { createKodeRole } = require('../controllers/role');
const { createMenu, getMenu, getAllMenu, menuUpdate, createBulkMenu } = require('../controllers/menu');
const { kodeRoleMenuMapping, updateKodeRoleMenu } = require('../controllers/role_menu_mapping');
const { addOrganization } = require('../controllers/organization');
const { addDiscipline } = require('../controllers/discipline');
const { createProgram } = require('../controllers/program');
const { createField, updatedFieldData, createMultipleField } = require('../controllers/user_field');
const { fieldsMenuMapping } = require('../controllers/user_fields_mapping');
const { updateCourseDurationMaster } = require('../controllers/course_duration');
const { updateCourseSemDurationMaster } = require('../controllers/course_sem_duration');
const { createSupportType } = require('../controllers/support_type');
const { assignTicket, closeTicket } = require('../controllers/support_ticket');
const router = express.Router();

//users api's

router.post('/owner/create', createOwner);
router.post('/user/register', needsAuth, userRegister);
router.post('/user/info/create', needsAuth, creatUserInfo);

//user field 

router.post('/user/field/create', needsAuth, createField);
router.post('/user/field/bulk/upload', needsAuth, createMultipleField);
router.put('/user/field/update', needsAuth, updatedFieldData);

//user fields mapping

router.post('/user/field/mapping', needsAuth, fieldsMenuMapping);

//group api's

router.post('/group/create', needsAuth, createGroup);
router.put('/group/organization/map', needsAuth, mapGroupOrganization);

//organization type

router.post('/organization/type/create', needsAuth, createOrganizationType);
router.put('/organization/type/update', needsAuth, updateOrganizationType);

//affiliated type

router.post('/affiliated/type/create', needsAuth, createAffiliate);
router.put('/affiliated/type/update', needsAuth, updatedAffiliatedType);


//institution type

router.post('/institution/type/create', needsAuth, createInstitutionType);
router.put('/institution/type/update', needsAuth, updatedInstitutionType);

//university type

router.post('/university/type/create', needsAuth, createUniversityType);
router.put('/university/type/update', needsAuth, updatedUniversityType);


//course duration

router.put('/course/duration/update', needsAuth, updateCourseDurationMaster);

//course semester duration

router.put('/course/semester/duration/update', needsAuth, updateCourseSemDurationMaster);

//role

router.post('/kode/role/create', needsAuth, createKodeRole);

//menu

router.post('/menu/create', needsAuth, createMenu);
router.post('/menu/bulk/create', needsAuth, createBulkMenu);
router.get('/menu/get/all', needsAuth, getAllMenu);
router.get('/menu/get/:menuId', needsAuth, getMenu);
router.put('/menu/update', needsAuth, menuUpdate);


//role menu mapping

router.post('/kode/role/menu/mapping', needsAuth, kodeRoleMenuMapping);
router.put('/kode/role/menu/update', needsAuth, updateKodeRoleMenu);

//organization api's

router.post("/organization/create", needsAuth, addOrganization);

//discipline api's

router.post("/discipline/create", needsAuth, addDiscipline);

//program api's

router.post("/program/create", needsAuth, createProgram);

//support type api's

router.post("/support/type/create", needsAuth, createSupportType);
router.put("/support/assigne/:id", needsAuth, assignTicket);
router.put("/support/close", needsAuth, closeTicket);


module.exports = router;