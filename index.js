import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import P from "pino";
import readline from "readline";

const BOT_NAME = "Luck Kyy";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    browser: [BOT_NAME, "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    const number = await ask(
      "\nMasukkan nomor WhatsApp (contoh 628123456789): "
    );

    const phoneNumber = number.replace(/\D/g, "");

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log("\n================================");
        console.log("   LUCK KYY PAIRING CODE");
        console.log("================================");
        console.log(`   ${code}`);
        console.log("================================\n");
        console.log(
          "WhatsApp > Perangkat tertaut > Tautkan perangkat > Tautkan dengan nomor telepon"
        );
      } catch (err) {
        console.error("Gagal mendapatkan pairing code:", err);
      }
    }, 3000);
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log(`\n✅ ${BOT_NAME} berhasil terhubung!`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        console.log("Koneksi terputus, mencoba menyambungkan kembali...");
        startBot();
      } else {
        console.log("Sesi logout. Hapus folder session lalu login kembali.");
      }
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
        text: `╭──「 ${BOT_NAME} 」──
│
│ 👋 Halo!
│
│ .menu
│ .ping
│ .owner
│ .runtime
│
╰────────────`
      });
    }

    if (command === ".ping") {
      await sock.sendMessage(jid, {
        text: "🏓 Pong!"
      });
    }

    if (command === ".owner") {
      await sock.sendMessage(jid, {
        text: "👑 Owner: Luck Kyy"
      });
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
