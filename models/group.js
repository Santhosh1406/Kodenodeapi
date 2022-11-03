const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let group = sequelize.define('group', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false
        },
        no_branch: {
            type: DataTypes.STRING(10),
            allowNull: false
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

    group.associate = function (models) {
        group.hasMany(models.group, {
            foreignKey: '_id'
        });
        group.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        group.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        group.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return group;
}