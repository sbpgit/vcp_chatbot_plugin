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
            const oRootPath = jQuery.sap.getModulePath("chat.newchatbot");
            that.logoPath = oRootPath + "/image/logo.png";
            const _preloadLogo = new window.Image();
            _preloadLogo.src = that.logoPath;
            this._createFloatingButton();
            this._createChatPanel();
            this._addStyles();
            this._setupNavigationListener();
            this._getURL();
            this._getToken();
            const oImageModel = new JSONModel({ path: oRootPath });
            this.setModel(oImageModel, "imageModel");

            that.userId = this.getUser()?.toLowerCase() || "unknown";
            //For browser close/session close
            this._registerSessionEndHandlers();

            setTimeout(() => sap.ui.core.BusyIndicator.hide(), 1200);
        },
        _getURL: function () {
            that.oModel = that.getModel("oModel");
            return new Promise(function (resolve) {
                that.oModel.callFunction("/getChatbotUrl", {
                    method: "GET",
                    success: function (oData) {
                        var url = oData.getChatbotUrl;
                        if (url !== undefined) {
                            that.URL = url;
                        }
                        resolve();
                    },
                    error: function () {
                        MessageToast.show("error");
                        resolve();
                    }
                });
            });
        },
        _getToken: function () {
            var oJobModel = that.getModel("jobs");
            if (!oJobModel) return Promise.resolve();
            return new Promise(function (resolve) {
                oJobModel.callFunction("/getAuthorization", {
                    method: "GET",
                    success: function (oData) {
                        that.token = oData.getAuthorization;
                        resolve();
                    },
                    error: function () {
                        MessageToast.show("error");
                        resolve();
                    }
                });
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
                    if (that.URL) {
                        navigator.sendBeacon(
                            that.URL + "/destroy",
                            JSON.stringify({ userid: that.userId })
                        );
                    }
                });

                // 2️⃣ When Launchpad logs out or session expires
                if (sap.ushell && sap.ushell.Container) {
                    sap.ushell.Container.attachLogoutEvent(function () {
                        try {
                            that.userId = that.getUser()?.toLowerCase() || "unknown";
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
            rightIcons.style.flexShrink = "0";

            // ✖ Close icon
            const closeIcon = new Icon({
                src: "sap-icon://decline",
                size: "1.2rem",
                color: "white",
                tooltip: "Close Chat",
                press: () => {
                    panel.classList.remove("open", "fullscreen");
                    panel.classList.add("closed");
                    panel.style.display = "none";
                    fullscreenIcon.setSrc("sap-icon://full-screen");
                    document.getElementById("chat-floating-btn").style.display = "flex";
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
                    new HBox({
                        items: [
                            new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                            new Text({ text: greetingText }).addStyleClass("chatBotBubble")
                        ]
                    }).addStyleClass("chatBotMessageRow")
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

            const INTENT_FILTERS = {
                "OptionMixPlanning": {
                    entitySet: "getTelescopicFinalPlanNew",
                    cascade: [
                        { key: "LOCATION_ID",     label: "Location ID",     type: "string" },
                        { key: "PRODUCT_ID",      label: "Product ID",      type: "string" },
                        { key: "CUSTOMER_GROUP",  label: "Customer Group",  type: "string" },
                        { key: "CHAR_NAME",       label: "Char Name",       type: "string" },
                        { key: "CHARVAL_NUM",     label: "Char Value",      type: "string" },
                        { key: "TELESCOPIC_WEEK", label: "Telescopic Week", type: "string" }
                    ],
                    autoFill: [
                        { key: "PERIODSTART", label: "Period Start Date" },
                        { key: "PERIODEND",   label: "Period End Date" }
                    ],
                    optionalFilters: [
                        { key: "VERSION",       label: "Version",       defaultVal: "__BASELINE" },
                        { key: "SCENARIO",      label: "Scenario",      defaultVal: "_PLAN" },
                        { key: "MODEL_VERSION", label: "Model Version", defaultVal: "Active" }
                    ],
                    derived: [
                        { key: "OPT_PERCENT", label: "Opt Percent (%)" },
                        { key: "OPT_QTY",     label: "Opt Quantity" }
                    ],
                    distributionFilter: {
                        key: "DISTRIBUTION_METHOD",
                        label: "Distribution Type",
                        options: [
                            { value: "EQUAL",   label: "Equal Distribution" },
                            { value: "PRORATE", label: "Prorate Distribution" }
                        ]
                    }
                }
            };
            window._intentFilterConfig = INTENT_FILTERS;

            function toDateStr(val) {
                if (!val) return "";
                if (typeof val === "string") {
                    var m = val.match(/Date\((\d+)\)/);
                    if (m) return new Date(parseInt(m[1])).toISOString().slice(0, 10);
                    return val.slice(0, 10);
                }
                return val instanceof Date ? val.toISOString().slice(0, 10) : String(val);
            }

            function showFilterForm(intentName, config) {
                var oVBox = sap.ui.getCore().byId("chatMessages");
                var formId = "filterForm_" + Date.now();

                var cascadeHtml = config.cascade.map(function (f, i) {
                    var dis = i === 0 ? "" : " disabled";
                    var bg  = i === 0 ? "#fff" : "#f5f5f5";
                    return '<div style="margin-bottom:8px;">'
                        + '<label style="font-size:0.72rem;color:#555;display:block;margin-bottom:3px;">' + f.label + '</label>'
                        + '<select name="' + f.key + '"' + dis
                        + ' style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:0.78rem;background:' + bg + ';box-sizing:border-box;">'
                        + '<option value="">-- Select --</option></select></div>';
                }).join("");

                var autoFillHtml = (config.autoFill || []).map(function (f) {
                    return '<div style="margin-bottom:8px;">'
                        + '<label style="font-size:0.72rem;color:#555;display:block;margin-bottom:3px;">' + f.label + '</label>'
                        + '<input name="' + f.key + '" readonly style="width:100%;padding:5px 8px;border:1px solid #e0e0e0;'
                        + 'border-radius:6px;font-size:0.78rem;background:#f9f9f9;box-sizing:border-box;color:#555;"/></div>';
                }).join("");

                var derivedHtml = (config.derived || []).map(function (f) {
                    var isDisabled = f.key === "OPT_QTY";
                    return '<div style="margin-bottom:8px;">'
                        + '<label style="font-size:0.72rem;color:#555;display:block;margin-bottom:3px;">' + f.label + '</label>'
                        + '<input name="' + f.key + '" type="number" step="any"'
                        + (isDisabled ? ' disabled' : '')
                        + ' style="width:100%;padding:5px 8px;border:1px solid #' + (isDisabled ? 'e0e0e0' : 'ccc') + ';border-radius:6px;font-size:0.78rem;background:' + (isDisabled ? '#f9f9f9' : '#fff') + ';box-sizing:border-box;"/></div>';
                }).join("")
                + (config.distributionFilter
                    ? '<div style="margin-top:10px;padding-top:8px;border-top:1px solid #eee;margin-bottom:8px;">'
                      + '<label style="font-size:0.72rem;color:#555;display:block;margin-bottom:3px;">' + config.distributionFilter.label + '</label>'
                      + '<select name="' + config.distributionFilter.key + '" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:0.78rem;background:#fff;box-sizing:border-box;">'
                      + config.distributionFilter.options.map(function (o) { return '<option value="' + o.value + '">' + o.label + '</option>'; }).join("")
                      + '</select></div>'
                    : "");

                var optionalFiltersHtml = (config.optionalFilters || []).map(function (f) {
                    return '<div style="margin-bottom:8px;">'
                        + '<label style="font-size:0.72rem;color:#555;display:block;margin-bottom:3px;">' + f.label + '</label>'
                        + '<select name="' + f.key + '" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:0.78rem;background:#fff;box-sizing:border-box;">'
                        + '<option value="' + f.defaultVal + '">' + f.defaultVal + '</option>'
                        + '</select></div>';
                }).join("");

                var formHtml = '<div id="' + formId + '" style="padding:4px 0;">'
                    + '<div style="font-size:0.78rem;font-weight:600;margin-bottom:10px;color:#0a6ed1;">' + intentName + ' — Please provide filters:</div>'
                    + cascadeHtml
                    + (optionalFiltersHtml ? '<div style="border-top:1px solid #eee;margin-top:8px;padding-top:8px;">' + optionalFiltersHtml + '</div>' : '')
                    + '<div id="' + formId + '_autoFill" style="display:none;border-top:1px solid #eee;margin-top:8px;padding-top:8px;">' + autoFillHtml + '</div>'
                    + '<div id="' + formId + '_derived" style="display:none;">' + derivedHtml + '</div>'
                    + '<button id="' + formId + '_submit"'
                    + ' style="display:none;background:#0a6ed1;color:white;border:none;padding:7px 18px;border-radius:6px;'
                    + 'cursor:pointer;font-size:0.78rem;margin-top:8px;width:100%;">Submit</button></div>';

                oVBox.addItem(new HBox({
                    items: [
                        new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                        new sap.ui.core.HTML({ content: '<div class="chatBotBubble" style="width:280px;">' + formHtml + '</div>' })
                    ]
                }).addStyleClass("chatBotMessageRow"));
                sap.ui.getCore().applyChanges();
                scrollDown(true);

                // Attach event listeners (CSP: no inline handlers allowed)
                config.cascade.forEach(function (f, idx) {
                    var sel = document.querySelector("#" + formId + " [name='" + f.key + "']");
                    if (sel) {
                        sel.addEventListener("change", function () {
                            window._onCascadeChange(formId, intentName, idx);
                        });
                    }
                });
                var optPctInp = document.querySelector("#" + formId + " [name='OPT_PERCENT']");
                if (optPctInp) {
                    optPctInp.addEventListener("input", function () { window._onOptPercentChange(formId); });
                }
                var submitBtnEl = document.getElementById(formId + "_submit");
                if (submitBtnEl) {
                    submitBtnEl.addEventListener("click", function () { window._submitFilterForm(formId, intentName); });
                }

                // Load first cascade dropdown
                var firstField = config.cascade[0];
                var firstSel = document.querySelector("#" + formId + " [name='" + firstField.key + "']");
                if (firstSel) {
                    firstSel.innerHTML = '<option value="">Loading...</option>';
                    that.oModel.read("/" + config.entitySet, {
                        urlParameters: Object.assign({ "$top": "30000" }, config.baseFilter ? { "$filter": config.baseFilter } : {}),
                        success: function (oData) {
                            var seen = {}, unique = [];
                            (oData.results || []).forEach(function (r) {
                                var v = r[firstField.key];
                                if (v !== null && v !== undefined && v !== "" && !seen[v]) { seen[v] = true; unique.push(String(v)); }
                            });
                            unique.sort();
                            var opts = '<option value="">-- Select --</option>';
                            unique.forEach(function (v) { opts += '<option value="' + v + '">' + v + '</option>'; });
                            firstSel.innerHTML = opts;
                        },
                        error: function () { firstSel.innerHTML = '<option value="">Error loading</option>'; }
                    });
                }

                // Load optional filter dropdowns (VERSION, SCENARIO, MODEL_VERSION) — default pre-selected
                (config.optionalFilters || []).forEach(function (f) {
                    var sel = document.querySelector("#" + formId + " [name='" + f.key + "']");
                    if (!sel) return;
                    that.oModel.read("/" + config.entitySet, {
                        urlParameters: Object.assign({ "$top": "30000" }, config.baseFilter ? { "$filter": config.baseFilter } : {}),
                        success: function (oData) {
                            var seen = {}, unique = [];
                            (oData.results || []).forEach(function (r) {
                                var v = r[f.key];
                                if (v !== null && v !== undefined && v !== "" && !seen[v]) { seen[v] = true; unique.push(String(v)); }
                            });
                            unique.sort();
                            var opts = "";
                            unique.forEach(function (v) {
                                opts += '<option value="' + v + '"' + (v === f.defaultVal ? " selected" : "") + ">" + v + "</option>";
                            });
                            if (!unique.length || unique.indexOf(f.defaultVal) === -1) {
                                opts = '<option value="' + f.defaultVal + '" selected>' + f.defaultVal + '</option>' + opts;
                            }
                            sel.innerHTML = opts;
                        },
                        error: function () { /* keep the pre-rendered default option */ }
                    });
                });
            }

            window._onCascadeChange = function (formId, intentName, changedIndex) {
                var config = window._intentFilterConfig[intentName];
                if (!config) return;
                var cascade = config.cascade;
                var form = document.getElementById(formId);
                if (!form) return;

                var currentSel = form.querySelector("[name='" + cascade[changedIndex].key + "']");
                var currentVal = currentSel ? currentSel.value : "";

                // Reset all dropdowns after the changed one
                for (var i = changedIndex + 1; i < cascade.length; i++) {
                    var s = form.querySelector("[name='" + cascade[i].key + "']");
                    if (s) { s.innerHTML = '<option value="">-- Select --</option>'; s.disabled = true; s.style.background = "#f5f5f5"; }
                }
                var autoFillDiv = document.getElementById(formId + "_autoFill");
                var derivedDiv  = document.getElementById(formId + "_derived");
                var submitBtn   = document.getElementById(formId + "_submit");
                if (autoFillDiv) autoFillDiv.style.display = "none";
                if (derivedDiv)  derivedDiv.style.display  = "none";
                if (submitBtn)   submitBtn.style.display   = "none";
                if (!currentVal) return;

                // Build OData $filter from all selections up to and including changedIndex
                var filterParts = [];
                for (var j = 0; j <= changedIndex; j++) {
                    var f = cascade[j];
                    var sel = form.querySelector("[name='" + f.key + "']");
                    var val = sel ? sel.value : "";
                    if (val) {
                        filterParts.push(
                            f.type === "datetime"
                                ? f.key + " eq datetime'" + val + "'"
                                : f.key + " eq '" + val.replace(/'/g, "''") + "'"
                        );
                    }
                }
                var cascadeFilter = filterParts.join(" and ");
                var filterStr = config.baseFilter
                    ? (cascadeFilter ? config.baseFilter + " and " + cascadeFilter : config.baseFilter)
                    : cascadeFilter;
                var nextIndex = changedIndex + 1;

                if (nextIndex < cascade.length) {
                    var nextField = cascade[nextIndex];
                    var nextSel = form.querySelector("[name='" + nextField.key + "']");
                    console.log("[Cascade] changedIndex=" + changedIndex + " nextField=" + nextField.key + " nextSel=" + nextSel + " filterStr=" + filterStr);
                    if (nextSel) {
                        nextSel.innerHTML = '<option value="">Loading...</option>';
                        nextSel.disabled = true;
                        (function (capturedFormId, capturedFieldKey, capturedFilterStr) {
                            console.log("[Cascade] OData read start for " + capturedFieldKey + " filter=" + capturedFilterStr);
                            that.oModel.read("/" + config.entitySet, {
                                urlParameters: { "$filter": capturedFilterStr, "$top": "30000" },
                                success: function (oData) {
                                    console.log("[Cascade] OData success for " + capturedFieldKey + " results=" + (oData.results || []).length);
                                    var f2 = document.getElementById(capturedFormId);
                                    var s2 = f2 ? f2.querySelector("[name='" + capturedFieldKey + "']") : null;
                                    if (!s2) { console.warn("[Cascade] select not found after read"); return; }
                                    var seen2 = {}, unique2 = [];
                                    (oData.results || []).forEach(function (r) {
                                        var v = r[capturedFieldKey];
                                        if (v !== null && v !== undefined && v !== "" && !seen2[v]) { seen2[v] = true; unique2.push(String(v)); }
                                    });
                                    unique2.sort();
                                    var opts2 = '<option value="">-- Select --</option>';
                                    unique2.forEach(function (v) { opts2 += '<option value="' + v + '">' + v + '</option>'; });
                                    s2.innerHTML = opts2;
                                    s2.disabled = false;
                                    s2.style.background = "#fff";
                                },
                                error: function (oErr) {
                                    console.error("[Cascade] OData error for " + capturedFieldKey, oErr);
                                    var f2 = document.getElementById(capturedFormId);
                                    var s2 = f2 ? f2.querySelector("[name='" + capturedFieldKey + "']") : null;
                                    if (!s2) return;
                                    s2.innerHTML = '<option value="">-- Error --</option>';
                                    s2.disabled = false;
                                    s2.style.background = "#fff";
                                }
                            });
                        })(formId, nextField.key, filterStr);
                    }
                } else {
                    // All cascade fields selected — fetch matching row to pre-fill autoFill + derived
                    that.oModel.read("/" + config.entitySet, {
                        urlParameters: { "$filter": filterStr + " and TYPE eq 1000", "$top": "1" },
                        success: function (oData) {
                            var row = oData.results && oData.results[0];
                            if (config.autoFill) {
                                config.autoFill.forEach(function (af) {
                                    var inp = form.querySelector("[name='" + af.key + "']");
                                    if (inp) inp.value = (row && row[af.key] !== undefined && row[af.key] !== null) ? toDateStr(row[af.key]) : "";
                                });
                                if (autoFillDiv) autoFillDiv.style.display = "block";
                            }
                            if (config.derived) {
                                config.derived.forEach(function (df) {
                                    var inp = form.querySelector("[name='" + df.key + "']");
                                    if (inp) inp.value = (row && row[df.key] !== undefined && row[df.key] !== null) ? row[df.key] : "";
                                });
                                // Store originals for OPT_QTY formula
                                if (row) {
                                    form.dataset.origOptPercent = row.OPT_PERCENT !== undefined ? row.OPT_PERCENT : "";
                                    form.dataset.origOptQty     = row.OPT_QTY     !== undefined ? row.OPT_QTY     : "";
                                }
                                if (derivedDiv) derivedDiv.style.display = "block";
                            }
                            if (submitBtn) submitBtn.style.display = "block";
                        },
                        error: function () {
                            if (derivedDiv) derivedDiv.style.display = "block";
                            if (submitBtn) submitBtn.style.display = "block";
                        }
                    });
                }
            };

            window._onOptPercentChange = function (formId) {
                var form = document.getElementById(formId);
                if (!form) return;
                var newPct  = parseFloat(form.querySelector("[name='OPT_PERCENT']").value);
                var origPct = parseFloat(form.dataset.origOptPercent);
                var origQty = parseFloat(form.dataset.origOptQty);
                if (isNaN(newPct) || !origPct || isNaN(origQty)) return;
                var newQty = (newPct / origPct) * origQty;
                var optQtyInp = form.querySelector("[name='OPT_QTY']");
                if (optQtyInp) optQtyInp.value = Math.round(newQty * 100) / 100;
            };

            window._submitFilterForm = function (formId, intentName) {
                var config = window._intentFilterConfig[intentName];
                if (!config) return;
                var form = document.getElementById(formId);
                if (!form) return;
                var params = {}, valid = true;

                config.cascade.forEach(function (f) {
                    var sel = form.querySelector("[name='" + f.key + "']");
                    if (sel) {
                        var v = sel.value.trim();
                        if (!v) { sel.style.border = "1px solid red"; valid = false; }
                        else { sel.style.border = "1px solid #ccc"; params[f.key] = v; }
                    }
                });
                (config.autoFill || []).forEach(function (f) {
                    var inp = form.querySelector("[name='" + f.key + "']");
                    if (inp && inp.value) params[f.key] = inp.value;
                });
                (config.derived || []).forEach(function (f) {
                    var inp = form.querySelector("[name='" + f.key + "']");
                    if (inp) {
                        var v = inp.value.trim();
                        if (inp.disabled) { if (v) params[f.key] = v; }
                        else {
                            if (!v) { inp.style.border = "1px solid red"; valid = false; }
                            else { inp.style.border = "1px solid #ccc"; params[f.key] = v; }
                        }
                    }
                });
                (config.optionalFilters || []).forEach(function (f) {
                    var sel = form.querySelector("[name='" + f.key + "']");
                    if (sel) params[f.key] = sel.value || f.defaultVal;
                });
                if (config.distributionFilter) {
                    var distSel = form.querySelector("[name='" + config.distributionFilter.key + "']");
                    if (distSel) params[config.distributionFilter.key] = distSel.value;
                }
                if (!valid) return;
                params.DATE_TIME = new Date().toISOString();

                // Disable form while loading preview
                form.querySelectorAll("input,select,button").forEach(function (el) { el.disabled = true; });

                // Fetch all CHARVAL_NUM rows for the same CHAR_NAME to compute distribution
                var filterParts = config.baseFilter ? [config.baseFilter] : [];
                filterParts.push("TYPE eq 1000");
                ["LOCATION_ID", "PRODUCT_ID", "CUSTOMER_GROUP", "CHAR_NAME", "TELESCOPIC_WEEK"].forEach(function (key) {
                    if (params[key]) filterParts.push(key + " eq '" + params[key].replace(/'/g, "''") + "'");
                });
                (config.optionalFilters || []).forEach(function (f) {
                    if (params[f.key]) filterParts.push(f.key + " eq '" + (params[f.key] || "").replace(/'/g, "''") + "'");
                });

                that.oModel.read("/" + config.entitySet, {
                    urlParameters: { "$filter": filterParts.join(" and ") },
                    success: function (oData) {
                        _showDistributionPreview(formId, intentName, params, oData.results || []);
                    },
                    error: function () {
                        form.querySelectorAll("input,select,button").forEach(function (el) { el.disabled = false; });
                    }
                });
            };

            function _showDistributionPreview(formId, intentName, params, allRows) {
                var oVBox = sap.ui.getCore().byId("chatMessages");
                var selectedCharVal = params["CHARVAL_NUM"];
                var newPct = parseFloat(params["OPT_PERCENT"]);
                var distMethod = params["DISTRIBUTION_METHOD"];

                var selectedRow = null;
                for (var i = 0; i < allRows.length; i++) {
                    if (String(allRows[i].CHARVAL_NUM) === String(selectedCharVal)) { selectedRow = allRows[i]; break; }
                }
                var oldPct = selectedRow ? parseFloat(selectedRow.OPT_PERCENT) : newPct;
                var delta = newPct - oldPct;
                var others = allRows.filter(function (r) { return String(r.CHARVAL_NUM) !== String(selectedCharVal); });
                var sumOthersPct = others.reduce(function (s, r) { return s + (parseFloat(r.OPT_PERCENT) || 0); }, 0);

                var previewRows = [];
                previewRows.push({
                    charVal: selectedCharVal,
                    charNum: selectedRow ? String(selectedRow.CHAR_NUM || "") : "",
                    oldPct: oldPct, newPct: Math.round(newPct * 100) / 100,
                    oldQty: selectedRow ? parseFloat(selectedRow.OPT_QTY) || 0 : 0,
                    newQty: Math.round((parseFloat(params["OPT_QTY"]) || 0) * 100) / 100,
                    oldPctStr: String(oldPct),
                    isSelected: true
                });
                var equalSharePct = Math.round((100 - newPct) / (others.length || 1) * 100) / 100;

                others.forEach(function (r) {
                    var oPct = parseFloat(r.OPT_PERCENT) || 0;
                    var oQty = parseFloat(r.OPT_QTY) || 0;
                    var nPct = distMethod === "EQUAL"
                        ? equalSharePct
                        : (sumOthersPct ? oPct - (oPct / sumOthersPct) * delta : oPct);
                    nPct = Math.round(nPct * 100) / 100;
                    var nQty = oPct ? Math.round((nPct / oPct) * oQty * 100) / 100 : oQty;
                    previewRows.push({
                        charVal: r.CHARVAL_NUM,
                        charNum: String(r.CHAR_NUM || ""),
                        oldPct: oPct, newPct: nPct, oldQty: oQty, newQty: nQty,
                        oldPctStr: String(oPct),
                        isSelected: false
                    });
                });

                var previewId = "preview_" + Date.now();
                window._previewData = window._previewData || {};
                window._previewData[previewId] = { formId: formId, intentName: intentName, params: params, rows: previewRows };

                var distLabel = distMethod === "EQUAL" ? "Equal Distribution" : "Prorate Distribution";
                var tableHtml = '<div style="font-size:0.72rem;">'
                    + '<div style="font-weight:600;margin-bottom:8px;color:#0a6ed1;">Distribution Preview — ' + distLabel + '</div>'
                    + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.68rem;">'
                    + '<thead><tr style="background:#e8f0fe;">'
                    + '<th style="padding:4px 5px;text-align:left;border:1px solid #ddd;">Char Value</th>'
                    + '<th style="padding:4px 5px;text-align:right;border:1px solid #ddd;">Old %</th>'
                    + '<th style="padding:4px 5px;text-align:right;border:1px solid #ddd;">New %</th>'
                    + '<th style="padding:4px 5px;text-align:right;border:1px solid #ddd;">Old Qty</th>'
                    + '<th style="padding:4px 5px;text-align:right;border:1px solid #ddd;">New Qty</th>'
                    + '</tr></thead><tbody>';

                previewRows.forEach(function (row) {
                    var bg = row.isSelected ? "#fff8e1" : "#fff";
                    var changed = row.newPct !== row.oldPct;
                    var color = row.newPct > row.oldPct ? "#2e7d32" : (row.newPct < row.oldPct ? "#c62828" : "#333");
                    var fw = changed ? "600" : "normal";
                    tableHtml += '<tr style="background:' + bg + ';">'
                        + '<td style="padding:4px 5px;border:1px solid #ddd;">' + row.charVal + (row.isSelected ? " ✎" : "") + '</td>'
                        + '<td style="padding:4px 5px;text-align:right;border:1px solid #ddd;">' + row.oldPct + '</td>'
                        + '<td style="padding:4px 5px;text-align:right;border:1px solid #ddd;color:' + color + ';font-weight:' + fw + ';">' + row.newPct + '</td>'
                        + '<td style="padding:4px 5px;text-align:right;border:1px solid #ddd;">' + row.oldQty + '</td>'
                        + '<td style="padding:4px 5px;text-align:right;border:1px solid #ddd;color:' + color + ';font-weight:' + fw + ';">' + row.newQty + '</td>'
                        + '</tr>';
                });

                tableHtml += '</tbody></table></div>'
                    + '<div style="display:flex;gap:8px;margin-top:10px;">'
                    + '<button id="' + previewId + '_confirm"'
                    + ' style="flex:1;background:#0a6ed1;color:#fff;border:none;padding:7px;border-radius:6px;cursor:pointer;font-size:0.78rem;font-weight:600;">Confirm &amp; Send</button>'
                    + '<button id="' + previewId + '_cancel"'
                    + ' style="flex:1;background:#fff;color:#0a6ed1;border:1px solid #0a6ed1;padding:7px;border-radius:6px;cursor:pointer;font-size:0.78rem;">Edit</button>'
                    + '</div></div>';

                oVBox.addItem(new HBox({
                    items: [
                        new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                        new sap.ui.core.HTML({ content: '<div id="' + previewId + '" class="chatBotBubble" style="width:310px;">' + tableHtml + '</div>' })
                    ]
                }).addStyleClass("chatBotMessageRow"));
                sap.ui.getCore().applyChanges();
                scrollDown(true);

                // Attach confirm/cancel listeners (CSP: no inline handlers)
                var confirmBtnEl = document.getElementById(previewId + "_confirm");
                if (confirmBtnEl) {
                    confirmBtnEl.addEventListener("click", function () { window._confirmFilterSubmit(previewId); });
                }
                var cancelBtnEl = document.getElementById(previewId + "_cancel");
                if (cancelBtnEl) {
                    cancelBtnEl.addEventListener("click", function () { window._cancelFilterSubmit(previewId); });
                }
            }

            window._confirmFilterSubmit = function (previewId) {
                var data = (window._previewData || {})[previewId];
                if (!data) return;
                var previewEl = document.getElementById(previewId);
                if (previewEl) previewEl.querySelectorAll("button").forEach(function (b) { b.disabled = true; });

                var params = data.params;
                var currentUser = that.getUser ? that.getUser() : "";
                var now = new Date();

                var optData = data.rows.map(function (r, idx) {
                    var dt = new Date(now.getTime() + idx).toISOString();
                    return {
                        LOCATION_ID:    params.LOCATION_ID,
                        PRODUCT_ID:     params.PRODUCT_ID,
                        CUSTOMER_GROUP: params.CUSTOMER_GROUP,
                        CLASS_NUM:      "NA",
                        CHAR_NUM:       r.charNum,
                        CHARVAL_NUM:    r.charVal,
                        VERSION:        params.VERSION,
                        SCENARIO:       params.SCENARIO,
                        MODEL_VERSION:  params.MODEL_VERSION,
                        TYPE:           3,
                        OPT_PERCENT:    r.newPct,
                        COMMENTS:       "",
                        OLD_VALUE:      r.oldPctStr,
                        DATE_TIME:      dt,
                        USER:           currentUser,
                        TELESCOPIC_WEEK: params.TELESCOPIC_WEEK,
                        LOCK:           false,
                        OPT_QTY:        r.newQty,
                        WEEK_STARTDATE: params.PERIODSTART || "",
                        WEEK_ENDDATE:   params.PERIODEND   || ""
                    };
                });

                that.oModel.callFunction("/saveOptionPercentData", {
                    method: "GET",
                    urlParameters: { optData: JSON.stringify(optData) },
                    success: function () {
                        var oVBox = sap.ui.getCore().byId("chatMessages");
                        oVBox.addItem(new HBox({
                            items: [
                                new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                                new Text({ text: "Option mix planning data saved successfully." }).addStyleClass("chatBotBubble")
                            ]
                        }).addStyleClass("chatBotMessageRow"));
                        sap.ui.getCore().applyChanges();
                        scrollDown(true);
                    },
                    error: function (oErr) {
                        var msg = "Failed to save data. Please try again.";
                        try {
                            var body = JSON.parse(oErr.responseText);
                            msg = (body.error && body.error.message && body.error.message.value) || msg;
                        } catch (e) {}
                        var oVBox = sap.ui.getCore().byId("chatMessages");
                        oVBox.addItem(new HBox({
                            items: [
                                new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                                new Text({ text: msg }).addStyleClass("chatBotBubble")
                            ]
                        }).addStyleClass("chatBotMessageRow"));
                        sap.ui.getCore().applyChanges();
                        scrollDown(true);
                    }
                });
                delete window._previewData[previewId];
            };

            window._cancelFilterSubmit = function (previewId) {
                var data = (window._previewData || {})[previewId];
                if (!data) return;
                // Re-enable the filter form
                var form = document.getElementById(data.formId);
                if (form) {
                    form.querySelectorAll("input,select").forEach(function (el) { el.disabled = false; });
                    var submitBtn = document.getElementById(data.formId + "_submit");
                    if (submitBtn) submitBtn.disabled = false;
                }
                // Remove preview card from chat
                var oVBox = sap.ui.getCore().byId("chatMessages");
                var previewEl = document.getElementById(previewId);
                if (previewEl && oVBox) {
                    oVBox.getItems().forEach(function (item) {
                        if (item.getDomRef && item.getDomRef() && item.getDomRef().contains(previewEl)) {
                            oVBox.removeItem(item);
                            item.destroy();
                        }
                    });
                    sap.ui.getCore().applyChanges();
                }
                delete window._previewData[previewId];
            };

            function sendMessage(sMsg) {
                if (!sMsg) return;
                const oVBox = sap.ui.getCore().byId("chatMessages");
                const escapedMsg = sMsg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                oVBox.addItem(new sap.ui.core.HTML({
                    content: `<div class="chatUserMessageRow"><span class="chatUserBubble">${escapedMsg}</span></div>`
                }));
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
                    const urlFinal = that.URL + "/ask";

                    function doAjax() {
                        const history = that.currentMessages
                            .filter(function (m) { return m.role === "user" || m.role === "bot"; })
                            .map(function (m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text || m.html || "" }; });
                        return $.ajax({
                            url: urlFinal,
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({ query: sMsg, userid: userId, session_id: that.currentSessionId, messages: history }),
                            headers: { Authorization: that.token }
                        });
                    }

                    function showError(xhr) {
                        removeTyping();
                        const errText = "🤖 " + (xhr.statusText || "Error contacting assistant");
                        oVBox.addItem(new HBox({
                            items: [
                                new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                                new Text({ text: errText }).addStyleClass("chatBotBubble")
                            ]
                        }).addStyleClass("chatBotMessageRow"));
                        that.currentMessages.push({ role: "bot", text: errText });
                        that._saveCurrentSession();
                        sap.ui.getCore().applyChanges();
                        scrollDown();
                    }

                    var data;
                    try {
                        data = await doAjax();
                    } catch (xhr) {
                        if (xhr.status === 401) {
                            await that._getToken();
                            try {
                                data = await doAjax();
                            } catch (xhr2) {
                                showError(xhr2);
                                return;
                            }
                        } else {
                            showError(xhr);
                            return;
                        }
                    }

                    // Fetch images before removing typing indicator so everything renders at once
                    var imagesByPageId = {};
                    if (data && Array.isArray(data.page_references) && data.page_references.length > 0) {
                        await Promise.all(data.page_references.map(function (ref) {
                    //    await Promise.all(refPages.map(function (pageId) {     
                        return $.ajax({
                                url: "https://vcprag.cfapps.us10-001.hana.ondemand.com/images?page_id=" + ref.page_id,
                                method: "GET",
                                // headers: { Authorization: that.token }
                            }).then(function (imgData) {
                                const arr = Array.isArray(imgData) ? imgData : (imgData.images || [imgData]);
                                imagesByPageId[ref.page_id] = arr.map(function (item) {
                                    if (typeof item === "string") return { src: item, description: "" };
                                    return {
                                        src: item.base64 || item.image || item.data || "",
                                        description: item.description || item.caption || item.text || item.title || ""
                                    };
                                }).filter(function (item) { return !!item.src; });
                            }).catch(function () {
                                imagesByPageId[ref.page_id] = [];
                            });
                        }));
                    }

                    removeTyping();

                    const responseText = (data && data.response) ? data.response.trim() : "";
                    const detectedIntent = (data && data.intent) ||
                        Object.keys(INTENT_FILTERS).find(function (k) { return responseText.includes(k); });

                    if (detectedIntent && INTENT_FILTERS[detectedIntent]) {
                        if (responseText) {
                            const oBotVBox = new VBox().addStyleClass("chatBotBubble");
                            oBotVBox.addItem(new sap.m.FormattedText({ htmlText: responseText }));
                            oVBox.addItem(new HBox({
                                items: [new Image({ src: that.logoPath, width: "28px", height: "28px" }), oBotVBox]
                            }).addStyleClass("chatBotMessageRow"));
                            that.currentMessages.push({ role: "bot", text: responseText });
                        }
                        showFilterForm(detectedIntent, INTENT_FILTERS[detectedIntent]);
                        that._saveCurrentSession();
                        sap.ui.getCore().applyChanges();
                        return;
                    }

                    const oBotVBox = new VBox().addStyleClass("chatBotBubble");

                    if (responseText) {
                        if (responseText.includes("<table")) {
                            oBotVBox.addItem(new sap.ui.core.HTML({ content: responseText }));
                        } else {
                            oBotVBox.addItem(new sap.m.FormattedText({
                                htmlText: responseText.startsWith("An unexpected error")
                                    ? "Sorry, I ran into an internal error. Please try again later."
                                    : responseText
                            }));
                        }
                    }

                    if (data.table) {
                        oBotVBox.addItem(new sap.ui.core.HTML({ content: data.table }));
                    }

                    Object.values(imagesByPageId).forEach(function (images) {
                        images.forEach(function (item) {
                            if (!item.src) return;
                            var html = '<div style="margin-top:8px;">'
                                + '<img src="' + item.src + '" style="max-width:100%;border-radius:4px;display:block;cursor:pointer;" onclick="this.style.maxWidth=this.style.maxWidth===\'100%\'?\'none\':\'100%\'"/>';
                            if (item.description) {
                                html += '<div style="font-size:0.72rem;color:#666;margin-top:4px;font-style:italic;">' + item.description + '</div>';
                            }
                            html += '</div>';
                            oBotVBox.addItem(new sap.ui.core.HTML({ content: html }));
                        });
                    });

                    oVBox.addItem(new HBox({
                        items: [
                            new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                            oBotVBox
                        ]
                    }).addStyleClass("chatBotMessageRow"));

                    if (responseText) {
                        const msgEntry = responseText.includes("<table")
                            ? { role: "bot", html: responseText }
                            : { role: "bot", text: responseText.startsWith("An unexpected error") ? "Sorry, I ran into an internal error. Please try again later." : responseText };
                        if (data.table) msgEntry.table = data.table;
                        that.currentMessages.push(msgEntry);
                    }
                    that._saveCurrentSession();
                    sap.ui.getCore().applyChanges();
                    scrollDown();
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
                oVBox.addItem(new HBox({
                    items: [
                        new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                        new Text({ text: greetingText }).addStyleClass("chatBotBubble")
                    ]
                }).addStyleClass("chatBotMessageRow"));
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
                    oVBox.addItem(new HBox({
                        items: [
                            new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                            new Text({ text: msg.text }).addStyleClass("chatBotBubble")
                        ]
                    }).addStyleClass("chatBotMessageRow"));
                } else if (msg.role === "user") {
                    const escapedText = (msg.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    oVBox.addItem(new sap.ui.core.HTML({
                        content: `<div class="chatUserMessageRow"><span class="chatUserBubble">${escapedText}</span></div>`
                    }));
                } else if (msg.role === "bot") {
                    const oBotVBox = new VBox().addStyleClass("chatBotBubble");
                    if (msg.html) oBotVBox.addItem(new sap.ui.core.HTML({ content: msg.html }));
                    else if (msg.text) oBotVBox.addItem(new sap.m.FormattedText({ htmlText: msg.text }));
                    if (msg.table) oBotVBox.addItem(new sap.ui.core.HTML({ content: msg.table }));
                    oVBox.addItem(new HBox({
                        items: [new Image({ src: that.logoPath, width: "28px", height: "28px" }), oBotVBox]
                    }).addStyleClass("chatBotMessageRow"));
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
                oVBox.addItem(new HBox({
                    items: [
                        new Image({ src: that.logoPath, width: "28px", height: "28px" }),
                        new Text({ text: greetingText }).addStyleClass("chatBotBubble")
                    ]
                }).addStyleClass("chatBotMessageRow"));
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

                .chatUserMessageRow {
                    width: 100%; display: flex; justify-content: flex-end; padding: 2px 0;
                }
                .chatUserBubble {
                    background: #0a6ed1; color: white; padding: 8px 12px;
                    border-radius: 12px; margin: 4px; max-width: 70%;
                    overflow-wrap: break-word; word-break: normal;
                    font-size: 0.78rem; white-space: pre-wrap;
                }

                .chatBotBubble {
                    background: #f2f2f2; color: #333; padding: 8px 12px;
                    border-radius: 12px; margin: 4px; max-width: 90%;
                    align-self: flex-start; word-wrap: break-word;
                    width: fit-content; font-size: 0.78rem;
                }

                .chatBotBubble .sapMFT, .chatBotBubble .sapMFT * { font-size: 0.78rem !important; }

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

                .chatBotMessageRow { gap: 8px; align-items: flex-start !important; }

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
