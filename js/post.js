(async function initPost() {
  const id = getQueryParam("id") || window.location.hash.replace(/^#/, "");
  window.location.replace(id ? `board.html#${id}` : "board.html");
})();
