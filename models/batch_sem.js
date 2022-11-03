const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let batch_sem = sequelize.define('batch_sem', {
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
        course_batch_id:{
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
        year: {
            type: DataTypes.STRING(10)
        },
        semester: {
            type: DataTypes.STRING(10)
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

    batch_sem.associate = function (models) {
        batch_sem.hasMany(models.batch_sem, {
            foreignKey: '_id'
        });
        batch_sem.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        batch_sem.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        batch_sem.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        batch_sem.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        batch_sem.belongsTo(models.course_batch,{
            foreignKey:'course_batch_id',
            as:'courseBatchId'
        });
        batch_sem.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        batch_sem.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return batch_sem;
}