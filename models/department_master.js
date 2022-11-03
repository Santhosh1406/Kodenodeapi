const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let department_master = sequelize.define('department_master', {
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
        org_id: {
            type: DataTypes.UUID,
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

    department_master.associate = function (models) {
        department_master.hasMany(models.department_master, {
            foreignKey: '_id'
        });
        department_master.belongsTo(models.discipline_master, {
            foreignKey: 'discipline_master_id',
            as:'disciplineMaster'
        });
        department_master.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'organization'
        });
        department_master.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        department_master.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });
    }

    return department_master;
}