const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let time_day = sequelize.define('time_day', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        org_id: {
            type: DataTypes.UUID
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        order: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique:true
        },
        code: {
            type: DataTypes.STRING(10),
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

    time_day.associate = function (models) {
        time_day.hasMany(models.time_day, {
            foreignKey: '_id'
        });
        time_day.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        time_day.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        time_day.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
    }

    return time_day;
}