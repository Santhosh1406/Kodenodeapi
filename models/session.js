const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
module.exports = (sequelize, DataTypes) => {
    let session = sequelize.define('session', {
        _id: {
            allowNull: false,
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        session_id: {
            allowNull: false,
            unique: true,
            type: DataTypes.STRING(100),
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        duration:{
            type: DataTypes.STRING(100),
            allowNull: false
        },
        session_date: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        session_start_time:{
            type: DataTypes.STRING(100),
            allowNull: false
        },
        session_end_time:{
            type: DataTypes.STRING(100),
            allowNull: false
        },
        file_path:{
            type: DataTypes.STRING(100),
            allowNull: false
        },
        class_type:{
            type: DataTypes.STRING(50),
            allowNull: false
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
        department_id:{
            type: DataTypes.UUID,
            allowNull: false
        },
        cdm_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        section_id:{
            type: DataTypes.UUID,
            allowNull: false
        },
        course_batch_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        batch_sem_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        time_frame_id:{
            type: DataTypes.UUID,
            allowNull: false
        },
        subject_id:{
            type: DataTypes.UUID,
            allowNull: false
        },
        topic_id:{
            type: DataTypes.UUID
        },
        sub_topic_id:{
            type: DataTypes.UUID
        },
        faculty_id:{
            type: DataTypes.UUID,
            allowNull: false
        },
        started: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        timezone:{
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

    session.associate = function (models) {
        session.hasMany(models.session, {
            foreignKey: '_id'
        });
        session.belongsTo(models.organization, {
            foreignKey: 'org_id',
            as:'orgId'
        });
        session.belongsTo(models.discipline, {
            foreignKey: 'discipline_id',
            as:'disciplineId'
        });
        session.belongsTo(models.program, {
            foreignKey: 'program_id',
            as:'programId'
        });
        session.belongsTo(models.department, {
            foreignKey: 'department_id',
            as:'departmentId'
        });
        session.belongsTo(models.course_department_mapping, {
            foreignKey: 'cdm_id',
            as:'cdmId'
        });
        session.belongsTo(models.section, {
            foreignKey: 'section_id',
            as:'sectionId'
        });
        session.belongsTo(models.course_batch, {
            foreignKey: 'course_batch_id',
            as:'courseBatchId'
        });
        session.belongsTo(models.batch_sem, {
            foreignKey: 'batch_sem_id',
            as:'batchSemId'
        });
        session.belongsTo(models.time_frame, {
            foreignKey: 'time_frame_id',
            as:'timeFrameId'
        });
        session.belongsTo(models.subject, {
            foreignKey: 'subject_id',
            as:'subjectId'
        });
        session.belongsTo(models.topic, {
            foreignKey: 'topic_id',
            as:'topicId'
        });
        session.belongsTo(models.sub_topic, {
            foreignKey: 'sub_topic_id',
            as:'subTopicId'
        });
        session.belongsTo(models.user_data, {
            foreignKey: 'faculty_id',
            as:'facultyId'
        });
        session.belongsTo(models.user_data, {
            foreignKey: 'createdby',
            as:'createdBy'
        });
        session.belongsTo(models.user_data, {
            foreignKey: 'updatedby',
            as:'updatedBy'
        });

    }

    return session;
}