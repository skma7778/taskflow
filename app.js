import { supabase } from "./supabase.js";

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────
export function toast(msg, type = "success") {
  const container = document.getElementById("toast");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast-msg toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function statusBadge(status) {
  const label = status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1);
  return `<span class="badge badge-${status}">${label}</span>`;
}

export function roleBadge(role) {
  return `<span class="badge badge-${role}">${role}</span>`;
}

// ────────────────────────────────────────────────────────────
// Notification Sound
// ────────────────────────────────────────────────────────────
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Create a pleasant notification tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.log("Notification sound error: ", e.message);
  }
}

// ────────────────────────────────────────────────────────────
// Auth helpers
// ────────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  return profile;
}

export async function requireAuth(allowedRoles = null) {
  const user = await getCurrentUser();
  if (!user) { window.location.href = "/index.html"; return null; }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirectByRole(user.role);
    return null;
  }
  return user;
}

export function redirectByRole(role) {
  if (role === "admin") window.location.href = "/dashboard.html";
  else if (role === "manager") window.location.href = "/dashboard.html";
  else window.location.href = "/dashboard.html";
}

// ────────────────────────────────────────────────────────────
// Sidebar builder
// ────────────────────────────────────────────────────────────
export function buildSidebar(user, activePage) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const navItems = {
    admin: [
      { href: "dashboard.html", icon: gridIcon(), label: "Dashboard" },
      { href: "tasks.html", icon: taskIcon(), label: "All Tasks" },
      { href: "users.html", icon: usersIcon(), label: "Manage Users" },
      { href: "chat.html", icon: chatIcon(), label: "Direct Chat" },
      { href: "groupchat.html", icon: groupChatIcon(), label: "Group Chat" },
      { href: "notifications.html", icon: bellIcon(), label: "Notifications", badge: true },
      { href: "reports.html", icon: reportIcon(), label: "Reports" },
    ],
    manager: [
      { href: "dashboard.html", icon: gridIcon(), label: "Dashboard" },
      { href: "tasks.html", icon: taskIcon(), label: "Tasks" },
      { href: "chat.html", icon: chatIcon(), label: "Direct Chat" },
      { href: "groupchat.html", icon: groupChatIcon(), label: "Group Chat" },
      { href: "notifications.html", icon: bellIcon(), label: "Notifications", badge: true },
      { href: "reports.html", icon: reportIcon(), label: "Reports" },
    ],
    employee: [
      { href: "dashboard.html", icon: gridIcon(), label: "Dashboard" },
      { href: "tasks.html", icon: taskIcon(), label: "My Tasks" },
      { href: "chat.html", icon: chatIcon(), label: "Direct Chat" },
      { href: "groupchat.html", icon: groupChatIcon(), label: "Group Chat" },
      { href: "notifications.html", icon: bellIcon(), label: "Notifications", badge: true },
    ],
  };

  const items = navItems[user.role] || navItems.employee;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">${logoIcon()}</div>
      <div class="sidebar-logo-text">TaskFlow<span>Management System</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Menu</div>
      ${items.map(i => `
        <a href="${i.href}" class="nav-item ${activePage === i.href ? "active" : ""}">
          ${i.icon} ${i.label}
          ${i.badge ? `<span class="nav-badge hidden" id="notif-badge">0</span>` : ""}
        </a>`).join("")}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials(user.name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
      </div>
      <button class="sidebar-logout" id="logoutBtn">
        ${logoutIcon()} Sign out
      </button>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });

  loadNotifBadge(user.id);
}

async function loadNotifBadge(userId) {
  const { count } = await supabase.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("is_read", false);
  const badge = document.getElementById("notif-badge");
  if (badge) {
    if (count > 0) { badge.textContent = count; badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  }
}

// ────────────────────────────────────────────────────────────
// Real-time Notification Popup
// ────────────────────────────────────────────────────────────
export function initNotifPopup(user) {
  // Create popup container if not exists
  if (!document.getElementById("notif-popup-container")) {
    const container = document.createElement("div");
    container.id = "notif-popup-container";
    document.body.appendChild(container);
  }

  // Subscribe to new notifications for current user
  supabase
    .channel(`notif-realtime-${user.id}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      showNotifPopup(payload.new.message, "notification");
      playNotificationSound();
      // Update badge count
      loadNotifBadgeRealtime();
    })
    .subscribe();
}

function loadNotifBadgeRealtime() {
  const badge = document.getElementById("notif-badge");
  if (!badge) return;
  const current = parseInt(badge.textContent) || 0;
  const next = current + 1;
  badge.textContent = next;
  badge.classList.remove("hidden");
}

export function showNotifPopup(message, type = "notification") {
  const container = document.getElementById("notif-popup-container");
  if (!container) return;

  const popup = document.createElement("div");
  popup.className = `notif-popup notif-popup-${type}`;
  popup.innerHTML = `
    <div class="notif-popup-icon">
      ${type === "message" ? chatIcon() : bellIcon()}
    </div>
    <div class="notif-popup-body">
      <div class="notif-popup-title">${type === "message" ? "New Message" : "Notification"}</div>
      <div class="notif-popup-text">${message}</div>
    </div>
    <button class="notif-popup-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(popup);

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    popup.style.animation = "slideOutRight .3s ease forwards";
    setTimeout(() => popup.remove(), 300);
  }, 4500);
}

// ────────────────────────────────────────────────────────────
// Mobile sidebar toggle
// ────────────────────────────────────────────────────────────
export function initMobileMenu() {
  const btn = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  btn?.addEventListener("click", () => sidebar?.classList.toggle("open"));
}

// ────────────────────────────────────────────────────────────
// SVG Icons
// ────────────────────────────────────────────────────────────
function logoIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`; }
function gridIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`; }
function taskIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`; }
function usersIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`; }
function chatIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`; }
function groupChatIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/></svg>`; }
function bellIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`; }
function reportIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`; }
function logoutIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`; }
