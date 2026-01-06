console.log("✅ ChatGPT Search Extension LOADED");
let isWholeWord = true; // default: whole-word search


/* -----------------------------
   STORAGE HELPERS
----------------------------- */
function getSavedMessages() {
  return JSON.parse(localStorage.getItem("gpt-saved") || "{}");
}

function saveMessages(data) {
  localStorage.setItem("gpt-saved", JSON.stringify(data));
}

/* -----------------------------
   UTILS
----------------------------- */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* -----------------------------
   WAIT FOR CHATGPT
----------------------------- */
function waitForChatGPT() {
  const observer = new MutationObserver(() => {
    if (document.querySelector("div[data-message-author-role]")) {
      observer.disconnect();
      injectSearchBox();
      createSidebar();
      addSidebarToggle();
      addStarButtons();
      renderSavedMessages();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/* -----------------------------
   CLEAR HIGHLIGHTS
----------------------------- */
function clearHighlights() {
  document.querySelectorAll("mark.gpt-highlight").forEach(mark => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
}

/* -----------------------------
   SAFE TEXT HIGHLIGHT
----------------------------- */
function highlightText(query) {
  clearHighlights();

  const safeQuery = escapeRegex(query);
  const regex = isWholeWord
  ? new RegExp(`(?<!\\w)${safeQuery}(?!\\w)`, "gi")
  : new RegExp(safeQuery, "gi");




  const messages = document.querySelectorAll(
    "div[data-message-author-role]"
  );

  let firstMatch = null;

  messages.forEach(msg => {
    // ✅ MESSAGE-LEVEL CHECK (fixes long words)
    if (!msg.innerText.match(regex)) return;

    const walker = document.createTreeWalker(
      msg,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.match(regex)) continue;

      const span = document.createElement("span");
      span.innerHTML = node.textContent.replace(
        regex,
        m => `<mark class="gpt-highlight">${m}</mark>`
      );

      const fragment = document.createDocumentFragment();
      while (span.firstChild) fragment.appendChild(span.firstChild);

      node.parentNode.replaceChild(fragment, node);
    }

    if (!firstMatch) firstMatch = msg;
  });

  const firstHighlight = document.querySelector("mark.gpt-highlight");
if (firstHighlight) {
  firstHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
}

}



/* -----------------------------
   SEARCH BOX
----------------------------- */
function injectSearchBox() {
  if (document.getElementById("gpt-search-box")) return;

  const container = document.createElement("div");

  Object.assign(container.style, {
    position: "fixed",
    top: "12px",
    right: "60px",
    zIndex: "9999",
    display: "flex",
    gap: "6px",
    alignItems: "center"
  });

  const searchBox = document.createElement("input");
  searchBox.id = "gpt-search-box";
  searchBox.placeholder = "🔍 Search or use tag:dsa";

  Object.assign(searchBox.style, {
    padding: "8px 10px",
    width: "200px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    background: "white",
    fontSize: "14px"
  });

  // 🔤 / 🔍 TOGGLE BUTTON
  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = "🔤"; // Whole-word mode
  toggleBtn.title = "Toggle whole-word / substring search";

  Object.assign(toggleBtn.style, {
    cursor: "pointer",
    border: "1px solid #ccc",
    background: "white",
    borderRadius: "6px",
    padding: "4px 6px"
  });

  toggleBtn.onclick = () => {
    isWholeWord = !isWholeWord;
    toggleBtn.textContent = isWholeWord ? "🔤" : "🔍";

    // re-run search instantly
    const value = searchBox.value.trim();
    if (value && !value.startsWith("tag:")) {
      highlightText(value);
    }
  };

  container.appendChild(searchBox);
  container.appendChild(toggleBtn);
  document.body.appendChild(container);

  searchBox.addEventListener("input", () => {
    clearHighlights();
    document
      .querySelectorAll("div[data-message-author-role]")
      .forEach(m => (m.style.outline = ""));

    const rawQuery = searchBox.value.trim();
    if (!rawQuery) return;

    if (rawQuery.startsWith("tag:")) {
      searchByTag(rawQuery.replace("tag:", ""));
    } else {
      highlightText(rawQuery);
    }
  });
}


/* -----------------------------
   STAR ⭐ + TAGS 🏷️
----------------------------- */
function addStarButtons() {
  const messages = document.querySelectorAll(
    "div[data-message-author-role]"
  );
  const saved = getSavedMessages();

  messages.forEach((msg, index) => {
    if (msg.querySelector(".gpt-star")) return;

    const star = document.createElement("span");
    star.className = "gpt-star";
    star.textContent = saved[index] ? "⭐" : "☆";

    Object.assign(star.style, {
      cursor: "pointer",
      marginRight: "8px",
      fontSize: "16px",
      opacity: "0.7"
    });

    star.onclick = () => {
      const data = getSavedMessages();

      if (data[index]) {
        delete data[index];
        star.textContent = "☆";
      } else {
        const tags = prompt("Add tags (comma separated)", "dsa");

        data[index] = {
          text: msg.innerText,
          tags: tags
            ? tags.split(",").map(t => t.trim().toLowerCase())
            : []
        };

        star.textContent = "⭐";
      }

      saveMessages(data);
      renderSavedMessages(); // 🔥 update sidebar live
    };

    msg.prepend(star);
  });
}

/* -----------------------------
   TAG SEARCH
----------------------------- */
function searchByTag(tag) {
  const saved = getSavedMessages();
  const messages = document.querySelectorAll(
    "div[data-message-author-role]"
  );

  messages.forEach((msg, index) => {
    const entry = saved[index];
    if (!entry || !entry.tags.includes(tag)) return;

    msg.style.outline = "2px solid orange";
    msg.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* -----------------------------
   SIDEBAR ⭐
----------------------------- */
function createSidebar() {
  if (document.getElementById("gpt-sidebar")) return;

  const sidebar = document.createElement("div");
  sidebar.id = "gpt-sidebar";

  Object.assign(sidebar.style, {
    position: "fixed",
    top: "0",
    right: "0",
    width: "300px",
    height: "100vh",
    background: "white",
    borderLeft: "1px solid #ccc",
    zIndex: "9998",
    padding: "10px",
    overflowY: "auto",
    fontSize: "13px",
    display: "none"
  });

  sidebar.innerHTML = `
    <h3 style="margin-top:0;">⭐ Saved Chats</h3>
    <div id="gpt-saved-list"></div>
  `;

  document.body.appendChild(sidebar);
}

function addSidebarToggle() {
  if (document.getElementById("gpt-sidebar-toggle")) return;

  const btn = document.createElement("button");
  btn.id = "gpt-sidebar-toggle";
  btn.textContent = "⭐";

  Object.assign(btn.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    zIndex: "9999",
    border: "none",
    background: "#ffd700",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    cursor: "pointer"
  });

  btn.onclick = () => {
    const sidebar = document.getElementById("gpt-sidebar");
    sidebar.style.display =
      sidebar.style.display === "none" ? "block" : "none";
  };

  document.body.appendChild(btn);
}

function renderSavedMessages() {
  const list = document.getElementById("gpt-saved-list");
  if (!list) return;

  const saved = getSavedMessages();
  list.innerHTML = "";

  // ✅ EMPTY STATE
  if (Object.keys(saved).length === 0) {
    list.innerHTML = `
      <p style="color:#777; font-size:13px;">
        No saved chats yet ⭐
      </p>
    `;
    return;
  }

  Object.entries(saved).forEach(([index, data]) => {
    const item = document.createElement("div");

    // ✅ CARD STYLE
    Object.assign(item.style, {
      padding: "10px",
      marginBottom: "10px",
      borderRadius: "8px",
      background: "#f9f9f9",
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
    });

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="font-weight:600; width:85%;">
          ${data.text.slice(0, 70)}...
        </div>
        <span class="gpt-delete" style="cursor:pointer; color:#c00;">✕</span>
      </div>
      <div style="color:#888; font-size:11px; margin-top:4px;">
        🏷️ ${data.tags.join(", ")}
      </div>
    `;

    // ✅ CLICK → SCROLL TO MESSAGE
    item.onclick = () => {
      const messages = document.querySelectorAll(
        "div[data-message-author-role]"
      );
      const msg = messages[index];
      if (msg) {
        msg.scrollIntoView({ behavior: "smooth", block: "center" });
        msg.style.outline = "2px solid orange";
        setTimeout(() => (msg.style.outline = ""), 1500);
      }
    };

    // ✅ DELETE DIRECTLY FROM SIDEBAR
    item.querySelector(".gpt-delete").onclick = (e) => {
      e.stopPropagation(); // prevent scroll click
      const updated = getSavedMessages();
      delete updated[index];
      saveMessages(updated);
      renderSavedMessages();
    };

    list.appendChild(item);
  });
}


/* -----------------------------
   START EXTENSION
----------------------------- */
waitForChatGPT();
