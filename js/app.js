const STORAGE_KEYS = {
  url: "hangyeol.supabaseUrl",
  key: "hangyeol.supabaseAnonKey",
};

function getSupabaseConfig() {
  const url = localStorage.getItem(STORAGE_KEYS.url) || window.APP_CONFIG?.supabaseUrl || "";
  const key = localStorage.getItem(STORAGE_KEYS.key) || window.APP_CONFIG?.supabaseAnonKey || "";
  return { url: url.trim(), key: key.trim() };
}

function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
}

function saveSupabaseConfig(url, key) {
  localStorage.setItem(STORAGE_KEYS.url, url.trim());
  localStorage.setItem(STORAGE_KEYS.key, key.trim());
}

function getSupabase() {
  if (!window.supabase) {
    throw new Error("Supabase 라이브러리를 불러오지 못했습니다.");
  }

  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return null;
  }

  if (!window.__hangyeolClient) {
    window.__hangyeolClient = window.supabase.createClient(url, key);
  }

  return window.__hangyeolClient;
}

async function getSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data.session;
}

function getUserLabel(user) {
  return user?.user_metadata?.name || user?.email || "회원";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showNotice(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = `notice notice-${type}`;
  element.classList.remove("hidden");
}

function hideNotice(element) {
  if (!element) return;
  element.classList.add("hidden");
  element.textContent = "";
}

async function isAdminUser(session) {
  const client = getSupabase();
  const current = session || (await getSession());
  if (!client || !current?.user) return false;

  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", current.user.id)
    .maybeSingle();

  return !error && Boolean(data?.user_id);
}

async function requireAuth(redirectTo) {
  if (!isSupabaseConfigured()) {
    window.location.replace("login.html?reason=setup");
    return null;
  }

  const session = await getSession();
  if (!session) {
    const target = redirectTo || window.location.pathname.split("/").pop() || "board.html";
    window.location.replace(`login.html?redirect=${encodeURIComponent(target)}&reason=board`);
    return null;
  }

  return session;
}

async function mountHeader({ page } = {}) {
  const root = document.getElementById("site-header");
  if (!root) return;

  const session = isSupabaseConfigured() ? await getSession() : null;
  const user = session?.user;
  const admin = user ? await isAdminUser(session) : false;
  const homeHref = page === "home" ? "#home" : "index.html#home";
  const aboutHref = page === "home" ? "#about" : "index.html#about";
  const contactHref = page === "home" ? "#contact" : "index.html#contact";

  root.innerHTML = `
    <header>
      <nav class="nav">
        <a class="logo" href="${page === "home" ? "#home" : "index.html"}">HAN-GYEOL</a>
        <ul class="menu">
          <li><a href="${homeHref}" class="${page === "home" ? "is-active" : ""}">홈</a></li>
          <li><a href="${aboutHref}">회사소개</a></li>
          <li><a href="${contactHref}">연락하기</a></li>
          <li><a href="board.html" class="js-board-link ${page === "board" ? "is-active" : ""}">게시판</a></li>
          ${admin ? `<li><a href="admin.html" class="${page === "admin" ? "is-active" : ""}">관리자</a></li>` : ""}
        </ul>
        <div class="nav-actions">
          ${
            user
              ? `<span class="user-email" title="${user.email}">${getUserLabel(user)}</span>
                 <button type="button" class="btn-ghost js-logout">로그아웃</button>`
              : `<a class="btn btn-login" href="login.html">로그인</a>`
          }
        </div>
      </nav>
    </header>
  `;

  root.querySelector(".js-board-link")?.addEventListener("click", async (event) => {
    if (!isSupabaseConfigured()) {
      event.preventDefault();
      window.location.href = "login.html?reason=setup";
      return;
    }

    const current = await getSession();
    if (!current) {
      event.preventDefault();
      window.location.href = "login.html?redirect=board.html&reason=board";
    }
  });

  root.querySelector(".js-logout")?.addEventListener("click", async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    window.location.href = "index.html";
  });
}
