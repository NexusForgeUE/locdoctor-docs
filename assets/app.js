"use strict";
(() => {
  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("menu-toggle");
  const search = document.getElementById("doc-search");
  const results = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  const sections = [...document.querySelectorAll("main > .doc-section")];
  const links = [...document.querySelectorAll(".sidebar nav > a")];
  const entries = sections.map(section => ({
    id: section.id,
    title: section.querySelector("h1, h2").textContent.replace(/\s+/g, " ").trim(),
    text: section.textContent.replace(/\s+/g, " ").trim(),
    keywords: section.dataset.search || ""
  }));
  let navigationTarget = "";
  const closeMenu = () => { sidebar.classList.remove("is-open"); menuButton.setAttribute("aria-expanded", "false"); };
  menuButton.addEventListener("click", () => {
    const open = sidebar.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(open));
    if (open) search.focus();
  });
  const activate = id => links.forEach(link => {
    if (link.hash === "#" + id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  const followChapter = event => {
    const link = event.target.closest("a[href^='#']");
    if (!link || !sections.some(section => section.id === link.hash.slice(1))) return;
    navigationTarget = link.hash.slice(1);
    if (matchMedia("(max-width: 800px)").matches) closeMenu();
    activate(link.hash.slice(1));
    const destination = document.getElementById(link.hash.slice(1));
    if (destination) { destination.tabIndex = -1; destination.focus({preventScroll: true}); }
  };
  document.addEventListener("click", followChapter);
  const releaseNavigation = () => { navigationTarget = ""; };
  window.addEventListener("wheel", releaseNavigation, {passive: true});
  window.addEventListener("touchstart", releaseNavigation, {passive: true});
  window.addEventListener("pointerdown", event => {
    if (!event.target.closest?.("a[href^='#']")) releaseNavigation();
  }, {passive: true});
  document.addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key) && !event.target.matches("input,button,summary")) releaseNavigation();
    if (event.key === "Escape") {
      const wasOpen = sidebar.classList.contains("is-open");
      closeMenu(); results.hidden = true;
      if (wasOpen) menuButton.focus();
    }
  });
  search.addEventListener("input", () => {
    const query = search.value.toLocaleLowerCase("en").trim();
    results.replaceChildren();
    if (!query) { results.hidden = true; status.textContent = ""; return; }
    const words = query.split(/\s+/);
    const found = entries.filter(entry => {
      const haystack = (entry.title + " " + entry.keywords + " " + entry.text).toLocaleLowerCase("en");
      return words.every(word => haystack.includes(word));
    }).sort((a,b) => Number(b.title.toLowerCase().includes(query)) - Number(a.title.toLowerCase().includes(query)));
    status.textContent = (found.length === 1 ? document.body.dataset.searchOne : document.body.dataset.searchMany).replace("{count}", String(found.length));
    if (!found.length) {
      const message = document.createElement("p");
      message.textContent = document.body.dataset.searchEmpty;
      results.append(message);
    }
    for (const entry of found.slice(0, 8)) {
      const link = document.createElement("a");
      link.href = "#" + entry.id;
      link.textContent = entry.title;
      const snippet = document.createElement("small");
      const start = entry.text.toLocaleLowerCase("en").indexOf(words[0]);
      const offset = Math.max(0, start - 25);
      snippet.textContent = (offset ? "..." : "") + entry.text.slice(offset, offset + 110) + "...";
      link.append(snippet);
      results.append(link);
    }
    results.hidden = false;
  });
  search.addEventListener("keydown", event => {
    if (event.key === "Enter" && !results.hidden) { const first = results.querySelector("a"); if (first) first.click(); }
  });
  results.addEventListener("click", event => { if (event.target.closest("a")) { results.hidden = true; search.value = ""; } });
  let scheduled = false;
  const trackChapter = () => {
    scheduled = false;
    if (navigationTarget) { activate(navigationTarget); return; }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3) { activate(sections.at(-1).id); return; }
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 5;
    let current = sections[0];
    for (const section of sections) { if (section.getBoundingClientRect().top <= offset) current = section; else break; }
    activate(current.id);
  };
  window.addEventListener("scroll", () => { if (!scheduled) { scheduled = true; requestAnimationFrame(trackChapter); } }, {passive: true});
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    navigationTarget = sections.some(section => section.id === id) ? id : "";
    if (navigationTarget) activate(navigationTarget); else trackChapter();
  });
  document.getElementById("print-guide").addEventListener("click", () => window.print());
  window.addEventListener("beforeprint", () => document.querySelectorAll("details.qa").forEach(detail => {
    detail.dataset.wasOpen = String(detail.open); detail.open = true;
  }));
  window.addEventListener("afterprint", () => document.querySelectorAll("details.qa").forEach(detail => {
    detail.open = detail.dataset.wasOpen === "true"; delete detail.dataset.wasOpen;
  }));
  activate(location.hash.slice(1) || "overview");
  document.getElementById("doc-locale").addEventListener("change", event => {
    const root = new URL(document.querySelector("meta[name='site-root']").content, location.href);
    const next = new URL(event.target.value === "en" ? "index.html" : event.target.value + "/index.html", root);
    next.hash = location.hash;
    location.assign(next);
  });
  const viewer = document.getElementById("image-viewer");
  const largeImage = document.getElementById("large-image");
  const actualSize = document.getElementById("image-size");
  let imageOrigin;
  document.querySelectorAll(".screenshot > a").forEach(link => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || typeof viewer.showModal !== "function") return;
    event.preventDefault();
    imageOrigin = link;
    largeImage.src = link.href;
    largeImage.alt = link.querySelector("img").alt;
    viewer.classList.remove("actual-size");
    actualSize.setAttribute("aria-pressed", "false");
    viewer.showModal();
  }));
  actualSize.addEventListener("click", () => actualSize.setAttribute("aria-pressed", String(viewer.classList.toggle("actual-size"))));
  document.getElementById("image-close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", event => {
    if (event.target !== largeImage && !event.target.closest("button")) viewer.close();
  });
  viewer.addEventListener("close", () => imageOrigin?.focus({preventScroll: true}));
})();
