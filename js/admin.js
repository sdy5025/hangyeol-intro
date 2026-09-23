function showView(name) {
  document.getElementById("login-view").classList.toggle("hidden", name !== "login");
  document.getElementById("denied-view").classList.toggle("hidden", name !== "denied");
  document.getElementById("dashboard-view").classList.toggle("hidden", name !== "dashboard");
}

function renderReplies(postId, replies) {
  if (!replies.length) {
    return `<p class="post-meta">아직 답글이 없습니다.</p>`;
  }

  return replies
    .map(
      (reply) => `
        <article class="reply-item">
          <p class="post-meta">${escapeHtml(reply.author_name)} · ${formatDate(reply.created_at)}</p>
          <p class="post-body" style="margin-top: 8px;">${escapeHtml(reply.content)}</p>
        </article>
      `
    )
    .join("");
}

async function loadDashboard(session) {
  const client = getSupabase();
  const notice = document.getElementById("dash-notice");
  const root = document.getElementById("admin-posts");
  hideNotice(notice);

  const { data: posts, error } = await client
    .from("posts")
    .select("id, title, content, author_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showNotice(notice, "게시글을 불러오지 못했습니다. admin.sql을 실행했는지 확인해 주세요.", "error");
    return;
  }

  if (!posts.length) {
    root.innerHTML = `<div class="empty-state">삭제하거나 답글 달 게시글이 없습니다.</div>`;
    return;
  }

  const { data: replies } = await client
    .from("replies")
    .select("id, post_id, author_name, content, created_at")
    .in("post_id", posts.map((post) => post.id))
    .order("created_at", { ascending: true });

  const repliesByPost = new Map();
  (replies || []).forEach((reply) => {
    const list = repliesByPost.get(reply.post_id) || [];
    list.push(reply);
    repliesByPost.set(reply.post_id, list);
  });

  root.innerHTML = posts
    .map((post) => {
      const postReplies = repliesByPost.get(post.id) || [];
      return `
        <article class="admin-post" data-id="${post.id}">
          <h3>${escapeHtml(post.title)}</h3>
          <p class="post-meta">${escapeHtml(post.author_name)} · ${formatDate(post.created_at)}</p>
          <p class="post-body">${escapeHtml(post.content)}</p>
          <div class="replies">${renderReplies(post.id, postReplies)}</div>
          <form class="js-reply-form" data-id="${post.id}">
            <label>
              답글
              <textarea name="content" rows="3" required></textarea>
            </label>
            <div class="admin-post-actions">
              <button type="submit">답글 등록</button>
              <button type="button" class="btn-danger js-delete" data-id="${post.id}">글 삭제</button>
            </div>
          </form>
        </article>
      `;
    })
    .join("");

  root.querySelectorAll(".js-reply-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideNotice(notice);

      if (!(await isAdminUser(session))) {
        showNotice(notice, "관리자만 답글을 등록할 수 있습니다.", "error");
        return;
      }

      const content = form.content.value.trim();
      const { error: insertError } = await client.from("replies").insert({
        post_id: form.dataset.id,
        user_id: session.user.id,
        author_name: getUserLabel(session.user),
        content,
      });

      if (insertError) {
        showNotice(notice, "답글을 저장하지 못했습니다.", "error");
        return;
      }

      await loadDashboard(session);
    });
  });

  root.querySelectorAll(".js-delete").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("이 글과 답글을 삭제할까요?")) return;
      hideNotice(notice);

      if (!(await isAdminUser(session))) {
        showNotice(notice, "관리자만 글을 삭제할 수 있습니다.", "error");
        return;
      }

      const { error: deleteError } = await client.from("posts").delete().eq("id", button.dataset.id);
      if (deleteError) {
        showNotice(notice, "글을 삭제하지 못했습니다.", "error");
        return;
      }

      await loadDashboard(session);
    });
  });
}

document.getElementById("admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const notice = document.getElementById("login-notice");
  hideNotice(notice);

  const client = getSupabase();
  if (!client) {
    showNotice(notice, "Supabase 연결이 필요합니다.", "error");
    return;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: document.getElementById("admin-email").value.trim(),
    password: document.getElementById("admin-password").value,
  });

  if (error || !data.session) {
    showNotice(notice, "이메일 또는 비밀번호가 올바르지 않습니다.", "error");
    return;
  }

  if (!(await isAdminUser(data.session))) {
    await client.auth.signOut();
    showNotice(notice, "관리자로 지정된 계정이 아닙니다.", "error");
    return;
  }

  window.location.reload();
});

(async function initAdmin() {
  await mountHeader({ page: "admin" });

  const session = await getSession();
  if (!session) {
    showView("login");
    return;
  }

  if (!(await isAdminUser(session))) {
    showView("denied");
    return;
  }

  showView("dashboard");
  await loadDashboard(session);
})();
