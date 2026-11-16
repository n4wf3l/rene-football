<?php

namespace App\Console\Commands;

use App\Models\Player;
use App\Services\TelegramNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

/**
 * Posts "Joyeux anniversaire" in the agency Telegram chat for every
 * published player born on this day (Luxembourg time). Run each morning by
 * the scheduler or the HTTP cron (/api/_maintenance/cron/birthdays).
 *
 * Each player is announced once per year (players.birthday_notified_year),
 * so running it twice the same day sends nothing new. Born on 29 February:
 * celebrated on 28 February in non-leap years.
 */
class SendPlayerBirthdays extends Command
{
    protected $signature = 'players:birthdays
                            {--date= : Day to check (YYYY-MM-DD), today in Luxembourg by default}
                            {--dry-run : Show the messages without sending them}';

    protected $description = 'Send a Telegram message for players whose birthday is today.';

    public const TIMEZONE = 'Europe/Luxembourg';

    public function handle(TelegramNotifier $telegram): int
    {
        $day = $this->option('date')
            ? CarbonImmutable::parse((string) $this->option('date'), self::TIMEZONE)
            : CarbonImmutable::now(self::TIMEZONE);
        $dryRun = (bool) $this->option('dry-run');

        $players = $this->birthdaysOn($day)
            ->filter(fn (Player $p) => $dryRun || (int) $p->birthday_notified_year !== $day->year);

        if ($players->isEmpty()) {
            $this->info("Aucun anniversaire à annoncer le {$day->toDateString()}.");
            return self::SUCCESS;
        }

        if (! $dryRun && ! $telegram->isConfigured()) {
            $this->warn('Telegram n\'est pas configuré (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) : rien envoyé.');
            return self::SUCCESS;
        }

        $sent = 0;
        foreach ($players as $player) {
            $message = $this->message($player, $day);
            if ($dryRun) {
                $this->line($message);
                continue;
            }
            if ($telegram->send($message)) {
                $player->forceFill(['birthday_notified_year' => $day->year])->saveQuietly();
                $sent++;
            } else {
                $this->error("Échec de l'envoi pour {$player->name}.");
            }
        }

        $this->info($dryRun
            ? "{$players->count()} anniversaire(s) le {$day->toDateString()} (simulation, rien envoyé)."
            : "{$sent} message(s) d'anniversaire envoyé(s).");

        return self::SUCCESS;
    }

    /** @return Collection<int, Player> */
    private function birthdaysOn(CarbonImmutable $day): Collection
    {
        return Player::query()
            ->where('is_published', true)
            ->whereNotNull('date_of_birth')
            ->orderBy('name')
            ->get()
            ->filter(function (Player $p) use ($day) {
                $born = $this->bornOn($p);
                if ($born->month === $day->month && $born->day === $day->day) {
                    return true;
                }
                // 29 February birthdays fall on 28 February in other years.
                return $born->month === 2 && $born->day === 29
                    && ! $day->isLeapYear() && $day->month === 2 && $day->day === 28;
            })
            ->values();
    }

    private function bornOn(Player $player): CarbonImmutable
    {
        return CarbonImmutable::parse(substr((string) $player->getRawOriginal('date_of_birth'), 0, 10), self::TIMEZONE);
    }

    private function message(Player $player, CarbonImmutable $day): string
    {
        $age = $day->year - $this->bornOn($player)->year;
        $facts = collect([$player->position, $player->club])->filter()->map(fn ($v) => e($v))->implode(' · ');
        $url = rtrim((string) config('app.url'), '/').'/joueurs/'.$player->slug;

        $lines = [
            "\u{1F382} <b>Joyeux anniversaire ".e($player->name).' !</b>',
            "Il fête ses {$age} ans aujourd'hui.",
        ];
        if ($facts !== '') {
            $lines[] = $facts;
        }
        $lines[] = '';
        $lines[] = '<a href="'.e($url).'">Voir son profil</a>';

        return implode("\n", $lines);
    }
}
