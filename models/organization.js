const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

module.exports = (sequelize, DataTypes) => {
  let organization = sequelize.define('organization', {
    _id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    org_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    org_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    org_type: {
      type: DataTypes.UUID,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(50)
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    postal_code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fax: {
      type: DataTypes.STRING(20)
    },
    telephone: {
      type: DataTypes.STRING(25)
    },
    alternate_contact_no: {
      type: DataTypes.STRING(25)
    },
    sortname:{
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(200)
    },
    institution_type_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    group_id: {
      type: DataTypes.UUID
    },
    affiliated_type_id: {
      type: DataTypes.UUID
    },
    affiliated_status: {
      type: DataTypes.BOOLEAN
    },
    university_ref: {
      type: DataTypes.UUID
    },
    affiliated_date: {
      type: DataTypes.STRING(20)
    },
    year_of_foundation: {
      type: DataTypes.STRING(50),
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

  organization.associate = function (models) {
    organization.hasMany(models.organization, {
      foreignKey: '_id'
    });
    organization.belongsTo(models.university_type, {
      foreignKey: 'university_ref',
      as: 'universityRef'
    });
    organization.belongsTo(models.affiliated_type, {
      foreignKey: 'affiliated_type_id',
      as: 'affiliated_typeId'
    });
    organization.belongsTo(models.organization_type, {
      foreignKey: 'org_type',
      as: 'orgType'
    });
    organization.belongsTo(models.institution_type, {
      foreignKey: 'institution_type_id',
      as: 'institution_typeId'
    });
    organization.belongsTo(models.group, {
      foreignKey: 'group_id',
      as: 'groupId'
    });
    organization.belongsTo(models.user_data, {
      foreignKey: 'createdby',
      as: 'createdBy'
    });
    organization.belongsTo(models.user_data, {
      foreignKey: 'updatedby',
      as: 'updatedBy'
    });
  }

  return organization;
}