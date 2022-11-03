const { autoUpdateTable } = require("../../controllers/auto_api")

const autoApi = async () => {
    console.log("calling");
    const updateCompletedSem = await autoUpdateTable({ status: false });

    if (updateCompletedSem) {
        console.log(updateCompletedSem, "Update completed semester!");
    }

    const updateStartedSem = await autoUpdateTable({ status: true });

    if (updateStartedSem) {
        console.log(updateStartedSem, "Update started semester!");
    }

}

module.exports = { autoApi }