const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let time_table = sequelize.define('time_table', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
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
        cdm_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        course_batch_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        section_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        batch_sem_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        current: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        time_day_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        time_frame_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
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

    time_table.associate = function (models) {
        time_table.hasMany(models.time_table, {
            foreignKey: '_id'
        });
        time_table.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        time_table.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        time_table.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        time_table.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as: 'cdmId'
        });
        time_table.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as: 'courseBatchId'
        });
        time_table.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as: 'batchSemId'
        });
        time_table.belongsTo(models.section, {
            foreignKey: 'section_id',
            as: 'sectionId'
        });
        time_table.belongsTo(models.time_day, {
            foreignKey: 'time_day_id',
            as: 'timeDayId'
        });
        time_table.belongsTo(models.time_frame, {
            foreignKey: 'time_frame_id',
            as: 'timeFrameId'
        });
        time_table.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        time_table.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        time_table.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        time_table.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return time_table;
}