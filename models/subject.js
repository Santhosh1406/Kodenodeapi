const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let subject = sequelize.define('subject', {
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
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        org_id: {
            type: DataTypes.UUID
        },
        discipline_id: {
            type: DataTypes.UUID
        },
        department_id: {
            type: DataTypes.UUID
        },
        practical: {
            type: DataTypes.BOOLEAN,
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

    subject.associate = function (models) {
        subject.hasMany(models.subject, {
            foreignKey: '_id'
        });
        subject.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        subject.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        subject.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        subject.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        subject.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return subject;
}