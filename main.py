import os
import asyncio
import requests
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes
)

NVIDIA_KEY = os.environ.get("NVIDIA_API_KEY")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ALLOWED_USER_ID = os.environ.get("ALLOWED_USER_ID", "")

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
        res = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {NVIDIA_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-ai/deepseek-v4.1-flash",
                "messages": [{"role": "user", "content": update.message.text}],
                "temperature": 0.7,
                "max_tokens": 2048
            },
            timeout=60
        )
        
        data = res.json()
        
        if "error" in data:
            raise Exception(data["error"].get("message", "API Error"))
        
        reply = data["choices"][0]["message"]["content"]
        
        if len(reply) > 4000:
            for i in range(0, len(reply), 4000):
                await update.message.reply_text(reply[i:i+4000])
        else:
            await update.message.reply_text(reply)
            
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")

async def main():
    app = ApplicationBuilder().token(TG_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))
    await app.run_polling()

if __name__ == "__main__":
    asyncio.run(main())
