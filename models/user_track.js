const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_track = sequelize.define('user_track', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        device: {
            type: DataTypes.JSON
        },
        key: {
            type: DataTypes.STRING
        },
        owner: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        org_id: {
            type: DataTypes.UUID
        },
        login_at: {
            type: DataTypes.DATE
        },
        logout_at: {
            type: DataTypes.DATE
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

    user_track.associate = function (models) {
        user_track.hasMany(models.user_track, {
            foreignKey: '_id'
        });
        user_track.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        user_track.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        user_track.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        user_track.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
    }

    return user_track;
}