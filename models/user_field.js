const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_field = sequelize.define('user_field', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        label:{
            type: DataTypes.STRING(100),
        },
        name: {
            type: DataTypes.STRING(100),
        },
        required: {
            type: DataTypes.BOOLEAN,
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

    user_field.associate = function (models) {
        user_field.hasMany(models.user_field, {
            foreignKey: '_id'
        });
        user_field.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        user_field.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
    }

    return user_field;
}