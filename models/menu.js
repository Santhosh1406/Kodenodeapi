const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let menu = sequelize.define('menu', {
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
        label:{
            type: DataTypes.STRING(200)
        },
        user: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        ref_role_id: {
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

    menu.associate = function (models) {
        menu.hasMany(models.menu, {
            foreignKey: '_id'
        });
        menu.hasMany(models.kode_role, {
            foreignKey: 'ref_role_id',
            as:'refRoleDetails'
        });
        menu.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        menu.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return menu;
}