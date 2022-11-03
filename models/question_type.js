const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let question_type = sequelize.define('question_type', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        org_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        option: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        option_length: {
            type: DataTypes.STRING
        },
        answer:{
            type: DataTypes.BOOLEAN,
            allowNull: true
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

    question_type.associate = function (models) {
        question_type.hasMany(models.question_type, {
            foreignKey: '_id'
        });
        question_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        question_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });
    }

    return question_type;
}