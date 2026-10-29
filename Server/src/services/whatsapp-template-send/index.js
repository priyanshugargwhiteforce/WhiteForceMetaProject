const { sendPaymentReminder } = require('./paymentReminder.service');
const { sendOverduePaymentReminder } = require('./overduePaymentReminder.service');

// Optional convenience re-exports of existing reports without altering their original locations
const dailyTaskReminder = require('../dailyTaskReminder.service');
const weeklyBusinessReport = require('../weeklyBusinessReport.service');

module.exports = {
    sendPaymentReminder,
    sendOverduePaymentReminder,
    // Reference handles
    dailyTaskReminder,
    weeklyBusinessReport
};
