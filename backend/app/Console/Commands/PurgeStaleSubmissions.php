<?php

namespace App\Console\Commands;

use App\Models\ContactSubmission;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Enforces the 12-month retention window promised in /confidentialite §5.
 * Deletes contact submissions older than the cutoff along with the CV
 * file they carry. Rows manually marked as `archived` by the admin are
 * kept — that flag is how the operator signals "this became a
 * contractual lead", which the policy retains for contract duration + 5
 * years.
 *
 * Scheduled daily from bootstrap/app.php.
 */
class PurgeStaleSubmissions extends Command
{
    protected $signature = 'submissions:purge
                            {--months=12 : Retention window in months (default 12)}
                            {--dry-run : Report what would be deleted without touching the database}';

    protected $description = 'Delete contact submissions past their retention window (RGPD).';

    public function handle(): int
    {
        $months = max(1, (int) $this->option('months'));
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subMonths($months);

        $query = ContactSubmission::query()
            ->where('created_at', '<', $cutoff)
            ->where('status', '!=', 'archived');

        $total = (clone $query)->count();
        if ($total === 0) {
            $this->info("Aucune demande à purger (fenêtre {$months} mois, seuil {$cutoff->toDateString()}).");
            return self::SUCCESS;
        }

        $deletedRows = 0;
        $deletedCvs  = 0;

        $query->chunkById(200, function ($chunk) use (&$deletedRows, &$deletedCvs, $dryRun) {
            foreach ($chunk as $submission) {
                if ($submission->cv_path) {
                    if (! $dryRun) {
                        // Wipe from both disks — new uploads sit on `local`,
                        // legacy ones from before the privacy hardening on `public`.
                        Storage::disk('local')->delete($submission->cv_path);
                        Storage::disk('public')->delete($submission->cv_path);
                    }
                    $deletedCvs++;
                }
                if (! $dryRun) {
                    $submission->delete();
                }
                $deletedRows++;
            }
        });

        $prefix = $dryRun ? '[dry-run] ' : '';
        $this->info("{$prefix}Purgé {$deletedRows} demande(s) et {$deletedCvs} CV(s) antérieur(s) à {$cutoff->toDateString()}.");
        return self::SUCCESS;
    }
}
