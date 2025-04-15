'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('topic_labelling', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      topic_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sub_topic: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: Sequelize.TEXT,
      banding: Sequelize.STRING,
      level: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('topic_labelling');
  },
};