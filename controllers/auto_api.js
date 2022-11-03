const { discipline, organization, program, user_data, course_batch, course_department_mapping, batch_sem, time_table, assignment_bank, assignment_student } = require("../models");
const { Op } = require("sequelize");
const { IsValidUUIDV4, getQuery } = require('../service/validation');
const HttpStatus = require('http-status');
const { isNull, isEmpty, ReE, to, ReS, generateCode } = require("../service/util.service");
const { CONFIG } = require("../config/confifData");
const moment = require('moment');

const autoUpdateTable = async (body) => {

    let err;

    let getSem, optionSem = {
        where: {
            is_active: true,
            is_block: false,
        }
    };

    if (!CONFIG.boolean.includes(body.status)) {
        return { message: "Please select vaild status!.", success: false };
    }

    let fDate = moment();

    fDate = fDate.set({ h: 00, m: 01 });

    if (body.status == true) {

        optionSem.where = {
            ...optionSem.where,
            from: { [Op.lte]: fDate._d }
        }

    }

    if (body.status == false) {

        optionSem.where = {
            ...optionSem.where,
            to: { [Op.lte]: moment()._d }
        }
    }

    [err, getSem] = await to(batch_sem.findAll(optionSem));

    if (err) {
        return { message: err, success: false };
    }

    if (isEmpty(getSem)) {
        return { message: "No date have to update!.", success: false };
    }

    let batchIds = [], updatedTime = [], updatedBatch = [];

    getSem.map(x => {
        if (!batchIds.includes(x.course_batch_id)) {
            batchIds.push(x.course_batch_id);
        }
    });

    let updatedValue = [], updateValue = [];

    for (let index = 0; index < batchIds.length; index++) {
        const element = batchIds[index];

        let checkTimeTable, checkTimeTableData = {
            where: {
                course_batch_id: element,
                is_active: true,
                is_block: false,
            }
        };

        if (body.status == false) {

            checkTimeTableData.where = {
                ...checkTimeTableData.where,
                active: true,
                current: true
            }
        }

        if (body.status == true) {

            checkTimeTableData.where = {
                ...checkTimeTableData.where,
                active: true,
                current: false
            }
        };

        [err, checkTimeTable] = await to(time_table.findAll(checkTimeTableData));


        if (isEmpty(checkTimeTable)) {
            updatedValue.push(element);
        }


        if (!isEmpty(checkTimeTable)) {
            updateValue.push(element);
        }

    }

    if (!isEmpty(updateValue)) {
        for (let index = 0; index < updateValue.length; index++) {
            const element = updateValue[index];

            let updateTimeTable, updateTimeTableData = {
                where: {
                    course_batch_id: element,
                    is_active: true,
                    is_block: false,
                },
                set: {

                }
            };

            if (body.status == true) {

                updateTimeTableData.where = {
                    ...updateTimeTableData.where,
                    active: true,
                    current: false
                }

                updateTimeTableData.set = {
                    ...updateTimeTableData.set,
                    current: true
                }
            }

            if (body.status == false) {

                updateTimeTableData.where = {
                    ...updateTimeTableData.where,
                    active: true,
                    current: true
                }

                updateTimeTableData.set = {
                    ...updateTimeTableData.set,
                    active: false,
                    current: false
                }
            };

            [err, updateTimeTable] = await to(time_table.update(updateTimeTableData.set, { where: updateTimeTableData.where }));


            if (!isNull(updateTimeTable)) {
                updatedTime.push(`Time table was updated!`);
            }

        }

    }

    let aUpdated = [], updateData = [];


    for (let index = 0; index < getSem.length; index++) {
        const element = getSem[index];

        let checkBatch, checkBatchData = {
            where: {
                _id: element.course_batch_id,
                is_active: true,
                is_block: false,
            }
        };

        if (body.status == true) {

            checkBatchData.where = {
                ...checkBatchData.where,
                current_sim: element._id
            }
        }

        if (body.status == false) {

            checkBatchData.where = {
                ...checkBatchData.where,
                current_sim: null
            }
        };

        [err, checkBatch] = await to(course_batch.findOne(checkBatchData));


        if (!isNull(checkBatch)) {
            aUpdated.push(element);
        }

        if (isNull(checkBatch)) {
            updateData.push(element);
        }

    }

    if (!isEmpty(updateData)) {
        for (let index = 0; index < getSem.length; index++) {
            const element = getSem[index];

            let updateBatch, updateBatchData = {
                where: {
                    _id: element.course_batch_id,
                    is_active: true,
                    is_block: false,
                },
                set: {

                }
            };

            if (body.status == true) {

                updateBatchData.set = {
                    ...updateBatchData.set,
                    current_sim: element._id
                }
            }

            if (body.status == false) {

                updateBatchData.set = {
                    ...updateBatchData.set,
                    current_sim: null
                }
            };

            [err, updateBatch] = await to(course_batch.update(updateBatchData.set, { where: updateBatchData.where }));


            if (!isNull(updateBatch)) {
                updatedBatch.push(`Batch was updated!`);
            }

        }
    }


    if ((isEmpty(updateData) && !isEmpty(aUpdated)) || (isEmpty(updateValue) && !isEmpty(updatedValue))) {
        return { message: "No data have to update!.", success: false };
    }

    if (isEmpty(updatedBatch) && isEmpty(updatedTime)) {
        return { message: `Something went wrong to update details!.`, success: false };
    }


    return { message: `Details was updated!.`, success: true };
}

const autoUpdateAssignment = async (body) => {

    let today = moment.tz(new Date(), 'Asia/Calcutta')._d;

    let err, assignemnetBanks, optionAssignmentBank = {
        where: {
            is_active: true,
            to: { [Op.lt]: today }
        }
    };

    [err, assignemnetBanks] = await to(assignment_bank.findAll(optionAssignmentBank));

    if (err) {
        return { message: err, status: false };
    }

    if (isEmpty(assignemnetBanks)) {
        return { message: "No assignment detials have to update!.", success: false };
    }

    let errBank = [], vaildBank = [];

    for (let index = 0; index < assignemnetBanks.length; index++) {
        let element = assignemnetBanks[index];

        let studentAssignment, studentOption = {
            where: {
                assignment_bank_id: element._id,
                is_active: true,
                is_block: false
            }
        };

        [err, studentAssignment] = await to(assignment_student.findAll({}))
    }

}

module.exports = { autoUpdateTable }