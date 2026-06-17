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
    if (!tab.url) return;
    const url = new URL(tab.url);

    // Enable/disable side panel only on full page load
    if (info.status === "complete") {
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
    }

    // Trigger pending scroll when the target URL is reached.
    // Handles both full page reload (info.status === "complete") and
    // SPA pushState navigation (info.url set, no status change).
    if (
        pendingScroll &&
        tabId === pendingScroll.tabId &&
        tab.url === pendingScroll.url
    ) {
        const scroll = pendingScroll;
        pendingScroll = null;
        setTimeout(
            () =>
                chrome.tabs.sendMessage(tabId, {
                    type: "scroll_to",
                    url: tab.url,
                    xpath: scroll.xpath,
                    scrollTop: scroll.scrollTop,
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
            scrollTop: msg.scrollTop,
        };
    }
});

// <!-- Copyright (c) 2025 Long Cheng -->
