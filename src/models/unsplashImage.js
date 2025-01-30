const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const UnsplashImage = sequelize.define(
  "UnsplashImage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    downloadLocation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    urls: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = { UnsplashImage };
