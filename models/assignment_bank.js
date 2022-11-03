
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let assignment_bank = sequelize.define('assignment_bank', {
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
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        from: {
            type: DataTypes.DATE
        },
        to: {
            type: DataTypes.DATE
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
        section_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        student_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        batch_sem_id: {
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
        topic_id: {
            type: DataTypes.ARRAY(DataTypes.UUID)
        },
        total_count: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mark: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        total_mark: {
            type: DataTypes.INTEGER
        },
        random: {
            type: DataTypes.BOOLEAN,
            allowNull:false
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

    assignment_bank.associate = function (models) {
        assignment_bank.hasMany(models.assignment_bank, {
            foreignKey: '_id'
        });
        assignment_bank.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        assignment_bank.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        assignment_bank.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        assignment_bank.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        assignment_bank.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        assignment_bank.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as: 'courseBatchId'
        });
        assignment_bank.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as: 'batchSemId'
        });
        assignment_bank.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as: 'cdmId'
        });
        assignment_bank.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        assignment_bank.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        assignment_bank.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return assignment_bank;
}
