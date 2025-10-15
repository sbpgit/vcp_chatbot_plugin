/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["chat/newchatbot/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
