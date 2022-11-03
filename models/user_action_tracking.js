const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
    let user_action_tracking = sequelize.define('user_action_tracking', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        before_action:{
            type: DataTypes.JSON,
        },
        after_action:{
            type: DataTypes.JSON,
            allowNull: false
        },
        user:{
            type: DataTypes.UUID,
            allowNull: false
        },
        action:{
            type: DataTypes.STRING,
            allowNull: false
        },
        model: {
            type: DataTypes.STRING,
            allowNull: false
        },
        device:{
            type: DataTypes.JSON,
            allowNull: false
        },
        current_time:{
            type: 'TIMESTAMP',
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        is_block: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        }
    }, { schema: config.schema });

    user_action_tracking.associate = function (models) {
        user_action_tracking.hasMany(models.user_action_tracking, {
            foreignKey: '_id'
        });
    }

    return user_action_tracking;
}