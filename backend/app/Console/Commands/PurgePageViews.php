<?php

namespace App\Console\Commands;

use App\Models\PageView;
use Illuminate\Console\Command;

/**
 * Enforces the 13-month retention window for the anonymous page-view
 * counter, as stated in /confidentialite §5. Scheduled daily from
 * bootstrap/app.php and also run by the HTTP cron fallback.
 */
class PurgePageViews extends Command
{
    protected $signature = 'analytics:purge
                            {--months=13 : Retention window in months (default 13)}';

    protected $description = 'Delete anonymous page views past their retention window.';

    public function handle(): int
    {
        $months = max(1, (int) $this->option('months'));
        $cutoff = now()->subMonths($months);

        $deleted = PageView::query()->where('viewed_at', '<', $cutoff)->delete();

        $this->info("{$deleted} vue(s) supprimée(s) (fenêtre {$months} mois, seuil {$cutoff->toDateString()}).");
        return self::SUCCESS;
    }
}
