const fs = require("fs");
const path = require("path");

function readEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function main() {
  const env = readEnv(path.join(__dirname, "..", ".env"));
  const email = (process.argv[2] || env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.error("관리자 이메일을 넣어 주세요. 예: node scripts/grant-admin.js you@email.com");
    process.exit(1);
  }

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const usersRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, { headers });
  const usersJson = await usersRes.json();
  const users = usersJson.users || [];
  const user = users.find((item) => (item.email || "").toLowerCase() === email);

  if (!user) {
    console.error("해당 이메일로 가입된 계정이 없습니다. 먼저 사이트에서 회원가입을 해 주세요.");
    process.exit(1);
  }

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/admin_users`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: user.id }),
  });
  const insertText = await insertRes.text();

  if (!insertRes.ok) {
    console.error("관리자 지정에 실패했습니다. admin.sql을 먼저 실행했는지 확인해 주세요.");
    console.error(insertText.slice(0, 240));
    process.exit(1);
  }

  console.log("관리자 지정 완료");
}

main();
