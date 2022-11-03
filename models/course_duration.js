const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let course_duration = sequelize.define('course_duration', {
        _id: {
            allowNull: false,
            primaryKey: true,
            unique: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        duration: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200)
        },
        org_id: {
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

    course_duration.associate = function (models) {
        course_duration.hasMany(models.course_duration, {
            foreignKey: '_id'
        });
        course_duration.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        course_duration.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        course_duration.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
    }

    return course_duration;
}