const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let leave = sequelize.define('leave', {
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
        type: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        org_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
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

    leave.associate = function (models) {
        leave.hasMany(models.leave, {
            foreignKey: '_id'
        });
        leave.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        leave.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        leave.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        leave.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return leave;
}