const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let support_ticket = sequelize.define('support_ticket', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        ticket_no: {
            allowNull: false,
            type: DataTypes.STRING(12),
            uniue: true
        },
        support_type: {
            type: DataTypes.UUID
        },
        device_details: {
            type: DataTypes.JSON,
            allowNull: false
        },
        remarks: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM({ values: ['NOT-ASSIGNED', 'PENDING', 'CLOSED', 'COMPLEDED', 'REJECTED'] }),
        },
        opendate: {
            type: DataTypes.STRING(10)
        },
        closedate: {
            type: DataTypes.STRING(10)
        },
        resolve_remarks: {
            type: DataTypes.STRING(200)
        },
        assignedto: {
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

    support_ticket.associate = function (models) {
        support_ticket.hasMany(models.support_type, {
            foreignKey: '_id'
        });
        support_ticket.belongsTo(models.user_data, {
            foreignKey: 'assignedto',
            as: 'assignedTo'
        });
        support_ticket.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        support_ticket.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
        support_ticket.belongsTo(models.support_type, {
            foreignKey: 'support_type',
            as: 'supportType'
        })

    }

    return support_ticket;
}