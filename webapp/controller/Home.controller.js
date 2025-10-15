sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/DateFormat",
    "../model/formatter"
], function (Controller, JSONModel, MessageToast, Fragment, DateFormat, formatter) {
    "use strict";
    return Controller.extend("chat.newchatbot.controller.Home", {
       formatter: formatter,

        /**
         * Controller initialization
         */
        onInit: function () {
            // Initialize models
            this._initializeModels();
            
            // Initialize chatbot
            this._initializeChatbot();
            
            // Set up event handlers
            this._setupEventHandlers();
            
            // Load configuration from backend if available
            this._loadConfiguration();
        },

        /**
         * Initialize all models
         */
        _initializeModels: function () {
            // Chat model
            var oChatModel = new JSONModel({
                config: {
                    botName: "SAP Assistant",
                    apiEndpoint: "/api/chat",
                    apiKey: "",
                    responseDelay: 1500,
                    enableTypingIndicator: true,
                    enableQuickReplies: true,
                    maxMessageLength: 500,
                    position: "bottom-right"
                },
                messages: [],
                currentMessage: "",
                isTyping: false,
                showQuickReplies: true,
                isOpen: false,
                connectionStatus: "online",
                user: {
                    id: "",
                    name: "User"
                }
            });
            
            this.getView().setModel(oChatModel, "chatModel");
            
            // Settings model
            var oSettingsModel = new JSONModel({
                notifications: true,
                sound: true,
                autoResponse: true,
                language: "en"
            });
            
            this.getView().setModel(oSettingsModel, "settings");
        },

        /**
         * Initialize chatbot with welcome message
         */
        _initializeChatbot: function () {
            // Add welcome message
            this._addBotMessage(
                this._getResourceText("welcomeMessage") || 
                "Hello! I'm your SAP Assistant. How can I help you today?"
            );
            
            // Set up floating button position
            this._setFloatingButtonPosition();
        },

        /**
         * Set up event handlers
         */
        _setupEventHandlers: function () {
            // Handle window resize
            window.addEventListener("resize", this._onWindowResize.bind(this));
            
            // Handle keyboard shortcuts
            document.addEventListener("keydown", this._onKeyDown.bind(this));
        },

        /**
         * Load configuration from backend
         */
        _loadConfiguration: function () {
            var that = this;
            
            // Simulated API call - replace with actual backend call
            jQuery.ajax({
                url: "/api/chatbot/config",
                type: "GET",
                success: function (data) {
                    var oModel = that.getView().getModel("chatModel");
                    oModel.setProperty("/config", data);
                },
                error: function () {
                    console.log("Using default configuration");
                }
            });
        },

        /**
         * Toggle chat window
         */
        onToggleChat: function () {
            var oPopover = this.byId("chatPopover");
            var oButton = this.byId("chatbotFloatingButton");
            
            if (!oPopover.isOpen()) {
                oPopover.openBy(oButton);
                this._onChatOpened();
            } else {
                oPopover.close();
                this._onChatClosed();
            }
        },

        /**
         * Open chat window
         */
        onOpenChat: function () {
            var oPopover = this.byId("chatPopover");
            var oButton = this.byId("chatbotFloatingButton");
            
            oPopover.openBy(oButton);
            this._onChatOpened();
        },

        /**
         * Close chat window
         */
        onCloseChat: function () {
            var oPopover = this.byId("chatPopover");
            oPopover.close();
            this._onChatClosed();
        },

        /**
         * Handle chat opened event
         */
        _onChatOpened: function () {
            var oModel = this.getView().getModel("chatModel");
            oModel.setProperty("/isOpen", true);
            
            // Focus on input field
            setTimeout(function () {
                this.byId("chatInput").focus();
            }.bind(this), 300);
            
            // Scroll to bottom
            this._scrollToBottom();
            
            // Mark messages as read
            this._markMessagesAsRead();
        },

        /**
         * Handle chat closed event
         */
        _onChatClosed: function () {
            var oModel = this.getView().getModel("chatModel");
            oModel.setProperty("/isOpen", false);
        },

        /**
         * Send message
         */
        onSendMessage: function () {
            var oModel = this.getView().getModel("chatModel");
            var sMessage = oModel.getProperty("/currentMessage");
            
            if (!sMessage || sMessage.trim() === "") {
                return;
            }
            
            // Add user message
            this._addUserMessage(sMessage);
            
            // Clear input
            oModel.setProperty("/currentMessage", "");
            
            // Hide quick replies
            oModel.setProperty("/showQuickReplies", false);
            
            // Process message
            this._processUserMessage(sMessage);
        },

        /**
         * Process user message and get response
         */
        _processUserMessage: function (sMessage) {
            var that = this;
            var oModel = this.getView().getModel("chatModel");
            var oConfig = oModel.getProperty("/config");
            
            // Show typing indicator
            if (oConfig.enableTypingIndicator) {
                oModel.setProperty("/isTyping", true);
            }
            
            // Call API or process locally
            if (oConfig.apiEndpoint) {
                this._callChatAPI(sMessage);
            } else {
                // Simulate response for demo
                setTimeout(function () {
                    oModel.setProperty("/isTyping", false);
                    var sResponse = that._generateLocalResponse(sMessage);
                    that._addBotMessage(sResponse);
                    
                    // Show quick replies for certain responses
                    if (sResponse.includes("help")) {
                        oModel.setProperty("/showQuickReplies", true);
                    }
                }, oConfig.responseDelay || 1500);
            }
        },

        /**
         * Call chat API
         */
        _callChatAPI: function (sMessage) {
            var that = this;
            var oModel = this.getView().getModel("chatModel");
            var oConfig = oModel.getProperty("/config");
            
            jQuery.ajax({
                url: oConfig.apiEndpoint,
                type: "POST",
                contentType: "application/json",
                headers: {
                    "Authorization": "Bearer " + oConfig.apiKey
                },
                data: JSON.stringify({
                    message: sMessage,
                    userId: oModel.getProperty("/user/id"),
                    sessionId: this._getSessionId(),
                    context: this._getConversationContext()
                }),
                success: function (data) {
                    oModel.setProperty("/isTyping", false);
                    
                    // Add bot response
                    that._addBotMessage(data.response || data.message);
                    
                    // Handle quick replies if present
                    if (data.quickReplies) {
                        oModel.setProperty("/quickReplies", data.quickReplies);
                        oModel.setProperty("/showQuickReplies", true);
                    }
                    
                    // Handle actions if present
                    if (data.action) {
                        that._handleBotAction(data.action);
                    }
                },
                error: function (xhr, status, error) {
                    oModel.setProperty("/isTyping", false);
                    
                    // Show error message
                    that._addBotMessage(
                        that._getResourceText("errorMessage") || 
                        "I'm sorry, I couldn't process your request. Please try again."
                    );
                    
                    console.error("Chat API Error:", error);
                }
            });
        },

        /**
         * Generate local response (for demo/fallback)
         */
        _generateLocalResponse: function (sMessage) {
            var sLowerMessage = sMessage.toLowerCase();
            
            // Simple response logic
            if (sLowerMessage.includes("hello") || sLowerMessage.includes("hi")) {
                return "Hello! How can I assist you today?";
            } else if (sLowerMessage.includes("help")) {
                return "I can help you with:\n• Checking system status\n• Viewing reports\n• Managing users\n• Answering questions\n\nWhat would you like to do?";
            } else if (sLowerMessage.includes("status")) {
                return "All systems are operational. No incidents reported.";
            } else if (sLowerMessage.includes("report")) {
                return "Your latest reports are ready. Would you like to view them in the Reports section?";
            } else if (sLowerMessage.includes("thank")) {
                return "You're welcome! Is there anything else I can help you with?";
            } else {
                return "I understand you're asking about '" + sMessage + "'. Let me help you with that.";
            }
        },

        /**
         * Handle quick reply
         */
        onQuickReply: function (oEvent) {
            var sText = oEvent.getSource().getText();
            var oModel = this.getView().getModel("chatModel");
            
            // Set message and send
            oModel.setProperty("/currentMessage", sText);
            this.onSendMessage();
        },

        /**
         * Open settings
         */
        onOpenSettings: function () {
            var oView = this.getView();
            
            // Create dialog lazily
            if (!this._pSettingsDialog) {
                this._pSettingsDialog = Fragment.load({
                    id: oView.getId(),
                    name: "com.company.chatbotplugin.fragment.Settings",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            
            this._pSettingsDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        /**
         * Save settings
         */
        onSaveSettings: function () {
            var oSettings = this.getView().getModel("settings").getData();
            
            // Save to backend
            jQuery.ajax({
                url: "/api/chatbot/settings",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oSettings),
                success: function () {
                    MessageToast.show("Settings saved successfully");
                },
                error: function () {
                    MessageToast.show("Error saving settings");
                }
            });
            
            // Close dialog
            this.byId("settingsDialog").close();
        },

        /**
         * Cancel settings
         */
        onCancelSettings: function () {
            this.byId("settingsDialog").close();
        },

        /**
         * Refresh chat
         */
        onRefreshChat: function () {
            var oModel = this.getView().getModel("chatModel");
            
            // Clear messages except welcome message
            var aMessages = oModel.getProperty("/messages");
            oModel.setProperty("/messages", [aMessages[0]]);
            
            // Show quick replies
            oModel.setProperty("/showQuickReplies", true);
            
            MessageToast.show("Chat refreshed");
        },

        /**
         * Handle attachment
         */
        onAttachment: function () {
            // Create file input
            var oFileInput = document.createElement("input");
            oFileInput.type = "file";
            oFileInput.accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx";
            
            oFileInput.onchange = function (e) {
                var file = e.target.files[0];
                if (file) {
                    this._uploadFile(file);
                }
            }.bind(this);
            
            oFileInput.click();
        },

        /**
         * Upload file
         */
        _uploadFile: function (file) {
            var that = this;
            var formData = new FormData();
            formData.append("file", file);
            
            jQuery.ajax({
                url: "/api/chatbot/upload",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (data) {
                    that._addUserMessage("📎 " + file.name);
                    that._addBotMessage("File received: " + file.name + ". Processing...");
                },
                error: function () {
                    MessageToast.show("Error uploading file");
                }
            });
        },

        /**
         * Add user message
         */
        _addUserMessage: function (sText) {
            this._addMessage(sText, "user");
        },

        /**
         * Add bot message
         */
        _addBotMessage: function (sText) {
            this._addMessage(sText, "bot");
        },

        /**
         * Add message to chat
         */
        _addMessage: function (sText, sType) {
            var oModel = this.getView().getModel("chatModel");
            var aMessages = oModel.getProperty("/messages");
            
            aMessages.push({
                id: Date.now(),
                text: sText,
                type: sType,
                timestamp: new Date(),
                read: false
            });
            
            oModel.setProperty("/messages", aMessages);
            
            // Scroll to bottom
            this._scrollToBottom();
            
            // Play sound if enabled
            if (sType === "bot" && oModel.getProperty("/settings/sound")) {
                this._playNotificationSound();
            }
        },

        /**
         * Scroll to bottom of chat
         */
        _scrollToBottom: function () {
            setTimeout(function () {
                var oScrollContainer = this.byId("chatScrollContainer");
                if (oScrollContainer) {
                    var oDomRef = oScrollContainer.getDomRef();
                    if (oDomRef) {
                        oDomRef.scrollTop = oDomRef.scrollHeight;
                    }
                }
            }.bind(this), 100);
        },

        /**
         * Mark messages as read
         */
        _markMessagesAsRead: function () {
            var oModel = this.getView().getModel("chatModel");
            var aMessages = oModel.getProperty("/messages");
            
            aMessages.forEach(function (message) {
                message.read = true;
            });
            
            oModel.setProperty("/messages", aMessages);
        },

        /**
         * Play notification sound
         */
        _playNotificationSound: function () {
            // Implementation for notification sound
            try {
                var audio = new Audio("/resources/sounds/notification.mp3");
                audio.play();
            } catch (e) {
                console.log("Could not play notification sound");
            }
        },

        /**
         * Set floating button position
         */
        _setFloatingButtonPosition: function () {
            var oButton = this.byId("chatbotFloatingButton");
            var oConfig = this.getView().getModel("chatModel").getProperty("/config");
            
            // Set position based on configuration
            oButton.addStyleClass("chatbot-position-" + oConfig.position);
        },

        /**
         * Get session ID
         */
        _getSessionId: function () {
            if (!this._sessionId) {
                this._sessionId = this._generateUUID();
            }
            return this._sessionId;
        },

        /**
         * Get conversation context
         */
        _getConversationContext: function () {
            var oModel = this.getView().getModel("chatModel");
            var aMessages = oModel.getProperty("/messages");
            
            // Get last 5 messages for context
            return aMessages.slice(-5).map(function (msg) {
                return {
                    type: msg.type,
                    text: msg.text
                };
            });
        },

        /**
         * Handle bot action
         */
        _handleBotAction: function (action) {
            switch (action.type) {
                case "navigate":
                    window.location.href = action.url;
                    break;
                case "openDialog":
                    this._openActionDialog(action.data);
                    break;
                case "executeFunction":
                    this._executeFunction(action.function, action.params);
                    break;
                default:
                    console.log("Unknown action type:", action.type);
            }
        },

        /**
         * Get resource text
         */
        _getResourceText: function (sKey) {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            return oBundle.getText(sKey);
        },

        /**
         * Generate UUID
         */
        _generateUUID: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * Window resize handler
         */
        _onWindowResize: function () {
            // Adjust popover position if needed
            var oPopover = this.byId("chatPopover");
            if (oPopover && oPopover.isOpen()) {
                oPopover.close();
                setTimeout(function () {
                    this.onOpenChat();
                }.bind(this), 100);
            }
        },

        /**
         * Keyboard shortcuts handler
         */
        _onKeyDown: function (e) {
            // Ctrl/Cmd + Shift + C to toggle chat
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                this.onToggleChat();
            }
        }
    });
});