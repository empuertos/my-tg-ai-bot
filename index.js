export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // Health check
    if (request.method !== "POST") {
      return new Response("✅ Bot is running! Webhook active.");
    }

    try {
      // ✅ Fix: Read body properly
      let bodyText;
      try {
        bodyText = await request.text();
      } catch (e) {
        return new Response("❌ Cannot read body", { status: 400 });
      }

      if (!bodyText || bodyText.trim() === "") {
        return new Response("Empty body — OK", { status: 200 });
      }

      // ✅ Parse safely
      let update;
      try {
        update = JSON.parse(bodyText);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr.message);
        return new Response("Invalid JSON — OK", { status: 200 });
      }

      const chatId = update?.message?.chat?.id;
      const text = update?.message?.text;

      if (!chatId || !text) {
        return new Response("No message data — OK", { status: 200 });
      }

      // ✅ ALLOWED check — remove if not needed!
      const userId = update?.message?.from?.id;
      const allowed = env.ALLOWED_USER_ID;
      if (allowed && userId?.toString() !== allowed) {
        await tg(env.TELEGRAM_BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "❌ Not authorized"
        });
        return new Response("Forbidden", { status: 200 });
      }

      // /start
      if (text === "/start") {
        await tg(env.TELEGRAM_BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: "👋 Hello! Send me a message!"
        });
        return new Response("OK — start sent");
      }

      // Typing indicator
      await tg(env.TELEGRAM_BOT_TOKEN, "sendChatAction", {
        chat_id: chatId,
        action: "typing"
      });

      // NVIDIA API
      const nvidiaRes = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [{ role: "user", content: text }],
            temperature: 0.7,
            max_tokens: 512
          })
        }
      );

      if (!nvidiaRes.ok) {
        const errText = await nvidiaRes.text();
        await tg(env.TELEGRAM_BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: `⚠️ NVIDIA Error: ${nvidiaRes.status}`
        });
        return new Response(`NVIDIA error: ${nvidiaRes.status}`);
      }

      const data = await nvidiaRes.json();
      const reply = data?.choices?.[0]?.message?.content || "No reply received.";

      // Send reply
      await tg(env.TELEGRAM_BOT_TOKEN, "sendMessage", {
        chat_id: chatId,
        text: reply
      });

      return new Response("✅ Reply sent");

    } catch (err) {
      console.error("❌ ERROR:", err.message);
      return new Response(`Error: ${err.message}`, { status: 200 });
    }
  }
};

// ✅ Safe Telegram sender function
async function tg(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errData = await res.json();
    console.error("Telegram error:", errData);
  }
}
