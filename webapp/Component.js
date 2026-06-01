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
            that.currentSessionId = Date.now().toString();
            that.currentMessages = [];

            UIComponent.prototype.init.apply(this, arguments);
            this._createFloatingButton();
            this._createChatPanel();
            this._addStyles();
            this._setupNavigationListener();
            this._getURL();
            const oRootPath = jQuery.sap.getModulePath("chat.newchatbot");
            const oImageModel = new JSONModel({ path: oRootPath });
            this.setModel(oImageModel, "imageModel");

            that.userId = this.getUser()?.toLowerCase() || "unknown";;
            //For browser close/session close
            this._registerSessionEndHandlers();

            setTimeout(() => sap.ui.core.BusyIndicator.hide(), 1200);
        },
        _getURL: async function(){
            that.oModel = that.getModel("oModel");
            await that.oModel.callFunction("/getChatbotUrl",
                    {
                        method: "GET",
                        success: function (oData) {
                            var url = oData.getChatbotUrl;
                            if(url === undefined){
                                return;
                            }
                            that.URL = url;
                        },
                        error: function (oData, error) {
                            MessageToast.show("error");

                        }
                    });
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
                that.userId = this.getUser()?.toLowerCase() || "unknown";

                // 1️⃣ When browser/tab closes
                window.addEventListener("beforeunload", function () {
                    navigator.sendBeacon(
                        "https://vcp_assistant_api_devtest.cfapps.us10-001.hana.ondemand.com/destroy",
                        JSON.stringify({ userid: that.userId })
                    );
                });

                // 2️⃣ When Launchpad logs out or session expires
                if (sap.ushell && sap.ushell.Container) {
                    sap.ushell.Container.attachLogoutEvent(function () {
                        try {
                            that.userId = this.getUser()?.toLowerCase() || "unknown";
                            var urlFinal = that.URL+'/destroy';
                            $.ajax({
                                // url: "https://vcp_assistant_api_devtest.cfapps.us10-001.hana.ondemand.com/destroy ",
                                url: urlFinal,
                                method: "POST",
                                contentType: "application/json",
                                data: JSON.stringify({ userid: that.userId }),
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
        getNameFromEmail: function (email) {
            if (!email || typeof email !== "string") return "";

            // Take text before @
            let name = email.split("@")[0];

            // Remove digits
            name = name.replace(/[0-9]/g, "");

            // Replace separators (., _, -, etc.) with spaces
            name = name.replace(/[\.\_\-]+/g, " ");

            // Trim extra spaces
            name = name.replace(/\s+/g, " ").trim();

            // Capitalize each word
            name = name
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            return name;
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
                if (oChatPanel && !visible) {
                    oChatPanel.classList.remove("open");
                    oChatPanel.classList.add("closed");
                    oChatPanel.style.display = "none";
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
                tooltip: "VC Planner Chat Assistant",
                press: function () {
                    const oPanel = document.getElementById("chatbot-panel");
                    if (oPanel.classList.contains("open")) {
                        oPanel.classList.remove("open");
                        oPanel.classList.add("closed");
                        oPanel.style.display = "none";
                    } else {
                        oPanel.classList.remove("closed");
                        oPanel.classList.add("open");
                        oPanel.style.display = "flex";
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
                display: "none",
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
                    panel.style.display = "none";
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

            // 🖥️ Fullscreen icon
            const fullscreenIcon = new Icon({
                src: "sap-icon://full-screen",
                size: "1.2rem",
                color: "white",
                tooltip: "Full Screen",
                press: () => {
                    panel.classList.toggle("fullscreen");

                    const isFs = panel.classList.contains("fullscreen");
                    fullscreenIcon.setSrc(
                        isFs ? "sap-icon://exit-full-screen" : "sap-icon://full-screen"
                    );
                    if (isFs) {
                        document.getElementById("chat-floating-btn").style.display = "none";
                    } else {
                        document.getElementById("chat-floating-btn").style.display = "flex";
                    }
                }
            });
            fullscreenIcon.addStyleClass("chatHeaderIcon");

            const historyIcon = new Icon({
                src: "sap-icon://history",
                size: "1.2rem",
                color: "white",
                tooltip: "Chat History",
                press: function () {
                    const sidebar = document.getElementById("chatbot-history-sidebar");
                    if (!sidebar) return;
                    const isOpen = sidebar.style.width !== "0" && sidebar.style.width !== "0px" && sidebar.style.width !== "";
                    sidebar.style.width = isOpen ? "0" : "180px";
                    if (!isOpen) that._renderHistoryList();
                }
            });
            historyIcon.addStyleClass("chatHeaderIcon");

            historyIcon.placeAt(rightIcons);
            fullscreenIcon.placeAt(rightIcons);

            // 🧩 Swap order — delete first, close second
            clearIcon.placeAt(rightIcons);
            closeIcon.placeAt(rightIcons);

            header.appendChild(rightIcons);
            panel.appendChild(header);

            // === Content Wrapper (sidebar + chat area) ===
            const contentWrapper = document.createElement("div");
            Object.assign(contentWrapper.style, {
                flex: "1",
                display: "flex",
                flexDirection: "row",
                overflow: "hidden"
            });
            panel.appendChild(contentWrapper);

            // === History Sidebar ===
            const historySidebar = document.createElement("div");
            historySidebar.id = "chatbot-history-sidebar";
            Object.assign(historySidebar.style, {
                width: "0",
                overflow: "hidden",
                background: "#f5f7fa",
                borderRight: "1px solid #e0e0e0",
                display: "flex",
                flexDirection: "column",
                flexShrink: "0",
                transition: "width 0.25s ease"
            });
            contentWrapper.appendChild(historySidebar);

            const newChatBtn = document.createElement("button");
            newChatBtn.textContent = "+ New Chat";
            Object.assign(newChatBtn.style, {
                margin: "10px 8px", padding: "8px 10px", background: "transparent",
                border: "1px solid #0a6ed1", borderRadius: "6px", color: "#0a6ed1",
                cursor: "pointer", fontSize: "0.78rem", textAlign: "left",
                flexShrink: "0", whiteSpace: "nowrap", fontWeight: "500"
            });
            newChatBtn.addEventListener("click", function () { that._startNewChat(); });
            historySidebar.appendChild(newChatBtn);

            const recentLabel = document.createElement("div");
            recentLabel.textContent = "Recent";
            Object.assign(recentLabel.style, {
                color: "#888", fontSize: "0.68rem", padding: "8px 10px 4px",
                textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: "0"
            });
            historySidebar.appendChild(recentLabel);

            const historyList = document.createElement("div");
            historyList.id = "chatbot-history-list";
            Object.assign(historyList.style, { flex: "1", overflowY: "auto", padding: "4px 6px" });
            historySidebar.appendChild(historyList);

            // === Body ===
            const body = document.createElement("div");
            Object.assign(body.style, {
                flex: "1",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative"
            });
            contentWrapper.appendChild(body);

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
            const username = this.getNameFromEmail(this.getUser().toLowerCase());
            const greetingText = "Hello " + username + ". How can I help you today?";
            that.currentMessages = [{ role: "bot-greeting", text: greetingText }];
            const oVBox = new VBox("chatMessages", {
                width: "100%",
                items: [
                    new Text({ text: greetingText }).addStyleClass("chatBotBubble")
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

            async function sendMessage(sMsg) {
                if (!sMsg) return;
                that.oJobModel = that.getModel("jobs");
                await that.oJobModel.callFunction("/getAuthorization",
                    {
                        method: "GET",
                        success: function (oData) {
                            sap.ui.core.BusyIndicator.hide();
                            var bearerToken = oData.getAuthorization;
                            that.token = bearerToken;
                        },
                        error: function (oData, error) {
                            MessageToast.show("error");

                        }
                    });
                const oVBox = sap.ui.getCore().byId("chatMessages");
                oVBox.addItem(new Text({ text: sMsg }).addStyleClass("chatUserBubble"));
                that.currentMessages.push({ role: "user", text: sMsg });
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

                setTimeout(async function () {
                    const userId = that.getUser().toLowerCase();
                    var urlFinal = that.URL+'/ask';
                    await $.ajax({
                        url: urlFinal,
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

                            if (data && data.response) {
                                const rText = data.response.trim();
                                const msgEntry = rText.includes("<table")
                                    ? { role: "bot", html: rText }
                                    : { role: "bot", text: rText.startsWith("An unexpected error") ? "Sorry, I ran into an internal error. Please try again later." : rText };
                                if (data.table) msgEntry.table = data.table;
                                that.currentMessages.push(msgEntry);
                            }
                            that._saveCurrentSession();

                            sap.ui.getCore().applyChanges();
                            scrollDown();
                        },

                        error: function (xhr) {
                            removeTyping();
                            const errText = "🤖 " + (xhr.statusText || "Error contacting assistant");
                            oVBox.addItem(new HBox({
                                items: [
                                    new Image({ src: "image/logo.png", width: "28px", height: "28px" }),
                                    new Text({ text: errText }).addStyleClass("chatBotBubble")
                                ]
                            }));
                            that.currentMessages.push({ role: "bot", text: errText });
                            that._saveCurrentSession();
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
            this._saveCurrentSession();
            const oVBox = sap.ui.getCore().byId("chatMessages");
            if (oVBox) {
                oVBox.destroyItems();
                const username = this.getNameFromEmail(this.getUser().toLowerCase());
                const greetingText = "Hello " + username + ". How can I help you today?";
                oVBox.addItem(new Text({ text: greetingText }).addStyleClass("chatBotBubble"));
                that.currentSessionId = Date.now().toString();
                that.currentMessages = [{ role: "bot-greeting", text: greetingText }];
            }
            // 🧹 Reset scroll and hide "scroll down" button
            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            const scrollBtn = document.getElementById("scrollToBottomBtn");
            if (scrollDiv) scrollDiv.scrollTop = 0;
            if (scrollBtn) scrollBtn.style.display = "none";
        },

        _getStorageKey: function () {
            return "vcp_chatbot_sessions_" + (that.userId || "unknown");
        },

        _saveCurrentSession: function () {
            if (!that.currentMessages || !that.currentMessages.some(function (m) { return m.role === "user"; })) return;
            const key = this._getStorageKey();
            let sessions = [];
            try { sessions = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { sessions = []; }
            const firstUser = that.currentMessages.find(function (m) { return m.role === "user"; });
            const raw = firstUser ? firstUser.text : "Chat";
            const title = raw.length > 40 ? raw.slice(0, 37) + "..." : raw;
            const idx = sessions.findIndex(function (s) { return s.id === that.currentSessionId; });
            const session = { id: that.currentSessionId, title: title, messages: that.currentMessages.slice(), updatedAt: Date.now() };
            if (idx >= 0) sessions[idx] = session;
            else sessions.unshift(session);
            try { localStorage.setItem(key, JSON.stringify(sessions.slice(0, 50))); } catch (e) {}
            this._renderHistoryList();
        },

        _loadSession: function (sessionId) {
            this._saveCurrentSession();
            const key = this._getStorageKey();
            let sessions = [];
            try { sessions = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
            const session = sessions.find(function (s) { return s.id === sessionId; });
            if (!session) return;
            that.currentSessionId = sessionId;
            that.currentMessages = session.messages.slice();
            const oVBox = sap.ui.getCore().byId("chatMessages");
            if (!oVBox) return;
            oVBox.destroyItems();
            session.messages.forEach(function (msg) {
                if (msg.role === "bot-greeting") {
                    oVBox.addItem(new Text({ text: msg.text }).addStyleClass("chatBotBubble"));
                } else if (msg.role === "user") {
                    oVBox.addItem(new Text({ text: msg.text }).addStyleClass("chatUserBubble"));
                } else if (msg.role === "bot") {
                    const oBotVBox = new VBox().addStyleClass("chatBotBubble");
                    if (msg.html) oBotVBox.addItem(new sap.ui.core.HTML({ content: msg.html }));
                    else if (msg.text) oBotVBox.addItem(new sap.m.FormattedText({ htmlText: msg.text }));
                    if (msg.table) oBotVBox.addItem(new sap.ui.core.HTML({ content: msg.table }));
                    oVBox.addItem(new HBox({
                        items: [new Image({ src: "image/logo.png", width: "28px", height: "28px" }), oBotVBox]
                    }));
                }
            });
            sap.ui.getCore().applyChanges();
            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            if (scrollDiv) scrollDiv.scrollTop = scrollDiv.scrollHeight;
            this._renderHistoryList();
        },

        _startNewChat: function () {
            this._saveCurrentSession();
            that.currentSessionId = Date.now().toString();
            const username = this.getNameFromEmail(this.getUser().toLowerCase());
            const greetingText = "Hello " + username + ". How can I help you today?";
            that.currentMessages = [{ role: "bot-greeting", text: greetingText }];
            const oVBox = sap.ui.getCore().byId("chatMessages");
            if (oVBox) {
                oVBox.destroyItems();
                oVBox.addItem(new Text({ text: greetingText }).addStyleClass("chatBotBubble"));
                sap.ui.getCore().applyChanges();
            }
            const scrollDiv = document.getElementById("chat-scroll-wrapper");
            const scrollBtn = document.getElementById("scrollToBottomBtn");
            if (scrollDiv) scrollDiv.scrollTop = 0;
            if (scrollBtn) scrollBtn.style.display = "none";
            this._renderHistoryList();
        },

        _renderHistoryList: function () {
            const listEl = document.getElementById("chatbot-history-list");
            if (!listEl) return;
            const key = this._getStorageKey();
            let sessions = [];
            try { sessions = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
            listEl.innerHTML = "";
            const self = this;
            if (sessions.length === 0) {
                const empty = document.createElement("div");
                empty.textContent = "No previous chats";
                Object.assign(empty.style, { color: "#6b7280", fontSize: "0.75rem", padding: "16px 8px", textAlign: "center" });
                listEl.appendChild(empty);
                return;
            }
            sessions.forEach(function (session) {
                const item = document.createElement("div");
                item.textContent = session.title;
                item.title = session.title;
                const isActive = session.id === that.currentSessionId;
                Object.assign(item.style, {
                    padding: "8px 10px", borderRadius: "6px", cursor: "pointer",
                    fontSize: "0.78rem", color: isActive ? "#0a6ed1" : "#444",
                    background: isActive ? "rgba(10,110,209,0.10)" : "transparent",
                    fontWeight: isActive ? "600" : "normal",
                    margin: "1px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                });
                item.addEventListener("mouseover", function () {
                    if (session.id !== that.currentSessionId) this.style.background = "rgba(10,110,209,0.06)";
                });
                item.addEventListener("mouseout", function () {
                    if (session.id !== that.currentSessionId) this.style.background = "transparent";
                });
                item.addEventListener("click", function () { self._loadSession(session.id); });
                listEl.appendChild(item);
            });
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
                    width: fit-content;
                }

                .chatBotBubble {
                    background: #f2f2f2; color: #333; padding: 8px 12px;
                    border-radius: 12px; margin: 4px; max-width: 90%;
                    align-self: flex-start; word-wrap: break-word;
                    width: fit-content;
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

                #chatbot-history-sidebar button:hover { background: rgba(10,110,209,0.08) !important; }
                #chatbot-history-list::-webkit-scrollbar { width: 3px; }
                #chatbot-history-list::-webkit-scrollbar-track { background: transparent; }
                #chatbot-history-list::-webkit-scrollbar-thumb { background: #c0ccd8; border-radius: 4px; }
            `;
            document.head.appendChild(style);
        }
    });
});
