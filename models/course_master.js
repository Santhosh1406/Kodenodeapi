const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let course_master = sequelize.define('course_master', {
        _id: {
            allowNull: false,
            primaryKey: true,
            unique: true,
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
        discipline_master_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        program_master_id: {
            type: DataTypes.UUID,
            allowNull: false
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

    course_master.associate = function (models) {
        course_master.hasMany(models.course_master, {
            foreignKey: '_id'
        });
        course_master.belongsTo(models.discipline_master, {
            foreignKey: 'discipline_master_id',
            as:'disciplineMaster'
        });
        course_master.belongsTo(models.program_master, {
            foreignKey: 'program_master_id',
            as:'programMaster'
        });
        course_master.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'organization'
        });
        course_master.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        course_master.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return course_master;
}