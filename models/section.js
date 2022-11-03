const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
module.exports = (sequelize, DataTypes) => {
    let section = sequelize.define('section', {
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
        course_id: {
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

    section.associate = function (models) {
        section.hasMany(models.section, {
            foreignKey: '_id'
        });
        section.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        section.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        section.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as:'courseBatchId'
        });
        section.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        section.belongsTo(models.course, {
            foreignKey: 'course_id',
            as:'courseId'
        });
        section.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        section.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        section.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        section.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return section;
}