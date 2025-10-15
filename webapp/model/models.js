sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
    function (JSONModel, Device) {
        "use strict";

        return {
            /**
             * Provides runtime information for the device the UI5 app is running on as a JSONModel.
             * @returns {sap.ui.model.json.JSONModel} The device model.
             */
            createDeviceModel: function () {
                var oModel = new JSONModel(Device);
                oModel.setDefaultBindingMode("OneWay");
                return oModel;
            },
            createChatModel: function () {
                var oModel = new JSONModel({
                    config: {
                        botName: "SAP Assistant",
                        apiEndpoint: "/api/chat",
                        apiKey: "",
                        responseDelay: 1500,
                        enableTypingIndicator: true,
                        enableQuickReplies: true,
                        position: "bottom-right"
                    },
                    messages: [],
                    currentMessage: "",
                    isTyping: false,
                    showQuickReplies: true,
                    isOpen: false
                });
                return oModel;
            }
        };
    });
