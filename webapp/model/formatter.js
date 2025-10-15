sap.ui.define([
    "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";

    return {
        /**
         * Formats the timestamp to display time
         * @param {Date} oDate - The date object
         * @returns {string} Formatted time string
         */
        formatTime: function (oDate) {
            if (!oDate) {
                return "";
            }
            
            var oTimeFormat = DateFormat.getTimeInstance({
                pattern: "HH:mm"
            });
            
            return oTimeFormat.format(oDate);
        },
        
        /**
         * Formats the message type for styling
         * @param {string} sType - Message type (user/bot)
         * @returns {string} CSS class name
         */
        formatMessageType: function (sType) {
            return sType === "user" ? "userMessage" : "botMessage";
        }
    };
});