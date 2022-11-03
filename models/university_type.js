const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let university_type = sequelize.define('university_type', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(100),
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

    university_type.associate = function (models) {
        university_type.hasMany(models.university_type, {
            foreignKey: '_id'
        });
        university_type.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        university_type.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return university_type;
}