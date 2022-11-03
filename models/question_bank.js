
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let question_bank = sequelize.define('question_bank', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        code: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        year: {
            type: DataTypes.DATE
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
        department_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        total_count: {
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

    question_bank.associate = function (models) {
        question_bank.hasMany(models.question_bank, {
            foreignKey: '_id'
        });
        question_bank.belongsTo(models.user_data, {
            foreignKey: 'user_id',
            as: 'userId'
        });
        question_bank.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as: 'subjectId'
        });
        question_bank.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as: 'orgId'
        });
        question_bank.belongsTo(models.program, {
            foreignKey: 'program_id',
            as: 'programId'
        });
        question_bank.belongsTo(models.department, {
            foreignKey: 'department_id',
            as: 'departmentId'
        });
        question_bank.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as: 'disciplineId'
        });
        question_bank.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as: 'createdBy'
        });
        question_bank.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as: 'updatedBy'
        });

    }

    return question_bank;
}
