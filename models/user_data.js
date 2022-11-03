const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { TE, isNull, to } = require('../service/util.service');
const { CONFIG } = require('../config/confifData');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_data = sequelize.define('user_data', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        f_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        l_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        username: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        user_unique_id: {
            type: DataTypes.STRING(100)
        },
        surname: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        countrycode: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        dob: {
            type: DataTypes.DATE,
            allowNull: false
        },
        mother_name: {
            type: DataTypes.STRING(50)
        },
        father_name: {
            type: DataTypes.STRING(50)
        },
        blood_group: {
            type: DataTypes.STRING(50)
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        emergency_contact: {
            type: DataTypes.STRING(50),
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false,
            max: 15
        },
        address: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        city: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        state: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        country: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        pincode: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_block: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        email_otp: {
            type: DataTypes.STRING
        },
        phone_otp: {
            type: DataTypes.STRING
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        phone_verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        owner: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        user_info: {
            type: DataTypes.UUID
        },
        createdby: {
            type: DataTypes.UUID,
        },
        updatedby: {
            type: DataTypes.UUID,
        },
        createddate: {
            type: 'TIMESTAMP',
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false
        },
        updateddate: {
            type: 'TIMESTAMP',
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false
        }
    }, { schema: config.schema });


    user_data.beforeSave('create', async function (next) {

        if (isNull(this.password)) {
            return
        }

        if (this.isModified('`password`') || this.isNew) {

            let err, salt, hash;
            [err, salt] = await to(bcrypt.genSalt(10))
            if (err) TE(err.message, true);

            [err, hash] = await to(bcrypt.hash(this.password, salt))
            if (err) TE(err.message, true)

            this.password = hash

        } else {
            return next()
        }
    });

    user_data.prototype.comparePassword = async function (pw) {

        let err, pass
        if (!this.password) TE('password not set');
        [err, pass] = await to(bcrypt.compare(pw, this.password))
        if (err) TE(err)

        if (!pass) return null

        return this

    }

    user_data.prototype.getJWT = function () {
        let expiration_time = parseInt(CONFIG.jwt_expiration)
        return 'Bearer ' + jwt.sign({ _id: this._id, userName: this.user_name }, CONFIG.jwt_encryption,
            { expiresIn: expiration_time })
    }

    user_data.prototype.toWeb = function () {
        let json = this.toJSON()
        json.id = this._id//this is for the front end
        json.password = undefined
        return json
    }

    user_data.associate = function (models) {
        user_data.hasMany(models.user_data, {
            foreignKey: '_id'
        });
        user_data.belongsTo(models.user_info, {
            foreignKey: 'user_info',
            as: 'userInfo'
        });
    }

    return user_data;
}