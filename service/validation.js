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
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str) && (String(str).startsWith('http://') || String(str).startsWith('https://'));
}

const IsValidUUIDV4 = val => isValidUUIDV4(val);

exports.getQuery = ({ status, limit, page }) => {
    let query = {};
    // if(status === "inactive") {
    //     query.is_active = false;
    // }
    if (status === "inactive") {
        query.is_block = true;
        query.is_active = true;
    }
    if (status === "all") {
        query.is_active = true;
    }

    if (status != 'inactive' && status != 'all') {
        query.is_active = true;
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

exports.getLimitQuery = ({ limit, page }) => {
    let query = {};
    query.is_active = true;
    query.is_block = false;
    // if(status === "inactive") {
    //     query.is_active = false;
    // }
    if (status === "inactive") {
        query.is_block = true;
        query.is_active = true;
    }
    if (status === "all") {
        query.is_active = true;
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

    if (limit && page) {
        query = { where: { ...query }, limit: limit, offset: (page * (page - 1)) };
    };
    return query;
}

exports.IsValidUUIDV4 = IsValidUUIDV4;

exports.validator = (model, method, data) => {
    if (model === "organization") {
        if (method === "create") {
            if (!data.org_name || typeof data.org_name !== "string") {
                return { message: 'Institution name must be a string' };
            }
            if (data.org_name.length < 3 || data.org_name.length > 100) {
                return { message: 'Institution name must have min 5 and max 100 character' };
            }
            if (hasNumber.test(data.org_name) || hasSpecial.test(data.org_name)) {
                return { message: 'Invalid Institution name' };
            }
            if (!data.org_type || typeof data.org_type !== "string") {
                return { message: 'Institution Type must be a string' };
            }
            if (!IsValidUUIDV4(data.org_type)) {
                return { message: 'Invalid Institution Type Id' };
            }
            if (data.last_name && typeof data.last_name !== "string") {
                return { message: 'Institution Type must be a string' };
            }
            if (data.last_name && data.last_name.length === 0) {
                return { message: 'Last name must have min 1 charcter' };
            }
            if (!data.address || typeof data.address !== "string") {
                return { message: 'Institution address must be string' };
            }
            if (data.address.length < 3 || data.address.length > 200) {
                return { message: 'Institution address must have min 15 and max 200 character' };
            }
            if (!data.city || typeof data.city !== "string") {
                return { message: 'Institution city must be a string' };
            }
            if (data.city.length < 3 || data.city.length > 100) {
                return { message: 'Institution city must have min 3 character' };
            }
            if (!data.state || typeof data.state !== "string") {
                return { message: 'Institution state must be a string' };
            }
            if (data.state.length < 3 || data.state.length > 100) {
                return { message: 'Institution state must have min 3 character' };
            }
            if (!data.country || typeof data.country !== "string") {
                return { message: 'Institution country must be a string' };
            }
            if (data.country.length < 3 || data.country.length > 100) {
                return { message: 'Institution country must have min 5 character' };
            }
            if (!data.postal_code || typeof data.postal_code !== "string") {
                return { message: 'Institution postal code must be a string' };
            }
            if (data.postal_code.length !== 6) {
                return { message: 'Institution postal code must have 6 character' };
            }
            if (data.fax && typeof data.fax !== "string") {
                return { message: 'Institution fax must be a string' };
            }
            if (data.fax && (data.fax.length < 10 || data.fax.length > 100)) {
                return { message: 'Institution fax must have min 10 character' };
            }
            if (data.telephone && typeof data.telephone !== "string") {
                return { message: 'Institution telephone No must be a string' };
            }
            if (data.telephone && data.telephone.length < 10 || data.telephone.length > 15) {
                return { message: 'Institution telephone No must 10 to 15 character' };
            }
            if (!data.alternate_contact_no || typeof data.alternate_contact_no !== "string") {
                return { message: 'Institution alternate Contact No must be a string' };
            }
            if (data.alternate_contact_no && data.alternate_contact_no.length < 10 || data.alternate_contact_no.length > 15) {
                return { message: 'Institution alternate Contact No must 10 to 15 character' };
            }
            if (!data.email || typeof data.email !== "string") {
                return { message: 'Institution Email must be a string' };
            }
            if (!validateEmail(data.email)) {
                return { message: 'Invalid email address' };
            }
            if (!data.url || typeof data.url !== "string") {
                return { message: 'Institution website URL must be a string' };
            }
            if (!validURL(data.url)) {
                return { message: 'Invalid Institution website url' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Institution Logo URL must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Institution logo URL' };
            }
            if (!data.institution_type_id || typeof data.institution_type_id !== "string") {
                return { message: 'Institution institution type must be a string' };
            }
            if (!IsValidUUIDV4(data.institution_type_id)) {
                return { message: 'Invalid Institution Type' };
            }
            if (!data.affiliated_type_id || typeof data.affiliated_type_id !== "string") {
                return { message: 'Institution affiliated type must be a string' };
            }
            if (!IsValidUUIDV4(data.affiliated_type_id)) {
                return { message: 'Invalid Affiliated Type' };
            }
            if (data.affiliated_date && typeof data.affiliated_date !== "string") {
                return { message: 'Institution affiliated date must be a string' };
            }
            if (data.affiliated_date && `${new Date(data.affiliated_date.length)}` === "Invalid Date") {
                return { message: 'Invalid Institution affiliated date' };
            }
            if (!data.year_of_foundation || typeof data.year_of_foundation !== "string") {
                return { message: 'Institution year of foundation must be a string' };
            }
            if (!Number.isInteger(parseInt(data.year_of_foundation)) || parseInt(data.year_of_foundation) < 1900 || parseInt(data.year_of_foundation) >= new Date().getFullYear()) {
                return { message: 'Invalid Institution year of foundation' };
            }
            if (!data.sortname || typeof data.sortname !== "string") {
                return { message: 'Institution affiliated date must be a string' };
            }
            if (data.sortname.length < 3 || data.sortname.length > 20) {
                return { message: 'Institution Sortname must have min 3 or max 10 character' };
            }
        }
        if (method === "update") {
            if (!data._id || typeof data._id !== "string") {
                return { message: '_id is must' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'org_id is must' };
            }
            if (data.org_name && typeof data.org_name !== "string") {
                return { message: 'Institution name must be a string' };
            }
            if (data.org_name && data.org_name.length < 3 || data.org_name.length > 100) {
                return { message: 'Institution name must have min 5 and max 100 character' };
            }
            if (data.last_name && typeof data.last_name !== "string") {
                return { message: 'Institution Type must be a string' };
            }
            if (data.last_name && data.last_name.length === 0) {
                return { message: 'Last name must have min 1 charcter' };
            }
            if (data.address && typeof data.address !== "string") {
                return { message: 'Institution address must be string' };
            }
            if (data.address && data.address.length < 3 || data.address.length > 200) {
                return { message: 'Institution address must have min 15 and max 200 character' };
            }
            if (data.city && typeof data.city !== "string") {
                return { message: 'Institution city must be a string' };
            }
            if (data.city && data.city.length < 3 || data.city.length > 100) {
                return { message: 'Institution city must have min 5 character' };
            }
            if (data.state && typeof data.state !== "string") {
                return { message: 'Institution state must be a string' };
            }
            if (data.state && data.state.length < 3 || data.state.length > 100) {
                return { message: 'Institution state must have min 5 character' };
            }
            if (data.country && typeof data.country !== "string") {
                return { message: 'Institution country must be a string' };
            }
            if (data.country && data.country.length < 3 || data.country.length > 100) {
                return { message: 'Institution country must have min 5 character' };
            }
            if (data.postal_code && typeof data.postal_code !== "string") {
                return { message: 'Institution postal code must be a string' };
            }
            if (data.postal_code && data.postal_code.length !== 6) {
                return { message: 'Institution postal code must have 6 character' };
            }
            if (data.fax && typeof data.fax !== "string") {
                return { message: 'Institution fax must be a string' };
            }
            if (data.fax && data.fax.length < 10 || data.fax.length > 100) {
                return { message: 'Institution fax must have min 10 character' };
            }
            if (data.alternate_contact_no && typeof data.alternate_contact_no !== "string") {
                return { message: 'Institution alternate Contact No must be a string' };
            }
            if (data.alternate_contact_no.length < 10 || data.alternate_contact_no.length > 15) {
                return { message: 'Institution alternate Contact No must 10 to 15 character' };
            }
            if (data.telephone && typeof data.telephone !== "string") {
                return { message: 'Institution alternate Contact No must be a string' };
            }
            if (data.telephone.length < 10 || data.telephone.length > 15) {
                z
                return { message: 'Institution alternate Contact No must 10 to 15 character' };
            }
            if (data.email && typeof data.email !== "string") {
                return { message: 'Institution Email must be a string' };
            }
            if (data.email && !validateEmail(data.email)) {
                return { message: 'Invalid email address' };
            }
            if (data.url && typeof data.url !== "string") {
                return { message: 'Institution website URL must be a string' };
            }
            if (data.url && !validURL(data.url)) {
                return { message: 'Invalid website URL' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Institution Logo  URL must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Institution logo URL' };
            }
            if (data.institution_type_id && typeof data.institution_type_id !== "string") {
                return { message: 'Institution institution type must be a string' };
            }
            if (data.institution_type_id && !IsValidUUIDV4(data.institution_type_id)) {
                return { message: 'Invalid Institution type' };
            }
            if (data.group_id && typeof data.group_id !== "string") {
                return { message: 'Institution group must be a string' };
            }
            if (data.group_id && !IsValidUUIDV4(data.group_id)) {
                return { message: 'Invalid group id' };
            }
            if (data.affiliated_type_id && typeof data.affiliated_type_id !== "string") {
                return { message: 'Institution affiliated type must be a string' };
            }
            if (data.affiliated_type_id && !IsValidUUIDV4(data.affiliated_type_id)) {
                return { message: 'Invalid Institution affiliated Type' };
            }
            if (data.university_ref && typeof data.university_ref !== "string") {
                return { message: 'Institution university reference must be a string' };
            }
            if (data.university_ref && !IsValidUUIDV4(data.university_ref)) {
                return { message: 'Invalid Institution university reference' };
            }
            if (data.affiliated_date && typeof data.affiliated_date !== "string") {
                return { message: 'Institution affiliated date must be a string' };
            }
            if (data.affiliated_date && `${new Date(data.affiliated_date.length)}` === "Invalid Date") {
                return { message: 'Invalid Institution affiliated date' };
            }
            if (data.year_of_foundation && typeof data.year_of_foundation !== "string") {
                return { message: 'Institution year of foundation must be a string' };
            }
            if (data.year_of_foundation && !Number.isInteger(parseInt(data.year_of_foundation)) || parseInt(data.year_of_foundation) < 1900 || parseInt(data.year_of_foundation) >= new Date().getFullYear()) {
                return { message: 'Invalid Institution year of foundation' };
            }
        }
    }
    if (model === "discipline") {
        if (method === "create") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Discipline Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Discipline Description must have min 3 and max 200 character' };
            }
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Discipline Name must be a string' };
            }
            if (data.name.length < 3 && data.name.length > 100) {
                return { message: 'Course Name must have min 4 and max 100 character' };
            }
            if (hasNumber.test(data.name) || hasSpecial.test(data.name)) {
                return { message: 'Invalid Discipline name' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Discipline Logo must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid logo' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'org_id is must' };
            }
            if (!IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid discipline id' };
            }
        }
        if (method === "update") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Discipline Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Discipline Description must have min 3 and max 200 character' };
            }
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Discipline Name must be a string' };
            }
            if (data.name && (data.name.length < 3 || data.name.length > 100)) {
                return { message: 'Discipline Name must have min 4 or max 100 character' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'discipline Logo must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid logo' };
            }
        }
    }
    if (model === "program") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Program name must be a string' };
            }
            if (data.name.length < 2 && data.name.length > 100) {
                return { message: 'Course Name must have min 2 and max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Program description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Program description must have min 3 and max 200 character' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Program logo miust be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Program Logo URL' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline Id must be a string' };
            }
            if (!IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid Discipline Id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Program name must be a string' };
            }
            if (data.name && (data.name.length < 2 || data.name.length > 100)) {
                return { message: 'Program name must have min 2 and max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Program description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Program description must have min 3 max 200 character' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Program logo miust be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Program Logo URL' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline Id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid Discipline Id' };
            }
        }
    }
    if (model === "course") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Course Name must be a string' };
            }
            if (data.name.length < 2 && data.name.length > 100) {
                return { message: 'Course Name must have min 5 and max 100 character' };
            }
            if (hasNumber.test(data.name)) {
                return { message: 'Invalid Course name' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Course Description must have min 3 and max 200 character' };
            }
            if (!data.program_id || typeof data.program_id !== "string") {
                return { message: 'Program id must be a string' };
            }
            if (!IsValidUUIDV4(data.program_id)) {
                return { message: 'Invalid Program Id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.nmame !== "string") {
                return { message: 'Course Name must be a string' };
            }
            if (data.name && (data.name.length < 2 || data.name.length > 100)) {
                return { message: 'Course Name must have min 5 and max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Course Description must have min 3 and max 200 character' };
            }
            if (!data.program_id || typeof data.program_id !== "string") {
                return { message: 'Program id must be a string' };
            }
            if (data.program_id && !IsValidUUIDV4(data.program_id)) {
                return { message: 'Invalid Program Id' };
            }
        }
    }
    if (model === "department") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Department Name must be a string' };
            }
            if (data.name.length < 2 || data.name.length > 100) {
                return { message: 'Department Name must have min 2 and max 100 character' };
            }
            if (hasNumber.test(data.name) || hasSpecial.test(data.name)) {
                return { message: 'Invalid Department name' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Department Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Department Description must have min 3 and max 200 character' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Department Logo must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Department Logo' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'Institution id must be a string' };
            }
            if (!IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid Institution Id' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline id must be a string' };
            }
            if (!IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid Discipline Id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.nmame !== "string") {
                return { message: 'Department Name must be a string' };
            }
            if (data.name && (data.name.length < 2 && data.name.length > 100)) {
                return { message: 'Department Name must have min 5 and max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Department Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Department Description must have min 3 and max 200 character' };
            }
            if (data.logo && typeof data.logo !== "string") {
                return { message: 'Department Logo must be a string' };
            }
            if (data.logo && !validURL(data.logo)) {
                return { message: 'Invalid Department Logo' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'Institution id must be a string' };
            }
            if (data.org_id && !IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid Institution Id' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid Discipline Id' };
            }
        }
    }
    if (model === "subject") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Subject name is must be a string' };
            }
            if (data.name.length < 3 || data.name.length > 100) {
                return { message: 'Subject name musbt have min 5 and max 100 character' };
            }
            if (!data.code || typeof data.code !== "string") {
                return { message: 'Subject code must be a string' };
            }
            if (data.code.length < 3 || data.code.length > 50) {
                return { message: 'Subject code must have min 3 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Course Description must have min 3 and max 200 character' };
            }
            if (!data.department_id && typeof data.department_id !== "string") {
                return { message: 'Department id must be a string' };
            }
            if (!IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department Id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Subject name is must be a string' };
            }
            if (data.name && (data.name.length < 3 && data.name.length > 100)) {
                return { message: 'Subject name musbt have min 5 and max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Course Description must have min 3 and max 200 character' };
            }
            if (!data.id && typeof data.id !== "string") {
                return { message: 'Id must be a string' };
            }
            if (data.id && !IsValidUUIDV4(data.id)) {
                return { message: 'Invalid id' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'Organization Id must be a string' };
            }
            if (data.org_id && !IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid id' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline Id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid discipline id' };
            }
            if (!data.department_id || typeof data.department_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (data.department_id && !IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department id' };
            }
        }
    }
    if (model === "subject_mapping") {
        if (method === "create") {
            if (!data.course_batch_id || typeof data.course_batch_id !== "string") {
                return { message: 'Course Batch id must be a string' };
            }
            if (!IsValidUUIDV4(data.course_batch_id)) {
                return { message: 'Invalid Course Batch Id' };
            }
            if (!data.batch_sem_id || typeof data.batch_sem_id !== "string") {
                return { message: 'Batch Sem id must be a string' };
            }
            if (!IsValidUUIDV4(data.batch_sem_id)) {
                return { message: 'Invalid Batch Sem Id' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Subject Mapping Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Subject Mapping Description must have min 3 and max 200 character' };
            }
            if (!data.subject_id || typeof data.subject_id !== "string") {
                return { message: 'Subject id must be a string' };
            }
            if (!IsValidUUIDV4(data.subject_id)) {
                return { message: 'Invalid Subject Id' };
            }
            if (!data.cdm_id || typeof data.cdm_id !== "string") {
                return { message: 'Course department mapping id must be a string' };
            }
            if (!IsValidUUIDV4(data.cdm_id)) {
                return { message: 'Invalid Course department mapping id' };
            }
        }
        if (method === "update") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Subject Mapping Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Subject Mapping Description must have min 3 and max 200 character' };
            }
            if (!data.subject_id || typeof data.subject_id !== "string") {
                return { message: 'Subject id must be a string' };
            }
            if (data.subject_id && !IsValidUUIDV4(data.subject_id)) {
                return { message: 'Invalid Subject Id' };
            }
            if (!data.cdm_id || typeof data.cmd_id !== "string") {
                return { message: 'Course department mapping id must be a string' };
            }
            if (data.cdm_id && !IsValidUUIDV4(data.cmd_id)) {
                return { message: 'Invalid Course department mapping id' };
            }
        }
    }
    if (model === "course_department_mapping") {
        if (method === "create") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Department Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Course Department Description must have min 3 and max 200 character' };
            }
            if (!data.course_duration_id || typeof data.course_duration_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (!IsValidUUIDV4(data.course_duration_id)) {
                return { message: 'Invalid Course Duration Id' };
            }
            if (!data.department_id || typeof data.department_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (!IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department Id' };
            }
            if (!data.course_id || typeof data.course_id !== "string") {
                return { message: 'Course Id must be a string' };
            }
            if (!IsValidUUIDV4(data.course_id)) {
                return { message: 'Invalid Course Id' };
            }
        }
        if (method === "update") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Course Department Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Course Department Description must have min 3 and max 200 character' };
            }
            if (!data.course_duration_id || typeof data.course_duration_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (data.course_duration_id && !IsValidUUIDV4(data.course_duration_id)) {
                return { message: 'Invalid Course Duration Id' };
            }
            if (data.department_id && typeof data.department_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (data.department_id && !IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department Id' };
            }
            if (data.course_id && typeof data.course_id !== "string") {
                return { message: 'Course Id must be a string' };
            }
            if (data.course_id && !IsValidUUIDV4(data.course_id)) {
                return { message: 'Invalid Course Id' };
            }
        }
    }
    if (model === "topic") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Topic name must be string' };
            }
            if (data.name.length < 3 || data.name.length > 100) {
                return { message: 'Topic name must have min 3 or max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Topic Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Topic description must have min 3 and max 200 character' };
            }
            if (!data.subject_id || typeof data.subject_id !== "string") {
                return { message: 'Subject id must be a string' };
            }
            if (!IsValidUUIDV4(data.subject_id)) {
                return { message: 'Invalid Subject Id' };
            }
        }
        if (method === "upadte") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Topic name must be string' };
            }
            if (data.name && (data.name.length < 3 || data.name.length > 100)) {
                return { message: 'Topic name must have min 3 or max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Topic Description must be a string' };
            }
            if (data.description && (data.description.length < 3 || data.description.length > 200)) {
                return { message: 'Topic description must have min 3 and max 200 character' };
            }
            if (!data.id || typeof data.id !== "string") {
                return { message: 'Id must be a string' };
            }
            if (data.id && !IsValidUUIDV4(data.id)) {
                return { message: 'Invalid Id' };
            }
            if (data.org_id || typeof data.org_id !== "string") {
                return { message: 'Organization Id must be a string' };
            }
            if (data.org_id && !IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid id' };
            }
            if (data.discipline_id && typeof data.discipline_id !== "string") {
                return { message: 'Discipline Id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid discipline id' };
            }
            if (data.department_id && typeof data.department_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (data.department_id && !IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department id' };
            }
            if (!data.subject_id || typeof data.subject_id !== "string") {
                return { message: 'Subject Id must be a string' };
            }
            if (data.subject_id && !IsValidUUIDV4(data.subject_id)) {
                return { message: 'Invalid Subject id' };
            }
        }
    }
    if (model === "sub_topic") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Sub Topic name must be string' };
            }
            if (data.name.length < 3 || data.name.length > 100) {
                return { message: 'Sub Topic name must have min 3 or max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Sub Topic Description must be a string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'Sub Topic description must have min 3 and max 200 character' };
            }
            if (!data.topic_id || typeof data.topic_id !== "string") {
                return { message: 'Topic id must be a string' };
            }
            if (!IsValidUUIDV4(data.topic_id)) {
                return { message: 'Invalid Topic Id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Sub Topic name must be string' };
            }
            if (data.name && (data.name.length < 3 || data.name.length > 100)) {
                return { message: 'Sub Topic name must have min 3 or max 100 character' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Sub Topic Description must be a string' };
            }
            if (data.description && (data.description.length < 3 && data.description.length > 200)) {
                return { message: 'Sub Topic description must have min 3 and max 200 character' };
            }
            if (!data.id || typeof data.id !== "string") {
                return { message: 'id must be a string' };
            }
            if (data.id && !IsValidUUIDV4(data.id)) {
                return { message: 'Invalid Id' };
            }
            if (data.org_id && typeof data.org_id !== "string") {
                return { message: 'Organization Id must be a string' };
            }
            if (data.org_id && !IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid id' };
            }
            if (data.discipline_id && typeof data.discipline_id !== "string") {
                return { message: 'Discipline Id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid discipline id' };
            }
            if (data.department_id && typeof data.department_id !== "string") {
                return { message: 'Department Id must be a string' };
            }
            if (data.department_id && !IsValidUUIDV4(data.department_id)) {
                return { message: 'Invalid Department id' };
            }
            if (data.subject_id && typeof data.subject_id !== "string") {
                return { message: 'Subject Id must be a string' };
            }
            if (data.subject_id && !IsValidUUIDV4(data.subject_id)) {
                return { message: 'Invalid Subject id' };
            }
            if (data.topic_id && typeof data.topic_id !== "string") {
                return { message: 'Topic Id must be a string' };
            }
            if (data.topic_id && !IsValidUUIDV4(data.topic_id)) {
                return { message: 'Invalid Topic id' };
            }
        }
    }
    if (model === "section") {
        if (method === "create") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Section name must be string' };
            }
            if (data.name.length < 1 || data.name.length > 100) {
                return { message: 'Section name must have min 1 or max 100 character' };
            }
            if (hasNumber.test(data.name) || hasSpecial.test(data.name)) {
                return { message: 'Invalid Section Name' };
            }
            if (!data.cdm_id || typeof data.cdm_id !== "string") {
                return { message: 'Course department mapping id must be a string' };
            }
            if (!IsValidUUIDV4(data.cdm_id)) {
                return { message: 'Invalid Course department mapping id' };
            }
            if (!data.course_batch_id || typeof data.course_batch_id !== "string") {
                return { message: 'Course Batch id must be a string' };
            }
            if (!IsValidUUIDV4(data.course_batch_id)) {
                return { message: 'Invalid Course Batch id' };
            }
        }
        if (method === "update") {
            if (!data.name || typeof data.name !== "string") {
                return { message: 'Section name must be string' };
            }
            if (data.name && (data.name.length < 1 || data.name.length > 100)) {
                return { message: 'Section name must have min 1 or max 100 character' };
            }
            if (!data.id || typeof data.id !== "string") {
                return { message: 'Id must be a string' };
            }
            if (data.id && !IsValidUUIDV4(data.id)) {
                return { message: 'Invalid Id' };
            }
            if (!data.org_id || typeof data.org_id !== "string") {
                return { message: 'Organization id must be a string' };
            }
            if (data.org_id && !IsValidUUIDV4(data.org_id)) {
                return { message: 'Invalid Organization id' };
            }
            if (!data.discipline_id || typeof data.discipline_id !== "string") {
                return { message: 'Discipline id must be a string' };
            }
            if (data.discipline_id && !IsValidUUIDV4(data.discipline_id)) {
                return { message: 'Invalid Discipline id' };
            }
            if (!data.cdm_id || typeof data.cdm_id !== "string") {
                return { message: 'Course department mapping id must be a string' };
            }
            if (data.cdm_id && !IsValidUUIDV4(data.cdm_id)) {
                return { message: 'Invalid Course department mapping id' };
            }
            if (!data.course_batch_id || typeof data.course_batch_id !== "string") {
                return { message: 'Course Batch Id is must be a string' };
            }
            if (data.course_batch_id && !IsValidUUIDV4(data.course_batch_id)) {
                return { message: 'Invalid Course Batch Id' };
            }
        }
    }
    if (model === "time_frame") {
        if (method === "create") {
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Time frame description must be string' };
            }
            if (data.description.length < 3 || data.description.length > 200) {
                return { message: 'time frame description must have min 3 and max 200 character' };
            }
            if (!data.session_start_time || typeof data.session_start_time !== "string") {
                return { message: 'time frame session start time must be a string' };
            }
            if (`${new Date(`${todays()} ${data.session_start_time}`)}` === "Invalid Date") {
                return { message: 'Invalid session start time' };
            }
            if (!data.session_end_time || typeof data.session_end_time !== "string") {
                return { message: 'time frame session end time must be a string' };
            }
            if (`${new Date(`${todays()} ${data.session_end_time}`)}` === "Invalid Date") {
                return { message: 'Invalid session end time' };
            }
            if (!data.program_id || typeof data.program_id !== "string") {
                return { message: 'Program id must be a string' };
            }
            if (!IsValidUUIDV4(data.program_id)) {
                return { message: 'Invalid Program id' };
            }
        }
        if (method === "update") {
            if (!data.id && typeof data.id !== "string") {
                return { message: 'Id must be string' };
            }
            if (data.id && !IsValidUUIDV4(data.id)) {
                return { message: 'Invalid Id' };
            }
            if (!data.description || typeof data.description !== "string") {
                return { message: 'Time frame description must be string' };
            }
            if (data.description && data.description.length < 3 && data.description.length > 200) {
                return { message: 'time frame description must have min 3 and max 200 character' };
            }
            if (!data.session_start_time || typeof data.session_start_time !== "string") {
                return { message: 'time frame session start time must be a string' };
            }
            if (data.session_start_time && `${new Date(`${todays()} ${data.session_start_time}`)}` === "Invalid Date") {
                return { message: 'Invalid session start time' };
            }
            if (!data.session_end_time || typeof data.session_end_time !== "string") {
                return { message: 'time frame session end time must be a string' };
            }
            if (data.session_end_time && `${new Date(`${todays()} ${data.session_end_time}`)}` === "Invalid Date") {
                return { message: 'Invalid session end time' };
            }
        }
    }
    return null;
}

const yearValidation = (years) => {
    var text = /^[0-9]+$/;
    if (String(years).length === 4 || typeof parseInt(years) === 'number') {
        let year = parseInt(years);
        if (year != 0) {
            if (!text.test(String(year))) {
                return false;
            }
            if (String(year).length != 4) {
                return false;
            }
            var current_year = new Date().getFullYear();
            if ((year < 1088) || (year > current_year)) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

exports.yearValidation = yearValidation;