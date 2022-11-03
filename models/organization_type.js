const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let organization_type = sequelize.define('organization_type', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        type: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        professional: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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

    organization_type.associate = function (models) {
        organization_type.hasMany(models.organization_type, {
            foreignKey: '_id'
        });
        organization_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        organization_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return organization_type;
}