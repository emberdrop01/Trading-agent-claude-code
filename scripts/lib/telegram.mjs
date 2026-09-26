export function formatTelegramTradeAlert(analysis) {
  const { manager, researcher, analyst, redTeam, symbol, engine } = analysis;

  const verdictEmoji = manager.verdict.includes('BUY') ? '🟢' : manager.verdict.includes('SELL') ? '🔴' : '🟡';
  const confidenceBar =
    '█'.repeat(Math.round(manager.confidenceScore / 10)) + '░'.repeat(10 - Math.round(manager.confidenceScore / 10));
  const engineTag = engine === 'QUANTITATIVE_FALLBACK' ? ' (rule-based fallback)' : '';

  return `
${verdictEmoji} *DERIV AI TRADING ALERT: ${symbol}*${engineTag}
━━━━━━━━━━━━━━━━━━━━
🎯 *Signal:* *${manager.signal}* | *${manager.verdict}*
📊 *Confidence:* *${manager.confidenceScore}%* [${confidenceBar}]
⏱️ *Timestamp:* \`${new Date().toUTCString()}\`

📋 *EXECUTION LEVELS:*
• *Entry Zone:* \`${manager.entryZone}\`
• *Stop Loss:* \`${manager.stopLoss}\`
• *Take Profit 1:* \`${manager.takeProfit1}\`
• *Take Profit 2:* \`${manager.takeProfit2}\`
• *Risk/Reward:* \`${manager.riskRewardRatio}\`
• *Risk Sizing:* \`${manager.recommendedRiskPercent}\`

👥 *MULTI-AGENT CONSENSUS:*
• 🔍 *Researcher:* _${researcher.marketStructure}_
• 📈 *Analyst:* ${analyst.thesis} — _${analyst.rationale}_
• 🛡️ *Red Team:* _${redTeam.keyRisks[0] || 'Volatility spike hazard'}_

💡 *MANAGER VERDICT:*
${manager.summary}
━━━━━━━━━━━━━━━━━━━━
_⚡ Automated Synthetic Index Intelligence Desk — GitHub Actions_
`.trim();
}

export async function sendTelegramMessage(text, botToken, chatId, log = () => {}) {
  if (!botToken || !botToken.trim()) {
    log('warn', 'TG_BOT_TOKEN not set. Message not sent (logged only).');
    return { success: false, error: 'Telegram bot token not configured' };
  }
  if (!chatId || !chatId.trim()) {
    log('warn', 'TG_CHAT_ID not set. Message not sent (logged only).');
    return { success: false, error: 'Telegram chat id not configured' };
  }

  const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      if (data.description && data.description.includes("can't parse entities")) {
        const retryResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId.trim(), text, disable_web_page_preview: true }),
        });
        const retryData = await retryResp.json();
        if (retryData.ok) {
          log('success', 'Telegram alert sent (fallback plain-text format).');
          return { success: true, messageId: retryData.result?.message_id };
        }
      }
      const errMsg = data.description || `HTTP ${response.status} from Telegram`;
      log('error', `Telegram send failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }

    log('success', `Telegram alert delivered to chat ${chatId}.`);
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    log('error', `Telegram request exception: ${err.message}`);
    return { success: false, error: err.message };
  }
}
