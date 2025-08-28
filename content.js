const bookmark = {};

function scrollToXPath(xpath) {
    const el = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.outline = "2px solid red";
        setTimeout(() => (el.style.outline = ""), 3000);
    } else {
        return;
    }
}

function getXPathByContent(el) {
    if (!el || el.nodeType !== 1) return "";

    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 50);
    if (!text) return `//${tag}`;

    return `(//${tag}[contains(normalize-space(.), ${escapeXPathText(
        text
    )})])[last()]`;
}

function chooseContainer(startEl) {
    const isP = (n) => n && n.tagName === "P";
    const isH = (n) => n && /^H[1-6]$/.test(n.tagName);
    const isDiv = (n) => n && n.tagName === "DIV";

    if (isP(startEl) || isH(startEl) || isDiv(startEl)) return startEl;

    let node = startEl,
        firstP = null,
        firstH = null,
        firstDiv = null;
    while (node && node.nodeType === 1) {
        if (!firstP && isP(node)) firstP = node;
        if (!firstH && isH(node)) firstH = node;
        if (!firstDiv && isDiv(node)) firstDiv = node;
        node = node.parentElement;
    }
    return firstP || firstH || firstDiv || startEl;
}

function handleClick(ev) {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const container = chooseContainer(target);
    const xpath = getXPathByContent(container);

    bookmark.xpath = xpath;

    chrome.runtime.sendMessage({
        type: "element_captured",
        bookmark: bookmark,
    });

    showToast("location selected.", 1000);
    document.removeEventListener("click", handleClick);
}

function showToast(message, duration = 2000) {
    const existing = document.getElementById("my-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "my-toast";
    toast.textContent = message;

    Object.assign(toast.style, {
        position: "fixed",
        bottom: "150px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1aa1ea",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        zIndex: 9999,
        fontSize: "14px",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out",
    });

    document.body.appendChild(toast);

    // fade in
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
    });

    // remove
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function escapeXPathText(text) {
    if (!text.includes('"')) {
        return `"${text}"`;
    } else if (!text.includes("'")) {
        return `'${text}'`;
    } else {
        return (
            "concat(" +
            text
                .replace(/'/g, `', "'", '`)
                .replace(/"/g, `', '"', '`)
                .split(",")
                .map((s) => s.trim())
                .map((s) => `'${s}'`)
                .join(", ") +
            ")"
        );
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "scroll_to") {
        if (window.location.href === msg.url) {
            scrollToXPath(msg.xpath);
        } else {
            showToast("Redirecting to another page...");
            chrome.runtime.sendMessage({
                type: "change_url",
                xpath: msg.xpath,
                url: msg.url,
            });
            window.location.href = msg.url;
        }
    }
    if (msg.type === "add_notebook") {
        showToast("Click where you want to record on the page.", 3000);
        bookmark.id = crypto.randomUUID();
        bookmark.category = msg.category;
        bookmark.name = msg.name;
        let url = window.location.href;
        let u = new URL(url);
        bookmark.url = url;
        bookmark.origin = u.origin;
        const now = new Date();
        bookmark.createTime = now.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        document.addEventListener("click", handleClick);
    }
});

// <!-- Copyright (c) 2025 Long Cheng -->
