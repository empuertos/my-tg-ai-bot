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

      // /start — works fine
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

      // SHOW EXACT ERROR TO YOU IN TELEGRAM!
      if (!nvidiaRes.ok) {
        const status = nvidiaRes.status;
        let detail = "";
        try {
          const err = await nvidiaRes.json();
          detail = err.error?.message || "";
        } catch {}
        
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, 
          `❌ NVIDIA Error ${status}\n\n${detail}\n\nCheck your NVIDIA API Key!`);
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
