sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/m/Button",
    "sap/m/TextArea",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/HBox",
    "sap/m/Image",
    "sap/ui/core/Icon",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (UIComponent, Button, TextArea, VBox, Text, HBox, Image, Icon, JSONModel, MessageToast) {
    "use strict";

    var that;

    return UIComponent.extend("chat.newchatbot.Component", {
        init: function () {
            sap.ui.core.BusyIndicator.show(0);
            that = this;
            that.token = "";

            UIComponent.prototype.init.apply(this, arguments);
            this._createFloatingButton();
            this._createChatPanel();
            this._addStyles();
            this._setupNavigationListener();

            const oRootPath = jQuery.sap.getModulePath("chat.newchatbot");
            const oImageModel = new JSONModel({ path: oRootPath });
            this.setModel(oImageModel, "imageModel");

            this.getUser();

            setTimeout(() => sap.ui.core.BusyIndicator.hide(), 1200);
        },

        getUser: function () {
            let vUser = "";
            if (sap.ushell && sap.ushell.Container) {
                const email = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
                vUser = email || "";
            }
            return vUser;
        },

        _setupNavigationListener: function () {
            const handleNav = () => {
                const hash = window.location.hash;
                const oChatBtnDiv = document.getElementById("chat-floating-btn");
                const oChatPanel = document.getElementById("chatbot-panel");

                const visible = (
                    hash.startsWith("#Shell-home") ||
                    hash.startsWith("#Launchpad-open") ||
                    hash === "" || hash === "#"
                );

                if (oChatBtnDiv) oChatBtnDiv.style.display = visible ? "flex" : "none";
                if (oChatPanel) oChatPanel.style.display = visible ? "flex" : "none";
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
                width: "420px",
                height: "550px",
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

            // Header
            const header = document.createElement("div");
            Object.assign(header.style, {
                background: "#0a6ed1",
                color: "white",
                padding: "10px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "42px"
            });
            const sRootPath = jQuery.sap.getModulePath("chat/newchatbot", "/");
            const logoPath = sRootPath + "image/logo.png";
            header.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
                <img src="${logoPath}" width="32" height="32" style="border-radius:50%; background:white;"/>
                <span>VC Planner Assistant</span>
            </div>`;
            const clear = document.createElement("span");
            clear.innerHTML = "🗑️";
            clear.title = "Clear Chat";
            clear.style.cursor = "pointer";
            clear.style.marginRight = "12px";
            clear.onclick = () => this._clearChatMessages();
            header.appendChild(clear);
            const close = document.createElement("span");
            close.innerHTML = "✖";
            close.style.cursor = "pointer";
            close.style.marginRight = "15px";
            
            close.onclick = () => {
                panel.classList.remove("open");
                panel.classList.add("closed");
            };
            header.appendChild(close);
            panel.appendChild(header);

            // Body
            const body = document.createElement("div");
            Object.assign(body.style, {
                flex: "1",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative"
            });
            panel.appendChild(body);

            // Scroll area
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
                    new Text({ text: "Hello! I’m your VC Planner Assistant. How can I help you today?" }).addStyleClass("chatBotBubble")
                ]
            });
            oVBox.placeAt(scrollWrapper);

            // Input Bar
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

            // TextArea input (auto-grow)
            const oTextArea = new TextArea("chatInput", {
                placeholder: "Message here...",
                growing: true,
                growingMaxLines: 6,
                width: "100%",
                liveChange: function (oEvent) {
                    const val = oEvent.getParameter("value");
                    if (val.endsWith("\n")) {
                        oTextArea.setValue(val.trim());
                        sendMessage(val.trim());
                    }
                }
            }).addStyleClass("chatInputField");

            // Keyboard shortcut: Enter to send, Shift+Enter for newline
            oTextArea.addEventDelegate({
                onkeydown: function (oEvent) {
                    if (oEvent.key === "Enter" && !oEvent.shiftKey) {
                        oEvent.preventDefault();
                        const sMsg = oTextArea.getValue().trim();
                        if (sMsg) {
                            oTextArea.setValue("");
                            sendMessage(sMsg);
                        }
                    }
                }
            });

            // Send Button
            const oSendBtn = new Button({
                icon: "sap-icon://paper-plane",
                type: "Emphasized",
                press: function () {
                    const sMsg = oTextArea.getValue().trim();
                    if (sMsg) {
                        oTextArea.setValue("");
                        sendMessage(sMsg);
                    }
                }
            }).addStyleClass("chatSendBtn");

            const oInputBar = new HBox({
                width: "100%",
                alignItems: "End",
                justifyContent: "SpaceBetween",
                items: [oTextArea, oSendBtn]
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

            // Scroll logic
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

            function sendMessage(sMsg) {
                if (!sMsg) return;
                const oVBox = sap.ui.getCore().byId("chatMessages");
                oVBox.addItem(new Text({ text: sMsg }).addStyleClass("chatUserBubble"));
                sap.ui.getCore().applyChanges();
                scrollDown();

                const oTyping = new HBox("typingIndicator", {
                    items: [
                        new Image({ src: "image/logo.png", width: "28px", height: "28px" }),
                        new Text({ text: "VC Planner Assistant is typing..." })
                    ]
                });
                oVBox.addItem(oTyping);
                scrollDown();

                setTimeout(function () {
                    var userId = that.getUser().toLowerCase();
                    // var userId = "shariefahamed@sbpcorp.in";
                    $.ajax({
                        url: "https://vcp_assistant_api.cfapps.us10-001.hana.ondemand.com/ask",
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({ "query": sMsg, "userid": userId }),
                        headers: {
                            "Authorization": that.token  // ✅ pass token here
                        },
                        success: function (data) {
                            removeTyping();
                            const oBotVBox = new VBox().addStyleClass("chatBotBubble");
                            if (data.response) {
                                if (data.response.startsWith("An unexpected error")) {
                                    oBotVBox.addItem(new Text({ text: "Sorry, I ran into an internal error. Please try again later." }));
                                } else {
                                    oBotVBox.addItem(new Text({ text: data.response }));
                                }
                            }
                            if (data.table) oBotVBox.addItem(new sap.ui.core.HTML({ content: data.table }));

                            const oBotMsg = new HBox({
                                items: [
                                    new Image({
                                        src: "image/logo.png",
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
                                        src: "image/logo.png",
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
        },
        _clearChatMessages: function () {
            const oVBox = sap.ui.getCore().byId("chatMessages");
            if (oVBox) {
                const aItems = oVBox.getItems();
                aItems.forEach(item => item.destroy());
                oVBox.addItem(new sap.m.Text({
                    text: "Hello! I’m your VC Planner Assistant. How can I help you today?"
                }).addStyleClass("chatBotBubble"));
            }
            // MessageToast.show("Chat cleared");
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
                    #chatbot-panel span[title="Clear Chat"] {
  transition: transform 0.15s ease;
  margin-left: 6rem;
}
#chatbot-panel span[title="Clear Chat"]:hover {
  transform: scale(1.2);
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

                /* TextArea input (auto-grow, clean style) */
                .chatInputField .sapMTextAreaInner {
                    border: 1.6px solid #0a6ed1 !important;
                    border-radius: 0px !important;
                    background: #fff !important;
                    color: #000 !important;
                    font-size: 0.95rem !important;
                    padding: 8px 12px !important;
                    resize: none !important;
                    min-height: 2.2rem !important;
                    max-height: 8.5rem !important;
                    overflow-y: auto !important;
                    line-height: 1.4rem !important;
                    box-shadow: none !important;
                }

                .chatInputField .sapMTextAreaInner:focus {
                    border-color: #085caf !important;
                    outline: none !important;
                }

                .chatSendBtn {
                    height: 2.6rem !important;
                    width: 2.6rem !important;
                    border-radius: 10px !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white !important;
                    background-color: #0a6ed1 !important;
                    border: none !important;
                    transition: background 0.2s ease, transform 0.1s ease;
                }

                .chatSendBtn:hover {
                    background: #085caf !important;
                    transform: scale(1.05);
                }
            `;
            document.head.appendChild(style);
        }
    });
});
