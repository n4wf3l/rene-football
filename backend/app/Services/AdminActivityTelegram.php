<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Player;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Tells the agency Telegram chat (bot "ReneFootball") when the team
 * publishes an article or adds a player from the back-office. Called by
 * the admin controllers only, so content migrations and test data never
 * post anything. Sent after the response: a slow or broken Telegram never
 * slows down nor fails the admin action.
 */
class AdminActivityTelegram
{
    public function articlePublished(Article $article, ?User $by): void
    {
        $url = $this->url('/actualites/'.$article->slug);
        $lines = [
            "\u{1F4F0} <b>Article publié</b>",
            '',
            '<b>'.e($article->title).'</b>',
        ];
        if ($article->excerpt) {
            $lines[] = e(Str::limit(Str::squish($article->excerpt), 300));
        }
        $lines[] = '';
        $lines[] = 'Catégorie : '.e($article->category).($article->player ? ' · Joueur : '.e($article->player->name) : '');
        if ($by) {
            $lines[] = 'Par '.e($by->name);
        }
        $lines[] = '<a href="'.e($url).'">Lire l\'article</a>';

        $this->sendLater(implode("\n", $lines));
    }

    public function playerAdded(Player $player, ?User $by): void
    {
        $facts = collect([$player->position, $player->club, $player->nationality])->filter()->map(fn ($v) => e($v))->implode(' · ');
        $lines = [
            "\u{2795} <b>Nouveau joueur ajouté</b>",
            '',
            '<b>'.e($player->name).'</b>',
        ];
        if ($facts !== '') {
            $lines[] = $facts;
        }
        $lines[] = $player->is_published ? 'Visible sur le site' : 'Pas encore publié sur le site';
        if ($by) {
            $lines[] = 'Par '.e($by->name);
        }
        $lines[] = $player->is_published
            ? '<a href="'.e($this->url('/joueurs/'.$player->slug)).'">Voir son profil</a>'
            : '<a href="'.e($this->url('/admin/joueurs/'.$player->slug.'/edit')).'">Ouvrir sa fiche dans le back-office</a>';

        $this->sendLater(implode("\n", $lines));
    }

    private function sendLater(string $html): void
    {
        app(TelegramNotifier::class)->sendAfterResponse($html);
    }

    private function url(string $path): string
    {
        return rtrim((string) config('app.url'), '/').$path;
    }
}
