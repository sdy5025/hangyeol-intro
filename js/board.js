function getPostId() {
  const fromQuery = getQueryParam("id");
  if (fromQuery) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "");
  return hash || null;
}

async function renderList(client, list, notice) {
  document.getElementById("list-view").classList.remove("hidden");
  document.getElementById("detail-view").classList.add("hidden");
  document.title = "한결 | 게시판";

  const { data, error } = await client
    .from("posts")
    .select("id, title, author_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showNotice(notice, "글을 불러오지 못했습니다. schema.sql을 실행했는지 확인해 주세요.", "error");
    return;
  }

  if (!data.length) {
    list.innerHTML = `
      <div class="empty-state">
        아직 글이 없습니다. 첫 글을 작성해 보세요.
      </div>
    `;
    return;
  }

  list.innerHTML = data
    .map(
      (post) => `
        <a class="post-item" href="board.html#${post.id}">
          <h3>${escapeHtml(post.title)}</h3>
          <p class="post-meta">${escapeHtml(post.author_name)} · ${formatDate(post.created_at)}</p>
        </a>
      `
    )
    .join("");
}

async function renderDetail(client, id, notice) {
  document.getElementById("list-view").classList.add("hidden");
  document.getElementById("detail-view").classList.remove("hidden");

  const { data, error } = await client
    .from("posts")
    .select("title, content, author_name, created_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    showNotice(notice, "글을 찾을 수 없습니다.", "error");
    document.getElementById("list-view").classList.remove("hidden");
    document.getElementById("detail-view").classList.add("hidden");
    return;
  }

  document.title = `한결 | ${data.title}`;
  document.getElementById("post-title").textContent = data.title;
  document.getElementById("post-meta").textContent = `${data.author_name} · ${formatDate(data.created_at)}`;
  document.getElementById("post-content").textContent = data.content;

  const repliesBox = document.getElementById("replies");
  if (!repliesBox) return;

  const { data: replies, error: replyError } = await client
    .from("replies")
    .select("id, author_name, content, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (replyError || !replies?.length) {
    repliesBox.innerHTML = "";
    repliesBox.classList.add("hidden");
    return;
  }

  repliesBox.classList.remove("hidden");
  repliesBox.innerHTML = `
    <h3>관리자 답글</h3>
    ${replies
      .map(
        (reply) => `
          <article class="reply-item">
            <p class="post-meta">${escapeHtml(reply.author_name)} · ${formatDate(reply.created_at)}</p>
            <p class="post-body" style="margin-top: 8px;">${escapeHtml(reply.content)}</p>
          </article>
        `
      )
      .join("")}
  `;
}

(async function initBoard() {
  const session = await requireAuth("board.html");
  if (!session) return;

  await mountHeader({ page: "board" });

  const list = document.getElementById("post-list");
  const notice = document.getElementById("notice");
  const client = getSupabase();

  async function refresh() {
    hideNotice(notice);
    const id = getPostId();
    if (id) {
      await renderDetail(client, id, notice);
      return;
    }
    await renderList(client, list, notice);
  }

  window.addEventListener("hashchange", refresh);
  await refresh();
})();
