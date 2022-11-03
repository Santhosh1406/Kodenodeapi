const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let role = sequelize.define('role', {
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
        org_id: {
            type: DataTypes.UUID
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

    role.associate = function (models) {
        role.hasMany(models.role, {
            foreignKey: '_id'
        });
        role.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        role.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        role.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return role;
}