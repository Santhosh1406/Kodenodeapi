const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let topic = sequelize.define('topic', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        subject_code: {
            type: DataTypes.STRING(50),
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
        subject_id: {
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

    topic.associate = function (models) {
        topic.hasMany(models.topic, {
            foreignKey: '_id'
        });
        topic.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as:'subjectId'
        });
        topic.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        topic.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        topic.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        topic.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        topic.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return topic;
}