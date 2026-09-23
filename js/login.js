const notice = document.getElementById("notice");
const setupBox = document.getElementById("setup-box");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const authLead = document.getElementById("auth-lead");

function getRedirectTarget() {
  return getQueryParam("redirect") || "board.html";
}

function setMode(mode) {
  const isLogin = mode === "login";
  tabLogin.classList.toggle("is-active", isLogin);
  tabSignup.classList.toggle("is-active", !isLogin);
  loginForm.classList.toggle("hidden", !isLogin);
  signupForm.classList.toggle("hidden", isLogin);
}

function koreanAuthError(message) {
  if (!message) return "요청을 처리하지 못했습니다.";
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (message.includes("User already registered")) return "이미 가입된 이메일입니다.";
  if (message.includes("Email not confirmed")) return "이메일 인증이 아직 완료되지 않았습니다.";
  return message;
}

async function afterAuthSuccess() {
  window.location.href = getRedirectTarget();
}

tabLogin.addEventListener("click", () => setMode("login"));
tabSignup.addEventListener("click", () => setMode("signup"));

document.getElementById("setup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const url = document.getElementById("setup-url").value;
  const key = document.getElementById("setup-key").value;
  saveSupabaseConfig(url, key);
  window.__hangyeolClient = null;
  setupBox.classList.add("hidden");
  showNotice(notice, "Supabase 연결을 저장했습니다. 이제 로그인하거나 가입할 수 있습니다.", "info");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideNotice(notice);

  const client = getSupabase();
  if (!client) {
    showNotice(notice, "먼저 Supabase 연결 정보를 저장해 주세요.", "error");
    setupBox.classList.remove("hidden");
    return;
  }

  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-password").value,
  });

  if (error) {
    showNotice(notice, koreanAuthError(error.message), "error");
    return;
  }

  await afterAuthSuccess();
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideNotice(notice);

  const client = getSupabase();
  if (!client) {
    showNotice(notice, "먼저 Supabase 연결 정보를 저장해 주세요.", "error");
    setupBox.classList.remove("hidden");
    return;
  }

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/index.html`,
    },
  });

  if (error) {
    showNotice(notice, koreanAuthError(error.message), "error");
    return;
  }

  if (!data.session) {
    showNotice(notice, "가입되었습니다. 이메일 인증이 켜져 있다면 메일함을 확인한 뒤 로그인해 주세요.", "info");
    setMode("login");
    return;
  }

  await afterAuthSuccess();
});

(async function initLoginPage() {
  await mountHeader({ page: "login" });

  const reason = getQueryParam("reason");
  if (reason === "board") {
    authLead.textContent = "게시판은 로그인 후 확인할 수 있습니다.";
  }

  if (!isSupabaseConfigured() || reason === "setup") {
    setupBox.classList.remove("hidden");
  }

  if (!isSupabaseConfigured()) {
    showNotice(notice, "Supabase URL과 anon key를 먼저 연결해 주세요.", "info");
  } else if (reason === "board") {
    showNotice(notice, "로그인한 뒤에만 게시판을 보거나 글을 쓸 수 있습니다.", "info");
  }

  const existing = getSupabaseConfig();
  if (existing.url) document.getElementById("setup-url").value = existing.url;
  if (existing.key) document.getElementById("setup-key").value = existing.key;

  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session) {
      window.location.replace(getRedirectTarget());
    }
  }
})();
