
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let assignment_bank_type = sequelize.define('assignment_bank_type', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        assignment_bank_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        question_bank_id: {
            type: DataTypes.ARRAY(DataTypes.UUID),
            allowNull: false
        },
        question_type_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        count: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mark:{
            type: DataTypes.INTEGER,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
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

    assignment_bank_type.associate = function (models) {
        assignment_bank_type.hasMany(models.assignment_bank_type, {
            foreignKey: '_id'
        });
        assignment_bank_type.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        assignment_bank_type.belongsTo(models.assignment_bank, {
            foreignKey: 'assignment_bank_id',
            as: 'assignmentBankId'
        });
        assignment_bank_type.belongsTo(models.question_type, {
            foreignKey: 'question_type_id',
            as: 'questionTypeId'
        });
        assignment_bank_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        assignment_bank_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return assignment_bank_type;
}
