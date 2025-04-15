'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('question_answer_table', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      question_id: Sequelize.INTEGER,
      answer_option: Sequelize.STRING,
      answer_text: Sequelize.STRING,
      selected_option_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      correctness: Sequelize.BOOLEAN,
      paper_id: Sequelize.INTEGER,
      topic_label: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('question_answer_table');
  },
};