const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    quickLinks: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;
