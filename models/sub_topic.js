const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let sub_topic = sequelize.define('sub_topic', {
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
        topic_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        org_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        discipline_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        department_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        topic_id: {
            type: DataTypes.UUID,
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
            allowNull: false
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

    sub_topic.associate = function (models) {
        sub_topic.hasMany(models.sub_topic, {
            foreignKey: '_id'
        });
        sub_topic.belongsTo(models.topic, {
            foreignKey: 'topic_id',
            as:'topicId'
        });
        sub_topic.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as:'subjectId'
        });
        sub_topic.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        sub_topic.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        sub_topic.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        sub_topic.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        sub_topic.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return sub_topic;
}