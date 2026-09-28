import os
import httpx
from openai import OpenAI
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes

NVIDIA_KEY = os.environ.get("NVIDIA_API_KEY")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ALLOWED_USER_ID = os.environ.get("ALLOWED_USER_ID", "")

# ✅ Walang 'proxies' — direkta na!
client = OpenAI(
    api_key=NVIDIA_KEY,
    base_url="https://integrate.api.nvidia.com/v1"
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if ALLOWED_USER_ID and str(update.effective_user.id) != ALLOWED_USER_ID:
        await update.message.reply_text("❌ Sariling gamit lang ito!")
        return
    await update.message.reply_text("👋 Kumusta! Mag-type ka lang — sasagot ako!")

async def chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if ALLOWED_USER_ID and str(update.effective_user.id) != ALLOWED_USER_ID:
        return
    
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
    
    try:
        res = client.chat.completions.create(
            model="deepseek-ai/deepseek-v4.1-flash",
            messages=[{"role": "user", "content": update.message.text}],
            temperature=0.7,
            max_tokens=2048
        )
        reply = res.choices[0].message.content
        if len(reply) > 4000:
            for i in range(0, len(reply), 4000):
                await update.message.reply_text(reply[i:i+4000])
        else:
            await update.message.reply_text(reply)
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    app = ApplicationBuilder().token(TG_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    app.run_polling()
