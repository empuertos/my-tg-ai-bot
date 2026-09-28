export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running! ✅");
    }

    try {
      const update = await request.json();
      const chatId = update.message?.chat?.id;
      const text = update.message?.text;

      if (!chatId || !text) return new Response("OK");

      // ALLOWED check — leave empty to allow all
      const userId = update.message?.from?.id;
      const allowed = env.ALLOWED_USER_ID;
      if (allowed && userId?.toString() !== allowed) {
        return new Response("Forbidden", { status: 403 });
      }

      // /start command
      if (text === "/start") {
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, "👋 Hello! Send me a message!");
        return new Response("OK");
      }

      // Show typing...
      await sendAction(env.TELEGRAM_BOT_TOKEN, chatId, "typing");

      // Call NVIDIA API
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
        const err = await nvidiaRes.text();
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, `❌ NVIDIA Error: ${nvidiaRes.status}`);
        return new Response("Error");
      }

      const data = await nvidiaRes.json();
      const reply = data.choices?.[0]?.message?.content || "No reply.";
      
      await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK");

    } catch (err) {
      console.error("ERROR:", err.message);
      return new Response("Error: " + err.message);
    }
  }
};

async function sendMsg(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function sendAction(token, chatId, action) {
  await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action })
  });
}
