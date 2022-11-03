
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let question_bank_type = sequelize.define('question_bank_type', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        question_bank_id: {
            type: DataTypes.UUID,
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

    question_bank_type.associate = function (models) {
        question_bank_type.hasMany(models.question_bank_type, {
            foreignKey: '_id'
        });
        question_bank_type.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        question_bank_type.belongsTo(models.question_bank, {
            foreignKey: 'question_bank_id',
            as: 'questionBankId'
        });
        question_bank_type.belongsTo(models.question_type, {
            foreignKey: 'question_type_id',
            as: 'questionTypeId'
        });
        question_bank_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        question_bank_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return question_bank_type;
}
