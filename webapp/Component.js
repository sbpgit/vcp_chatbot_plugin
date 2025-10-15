sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/Image",
    "sap/m/MessageToast"
], function (UIComponent, Button, Input, VBox, Text, HBox, Image, MessageToast) {
    "use strict";

    return UIComponent.extend("chat.newchatbot.Component", {
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this._createFloatingButton();
            this._createChatPanel();
            this._addStyles();
        },

        _createFloatingButton: function () {
            var oDiv = document.createElement("div");
            oDiv.id = "chat-floating-btn";
            oDiv.style.position = "fixed";
            oDiv.style.bottom = "20px";
            oDiv.style.right = "20px";
            oDiv.style.zIndex = "1000";
            document.body.appendChild(oDiv);

            var oChatButton = new Button({
                icon: "sap-icon://discussion",
                type: "Emphasized",
                tooltip: "Open Chat",
                press: function () {
                    var oPanel = document.getElementById("chatbot-panel");
                    if (oPanel.classList.contains("open")) {
                        oPanel.classList.remove("open");
                        oPanel.classList.add("closed");
                    } else {
                        oPanel.classList.remove("closed");
                        oPanel.classList.add("open");
                    }
                }
            });

            oChatButton.placeAt(oDiv);
        },

        _createChatPanel: function () {
            var oPanel = document.createElement("div");
            oPanel.id = "chatbot-panel";
            oPanel.className = "closed";
            oPanel.style.width = "350px";
            oPanel.style.height = "500px";
            oPanel.style.position = "fixed";
            oPanel.style.bottom = "70px";
            oPanel.style.right = "20px";
            oPanel.style.background = "white";
            oPanel.style.border = "1px solid #ddd";
            oPanel.style.borderRadius = "12px";
            oPanel.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
            oPanel.style.display = "flex";
            oPanel.style.flexDirection = "column";
            oPanel.style.overflow = "hidden";
            oPanel.style.zIndex = "1000";

            // --- Header ---
            var oHeader = document.createElement("div");
            oHeader.style.background = "#0a6ed1";
            oHeader.style.color = "white";
            oHeader.style.padding = "10px";
            oHeader.style.fontWeight = "bold";
            oHeader.style.display = "flex";
            oHeader.style.justifyContent = "space-between";
            oHeader.style.alignItems = "center";

            oHeader.innerHTML = `<span>💬 Chat Assistant</span>`;
            var oCloseBtn = document.createElement("span");
            oCloseBtn.innerHTML = "✖";
            oCloseBtn.style.cursor = "pointer";
            oCloseBtn.onclick = function () {
                oPanel.classList.remove("open");
                oPanel.classList.add("closed");
            };
            oHeader.appendChild(oCloseBtn);
            oPanel.appendChild(oHeader);

            // --- Messages container ---
            var oVBox = new VBox("chatMessages", {
                fitContainer: true,
                items: [
                    new Text({ text: "👋 Hello! I’m your assistant." }).addStyleClass("chatBotBubble")
                ],
                layoutData: new sap.m.FlexItemData({ growFactor: 1 })
            }).addStyleClass("chatMessageArea");
            oVBox.placeAt(oPanel);

            // --- Input + Send button ---
            var oInputBox = new HBox({
                width: "100%",
                alignItems: "Center",
                items: [
                    new Input("chatInput", {
                        placeholder: "Type a message...",
                        layoutData: new sap.m.FlexItemData({ growFactor: 1 }),
                        submit: function (oEvent) {
                            var sMsg = oEvent.getParameter("value");
                            this.setValue("");
                            sendMessage(sMsg);
                        }
                    }),
                    new Button({
                        icon: "sap-icon://paper-plane",
                        type: "Emphasized",
                        press: function () {
                            var oInput = sap.ui.getCore().byId("chatInput");
                            var sMsg = oInput.getValue();
                            if (sMsg) {
                                oInput.setValue("");
                                sendMessage(sMsg);
                            }
                        }
                    }).addStyleClass("chatSendBtn")
                ]
            }).addStyleClass("chatInputBar");
            oInputBox.placeAt(oPanel);

            // Append panel to body
            document.body.appendChild(oPanel);

            // --- Helper: Send Message ---
            function sendMessage(sMsg) {
                if (!sMsg) return;
                var oVBox = sap.ui.getCore().byId("chatMessages");
                oVBox.addItem(new Text({ text: sMsg }).addStyleClass("chatUserBubble"));

                // --- Add typing indicator ---
                var oTyping = new HBox("typingIndicator", {
                    items: [
                        new Image({
                            src: "image/chaticon.jpg",
                            width: "28px",
                            height: "28px"
                        }).addStyleClass("chatAvatar"),
                        new Text({ text: "🤖 Bot is typing..." }).addStyleClass("chatTypingBubble")
                    ]
                }).addStyleClass("chatMessage bot");
                oVBox.addItem(oTyping);
                scrollDown(oVBox);

                // --- Call backend ---
                setTimeout(function () {
                    $.ajax({
                        url: "https://salesapi.cfapps.us10-001.hana.ondemand.com/chat",
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({ "query": sMsg }),
                        success: function (data) {
                            removeTyping(oVBox);
                            var oBotContent = new VBox().addStyleClass("chatBotBubble");

                            if (data.summary) {
                                oBotContent.addItem(
                                    new Text({ text: "🤖 " + data.summary })
                                );
                            }

                            if (data.table) {
                                oBotContent.addItem(
                                    new sap.ui.core.HTML({
                                        content: data.table
                                    })
                                );
                            }

                            // HBox for avatar + bot content
                            var oBotMessage = new HBox({
                                items: [
                                    new Image({
                                        src: "https://sap.github.io/ui5-webcomponents/assets/images/avatars/avatar_1.png",
                                        width: "28px",
                                        height: "28px"
                                    }).addStyleClass("chatAvatar"),
                                    oBotContent
                                ]
                            }).addStyleClass("chatMessage bot");

                            oVBox.addItem(oBotMessage);
                            scrollDown(oVBox);
                        },
                        error: function (xhr) {
                            removeTyping(oVBox);
                            oVBox.addItem(new HBox({
                                items: [
                                    new Image({
                                        src: "https://sap.github.io/ui5-webcomponents/assets/images/avatars/avatar_1.png",
                                        width: "28px",
                                        height: "28px"
                                    }).addStyleClass("chatAvatar"),
                                    new Text({ text: "🤖 " + xhr.statusText }).addStyleClass("chatBotBubble")
                                ]
                            }).addStyleClass("chatMessage bot"));
                            scrollDown(oVBox);
                        }
                    });
                }, 800);
            }

            // Remove typing indicator
            function removeTyping(oVBox) {
                var oTyping = sap.ui.getCore().byId("typingIndicator");
                if (oTyping) {
                    oVBox.removeItem(oTyping);
                    oTyping.destroy();
                }
            }

            // Auto-scroll helper
            function scrollDown(oVBox) {
                setTimeout(function () {
                    var oMsgArea = oVBox.getDomRef();
                    if (oMsgArea) {
                        oMsgArea.scrollTop = oMsgArea.scrollHeight;
                    }
                }, 200);
            }
        },

        _addStyles: function () {
            var style = document.createElement("style");
            style.innerHTML = `
                #chatbot-panel {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease-in-out;
                    pointer-events: none;
                }
                #chatbot-panel.open {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                #chatbot-panel.closed {
                    opacity: 0;
                    transform: translateY(20px);
                    pointer-events: none;
                }
                .chatUserBubble {
                    background: #0a6ed1;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 12px;
                    margin: 4px;
                    max-width: 70%;
                    align-self: flex-end;
                    word-wrap: break-word;
                }
                .chatBotBubble {
                    background: #f2f2f2;
                    color: #333;
                    padding: 8px 12px;
                    border-radius: 12px;
                    margin: 4px;
                    max-width: 70%;
                    align-self: flex-start;
                    word-wrap: break-word;
                }
                    .chatMessage {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    margin: 6px;
}

.chatMessage.user {
    justify-content: flex-end;
}

.chatMessage.bot {
    justify-content: flex-start;
}

.chatAvatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
}
            `;
            document.head.appendChild(style);
        }
    });
});
