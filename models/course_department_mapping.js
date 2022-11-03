const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let course_department_mapping = sequelize.define('course_department_mapping', {
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
            unique: true,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        total_year: {
            type: DataTypes.STRING(5),
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
        course_duration_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        course_sem_duration_id: {
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
            type: DataTypes.UUID
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

    course_department_mapping.associate = function (models) {
        course_department_mapping.hasMany(models.course_department_mapping, {
            foreignKey: '_id'
        });
        course_department_mapping.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        course_department_mapping.belongsTo(models.course_duration, {
            foreignKey: 'course_duration_id',
            as:'courseDuration'
        });
        course_department_mapping.belongsTo(models.course_sem_duration, {
            foreignKey: 'course_sem_duration_id',
            as:'courseSemDuration'
        });
        course_department_mapping.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        course_department_mapping.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        course_department_mapping.belongsTo(models.course, {
            foreignKey: 'course_id',
            as:'courseId'
        });
        course_department_mapping.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        course_department_mapping.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        course_department_mapping.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return course_department_mapping;
}