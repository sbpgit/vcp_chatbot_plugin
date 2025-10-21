sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/Image",
    "sap/ui/core/Icon"
], function (UIComponent, Button, Input, VBox, Text, HBox, Image, Icon) {
    "use strict";

    return UIComponent.extend("chat.newchatbot.Component", {
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this._createFloatingButton();
            this._createChatPanel();
            this._addStyles();
            this._setupNavigationListener();
        },

        _setupNavigationListener: function () {
            const handleNav = () => {
                const hash = window.location.hash;
                const oChatBtnDiv = document.getElementById("chat-floating-btn");
                const oChatPanel = document.getElementById("chatbot-panel");

                if (hash.startsWith("#Shell-home") || hash.startsWith("#Launchpad-open") || hash === "" || hash === "#") {
                    if (oChatBtnDiv) oChatBtnDiv.style.display = "flex";
                    if (oChatPanel) oChatPanel.style.display = "flex";
                } else {
                    if (oChatBtnDiv) oChatBtnDiv.style.display = "none";
                    if (oChatPanel) oChatPanel.style.display = "none";
                }
            };
            window.addEventListener("hashchange", handleNav);
            setTimeout(handleNav, 500);
        },

        _createFloatingButton: function () {
            const oDiv = document.createElement("div");
            oDiv.id = "chat-floating-btn";
            Object.assign(oDiv.style, {
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: "1000"
            });
            document.body.appendChild(oDiv);

            const oChatButton = new Button({
                icon: "sap-icon://discussion",
                type: "Emphasized",
                tooltip: "Open Chat",
                press: function () {
                    const oPanel = document.getElementById("chatbot-panel");
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
            const panel = document.createElement("div");
            panel.id = "chatbot-panel";
            panel.className = "closed";
            Object.assign(panel.style, {
                width: "350px",
                height: "500px",
                position: "fixed",
                bottom: "70px",
                right: "20px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "12px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: "1000"
            });
            document.body.appendChild(panel);

            // --- Header ---
            const header = document.createElement("div");
            Object.assign(header.style, {
                background: "#0a6ed1",
                color: "white",
                padding: "10px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "42px",
                flexShrink: "0"
            });
            header.innerHTML = `<span>💬 Chat Assistant</span>`;
            const close = document.createElement("span");
            close.innerHTML = "✖";
            close.style.cursor = "pointer";
            close.onclick = function () {
                panel.classList.remove("open");
                panel.classList.add("closed");
            };
            header.appendChild(close);
            panel.appendChild(header);

            // --- Body ---
            const body = document.createElement("div");
            Object.assign(body.style, {
                flex: "1",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative"
            });
            panel.appendChild(body);

            // --- Scroll area ---
            const scrollWrapper = document.createElement("div");
            Object.assign(scrollWrapper.style, {
                flex: "1",
                overflowY: "auto",
                padding: "10px",
                background: "#fff",
                marginBottom: "65px"
            });
            scrollWrapper.id = "chat-scroll-wrapper";
            body.appendChild(scrollWrapper);

            const oVBox = new VBox("chatMessages", {
                width: "100%",
                items: [
                    new Text({ text: "👋 Hello! I’m your assistant." }).addStyleClass("chatBotBubble")
                ]
            });
            oVBox.placeAt(scrollWrapper);

            // --- Sticky input bar ---
            const stickyInputBar = document.createElement("div");
            stickyInputBar.id = "stickyInputBar";
            Object.assign(stickyInputBar.style, {
                position: "absolute",
                bottom: "0",
                left: "0",
                width: "100%",
                background: "#fff",
                borderTop: "1px solid #ccc",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 -2px 5px rgba(0,0,0,0.05)",
                zIndex: "10"
            });
            body.appendChild(stickyInputBar);

            const oInputBar = new HBox({
                width: "100%",
                alignItems: "Center",
                justifyContent: "Start",
                items: [
                    new Input("chatInput", {
                        placeholder: "Type a message...",
                        submit: function (oEvent) {
                            const sMsg = oEvent.getParameter("value");
                            this.setValue("");
                            sendMessage(sMsg);
                        }
                    })
                    .addStyleClass("chatInputField")
                    .setLayoutData(new sap.m.FlexItemData({ growFactor: 1 })),

                    new Button({
                        icon: "sap-icon://paper-plane",
                        type: "Emphasized",
                        press: function () {
                            const oInput = sap.ui.getCore().byId("chatInput");
                            const sMsg = oInput.getValue();
                            if (sMsg) {
                                oInput.setValue("");
                                sendMessage(sMsg);
                            }
                        }
                    }).addStyleClass("chatSendBtn")
                ]
            });
            oInputBar.placeAt(stickyInputBar);

            sap.ui.getCore().applyChanges();

            // --- Scroll-to-bottom floating button (SAP icon) ---
            const scrollButton = document.createElement("div");
            scrollButton.id = "scrollToBottomBtn";
            Object.assign(scrollButton.style, {
                position: "absolute",
                bottom: "80px",
                right: "15px",
                background: "#0a6ed1",
                color: "white",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                display: "none",
                zIndex: "20",
                boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.3s ease",
                padding: "4px"
            });
            body.appendChild(scrollButton);

            const oIcon = new Icon({
                src: "sap-icon://slim-arrow-down",
                size: "1.2rem",
                color: "white",
                press: function () {
                    scrollDown(true);
                }
            });
            oIcon.placeAt(scrollButton);

            // --- Message Logic ---
            function sendMessage(sMsg) {
                if (!sMsg) return;
                const oVBox = sap.ui.getCore().byId("chatMessages");
                oVBox.addItem(new Text({ text: sMsg }).addStyleClass("chatUserBubble"));
                sap.ui.getCore().applyChanges();
                scrollDown();

                const oTyping = new HBox("typingIndicator", {
                    items: [
                        new Image({ src: "image/chaticon.jpg", width: "28px", height: "28px" }),
                        new Text({ text: "🤖 Bot is typing..." })
                    ]
                });
                oVBox.addItem(oTyping);
                scrollDown();

                setTimeout(function () {
                    $.ajax({
                        url: "https://salesapi.cfapps.us10-001.hana.ondemand.com/chat",
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({ "query": sMsg }),
                        success: function (data) {
                            removeTyping();
                            const oBotVBox = new VBox().addStyleClass("chatBotBubble");
                            if (data.summary) oBotVBox.addItem(new Text({ text: "🤖 " + data.summary }));
                            if (data.table) oBotVBox.addItem(new sap.ui.core.HTML({ content: data.table }));

                            const oBotMsg = new HBox({
                                items: [
                                    new Image({
                                        src: "https://sap.github.io/ui5-webcomponents/assets/images/avatars/avatar_1.png",
                                        width: "28px",
                                        height: "28px"
                                    }),
                                    oBotVBox
                                ]
                            });
                            oVBox.addItem(oBotMsg);
                            sap.ui.getCore().applyChanges();
                            scrollDown();
                        },
                        error: function (xhr) {
                            removeTyping();
                            oVBox.addItem(new HBox({
                                items: [
                                    new Image({
                                        src: "https://sap.github.io/ui5-webcomponents/assets/images/avatars/avatar_1.png",
                                        width: "28px",
                                        height: "28px"
                                    }),
                                    new Text({ text: "🤖 " + xhr.statusText }).addStyleClass("chatBotBubble")
                                ]
                            }));
                            sap.ui.getCore().applyChanges();
                            scrollDown();
                        }
                    });
                }, 800);
            }

            function removeTyping() {
                const oVBox = sap.ui.getCore().byId("chatMessages");
                const oTyping = sap.ui.getCore().byId("typingIndicator");
                if (oTyping) {
                    oVBox.removeItem(oTyping);
                    oTyping.destroy();
                }
            }

            function scrollDown(force) {
                const scrollDiv = document.getElementById("chat-scroll-wrapper");
                if (scrollDiv) {
                    setTimeout(() => {
                        if (force) {
                            scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior: "smooth" });
                        } else {
                            scrollDiv.scrollTop = scrollDiv.scrollHeight;
                        }
                    }, 150);
                }
            }

            // --- Show/hide scroll-to-bottom button dynamically ---
            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            scrollDiv.addEventListener("scroll", () => {
                const scrollButton = document.getElementById("scrollToBottomBtn");
                if (!scrollButton) return;
                const nearBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight < 150;
                scrollButton.style.opacity = nearBottom ? "0" : "1";
                scrollButton.style.display = nearBottom ? "none" : "flex";
            });
        },

        _addStyles: function () {
            const style = document.createElement("style");
            style.innerHTML = `
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
.chatInputBar {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0;
    margin: 0;
    border: 1.6px solid #0a6ed1 !important;
    border-radius: 10px !important;
    overflow: hidden;
    box-sizing: border-box;
    background: #fff !important;
}

/* --- Chat Input Field --- */
.chatInputField .sapMInputBaseInner {
    height: 2rem !important;
    border: none !important; /* remove default border */
    border-radius: 0 !important;
    padding: 0 12px !important;
    font-size: 0.95rem !important;
    line-height: 2.8rem !important;
    color: #000;
    background: transparent !important;
    box-shadow: none !important;
}

/* Placeholder always centered and visible */
.chatInputField .sapMInputBaseInner::placeholder {
    color: #888 !important;
    opacity: 1 !important;
}

   .chatSendBtn {
    height: 2.6rem !important;
    width: 2.6rem !important;
    border-radius: 10px !important;
    display: flex
;
    align-items: center;
    justify-content: center;
    color: white !important;
    box-shadow: none !important;
    border: none !important;
    margin-left: 0px;
    margin-right: 4px;
    transition: background 0.2s 
ease, transform 0.1s 
ease;
}

.chatSendBtn:hover {
    background: #085caf !important;
    transform: scale(1.05);
}

/* Keep blue border active even when input is focused */
.chatInputField .sapMInputBaseInner:focus {
    outline: none !important;
    box-shadow: none !important;
}

                .scrollToBottomBtn:hover {
                    background: #085caf;
                    transform: scale(1.08);
                }
                .scrollToBottomBtn {
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    });
});
