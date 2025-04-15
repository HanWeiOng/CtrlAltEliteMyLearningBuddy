const fs = require("fs");

module.exports = {
  development: {
    username:  // Use your RDS PostgreSQL username
    password:  // Use your RDS PostgreSQL password
    database:  // Use your RDS PostgreSQL database name
    host: // Replace with your RDS endpoint
    port: 5432, // Default PostgreSQL port
    dialect: "postgres", // Specifies the database dialect
  },
  seederStorage: "sequelize", // Configures Sequelize's storage for seeders
};