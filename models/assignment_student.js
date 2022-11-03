
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let assignment_student = sequelize.define('assignment_student', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        assignment_bank_id: {
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
        question_bank_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        assignment_bank_type_id:{
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        topic_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
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
        student_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        faculty_id: {
            type: DataTypes.UUID
        },
        from: {
            type: DataTypes.DATE
        },
        to: {
            type: DataTypes.DATE
        },
        question: {
            type: DataTypes.JSON
        },
        total_count: {
            type: DataTypes.INTEGER
        },
        total_mark: {
            type: DataTypes.INTEGER
        },
        completed_count: {
            type: DataTypes.INTEGER
        },
        mark: {
            type: DataTypes.INTEGER
        },
        status: {
            type: DataTypes.JSON,
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

    assignment_student.associate = function (models) {
        assignment_student.hasMany(models.assignment_student, {
            foreignKey: '_id'
        });
        assignment_student.belongsTo(models.assignment_bank, {
            foreignKey: 'assignment_bank_id',
            as: 'assignmentBankId'
        });
        assignment_student.belongsTo(models.user_data, {
            foreignKey: 'student_id',
            as: 'studentId'
        });
        assignment_student.belongsTo(models.user_data, {
            foreignKey: 'faculty_id',
            as: 'facultyId'
        });
        assignment_student.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        assignment_student.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        assignment_student.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        assignment_student.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        assignment_student.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        assignment_student.belongsTo(models.section, {
            foreignKey: 'section_id',
            as: 'sectionId'
        });
        assignment_student.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        assignment_student.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
        assignment_student.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as: 'courseBatchId'
        });
        assignment_student.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as: 'batchSemId'
        });
        assignment_student.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as: 'cdmId'
        });

    }

    return assignment_student;
}