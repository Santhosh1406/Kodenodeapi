const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
// 3) session_start_time           R
// 4) session_end_time             R
module.exports = (sequelize, DataTypes) => {
    let time_frame = sequelize.define('time_frame', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        period: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        session_start_time: {
            allowNull: false,
            type: DataTypes.STRING(50)
        },
        session_end_time: {
            allowNull: false,
            type: DataTypes.STRING(50)
        },
        org_id: {
            type: DataTypes.UUID
        },
        discipline_id: {
            type: DataTypes.UUID
        },
        program_id: {
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

    time_frame.associate = function (models) {
        time_frame.hasMany(models.time_frame, {
            foreignKey: '_id'
        });
        time_frame.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        time_frame.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        time_frame.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        time_frame.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        time_frame.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return time_frame;
}