'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('linkedin_ad_drafts', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      account_id: { type: Sequelize.STRING(100), allowNull: false },
      campaign_id: { type: Sequelize.STRING(100), allowNull: false },
      creative_id: { type: Sequelize.STRING(100), allowNull: false },
      ad_name: { type: Sequelize.STRING(255), allowNull: false },
      ad_format: { type: Sequelize.STRING(50), allowNull: false },
      draft_payload: { type: Sequelize.JSON, allowNull: false },
      preview_payload: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'DRAFT' },
      creation_source: { type: Sequelize.STRING(20), defaultValue: 'LOCAL_DRAFT' },
      created_by: { type: Sequelize.BIGINT, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), onUpdate: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('linkedin_ad_drafts');
  }
};
