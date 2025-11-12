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
            //For browser close/session close
             this._registerSessionEndHandlers();

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

        _registerSessionEndHandlers: function () {
            try {
                const userId = this.getUser()?.toLowerCase() || "unknown";

                // 1️⃣ When browser/tab closes
                window.addEventListener("beforeunload", function () {
                    navigator.sendBeacon(
                       "https://vcp_assistant_api.cfapps.us10-001.hana.ondemand.com/destroy",
                        JSON.stringify({ userid: userId })
                    );
                });

                // 2️⃣ When Launchpad logs out or session expires
                if (sap.ushell && sap.ushell.Container) {
                    sap.ushell.Container.attachLogoutEvent(function () {
                        try {
                            $.ajax({
                                url: "https://vcp_assistant_api.cfapps.us10-001.hana.ondemand.com/destroy ",
                                method: "POST",
                                contentType: "application/json",
                                data: JSON.stringify({ userid: userId }),
                                headers: { Authorization: that.token },
                                async: false // ensures call completes before unload
                            });
                        } catch (e) {
                            console.warn("Session cleanup failed:", e);
                        }
                    });
                }

            } catch (err) {
                console.warn("Session end handler registration failed:", err);
            }
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
                tooltip: "VC Planner Chat Assistant",
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
            }).addStyleClass("irctcChatButton");
            oChatButton.placeAt(oDiv);
        },

        _createChatPanel: function () {
            const panel = document.createElement("div");
            panel.id = "chatbot-panel";
            panel.className = "closed";
            Object.assign(panel.style, {
                width: "420px",
                height: "60rem",
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
                zIndex: "12000"
            });
            document.body.appendChild(panel);

            // === Header ===
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

            const rightIcons = document.createElement("div");
            rightIcons.style.display = "flex";
            rightIcons.style.alignItems = "center";
            rightIcons.style.gap = "10px";

            // ✖ Close icon
            const closeIcon = new Icon({
                src: "sap-icon://decline",
                size: "1.2rem",
                color: "white",
                tooltip: "Close Chat",
                press: () => {
                    panel.classList.remove("open");
                    panel.classList.add("closed");
                }
            });
            closeIcon.addStyleClass("chatHeaderIcon");

            // 🗑️ Clear chat icon
            const clearIcon = new Icon({
                src: "sap-icon://delete",
                size: "1.2rem",
                color: "white",
                tooltip: "Clear Chat",
                press: () => this._clearChatMessages()
            });
            clearIcon.addStyleClass("chatHeaderIcon");

            // 🧩 Swap order — delete first, close second
            clearIcon.placeAt(rightIcons);
            closeIcon.placeAt(rightIcons);

            header.appendChild(rightIcons);
            panel.appendChild(header);

            // === Body ===
            const body = document.createElement("div");
            Object.assign(body.style, {
                flex: "1",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative"
            });
            panel.appendChild(body);

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
            const username = this.getUser().split("@")[0];
            const oVBox = new VBox("chatMessages", {
                width: "100%",
                items: [
                    new Text({ text: "Hello " + username + ". How can I help you today?" })
                        .addStyleClass("chatBotBubble")
                ]
            });
            oVBox.placeAt(scrollWrapper);

            // === Sticky Input Bar ===
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
                boxShadow: "0 -2px 5px rgba(0,0,0,0.05)"
            });
            body.appendChild(stickyInputBar);

            // === Joule-style input & send button ===
            const inputContainer = document.createElement("div");
            inputContainer.id = "chatInputContainer";
            Object.assign(inputContainer.style, {
                display: "flex",
                alignItems: "center",
                border: "1.6px solid #0a6ed1",
                borderRadius: "25px",
                padding: "6px 10px",
                background: "#fff",
                width: "95%",
                boxSizing: "border-box",
                boxShadow: "0 0 5px rgba(106,27,154,0.2)"
            });

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
            }).addStyleClass("jouleInputField");

            const oSendBtn = new Button({
                icon: "sap-icon://paper-plane",
                tooltip: "Send",
                press: function () {
                    const sMsg = oTextArea.getValue().trim();
                    if (sMsg) {
                        oTextArea.setValue("");
                        sendMessage(sMsg);
                    }
                }
            }).addStyleClass("jouleSendButton");

            oTextArea.placeAt(inputContainer);
            oSendBtn.placeAt(inputContainer);
            stickyInputBar.appendChild(inputContainer);

            sap.ui.getCore().applyChanges();

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

            // === Scroll button ===
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
                padding: "4px"
            });
            body.appendChild(scrollButton);

            const oIcon = new Icon({
                src: "sap-icon://slim-arrow-down",
                size: "1.2rem",
                color: "white",
                press: function () { scrollDown(true); }
            });
            oIcon.placeAt(scrollButton);

            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            scrollDiv.addEventListener("scroll", () => {
                const nearBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight < 150;
                scrollButton.style.display = nearBottom ? "none" : "flex";
            });

            function scrollDown(force) {
                if (scrollDiv) {
                    setTimeout(() => {
                        if (force) scrollDiv.scrollTo({ top: scrollDiv.scrollHeight, behavior: "smooth" });
                        else scrollDiv.scrollTop = scrollDiv.scrollHeight;
                    }, 150);
                }
            }

            function sendMessage(sMsg) {
                if (!sMsg) return;
                const oVBox = sap.ui.getCore().byId("chatMessages");
                oVBox.addItem(new Text({ text: sMsg }).addStyleClass("chatUserBubble"));
                sap.ui.getCore().applyChanges();
                scrollDown();

                const oTyping = new HBox("typingIndicator", {
                    alignItems: "Center",
                    justifyContent: "Start",
                    items: [
                        new sap.ui.core.HTML({
                            content: `
            <div class="typing-joule-container clean">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            `
                        })
                    ]
                });
                oVBox.addItem(oTyping);
                scrollDown();

                setTimeout(function () {
                    const userId = that.getUser().toLowerCase();

                    $.ajax({
                        url: "https://vcp_assistant_api.cfapps.us10-001.hana.ondemand.com/ask",
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({ query: sMsg, userid: userId }),
                        headers: { Authorization: that.token },

                        success: function (data) {
                            removeTyping();

                            const oBotVBox = new VBox().addStyleClass("chatBotBubble");

                            if (data && data.response) {
                                const responseText = data.response.trim();

                                // 🔹 If response contains HTML table, render full HTML
                                if (responseText.includes("<table")) {
                                    oBotVBox.addItem(new sap.ui.core.HTML({
                                        content: responseText
                                    }));
                                } else {
                                    // 🔹 Otherwise use FormattedText for safe rendering
                                    oBotVBox.addItem(new sap.m.FormattedText({
                                        htmlText: responseText.startsWith("An unexpected error")
                                            ? "Sorry, I ran into an internal error. Please try again later."
                                            : responseText
                                    }));
                                }
                            }

                            // 🔹 Handle separate 'table' property (if API returns it separately)
                            if (data.table) {
                                oBotVBox.addItem(new sap.ui.core.HTML({
                                    content: data.table
                                }));
                            }

                            // 🔹 Add bot message with logo
                            oVBox.addItem(new HBox({
                                items: [
                                    new Image({ src: "image/logo.png", width: "28px", height: "28px" }),
                                    oBotVBox
                                ]
                            }));

                            sap.ui.getCore().applyChanges();
                            scrollDown();
                        },

                        error: function (xhr) {
                            removeTyping();
                            oVBox.addItem(new HBox({
                                items: [
                                    new Image({ src: "image/logo.png", width: "28px", height: "28px" }),
                                    new Text({
                                        text: "🤖 " + (xhr.statusText || "Error contacting assistant")
                                    }).addStyleClass("chatBotBubble")
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
                    const oHtml = oTyping.getItems()[0]?.getItems?.()[0];
                    const $typing = oHtml?.getDomRef();
                    if ($typing) {
                        $typing.classList.add("fade-out"); // trigger fade animation
                        setTimeout(() => {
                            oVBox.removeItem(oTyping);
                            oTyping.destroy();
                        }, 400); // match animation duration
                    } else {
                        oVBox.removeItem(oTyping);
                        oTyping.destroy();
                    }
                }
            }

        },

        _clearChatMessages: function () {
            const oVBox = sap.ui.getCore().byId("chatMessages");
            if (oVBox) {
                oVBox.destroyItems();
                const username = this.getUser().split("@")[0];
                oVBox.addItem(new Text({ text: "Hello " + username + ". How can I help you today?" })
                    .addStyleClass("chatBotBubble"));
            }
            // 🧹 Reset scroll and hide "scroll down" button
            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            const scrollBtn = document.getElementById("scrollToBottomBtn");
            if (scrollDiv) scrollDiv.scrollTop = 0;
            if (scrollBtn) scrollBtn.style.display = "none";
        },

        _addStyles: function () {
            const style = document.createElement("style");
            style.innerHTML = `
                #chatbot-panel.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
                #chatbot-panel.closed { opacity: 0; transform: translateY(20px); pointer-events: none; }

                .chatUserBubble {
                    background: #0a6ed1; color: white; padding: 8px 12px;
                    border-radius: 12px; margin: 4px; max-width: 70%;
                    align-self: flex-end; word-wrap: break-word;
                }

                .chatBotBubble {
                    background: #f2f2f2; color: #333; padding: 8px 12px;
                    border-radius: 12px; margin: 4px; max-width: 90%;
                    align-self: flex-start; word-wrap: break-word;
                }

                /* Joule-style input */
                .jouleInputField .sapMTextAreaInner {
                    border: none !important; outline: none !important;
                    background: transparent !important; color: #333 !important;
                    font-size: 0.95rem !important; padding: 6px 10px !important;
                    resize: none !important; line-height: 1.4rem !important;
                }

                .jouleInputField .sapMTextAreaInner::placeholder { color: #999 !important; }

                .jouleSendButton {
                    border: none !important; background: #0a6ed1 !important;
                 border-radius: 50% !important;
                    height: 2.4rem !important; width: 2.4rem !important;
                    margin-left: 6px !important;
                    transition: background 0.2s ease, transform 0.1s ease;
                }

                .jouleSendButton:hover {
                    background: #0a6ed1 !important; transform: scale(1.1);
                }

                .chatHeaderIcon { cursor: pointer; transition: transform 0.2s ease, opacity 0.2s ease; }
                .chatHeaderIcon:hover { transform: scale(1.2); opacity: 0.9; }
            `;
            document.head.appendChild(style);
        }
    });
});
