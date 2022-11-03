
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let question = sequelize.define('question', {
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
        description: {
            type: DataTypes.STRING(300)
        },
        question_bank_id: {
            type: DataTypes.UUID,
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
            type: DataTypes.UUID,
            allowNull: false
        },
        question_type_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        question: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        option: {
            type: DataTypes.JSON
        },
        correct_answer: {
            type: DataTypes.JSON,
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

    question.associate = function (models) {
        question.hasMany(models.question, {
            foreignKey: '_id'
        });
        question.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        question.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        question.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        question.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        question.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        question.belongsTo(models.topic, {
            foreignKey: 'topic_id',
            as: 'topicId'
        });
        question.belongsTo(models.sub_topic, {
            foreignKey: 'sub_topic_id',
            as: 'subTopicId'
        });
        question.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        question.belongsTo(models.question_bank, {
            foreignKey: 'question_bank_id',
            as: 'questionBankId'
        });
        question.belongsTo(models.question_type, {
            foreignKey: 'question_type_id',
            as: 'questionTypeId'
        });
        question.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        question.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return question;
}