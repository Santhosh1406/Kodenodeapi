require('dotenv').config();

let CONFIG = {};

CONFIG.port = process.env.PORT || '3200';
CONFIG.jwt_encryption = process.env.JWT_ENCRYPTION || 'jwt_please_change';
CONFIG.jwt_expiration = process.env.JWT_EXPIRATION || '28800';
CONFIG.codes = ['superAdmin', "admin", "staff", "student"];
CONFIG.user_type = {
    superAdmin: "@SA01",
    admin: "@A02",
    staff: "@S03",
    student: "@ST04"
}
CONFIG.mg_key = process.env.MG_KEY;
CONFIG.mg_domain = process.env.MG_DOMAIN;
CONFIG.formStatus = ['PENDING', 'APPROVED', 'BLOCKED'];
CONFIG.annual_revenue_min_amount = 100000;
CONFIG.plan = { minimumPrice: 100000, minimumMember: 10, duration_type: ['DAY', 'MONTH', 'YEAR'] };
CONFIG.company = ['SLEF', 'PRODUCT'];
CONFIG.status = ['Active', 'Block'];
CONFIG.approve = ['Approve', 'Block'];
CONFIG.dicimanagament = { type: ['A/V Suite', 'Dailer'], participants_type: ['All', 'Particular'] };
CONFIG.payment = { status: ['PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED'], key: process.env.PAYMENT_KEY, sec: process.env.PAYMENT_SECRET, description: [`Buy the license plan`, `Buy the DICI ticket`], secret_key: process.env.SECRET_KEY || 'C0o4iis@123' }
CONFIG.url = process.env.URL || 'https://dicom.oneappplus.in';
CONFIG.mail = process.env.MAILID || 'helpdesk.dicom@gmail.com';
CONFIG.pass = process.env.PASS || 'smblugdaxgjovgdz';
CONFIG.age = { owner: 18, staff: 20, student: 17, max: 70 };
CONFIG.gender = ['Male', 'Female', 'Other'];
CONFIG.access = ['Create', 'Update', 'Delete', "Get"];
CONFIG.block = ['active', 'block']
CONFIG.subjectUser = 4;
CONFIG.sKey = 'D!I&C0D1IS';
CONFIG.type = ['Student', 'Faculty'];
CONFIG.universityType = ['State', 'Central', 'Private', 'Deemed'];
CONFIG.batch = { startDay: 1, year: 12, semstart: 3, semDuration: { min: 120, max: 180 } };
CONFIG.minAtten = 75;
CONFIG.boolean = [true, false];
CONFIG.enrollment = ['Merit', 'Management'];
CONFIG.assignmentStatus = ['Started', 'Submited', 'Scored', 'Published'];
CONFIG.question = { questionMax: 200, max: 200000, min: 3, optionAnswer: 300, answer: 200000 };
CONFIG.bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
CONFIG.leave = { type: ['Academic', 'Goverment'] };
CONFIG.usertype=['proadmin','superadmin','admin','faculty','student'];
module.exports.CONFIG = CONFIG