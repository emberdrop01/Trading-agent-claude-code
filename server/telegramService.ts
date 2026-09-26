import { PersonaAnalysis } from './types';
import { configStore } from './configStore';

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Formats the Manager's verdict and sequential breakdown for Telegram
 */
export function formatTelegramTradeAlert(analysis: PersonaAnalysis): string {
  const { manager, researcher, analyst, redTeam, symbol } = analysis;

  const verdictEmoji =
    manager.verdict.includes('BUY')
      ? '🟢'
      : manager.verdict.includes('SELL')
      ? '🔴'
      : '🟡';

  const confidenceBar = '█'.repeat(Math.round(manager.confidenceScore / 10)) +
    '░'.repeat(10 - Math.round(manager.confidenceScore / 10));

  return `
${verdictEmoji} *DERIV AI TRADING ALERT: ${symbol}*
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
• 🔍 *Researcher:* Structure: _${researcher.marketStructure}_ (Patterns: ${researcher.patterns.slice(0, 2).join(', ') || 'Consolidation'})
• 📈 *Analyst Thesis:* ${analyst.thesis} — _${analyst.rationale}_
• 🛡️ *Red Team Audit:* _${redTeam.keyRisks[0] || 'Volatility spike hazard'}_

💡 *MANAGER VERDICT:*
${manager.summary}
━━━━━━━━━━━━━━━━━━━━
_⚡ Automated Synthetic Index Intelligence Desk_
`.trim();
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  text: string,
  botTokenOverride?: string,
  chatIdOverride?: string
): Promise<TelegramSendResult> {
  const config = configStore.getConfig();
  const token = botTokenOverride || config.tgBotToken;
  const chatId = chatIdOverride || config.tgChatId;

  if (!token || !token.trim()) {
    const errorMsg = 'Telegram Bot Token is not configured. Message skipped.';
    configStore.addLog('TELEGRAM', 'warn', errorMsg);
    configStore.addTelegramMessage({
      chatId: chatId || 'unknown',
      preview: text.slice(0, 80) + '...',
      fullText: text,
      status: 'failed',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  if (!chatId || !chatId.trim()) {
    const errorMsg = 'Telegram Chat ID is not configured. Message skipped.';
    configStore.addLog('TELEGRAM', 'warn', errorMsg);
    configStore.addTelegramMessage({
      chatId: 'missing',
      preview: text.slice(0, 80) + '...',
      fullText: text,
      status: 'failed',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;

  try {
    configStore.addLog('TELEGRAM', 'info', `Sending Telegram message to chat ${chatId}...`);

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

    const data: any = await response.json();

    if (!response.ok || !data.ok) {
      // If Markdown parsing fails due to reserved characters, retry as plain text
      if (data.description && data.description.includes("can't parse entities")) {
        const retryResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId.trim(),
            text,
            disable_web_page_preview: true,
          }),
        });
        const retryData: any = await retryResp.json();
        if (retryData.ok) {
          configStore.addLog('TELEGRAM', 'success', `Telegram alert sent successfully (fallback format).`);
          configStore.addTelegramMessage({
            chatId: chatId.trim(),
            preview: text.slice(0, 80) + '...',
            fullText: text,
            status: 'sent',
          });
          return { success: true, messageId: retryData.result?.message_id };
        }
      }

      const errMsg = data.description || `HTTP ${response.status} from Telegram`;
      configStore.addLog('TELEGRAM', 'error', `Telegram send failed: ${errMsg}`);
      configStore.addTelegramMessage({
        chatId: chatId.trim(),
        preview: text.slice(0, 80) + '...',
        fullText: text,
        status: 'failed',
        error: errMsg,
      });
      return { success: false, error: errMsg };
    }

    configStore.addLog('TELEGRAM', 'success', `Telegram alert delivered to chat ${chatId}.`);
    configStore.addTelegramMessage({
      chatId: chatId.trim(),
      preview: text.slice(0, 80) + '...',
      fullText: text,
      status: 'sent',
    });

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    const errorMsg = err.message || 'Network error connecting to Telegram';
    configStore.addLog('TELEGRAM', 'error', `Telegram request exception: ${errorMsg}`);
    configStore.addTelegramMessage({
      chatId: chatId.trim(),
      preview: text.slice(0, 80) + '...',
      fullText: text,
      status: 'failed',
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends a quick connection test ping to Telegram
 */
export async function sendTestTelegramPing(botToken: string, chatId: string): Promise<TelegramSendResult> {
  const pingText = `
🔔 *DERIV AI TRADING ANALYST: CONNECTION TEST*
━━━━━━━━━━━━━━━━━━━━
✅ Telegram Bot connection verified successfully!
⏱️ *Server Time:* \`${new Date().toUTCString()}\`
📊 *Active Mode:* Automated Multi-Agent Synthesis (30m, 1h, 4h Crons)
🤖 Ready to broadcast real-time trading signals and meta-research updates.
━━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(pingText, botToken, chatId);
}
