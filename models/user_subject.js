const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_subject = sequelize.define('user_subject', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id: {
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

    user_subject.associate = function (models) {
        user_subject.hasMany(models.user_subject, {
            foreignKey: '_id'
        });
        user_subject.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as:'userId'
        });
        user_subject.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as:'subjectId'
        });
        user_subject.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        user_subject.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        user_subject.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return user_subject;
}