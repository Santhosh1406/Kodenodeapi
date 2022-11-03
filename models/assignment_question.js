
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let assignment_question = sequelize.define('assignment_question', {
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
        assignment_bank_id:{
            type: DataTypes.UUID,
            allowNull:false
        },
        question_bank_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        question_id: {
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
        cdm_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        course_batch_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        batch_sem_id: {
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

    assignment_question.associate = function (models) {
        assignment_question.hasMany(models.assignment_question, {
            foreignKey: '_id'
        });
        assignment_question.belongsTo(models.question, {
            foreignKey: 'question_id',
            as:'questionId'
        });
        assignment_question.belongsTo(models.question_bank, {
            foreignKey: 'question_bank_id',
            as:'questionBankId'
        });
        assignment_question.belongsTo(models.assignment_bank, {
            foreignKey: 'assignment_bank_id',
            as:'assignmentBankId'
        });
        assignment_question.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        assignment_question.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        assignment_question.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        assignment_question.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        assignment_question.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as: 'cdmId'
        });
        assignment_question.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as: 'courseBatchId'
        });
        assignment_question.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as: 'batchSemId'
        });
        assignment_question.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        assignment_question.belongsTo(models.topic, {
            foreignKey: 'topic_id',
            as: 'topicId'
        });
        assignment_question.belongsTo(models.sub_topic, {
            foreignKey: 'sub_topic_id',
            as: 'subTopicId'
        });
        assignment_question.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        assignment_question.belongsTo(models.question_type, {
            foreignKey: 'question_type_id',
            as: 'questionTypeId'
        });
        assignment_question.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        assignment_question.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return assignment_question;
}