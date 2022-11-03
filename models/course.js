const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let course = sequelize.define('course', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        course_id: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        course_master: {
            type: DataTypes.UUID,
        },
        logo: {
            type: DataTypes.STRING(200)
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

    course.associate = function (models) {
        course.hasMany(models.course, {
            foreignKey: '_id'
        });
        course.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        course.belongsTo(models.course_master, {
            foreignKey: 'course_master',
            as:'courseMaster'
        });
        course.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        course.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        course.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        course.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return course;
}