'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_attempt_quiz_table', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      student_id: Sequelize.INTEGER,
      folder_id: Sequelize.INTEGER,
      completed: Sequelize.BOOLEAN,
      student_score: Sequelize.DECIMAL(5, 2),
      student_name: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_attempt_quiz_table');
  },
};