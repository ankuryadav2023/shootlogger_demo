/**
 * ShootLogger — Production Event Logging
 * Table-like Compact Dashboard with Plus Jakarta Sans & Modal Form
 */

const STORAGE_KEY = "shootlogger-simple-v2";
const PAGE_SIZE = 10;

const $ = (id) => document.getElementById(id);

let logs = loadLogs();
let currentPage = 1;
let toastTimer = null;

// ============================================================================
// Data Persistence
// ============================================================================

function loadLogs() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (err) {
    console.error("Failed to load logs from localStorage:", err);
    return [];
  }
}

function saveLogs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return true;
  } catch (err) {
    console.error("Failed to save logs to localStorage:", err);
    showToast("Could not save. Browser storage may be full.");
    return false;
  }
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function iconFor(type) {
  const map = {
    "Highlight": "star",
    "Best take": "clapperboard",
    "Funny moment": "laugh",
    "Failed attempt": "rotate-ccw",
    "Retake": "repeat-2",
    "Safety / continuity": "shield-check",
    "Other": "bookmark"
  };
  return map[type] || "bookmark";
}

function badgeClassFor(type) {
  const map = {
    "Highlight": "badge-highlight",
    "Best take": "badge-besttake",
    "Funny moment": "badge-funnymoment",
    "Failed attempt": "badge-failedattempt",
    "Retake": "badge-retake",
    "Safety / continuity": "badge-safety",
    "Other": "badge-other"
  };
  return map[type] || "badge-other";
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// ============================================================================
// Modal Logic (Create & Edit Log Form)
// ============================================================================

function openModal(mode = "create", logData = null) {
  const modal = $("logModal");
  const form = $("logForm");
  const title = $("modalTitle");
  const subtitle = $("modalSubtitle");
  const saveBtnText = $("saveBtnText");
  const editIdInput = $("editLogId");

  if (!modal || !form) return;

  if (mode === "edit" && logData) {
    title.textContent = "Edit Log Entry";
    subtitle.textContent = "Update timestamp, camera, or notes for this marker.";
    saveBtnText.textContent = "Update Event";
    editIdInput.value = logData.id;

    $("title").value = logData.title || "";
    $("camera").value = logData.camera || "";
    $("timestamp").value = logData.timestamp || "";
    $("type").value = logData.type || "Highlight";
    $("notes").value = logData.notes || "";
  } else {
    title.textContent = "Create New Log";
    subtitle.textContent = "Capture a moment with details for the editor.";
    saveBtnText.textContent = "Save Event";
    editIdInput.value = "";
    form.reset();
  }

  modal.removeAttribute("hidden");
  document.body.style.overflow = "hidden";

  if (window.lucide) lucide.createIcons();
  setTimeout(() => $("title").focus(), 80);
}

function closeModal() {
  const modal = $("logModal");
  if (!modal) return;
  modal.setAttribute("hidden", "true");
  document.body.style.overflow = "";
}

// ============================================================================
// Filtering, Sorting & Pagination
// ============================================================================

function inDateRange(log, range) {
  if (range === "all") return true;
  const d = new Date(log.createdAt);
  const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  const days = range === "7days" ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return d >= start && d <= now;
}

function getFilteredLogs() {
  const q = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  const camera = $("cameraFilter").value;
  const date = $("dateFilter").value;
  const sort = $("sortFilter").value;

  const result = logs.filter((log) => {
    const searchable = [
      log.title,
      log.camera,
      log.timestamp,
      log.type,
      log.notes
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!q || searchable.includes(q)) &&
      (type === "all" || log.type === type) &&
      (camera === "all" || log.camera === camera) &&
      inDateRange(log, date)
    );
  });

  result.sort((a, b) => {
    if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "timestamp") {
      return String(a.timestamp).localeCompare(String(b.timestamp), undefined, { numeric: true });
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return result;
}

// ============================================================================
// Render UI
// ============================================================================

function renderActiveTags() {
  const q = $("searchInput").value.trim();
  const type = $("typeFilter").value;
  const camera = $("cameraFilter").value;
  const date = $("dateFilter").value;
  const container = $("activeTagsContainer");
  const row = $("activeTagsRow");

  const tags = [];

  if (q) {
    tags.push({ label: `Search: "${q}"`, clear: () => { $("searchInput").value = ""; $("clearSearchBtn").hidden = true; } });
  }
  if (type !== "all") {
    tags.push({ label: `Type: ${type}`, clear: () => { $("typeFilter").value = "all"; } });
  }
  if (camera !== "all") {
    tags.push({ label: `Camera: ${camera}`, clear: () => { $("cameraFilter").value = "all"; } });
  }
  if (date !== "all") {
    const dateText = $("dateFilter").selectedOptions[0]?.text || date;
    tags.push({ label: `Date: ${dateText}`, clear: () => { $("dateFilter").value = "all"; } });
  }

  // Update Reset button status
  const resetBtn = $("resetBtn");
  const activeCountBadge = $("activeFilterBadge");
  if (tags.length > 0) {
    resetBtn.classList.add("has-active");
    activeCountBadge.hidden = false;
    activeCountBadge.textContent = tags.length;
    row.hidden = false;
    container.innerHTML = tags.map((t, idx) => `
      <span class="active-tag-chip">
        ${esc(t.label)}
        <button type="button" data-tag-idx="${idx}" aria-label="Remove filter ${esc(t.label)}">
          <i data-lucide="x"></i>
        </button>
      </span>
    `).join("");

    container.querySelectorAll("button[data-tag-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.tagIdx);
        if (tags[idx]) {
          tags[idx].clear();
          currentPage = 1;
          render();
        }
      });
    });
  } else {
    resetBtn.classList.remove("has-active");
    activeCountBadge.hidden = true;
    row.hidden = true;
    container.innerHTML = "";
  }

  // Highlight active dropdown containers
  $("typeFilter").closest(".filter-pill-control").classList.toggle("active-filter", type !== "all");
  $("cameraFilter").closest(".filter-pill-control").classList.toggle("active-filter", camera !== "all");
  $("dateFilter").closest(".filter-pill-control").classList.toggle("active-filter", date !== "all");
}

function renderPagination(totalItems) {
  const paginationContainer = $("paginationContainer");
  const rangeText = $("paginationRangeText");
  const prevBtn = $("prevPageBtn");
  const nextBtn = $("nextPageBtn");
  const pageNumbersContainer = $("pageNumbersContainer");

  if (totalItems === 0) {
    paginationContainer.hidden = true;
    return;
  }
  paginationContainer.hidden = false;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalItems);

  rangeText.textContent = `Showing ${totalItems === 0 ? 0 : startIdx + 1}–${endIdx} of ${totalItems} events`;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  // Render Page Numbers
  let pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  pageNumbersContainer.innerHTML = pages.map(p => {
    if (p === "...") {
      return `<span class="page-ellipsis">…</span>`;
    }
    return `
      <button type="button" class="page-num-btn ${p === currentPage ? "active" : ""}" data-page="${p}" aria-label="Page ${p}">
        ${p}
      </button>
    `;
  }).join("");

  pageNumbersContainer.querySelectorAll(".page-num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.page);
      if (page && page !== currentPage) {
        currentPage = page;
        render();
        $("logList").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function render() {
  // Update camera filter options dynamically
  const previousCamera = $("cameraFilter").value;
  const cameras = [...new Set(logs.map((log) => log.camera).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  $("cameraFilter").innerHTML =
    '<option value="all">All Cameras</option>' +
    cameras.map((camera) => `<option value="${esc(camera)}">${esc(camera)}</option>`).join("");
  $("cameraFilter").value = cameras.includes(previousCamera) ? previousCamera : "all";

  // KPI Statistics
  $("totalCount").textContent = logs.length;
  $("cameraCount").textContent = new Set(
    logs.map((log) => log.camera.trim().toLowerCase()).filter(Boolean)
  ).size;
  $("todayCount").textContent = logs.filter(
    (log) => new Date(log.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const filtered = getFilteredLogs();

  // Badges & Labels
  $("resultsCountBadge").textContent = `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`;
  $("resultsSubtext").textContent =
    filtered.length === logs.length
      ? "Showing all recorded moments."
      : `Showing ${filtered.length} of ${logs.length} logged markers.`;

  // Search Clear button toggle
  $("clearSearchBtn").hidden = !$("searchInput").value.trim();

  renderActiveTags();

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Toggle table header based on items
  const tableHeader = $("logTableHeader");
  if (tableHeader) {
    tableHeader.hidden = pagedItems.length === 0;
  }

  // Render Log Table Body (Scene column completely removed)
  if (pagedItems.length === 0) {
    $("logList").innerHTML = "";
    $("emptyState").hidden = false;
    $("emptyStateTitle").textContent = logs.length ? "No matching events found" : "No events yet";
    $("emptyStateText").textContent = logs.length
      ? "Try adjusting your search terms or clearing active filters."
      : "Add your first moment using the 'Create New Log' button, or load sample events to explore.";
    $("sampleBtn").hidden = logs.length > 0;
  } else {
    $("emptyState").hidden = true;
    $("logList").innerHTML = pagedItems.map((log) => `
      <article class="log-row" id="log-${esc(log.id)}">
        <!-- Col 1: Type Icon (tooltip on icon, no text badge) -->
        <div class="col-type">
          <span class="log-type-icon ${badgeClassFor(log.type)}" title="${esc(log.type)}">
            <i data-lucide="${iconFor(log.type)}"></i>
          </span>
        </div>

        <!-- Col 2: Better Refined Timecode Design with Clock Icon -->
        <div class="col-time">
          <span class="timecode-tag" title="Timecode marker">
            <i data-lucide="clock-3"></i>
            <span>${esc(log.timestamp)}</span>
          </span>
        </div>

        <!-- Col 3: Title & Plain Notes (reduced font-weight on title) -->
        <div class="col-title">
          <span class="log-title-text">${esc(log.title)}</span>
          ${log.notes ? `<div class="log-notes-text">${esc(log.notes)}</div>` : ""}
        </div>

        <!-- Col 4: Camera -->
        <div class="col-camera" title="${esc(log.camera)}">
          <i data-lucide="video"></i>
          <span>${esc(log.camera)}</span>
        </div>

        <!-- Col 5: Logged Date -->
        <div class="col-date" title="${esc(formatDate(log.createdAt))}">
          ${esc(formatDate(log.createdAt))}
        </div>

        <!-- Col 6: Actions -->
        <div class="col-actions">
          <button class="action-btn" data-action="edit" data-id="${esc(log.id)}" title="Edit event" aria-label="Edit event">
            <i data-lucide="pencil"></i>
          </button>
          <button class="action-btn action-delete" data-action="delete" data-id="${esc(log.id)}" title="Delete event" aria-label="Delete event">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </article>
    `).join("");
  }

  renderPagination(totalItems);

  if (window.lucide) lucide.createIcons();
}

// ============================================================================
// Event Listeners
// ============================================================================

// Open modal via header button or empty state buttons
$("openCreateModalBtn").addEventListener("click", () => openModal("create"));
$("emptyStateCreateBtn")?.addEventListener("click", () => openModal("create"));

// Close modal handlers
$("closeModalBtn").addEventListener("click", closeModal);
$("cancelModalBtn").addEventListener("click", closeModal);
$("logModal").addEventListener("click", (event) => {
  if (event.target === $("logModal")) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("logModal").hasAttribute("hidden")) {
    closeModal();
  }
  // Focus search shortcut with '/'
  if (event.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    event.preventDefault();
    $("searchInput").focus();
  }
});

// Form submission (Create or Edit) — Scene removed
$("logForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("title").value.trim();
  const camera = $("camera").value.trim();
  const timestamp = $("timestamp").value.trim();
  const type = $("type").value;
  const notes = $("notes").value.trim();
  const editId = $("editLogId").value;

  if (!title || !camera || !timestamp) {
    return showToast("Please fill in all required fields (title, camera, timecode).");
  }

  if (editId) {
    // Edit existing entry
    const existingIndex = logs.findIndex((item) => item.id === editId);
    if (existingIndex !== -1) {
      logs[existingIndex] = {
        ...logs[existingIndex],
        title,
        camera,
        timestamp,
        type,
        notes
      };
      if (saveLogs()) {
        closeModal();
        render();
        showToast("Event updated successfully.");
      }
    }
  } else {
    // Create new entry
    const newEntry = {
      id: makeId(),
      title,
      camera,
      timestamp,
      type,
      notes,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newEntry);
    if (saveLogs()) {
      closeModal();
      currentPage = 1;
      render();
      showToast("Event saved.");
    }
  }
});

// List Actions: Edit & Delete
$("logList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const log = logs.find((item) => item.id === id);
  if (!log) return;

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${log.title}"?`)) return;
    logs = logs.filter((item) => item.id !== id);
    saveLogs();
    render();
    showToast("Event deleted.");
  } else if (button.dataset.action === "edit") {
    openModal("edit", log);
  }
});

// Search and filter triggers
["searchInput", "typeFilter", "cameraFilter", "dateFilter", "sortFilter"].forEach((id) => {
  $(id).addEventListener("input", () => {
    currentPage = 1;
    render();
  });
  $(id).addEventListener("change", () => {
    currentPage = 1;
    render();
  });
});

$("clearSearchBtn").addEventListener("click", () => {
  $("searchInput").value = "";
  $("clearSearchBtn").hidden = true;
  currentPage = 1;
  render();
  $("searchInput").focus();
});

// Reset all filters
$("resetBtn").addEventListener("click", () => {
  $("searchInput").value = "";
  $("clearSearchBtn").hidden = true;
  $("typeFilter").value = "all";
  $("cameraFilter").value = "all";
  $("dateFilter").value = "all";
  $("sortFilter").value = "newest";
  currentPage = 1;
  render();
  showToast("All filters cleared.");
});

// Pagination Nav
$("prevPageBtn").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    render();
    $("logList").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

$("nextPageBtn").addEventListener("click", () => {
  const totalItems = getFilteredLogs().length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (currentPage < totalPages) {
    currentPage++;
    render();
    $("logList").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// Delete all logs
$("clearBtn").addEventListener("click", () => {
  if (!logs.length) return showToast("There are no events to delete.");
  if (!confirm(`Delete all ${logs.length} events saved in this browser? This cannot be undone.`)) {
    return;
  }
  logs = [];
  currentPage = 1;
  saveLogs();
  render();
  showToast("All events deleted.");
});

// Sample data generator with 14 diverse production entries (Scene removed)
function loadSampleEvents() {
  const now = Date.now();
  const sampleItems = [
    {
      title: "Amit Bhai ka energetic opening hook — 'Hello Guys!'",
      camera: "Main Cam A",
      timestamp: "00:02:14",
      type: "Best take",
      notes: "Intro dialogue ekdum perfect deliver hua. Ye take video ke starting ke liye lock karo."
    },
    {
      title: "Bablu ka hilarious reaction — blast sunte hi bhag khada hua",
      camera: "B-Cam Wide",
      timestamp: "00:07:35",
      type: "Funny moment",
      notes: "Bablu ka natural dar aur comical jump clear capture ho gaya. Blooper reel aur shorts ke liye gold material hai."
    },
    {
      title: "Road roller experiment setup collapse — iron ramp slip ho gaya",
      camera: "GoPro 1",
      timestamp: "00:14:02",
      type: "Failed attempt",
      notes: "Roller chadhne se pehle support gir gaya. Heavy-duty wooden blocks lagakar re-attempt karenge."
    },
    {
      title: "10,000 Litre slime pool me tractor entry — massive splash!",
      camera: "SlowMo Cam",
      timestamp: "00:21:48",
      type: "Highlight",
      notes: "240fps slow-motion me green slime ka wave formation super clear aaya hai. Thumbnail frame yahi se niklega."
    },
    {
      title: "Kartar ne safety zone cross kiya — shoot turant pause kiya",
      camera: "Main Cam A",
      timestamp: "00:28:19",
      type: "Safety / continuity",
      notes: "Sparks flying area ke bohot kareeb tha. Team ke sabhi members ke safety goggles aur gloves verify karo."
    },
    {
      title: "Liquid Nitrogen vs Garam Paani blast — Amit Bhai bole 'Lene ke dene pad gaye!'",
      camera: "A-Cam Cine",
      timestamp: "00:36:44",
      type: "Funny moment",
      notes: "White smoke cloud poore set par chha gaya. Amit Bhai ka shock dialogue clean audio track pe record hua."
    },
    {
      title: "Drone 4K top-down cinematic reveal over test ground",
      camera: "Drone 1",
      timestamp: "00:43:10",
      type: "Best take",
      notes: "Full ground setup aur equipment layout smooth orbit me record hua. Lighting aur contrast perfect hain."
    },
    {
      title: "Mega cracker chain reaction — 'Sabke hosh udd gaye!'",
      camera: "GoPro 2",
      timestamp: "00:51:25",
      type: "Highlight",
      notes: "Heavy blast shockwave se ground vibrate hua. Slow motion cut aur bass boost transition ke saath use karo."
    },
    {
      title: "Peeche gaon ke tractor ka loud horn — audio overlap retake",
      camera: "Main Cam A",
      timestamp: "00:58:40",
      type: "Retake",
      notes: "Dialogue ke beech me tractor ka horn bajne se dialogue cut ho gaya. Turant second take record kiya gaya."
    },
    {
      title: "Wireless collar mic #2 cut off — Mohit ka audio drop",
      camera: "Boom Audio",
      timestamp: "01:06:15",
      type: "Failed attempt",
      notes: "Transmitter ka battery drain ho gaya. 'Jab pressure increase hoga' line dubbing ya ADR se fix karni padegi."
    },
    {
      title: "Giant 6-foot water balloon burst — perfect slow-mo rupture",
      camera: "SlowMo Cam",
      timestamp: "01:14:52",
      type: "Highlight",
      notes: "Latex tear hone ka microsecond shot crystal clear hai. 4K high-speed file editor ko handover kardo."
    },
    {
      title: "Hydro dipping experiment color pattern fail — oil layer break ho gayi",
      camera: "A-Cam Cine",
      timestamp: "01:22:30",
      type: "Retake",
      notes: "Chemical swirl fail hone se pattern distort ho gaya. Tank clean karke fresh spray ke saath take 2 lenge."
    },
    {
      title: "Smoke bomb powder se lens fog ho gaya — cut & clean",
      camera: "B-Cam Wide",
      timestamp: "01:29:05",
      type: "Safety / continuity",
      notes: "Coloured powder camera lens ke glass par settle ho gayi. Microfiber wipe ke baad angle verify kiya."
    },
    {
      title: "Crazy Army outro wrap — 'Video pasand aayi toh like karo aur subscribe karo!'",
      camera: "Main Cam A",
      timestamp: "01:38:20",
      type: "Best take",
      notes: "Amit Bhai aur poori team ka energetic outro. End screen elements aur channel watermark yahan lagao."
    }
  ];

  sampleItems.forEach((sample, index) => {
    logs.unshift({
      ...sample,
      id: makeId(),
      createdAt: new Date(now - index * 180000).toISOString()
    });
  });

  saveLogs();
  currentPage = 1;
  render();
  showToast("Loaded 14 Crazy XYZ sample events across 2 pages.");
}

$("sampleBtn")?.addEventListener("click", loadSampleEvents);
$("sampleDataBtn")?.addEventListener("click", loadSampleEvents);

// Export CSV — Scene removed
$("exportBtn").addEventListener("click", () => {
  if (!logs.length) return showToast("Add an event before exporting.");

  const headers = [
    "Title",
    "Camera / Video Source",
    "Timecode / Timestamp",
    "Event Type",
    "Notes",
    "Logged At"
  ];

  const rows = [...logs]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((log) => [
      log.title,
      log.camera,
      log.timestamp,
      log.type,
      log.notes || "",
      log.createdAt
    ]);

  const cell = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const csvContent = [headers, ...rows]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shootlogger-markers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("CSV exported successfully.");
});

// Initial boot
if (window.lucide) lucide.createIcons();
render();
