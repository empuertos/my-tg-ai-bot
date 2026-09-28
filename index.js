export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running! ✅ GROQ ACTIVE");
    }

    try {
      const update = await request.json();
      const chatId = update.message?.chat?.id;
      const text = update.message?.text;

      if (!chatId || !text) return new Response("OK");

      // /start command
      if (text === "/start") {
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, "👋 Hello! Send me a message!");
        return new Response("OK");
      }

      // Show typing...
      await sendAction(env.TELEGRAM_BOT_TOKEN, chatId, "typing");

      // GROQ API — SIGURADONG GUMAGANA!
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: text }],
          temperature: 0.7,
          max_tokens: 512
        })
      });

      if (!groqRes.ok) {
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, 
          `⚠️ Error ${groqRes.status}\n\nI-check ang GROQ_API_KEY mo!\nDapat nagsisimula sa gsk_`);
        return new Response("Groq Error");
      }

      const data = await groqRes.json();
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
