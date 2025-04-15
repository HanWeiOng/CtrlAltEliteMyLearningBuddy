const fs = require("fs");

module.exports = {
  development: {
    username: "postgres", // Use your RDS PostgreSQL username
    password: "ctrlaltelite", // Use your RDS PostgreSQL password
    database: "exam_papers_test", // Use your RDS PostgreSQL database name
    host: "database-1.cv6m2giwwgvo.ap-southeast-2.rds.amazonaws.com", // Replace with your RDS endpoint
    port: 5432, // Default PostgreSQL port
    dialect: "postgres", // Specifies the database dialect
  },
  seederStorage: "sequelize", // Configures Sequelize's storage for seeders
};