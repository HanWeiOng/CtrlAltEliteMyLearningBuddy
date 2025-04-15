'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      paper_name: Sequelize.STRING,
      subject: Sequelize.STRING,
      banding: Sequelize.STRING,
      level: Sequelize.STRING,
      page_number: Sequelize.INTEGER,
      question_number: Sequelize.INTEGER,
      question_text: Sequelize.TEXT,
      answer_options: Sequelize.JSONB,
      image_paths: Sequelize.JSONB,
      topic_label: Sequelize.TEXT,
      answer_key: Sequelize.STRING,
      question_wrong: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      question_attempt_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      question_difficulty: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('questions');
  },
};