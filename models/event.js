const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let event = sequelize.define('event', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        one_line: {
            type: DataTypes.STRING(400),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        org_id: {
            type: DataTypes.UUID,
            allowNull:false
        },
        event_date: {
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

    event.associate = function (models) {
        event.hasMany(models.event, {
            foreignKey: '_id'
        });
        event.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        event.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        event.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return event;
}