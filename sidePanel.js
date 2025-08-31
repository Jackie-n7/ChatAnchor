let tab_url = "";

async function init() {
    tab_url = await getCurrentTabUrl();
    chrome.storage.sync.get(null, (items) => {
        if (!items || Object.keys(items).length === 0) {
            renderGroupedBookmarks();
            return;
        }
        const allBookmarks = Object.values(items);
        const grouped = groupBookmarks(allBookmarks);
        renderGroupedBookmarks(grouped);
    });
}

async function getCurrentTabUrl() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    return tab?.url || null;
}

async function sendToPage(msg) {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, msg);
    }
}

function groupBookmarks(bookmarks) {
    return bookmarks.reduce((acc, bookmark) => {
        const origin = bookmark.origin || "Others";
        const category = bookmark.category || "Uncat.";

        if (!acc[origin]) {
            acc[origin] = {};
        }

        if (!acc[origin][category]) {
            acc[origin][category] = [];
        }

        acc[origin][category].push(bookmark);
        return acc;
    }, {});
}

function renderGroupedBookmarks(grouped = null) {
    const container = document.getElementById("bookmarkContainer");
    container.innerHTML = "";
    if (grouped === null) {
        const p = document.createElement("p");
        p.textContent = "No data.";
        container.appendChild(p);
        return;
    }

    for (const origin in grouped) {
        const originDetails = document.createElement("details");
        const originSummary = document.createElement("summary");
        originSummary.textContent = origin;
        originDetails.className = "originDetails";
        originSummary.className = "originSummary";

        const tab_url_obj = new URL(tab_url);
        if (tab_url_obj.origin === originSummary.textContent) {
            originDetails.open = true;
        }
        originDetails.appendChild(originSummary);

        const categories = grouped[origin];
        for (const category in categories) {
            const categoryDetails = document.createElement("details");
            const categorySummary = document.createElement("summary");
            categoryDetails.open = true;
            categorySummary.textContent = category;
            categorySummary.className = "catSummary";
            categoryDetails.className = "catDetails";
            categoryDetails.appendChild(categorySummary);

            const list = document.createElement("div");
            list.className = "list-container";

            const sortedCatBookmarks = categories[category].sort(
                (a, b) => b.createTime - a.createTime
            );

            sortedCatBookmarks.forEach((bookmark) => {
                const item = document.createElement("div");
                item.className = "item-container";

                // ---- item-title ----
                const itemTitle = document.createElement("div");
                itemTitle.className = "item-title";
                itemTitle.tabIndex = "0";

                const nameP = document.createElement("p");
                nameP.textContent = bookmark.name;
                nameP.title = bookmark.name;

                const timeSpan = document.createElement("span");
                const createTimeObj = new Date(bookmark.createTime);
                const formattedTime = createTimeObj.toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });
                timeSpan.textContent = formattedTime;

                itemTitle.appendChild(nameP);
                itemTitle.appendChild(timeSpan);

                itemTitle.addEventListener("click", () => {
                    sendToPage({
                        id: bookmark.id,
                        type: "scroll_to",
                        xpath: bookmark.xpath,
                        url: bookmark.url,
                    });
                });

                // ---- item--delete ----
                const itemDelete = document.createElement("div");
                itemDelete.className = "item--delete";
                itemDelete.tabIndex = "0";

                const deleteImg = document.createElement("img");
                deleteImg.src = "imgs/delete.png";
                deleteImg.title = "delete bookmark";

                itemDelete.appendChild(deleteImg);

                itemDelete.addEventListener("click", () => {
                    const confirmed = window.confirm(
                        "Are you sure to delete it?"
                    );
                    if (!confirmed) return;
                    chrome.storage.sync.remove(bookmark.id, () => {
                        init();
                    });
                });

                // ---- appended to item ----
                item.appendChild(itemTitle);
                item.appendChild(itemDelete);

                list.appendChild(item);
            });

            categoryDetails.appendChild(list);
            originDetails.appendChild(categoryDetails);
        }

        container.appendChild(originDetails);
    }
}

document.addEventListener("DOMContentLoaded", init);

document.getElementById("create_Form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const category = document.getElementById("category").value;
    const name = document.getElementById("name").value;

    sendToPage({
        type: "add_notebook",
        category: category,
        name: name,
    });
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "element_captured") {
        const bookmark = msg.bookmark;
        chrome.storage.sync.set({ [bookmark.id]: bookmark }, () => {
            init();
        });
    }
});

// <!-- Copyright (c) 2025 Long Cheng -->
