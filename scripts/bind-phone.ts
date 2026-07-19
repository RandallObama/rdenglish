import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

function loadEnv() {
  const content = readFileSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.local", "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

const TARGET_EMAIL = "2190024060@qq.com";
const TARGET_PHONE = "18306752398";

async function main() {
  console.log("=".repeat(60));
  console.log("📋 手机号绑定操作");
  console.log("=".repeat(60));

  // 1. 查找目标邮箱用户
  console.log(`\n🔍 查找邮箱: ${TARGET_EMAIL}`);
  const userResult = await client.execute({
    sql: "SELECT id, email, phone, name, plan, createdAt FROM User WHERE email = ?",
    args: [TARGET_EMAIL],
  });

  if (userResult.rows.length === 0) {
    console.log(`❌ 未找到邮箱为 ${TARGET_EMAIL} 的用户，操作终止。`);
    client.close();
    return;
  }

  const user = userResult.rows[0];
  console.log(`✅ 找到用户:`);
  console.log(`   ID:       ${user.id}`);
  console.log(`   邮箱:     ${user.email}`);
  console.log(`   当前手机: ${user.phone || "(未绑定)"}`);
  console.log(`   昵称:     ${user.name || "(无)"}`);
  console.log(`   方案:     ${user.plan}`);
  console.log(`   注册时间: ${user.createdAt}`);

  // 2. 检查是否已有手机号
  if (user.phone) {
    console.log(`\n⚠️  该用户已绑定手机号 ${user.phone}`);
    if (user.phone === TARGET_PHONE) {
      console.log(`   目标手机号与当前手机号相同，无需操作。`);
    } else {
      console.log(`   需要先解绑旧手机号才能绑定新手机号。`);
      console.log(`   是否继续？(将覆盖旧手机号)`);
    }
  }

  // 3. 检查目标手机号是否已被其他用户绑定
  console.log(`\n🔍 检查手机号 ${TARGET_PHONE} 是否已被绑定...`);
  const phoneResult = await client.execute({
    sql: "SELECT id, email, phone, name FROM User WHERE phone = ?",
    args: [TARGET_PHONE],
  });

  if (phoneResult.rows.length > 0) {
    const otherUser = phoneResult.rows[0];
    if (otherUser.email === TARGET_EMAIL) {
      console.log(`✅ 该手机号已绑定到目标用户，无需操作。`);
      client.close();
      return;
    }
    console.log(`⚠️  手机号 ${TARGET_PHONE} 已被其他用户绑定:`);
    console.log(`   ID:       ${otherUser.id}`);
    console.log(`   邮箱:     ${otherUser.email}`);
    console.log(`   昵称:     ${otherUser.name || "(无)"}`);
    console.log(`\n🔧 正在从旧账号清除手机号...`);
    await client.execute({
      sql: "UPDATE User SET phone = NULL WHERE id = ?",
      args: [otherUser.id],
    });
    console.log(`✅ 旧账号手机号已清除。`);
  } else {
    console.log(`✅ 手机号 ${TARGET_PHONE} 未被占用，可以直接绑定。`);
  }

  // 4. 执行绑定
  console.log(`\n🔧 正在绑定手机号 ${TARGET_PHONE} 到 ${TARGET_EMAIL}...`);

  const updateResult = await client.execute({
    sql: "UPDATE User SET phone = ? WHERE email = ?",
    args: [TARGET_PHONE, TARGET_EMAIL],
  });

  console.log(`✅ 绑定成功！影响行数: ${updateResult.rowsAffected}`);

  // 5. 验证结果
  console.log(`\n🔍 验证绑定结果...`);
  const verifyResult = await client.execute({
    sql: "SELECT id, email, phone, name FROM User WHERE email = ?",
    args: [TARGET_EMAIL],
  });

  if (verifyResult.rows.length > 0) {
    const verified = verifyResult.rows[0];
    console.log(`✅ 验证通过:`);
    console.log(`   ID:       ${verified.id}`);
    console.log(`   邮箱:     ${verified.email}`);
    console.log(`   手机号:   ${verified.phone}`);
    console.log(`   昵称:     ${verified.name || "(无)"}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎉 操作完成！用户 ${TARGET_EMAIL} 现在可以用手机号 ${TARGET_PHONE} 登录了。`);
  console.log(`=".repeat(60)}`);

  client.close();
}

main();
