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
        bookmark.createTime = now.getTime();

        document.addEventListener("click", handleClick);
    }
});

//------- v1.1 add instant Anchor --------//
let quickMarkContainer = null;
const hint = document.createElement("div");
hint.id = "hint";
hint.className = "hintDiv";
hint.textContent = "⚡️Quick Mark";
hint.style.cssText = `position: absolute;
        display: none;
        padding: 0.375rem 0.625rem;
        font-size: 0.875rem;
        border-radius: 0.5rem;
        background: #111;
        color: #fff;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
        pointer-events: auto; 
        white-space: nowrap;
        z-index: 9999;
        transform: translateY(-8px);`;
document.body.appendChild(hint);

function getSelectionRect() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const endContainer = sel.getRangeAt(sel.rangeCount - 1).endContainer;

    // if endContainer in text node, then go to get parentNode
    quickMarkContainer =
        endContainer.nodeType === Node.TEXT_NODE
            ? endContainer.parentElement
            : endContainer;

    const range = sel.getRangeAt(sel.rangeCount - 1).cloneRange();

    let rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
        const rects = range.getClientRects();
        if (rects && rects.length) {
            rect = rects[rects.length - 1];
        }
    }
    return rect || null;
}

function showInstantAnchor() {
    const rect = getSelectionRect();

    if (!rect) {
        hint.style.display = "none";
        return;
    }

    const pageLeft = rect.right + window.scrollX;
    const pageTop = rect.bottom + window.scrollY;

    hint.style.left = `${pageLeft}px`;
    hint.style.top = `${pageTop}px`;
    hint.style.display = "block";
}

function handleEndOfSelection() {
    requestAnimationFrame(() => {
        const selText = (window.getSelection()?.toString() || "").trim();
        hint.setAttribute("data-name", selText.substring(0, 100));
        if (selText) {
            showInstantAnchor();
        } else {
            hint.style.display = "none";
        }
    });
}

document.addEventListener("mouseup", handleEndOfSelection);
document.addEventListener("touchend", handleEndOfSelection, {
    passive: true,
});
window.addEventListener(
    "scroll",
    () => {
        if (window.getSelection()?.toString()) showInstantAnchor();
        else hint.style.display = "none";
    },
    { passive: true }
);
window.addEventListener("resize", () => {
    if (window.getSelection()?.toString()) showInstantAnchor();
    else hint.style.display = "none";
});

document.addEventListener("click", (e) => {
    if (e.target === hint || hint.contains(e.target)) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) hint.style.display = "none";
});

hint.addEventListener("click", (ev) => {
    bookmark.id = crypto.randomUUID();
    bookmark.category = "QuickMark";
    bookmark.name = hint.getAttribute("data-name");
    let url = window.location.href;
    let u = new URL(url);
    bookmark.url = url;
    bookmark.origin = u.origin;
    const now = new Date();
    bookmark.createTime = now.getTime();

    const container = chooseContainer(quickMarkContainer);
    const xpath = getXPathByContent(container);
    bookmark.xpath = xpath;

    chrome.runtime.sendMessage({
        type: "element_captured",
        bookmark: bookmark,
    });

    showToast("add successfully", 1500);

    const text = (window.getSelection()?.toString() || "").trim();
    if (text) hint.style.display = "none";
    ev.stopPropagation();
});

//--------add instant Anchor -------//

// <!-- Copyright (c) 2025 Long Cheng -->
