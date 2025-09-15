const ORIGINS = [
    "https://chat.deepseek.com",
    "https://chatgpt.com",
    "https://gemini.google.com",
    "https://claude.ai",
    "https://grok.com",
    "https://www.doubao.com",
    "https://chat.qwen.ai",
    "https://www.kimi.com",
    "https://yuanbao.tencent.com",
    "https://copilot.microsoft.com",
];
let pendingScroll = null;

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (info.status !== "complete" || !tab.url) return;
    const url = new URL(tab.url);

    if (ORIGINS.includes(url.origin)) {
        await chrome.sidePanel.setOptions({
            tabId,
            path: "sidePanel.html",
            enabled: true,
        });
    } else {
        await chrome.sidePanel.setOptions({
            tabId,
            enabled: false,
        });
    }

    if (
        info.status === "complete" &&
        pendingScroll &&
        tabId === pendingScroll.tabId
    ) {
        setTimeout(
            () =>
                chrome.tabs.sendMessage(tabId, {
                    type: "scroll_to",
                    url: tab.url,
                    xpath: pendingScroll.xpath,
                }),
            2500
        );
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendRes) => {
    if (msg.type === "change_url") {
        pendingScroll = {
            tabId: sender.tab.id,
            xpath: msg.xpath,
            url: msg.url,
        };
    }
});

// <!-- Copyright (c) 2025 Long Cheng -->
