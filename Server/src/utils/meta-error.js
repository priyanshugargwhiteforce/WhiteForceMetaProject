/**
 * Extract a user-friendly error message from Meta/Facebook API responses.
 * @param {Error} error - The caught Axios error object
 * @returns {Error} - A new Error object with a formatted, detailed message
 */
const formatMetaError = (error) => {
    const metaError = error.response?.data?.error;
    if (metaError) {
        const userTitle = metaError.error_user_title;
        const userMsg = metaError.error_user_msg;
        const mainMsg = metaError.message;

        let displayMsg = '';
        if (userTitle && userMsg) {
            displayMsg = `${userTitle}: ${userMsg}`;
        } else if (userMsg) {
            displayMsg = userMsg;
        } else {
            displayMsg = mainMsg;
        }
        
        const newErr = new Error(displayMsg);
        newErr.metaError = metaError; // Keep reference to raw error details
        return newErr;
    }
    return error;
};

module.exports = {
    formatMetaError
};
