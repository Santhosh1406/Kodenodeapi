const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let affiliated_type = sequelize.define('affiliated_type', {
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
        status: {
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

    affiliated_type.associate = function (models) {
        affiliated_type.hasMany(models.affiliated_type, {
            foreignKey: '_id'
        });
        affiliated_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        affiliated_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return affiliated_type;
}