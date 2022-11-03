const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let kode_role_menu_mapping = sequelize.define('kode_role_menu_mapping', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        access: {
            type: DataTypes.JSON,
            allowNull: false
        },
        role_id: {
            type: DataTypes.UUID
        },
        menu_id: {
            type: DataTypes.UUID
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

    kode_role_menu_mapping.associate = function (models) {
        kode_role_menu_mapping.hasMany(models.kode_role_menu_mapping, {
            foreignKey: '_id'
        });
        kode_role_menu_mapping.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        kode_role_menu_mapping.belongsTo(models.kode_role, {
            foreignKey: 'role_id',
            as: 'roleDetails'
        });
        kode_role_menu_mapping.belongsTo(models.menu, {
            foreignKey: 'menu_id',
            as: 'menuDetails'
        });
        kode_role_menu_mapping.belongsTo(models.user_data, {
            as: 'createdBy',
            foreignKey: 'createdby'
        });
        kode_role_menu_mapping.belongsTo(models.user_data, {
            as: 'updatedBy',
            foreignKey: 'updatedby'
        });

    }

    return kode_role_menu_mapping;
}