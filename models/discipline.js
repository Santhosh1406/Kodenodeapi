const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let discipline = sequelize.define('discipline', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        discipline_id: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        logo: {
            type: DataTypes.STRING(200)
        },
        org_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        discipline_master: {
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

    discipline.associate = function (models) {
        discipline.hasMany(models.discipline, {
            foreignKey: '_id'
        });
        discipline.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        discipline.belongsTo(models.discipline_master, {
            foreignKey: 'discipline_master',
            as:'disciplineMaster'
        });
        discipline.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        discipline.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return discipline;
}