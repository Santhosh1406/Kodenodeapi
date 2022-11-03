// student_track
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
module.exports = (sequelize, DataTypes) => {
  let student_attendance = sequelize.define(
    "student_attendance",
    {
      _id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      session_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      faculty_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      duration: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      student_track: {
        type: DataTypes.JSON(),
        allowNull: false,
      },
      total_duration: {
        type: DataTypes.STRING(100),
      },
      present: {
        type: DataTypes.BOOLEAN,
      },
      session_date: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      session_start_time: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      session_end_time: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      org_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      discipline_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      cdm_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      section_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      course_batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batch_sem_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      subject_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      is_block: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      createddate: {
        type: "TIMESTAMP",
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      updateddate: {
        type: "TIMESTAMP",
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
    },
    { schema: config.schema }
  );

  student_attendance.associate = function (models) {
    student_attendance.hasMany(models.student_attendance, {
      foreignKey: "_id",
    });
    student_attendance.belongsTo(models.organization, {
      foreignKey: "org_id",
      as: "orgId",
    });
    student_attendance.belongsTo(models.discipline, {
      foreignKey: "discipline_id",
      as: "disciplineId",
    });
    student_attendance.belongsTo(models.program, {
      foreignKey: "program_id",
      as: "programId",
    });
    student_attendance.belongsTo(models.department, {
      foreignKey: "department_id",
      as: "departmentId",
    });
    student_attendance.belongsTo(models.course_department_mapping, {
      foreignKey: "cdm_id",
      as: "cdmId",
    });
    student_attendance.belongsTo(models.section, {
      foreignKey: "section_id",
      as: "sectionId",
    });
    student_attendance.belongsTo(models.course_batch, {
      foreignKey: "course_batch_id",
      as: "courseBatchId",
    });
    student_attendance.belongsTo(models.batch_sem, {
      foreignKey: "batch_sem_id",
      as: "batchSemId",
    });
    student_attendance.belongsTo(models.subject, {
      foreignKey: "subject_id",
      as: "subjectId",
    });
    student_attendance.belongsTo(models.user_data, {
      foreignKey: "faculty_id",
      as: "facultyId",
    });
    student_attendance.belongsTo(models.user_data, {
      foreignKey: "user_id",
      as: "userId",
    });
    student_attendance.belongsTo(models.session, {
      foreignKey: "session_id",
      as: "sessionId",
    });
  };

  return student_attendance;
};