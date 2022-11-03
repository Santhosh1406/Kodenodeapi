const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_fields_mapping = sequelize.define('user_fields_mapping', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        menu_id: {
            type: DataTypes.UUID,
        },
        field_id:{
            type: DataTypes.UUID,
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

    user_fields_mapping.associate = function (models) {
        user_fields_mapping.hasMany(models.user_fields_mapping, {
            foreignKey: '_id'
        });
        user_fields_mapping.belongsTo(models.user_field, {
            foreignKey: 'field_id',
            as:'fieldDetails'
        });
        user_fields_mapping.belongsTo(models.menu, {
            foreignKey: 'menu_id',
            as:'menuDetails'
        });
        user_fields_mapping.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        user_fields_mapping.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return user_fields_mapping;
}