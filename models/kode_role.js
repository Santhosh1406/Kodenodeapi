const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let kode_role = sequelize.define('kode_role', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        code:{
            type: DataTypes.STRING(50),
            allowNull:false,
            unique: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_block: {
            type: DataTypes.BOOLEAN,
            allowNull: false
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

    kode_role.associate = function (models) {
        kode_role.hasMany(models.kode_role, {
            foreignKey: '_id'
        });
        kode_role.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        kode_role.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return kode_role;
}