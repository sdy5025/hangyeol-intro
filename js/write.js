(async function initWrite() {
  const session = await requireAuth("write.html");
  if (!session) return;

  await mountHeader({ page: "board" });

  const form = document.getElementById("write-form");
  const notice = document.getElementById("notice");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideNotice(notice);

    const client = getSupabase();
    const title = document.getElementById("post-title").value.trim();
    const content = document.getElementById("post-content").value.trim();

    const { error } = await client.from("posts").insert({
      user_id: session.user.id,
      author_name: getUserLabel(session.user),
      title,
      content,
    });

    if (error) {
      showNotice(notice, "글을 저장하지 못했습니다. 로그인 상태와 테이블 정책을 확인해 주세요.", "error");
      return;
    }

    window.location.href = "board.html";
  });
})();
