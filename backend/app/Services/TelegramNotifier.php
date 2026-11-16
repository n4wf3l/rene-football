<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends messages from the "ReneFootball" Telegram bot to the agency chat.
 *
 * Configuration (.env, written by the deploy from GitHub Secrets):
 *   TELEGRAM_BOT_TOKEN — token given by @BotFather when the bot is created;
 *   TELEGRAM_CHAT_ID   — the chat that receives the messages (a group the
 *                        bot was added to, or a private chat with René).
 *                        `php artisan telegram:chats` lists the candidates.
 * Without both values nothing is sent and nothing fails.
 */
class TelegramNotifier
{
    private const API = 'https://api.telegram.org/bot';

    public function isConfigured(): bool
    {
        return $this->token() !== '' && $this->chatId() !== '';
    }

    /** Sends an HTML-formatted message; true when Telegram accepted it. */
    public function send(string $html): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::asJson()->timeout(10)->post(self::API.$this->token().'/sendMessage', [
                'chat_id'                  => $this->chatId(),
                'text'                     => $html,
                'parse_mode'               => 'HTML',
                'disable_web_page_preview' => true,
            ]);
            if (! $response->successful() || ! $response->json('ok')) {
                Log::warning('Telegram message refused', ['status' => $response->status(), 'body' => $response->json('description')]);
                return false;
            }
            return true;
        } catch (Throwable $e) {
            Log::warning('Telegram message failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Sends once the HTTP response is on its way, so a slow or broken
     * Telegram never delays nor fails the request that triggered it.
     * Each message goes out once, even if the application handles several
     * requests (tests) and runs its terminating callbacks again.
     */
    public function sendAfterResponse(string $html, array $logContext = []): void
    {
        $done = false;
        app()->terminating(function () use (&$done, $html, $logContext) {
            if ($done) {
                return;
            }
            $done = true;
            try {
                $this->send($html);
            } catch (Throwable $e) {
                Log::warning('Telegram deferred message failed', $logContext + ['error' => $e->getMessage()]);
            }
        });
    }

    /**
     * Chats that recently wrote to the bot or added it (getUpdates), to find
     * the TELEGRAM_CHAT_ID. Only needs the token.
     *
     * @return array<int, array{id: int|string, type: string, title: string}>
     */
    public function recentChats(): array
    {
        if ($this->token() === '') {
            return [];
        }
        $updates = Http::timeout(10)->get(self::API.$this->token().'/getUpdates')->json('result') ?? [];

        $chats = [];
        foreach ($updates as $update) {
            foreach (['message', 'channel_post', 'my_chat_member', 'edited_message'] as $key) {
                $chat = $update[$key]['chat'] ?? null;
                if ($chat) {
                    $chats[$chat['id']] = [
                        'id'    => $chat['id'],
                        'type'  => $chat['type'] ?? '?',
                        'title' => $chat['title'] ?? trim(($chat['first_name'] ?? '').' '.($chat['last_name'] ?? '')),
                    ];
                }
            }
        }
        return array_values($chats);
    }

    private function token(): string
    {
        return (string) config('services.telegram.bot_token', '');
    }

    private function chatId(): string
    {
        return (string) config('services.telegram.chat_id', '');
    }
}
