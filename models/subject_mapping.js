const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let subject_mapping = sequelize.define('subject_mapping', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        course_batch_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        batch_sem_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        cdm_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        sub_department_id: {
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
        course_id: {
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

    subject_mapping.associate = function (models) {
        subject_mapping.hasMany(models.subject_mapping, {
            foreignKey: '_id'
        });
        subject_mapping.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        subject_mapping.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as:'batchSemId'
        });
        subject_mapping.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as:'courseBatchId'
        });
        subject_mapping.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        subject_mapping.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        subject_mapping.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        subject_mapping.belongsTo(models.course, {
            foreignKey: 'course_id',
            as:'courseId'
        });
        subject_mapping.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        subject_mapping.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as:'subjectId'
        });
        subject_mapping.belongsTo(models.department, {
            foreignKey: 'sub_department_id',
            as:'sub_departmentId'
        });
        subject_mapping.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        subject_mapping.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return subject_mapping;
}