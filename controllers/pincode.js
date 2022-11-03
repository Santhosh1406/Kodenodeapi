const HttpStatus = require('http-status');
const PincodeData = require('../service/store/pincode.json');
const CountryData = require('../service/store/country.json');
const { isEmpty, ReE, ReS, isNull } = require('../service/util.service');

module.exports.getAllCountry = async (req, res) => {
    const user = req.user;

    if (isEmpty(CountryData)) {
        return ReE(res, { message: "Country not exits!." }, HttpStatus.BAD_REQUEST);
    }


    const countryIds = [];

    let country = CountryData.filter(element => {
        const isDuplicate = countryIds.includes(element.countryName);

        if (!isDuplicate) {
            countryIds.push(element.countryName);

            return true;
        }

        return false;
    });

    if (!isNull(req.query.country)) {
        country = country.filter(x => (String(x.countryName).replace(' ', '').toLowerCase() == String(req.query.country).replace(' ', '').toLowerCase()))
    }

    if (isEmpty(country)) {
        return ReE(res, { message: "Country was not found!." }, HttpStatus.BAD_REQUEST);
    }

    if (!isEmpty(country)) {
        return ReS(res, { message: "Country was fatched!.", country }, HttpStatus.OK);
    }
}

module.exports.getAllState = async (req, res) => {
    const user = req.user;

    if (isEmpty(PincodeData)) {
        return ReE(res, { message: `State not exits!.` }, HttpStatus.BAD_REQUEST);
    }

    const stateIds = [];

    let state = PincodeData.filter(element => {
        const isDuplicate = stateIds.includes(element.stateName);

        if (!isDuplicate) {
            stateIds.push(element.stateName);

            return true;
        }

        return false;
    });

    if (!isNull(req.query.state)) {
        state = state.filter(x => (String(x.stateName).replace(' ', '').toLowerCase() == String(req.query.state).replace(' ', '').toLowerCase()))
    }

    if (isEmpty(state)) {
        return ReE(res, { message: "State was not found!." }, HttpStatus.BAD_REQUEST);
    }

    state.sort((a, b) => (a.pincode > b.pincode) ? 1 : -1);

    if (!isEmpty(state)) {
        return ReS(res, { message: "State was fatched!.", state }, HttpStatus.OK);
    }
}

module.exports.getAllDistrict = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (isEmpty(PincodeData)) {
        return ReE(res, { message: `State not exits!.` }, HttpStatus.BAD_REQUEST);
    }

    let array = PincodeData;

    if (!isNull(body.state)) {

        array = PincodeData.filter(element => {
            if (String(element.stateName).replace(' ', '').toLowerCase() == String(body.state).replace(' ', '').toLowerCase()) {
                return true
            }
        });

        if (isEmpty(array)) {
            return ReE(res, { message: `${body.state} was not found!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    const districtIds = [];

    let district = array.filter(element => {
        const isDuplicate = districtIds.includes(element.districtName);

        if (!isDuplicate) {
            districtIds.push(element.districtName);

            return true;
        }

        return false;
    });

    if (!isNull(req.query.district)) {
        district = district.filter(x => (String(x.districtName).replace(' ', '').toLowerCase() == String(body.districtName).replace(' ', '').toLowerCase()))
    }

    if (isEmpty(district)) {
        return ReE(res, { message: "District was not found!." }, HttpStatus.BAD_REQUEST);
    }

    district.sort((a, b) => (a.pincode > b.pincode) ? 1 : -1);

    if (!isEmpty(district)) {
        return ReS(res, { message: "District was fatched!.", district }, HttpStatus.OK);
    }
}

module.exports.getAllPincode = async (req, res) => {
    const user = req.user;

    let body = req.query;

    if (isEmpty(PincodeData)) {
        return ReE(res, { message: `State not exits!.` }, HttpStatus.BAD_REQUEST);
    }

    let array = PincodeData;

    if (!isNull(body.district)) {

        array = PincodeData.filter(element => {
            if (String(element.districtName).replace(' ', '').toLowerCase() == String(body.district).replace(' ', '').toLowerCase()) {
                return true
            }
        });

        if (isEmpty(array)) {
            return ReE(res, { message: `${body.district} was not found!.` }, HttpStatus.BAD_REQUEST);
        }
    }

    const pincodeIds = [];

    let pincode = array.filter(element => {
        const isDuplicate = pincodeIds.includes(element.pincode);

        if (!isDuplicate) {
            pincodeIds.push(element.pincode);

            return true;
        }

        return false;
    });

    if (!isNull(req.query.pincode)) {
        pincode = pincode.filter(x => (String(x.pincode).replace(' ', '').toLowerCase() == String(body.pincode).replace(' ', '').toLowerCase()))
    }

    if (isEmpty(pincode)) {
        return ReE(res, { message: "Pincode was not found!." }, HttpStatus.BAD_REQUEST);
    }

    pincode.sort((a, b) => (a.pincode > b.pincode) ? 1 : -1);

    if (!isEmpty(pincode)) {
        return ReS(res, { message: "Pincode was fatched!.", pincode }, HttpStatus.OK);
    }
}