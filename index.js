export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot running! ✅");
    }

    try {
      const update = await request.json();
      const chatId = update.message?.chat?.id;
      
      if (!chatId) return new Response("OK");

      // SIMPLE TEST — NO NVIDIA YET
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ TEST WORKING! Bot received your message!"
        })
      });

      return new Response("OK");

    } catch (err) {
      return new Response("ERROR: " + err.message);
    }
  }
};