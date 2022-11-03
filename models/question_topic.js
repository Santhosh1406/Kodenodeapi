
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let question_topic = sequelize.define('question_topic', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        code: {
            type: DataTypes.STRING(50),
            unique: true,
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
        program_id: {
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
        sub_topic_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        question_bank_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
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

    question_topic.associate = function (models) {
        question_topic.hasMany(models.question_bank, {
            foreignKey: '_id'
        });
        question_topic.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        question_topic.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        question_topic.belongsTo(models.topic, {
            foreignKey: 'topic_id',
            as: 'topicId'
        });
        question_topic.belongsTo(models.question_bank, {
            foreignKey: 'question_bank_id',
            as: 'questionBankId'
        });
        question_topic.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        question_topic.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        question_topic.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        question_topic.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        question_topic.belongsTo(models.question_type, {
            foreignKey: 'question_type_id',
            as: 'questionTypeId'
        });
        question_topic.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        question_topic.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return question_topic;
}
