import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";

const BOT_NAME = "Luck Kyy";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: [BOT_NAME, "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan QR ini dari WhatsApp > Perangkat Tertaut:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log(`\n✅ ${BOT_NAME} berhasil terhubung!`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log("Koneksi terputus.", shouldReconnect ? "Menyambungkan ulang..." : "Silakan login ulang.");

      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    if (command === ".menu") {
      await sock.sendMessage(jid, {
        text:
`╭───「 ${BOT_NAME} 」───
│
│ 👋 Halo!
│
│ .menu
│ .ping
│ .owner
│ .runtime
│
╰────────────────`
      });
    }

    if (command === ".ping") {
      await sock.sendMessage(jid, { text: "🏓 Pong!" });
    }

    if (command === ".owner") {
      await sock.sendMessage(jid, { text: "👑 Owner: Luck Kyy" });
    }

    if (command === ".runtime") {
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);

      await sock.sendMessage(jid, {
        text: `⏱️ Runtime: ${h}h ${m}m ${s}s`
      });
    }
  });
}

startBot().catch(console.error);
