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

      // ✅ Use WORKING model names — try one by one
      const models = [
        "meta/llama-3.2-1b-instruct",
        "meta/llama-3.2-3b-instruct",
        "mistralai/mistral-7b-instruct-v0.3"
      ];

      let reply = null;
      let lastError = null;

      for (const model of models) {
        try {
          const nvidiaRes = await fetch(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.NVIDIA_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: text }],
                temperature: 0.7,
                max_tokens: 512
              })
            }
          );

          if (nvidiaRes.ok) {
            const data = await nvidiaRes.json();
            reply = data.choices?.[0]?.message?.content;
            console.log("✅ Working model:", model);
            break;
          }
        } catch (e) {
          lastError = e;
        }
      }

      if (!reply) {
        await sendMsg(env.TELEGRAM_BOT_TOKEN, chatId, 
          "⚠️ All models busy. Try again in a minute.");
        return new Response("No model available");
      }
      
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
