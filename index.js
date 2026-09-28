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

      if (text === "/start") {
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, "👋 Hello! Send me a message!");
        return new Response("OK");
      }

      await sendAction(env.TELEGRAM_BOT_TOKEN, chatId, "typing");

      // ✅ TAMANG PANGALAN NG MODEL — SIGURADONG GUMAGANA!
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: text }],
          temperature: 0.7,
          max_tokens: 512
        })
      });

      if (!groqRes.ok) {
        const err = await groqRes.json();
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, 
          `⚠️ ${err.error?.message || "Error " + groqRes.status}`);
        return new Response("Error");
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || "No reply.";
      
      await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, reply);
      return new Response("OK");

    } catch (err) {
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
