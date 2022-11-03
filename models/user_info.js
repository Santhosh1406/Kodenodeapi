const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_info = sequelize.define('user_info', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        gender:{
            type: DataTypes.STRING
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        year: {
            type: DataTypes.STRING
        },
        designation: {
            type: DataTypes.STRING
        },
        cdm_id: {
            type: DataTypes.UUID
        },
        course_batch_id: {
            type: DataTypes.UUID
        },
        org_id: {
            type: DataTypes.UUID
        },
        group_id: {
            type: DataTypes.UUID
        },
        discipline_id: {
            type: DataTypes.UUID
        },
        department_id: {
            type: DataTypes.UUID
        },
        program_id: {
            type: DataTypes.UUID
        },
        lateral_entry: {
            type: DataTypes.BOOLEAN
        },
        lateral_year: {
            type: DataTypes.STRING
        },
        role_id: {
            type: DataTypes.UUID,
        },
        section_id: {
            type: DataTypes.UUID
        },
        enrollment:{
            type: DataTypes.STRING(50)
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

    user_info.associate = function (models) {
        user_info.hasMany(models.user_info, {
            foreignKey: '_id'
        });
        user_info.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as:'userId'
        });
        user_info.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        user_info.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        user_info.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as:'courseBatchId'
        });
        user_info.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        user_info.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        user_info.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        user_info.belongsTo(models.group, {
            foreignKey: 'group_id',
            as:'groupId'
        });
        user_info.belongsTo(models.role, {
            foreignKey: 'role_id',
            as:'roleId'
        });
        user_info.belongsTo(models.section, {
            foreignKey: 'section_id',
            as: 'sectionId'
        });
        user_info.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        user_info.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return user_info;
}