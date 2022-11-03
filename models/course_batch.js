const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let course_batch = sequelize.define('course_batch', {
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
        from: {
            type: DataTypes.DATE
        },
        to: {
            type: DataTypes.DATE
        },
        code: {
            type: DataTypes.STRING(10),
            allowNull: false
        },
        current_sim: {
            type: DataTypes.UUID
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

    course_batch.associate = function (models) {
        course_batch.hasMany(models.course_batch, {
            foreignKey: '_id'
        });
        course_batch.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        course_batch.belongsTo(models.batch_sem, {
            foreignKey: 'current_sim',
            as:'currentSim'
        });
        course_batch.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        course_batch.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        course_batch.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        course_batch.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        course_batch.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return course_batch;
}