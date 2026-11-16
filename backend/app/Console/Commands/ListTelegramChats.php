<?php

namespace App\Console\Commands;

use App\Services\TelegramNotifier;
use Illuminate\Console\Command;

/**
 * Setup helper: lists the chats the bot has seen (add the bot to the group
 * or write it a message first), to find the TELEGRAM_CHAT_ID.
 */
class ListTelegramChats extends Command
{
    protected $signature = 'telegram:chats {--test : Also send a test message to TELEGRAM_CHAT_ID}';

    protected $description = 'List the Telegram chats the bot can write to, and optionally send a test message.';

    public function handle(TelegramNotifier $telegram): int
    {
        $chats = $telegram->recentChats();
        if ($chats === []) {
            $this->warn('Aucun chat trouvé. Vérifiez TELEGRAM_BOT_TOKEN, puis ajoutez le bot au groupe (ou envoyez-lui un message) et relancez.');
        } else {
            $this->table(['TELEGRAM_CHAT_ID', 'Type', 'Nom'], array_map(fn ($c) => [$c['id'], $c['type'], $c['title']], $chats));
        }

        if ($this->option('test')) {
            $ok = $telegram->send("\u{2705} Le bot <b>ReneFootball</b> est bien connecté à ce chat.");
            $ok ? $this->info('Message de test envoyé.') : $this->error('Envoi impossible : vérifiez TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID.');
        }

        return self::SUCCESS;
    }
}
