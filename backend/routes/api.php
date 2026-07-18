<?php

use App\Http\Controllers\Api\Admin\AdminAppearanceController;
use App\Http\Controllers\Api\Admin\AdminArticleController;
use App\Http\Controllers\Api\Admin\AdminClipController;
use App\Http\Controllers\Api\Admin\AdminPlayerController;
use App\Http\Controllers\Api\Admin\AdminPresentationController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\Admin\Scouting\ClubDnaProfileController as ScoutingClubDnaProfileController;
use App\Http\Controllers\Api\Admin\Scouting\FootballMatchController;
use App\Http\Controllers\Api\Admin\Scouting\PlayerAliasController as ScoutingPlayerAliasController;
use App\Http\Controllers\Api\Admin\Scouting\PlayerRiskController as ScoutingPlayerRiskController;
use App\Http\Controllers\Api\Admin\Scouting\PlayerSourceController as ScoutingPlayerSourceController;
use App\Http\Controllers\Api\Admin\Scouting\QuickObservationController;
use App\Http\Controllers\Api\Admin\Scouting\RecruitmentNeedController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutAssignmentController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutingDashboardController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutingInboxController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutingIntelligenceController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutingPlayerController;
use App\Http\Controllers\Api\Admin\Scouting\ScoutingReportController;
use App\Http\Controllers\Api\Admin\Scouting\ShortlistController;
use App\Http\Controllers\Api\AnalysisController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\PlayerController;
use App\Http\Controllers\Api\PresentationController;
use App\Http\Controllers\Api\StaffController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('/admin/login', [AuthController::class, 'login']);

Route::get('/players', [PlayerController::class, 'index']);
Route::get('/players/{player:slug}', [PlayerController::class, 'show']);
Route::get('/players/{player:slug}/pdf', [PdfController::class, 'playerProfile']);

Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{article:slug}', [ArticleController::class, 'show']);

Route::get('/staff', [StaffController::class, 'index']);

Route::get('/players/{player:slug}/presentations', [PresentationController::class, 'indexForPlayer']);
Route::get('/presentations/{token}',               [PresentationController::class, 'show']);
Route::get('/presentations/{token}/meta',          [PresentationController::class, 'meta']);

Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:5,1');

// --- Authenticated admin ---
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/players', [AdminPlayerController::class, 'index']);
    Route::post('/players', [AdminPlayerController::class, 'store']);
    Route::get('/players/{player:slug}', [AdminPlayerController::class, 'show']);
    Route::put('/players/{player:slug}', [AdminPlayerController::class, 'update']);
    Route::patch('/players/{player:slug}', [AdminPlayerController::class, 'update']);
    // POST alias for multipart updates (browsers can't natively send files via PUT
    // without method spoofing - keeping the alias avoids any spoofing dance).
    Route::post('/players/{player:slug}', [AdminPlayerController::class, 'update']);
    Route::delete('/players/{player:slug}', [AdminPlayerController::class, 'destroy']);

    // Match appearances - nested under a player.
    Route::get('/players/{player:slug}/appearances',                   [AdminAppearanceController::class, 'index']);
    Route::post('/players/{player:slug}/appearances',                  [AdminAppearanceController::class, 'store']);
    Route::put('/players/{player:slug}/appearances/{appearance}',      [AdminAppearanceController::class, 'update']);
    Route::patch('/players/{player:slug}/appearances/{appearance}',    [AdminAppearanceController::class, 'update']);
    Route::delete('/players/{player:slug}/appearances/{appearance}',   [AdminAppearanceController::class, 'destroy']);

    // Annotated frame clips - only PNGs and metadata, no video files server-side.
    Route::get('/clips',                                      [AdminClipController::class, 'indexAll']);
    Route::get('/players/{player:slug}/clips',                [AdminClipController::class, 'index']);
    Route::post('/players/{player:slug}/clips',               [AdminClipController::class, 'store']);
    Route::post('/players/{player:slug}/clips/{clip}',        [AdminClipController::class, 'update']); // multipart-friendly alias
    Route::put('/players/{player:slug}/clips/{clip}',         [AdminClipController::class, 'update']);
    Route::delete('/players/{player:slug}/clips/{clip}',      [AdminClipController::class, 'destroy']);

    Route::get('/analysis/metrics',     [AnalysisController::class, 'metrics']);
    Route::get('/analysis/percentiles', [AnalysisController::class, 'percentiles']);

    // Articles (news CMS) - multipart-friendly POST aliases for updates so the
    // browser can send cover/gallery files without _method spoofing dance.
    Route::get('/articles',                       [AdminArticleController::class, 'index']);
    Route::post('/articles',                      [AdminArticleController::class, 'store']);
    Route::get('/articles/{article:slug}',        [AdminArticleController::class, 'show']);
    Route::put('/articles/{article:slug}',        [AdminArticleController::class, 'update']);
    Route::patch('/articles/{article:slug}',      [AdminArticleController::class, 'update']);
    Route::post('/articles/{article:slug}',       [AdminArticleController::class, 'update']);
    Route::delete('/articles/{article:slug}',     [AdminArticleController::class, 'destroy']);

    // Presentations (player PDF generator with templates).
    Route::get('/presentations',                          [AdminPresentationController::class, 'index']);
    Route::get('/presentations/catalogue',                [AdminPresentationController::class, 'catalogue']);
    Route::post('/presentations',                         [AdminPresentationController::class, 'store']);
    Route::post('/presentations/upload-photo',            [AdminPresentationController::class, 'uploadPhoto']);
    Route::get('/presentations/{presentation}',           [AdminPresentationController::class, 'show']);
    Route::get('/presentations/{presentation}/preview',   [AdminPresentationController::class, 'preview']);
    Route::patch('/presentations/{presentation}',         [AdminPresentationController::class, 'update']);
    Route::delete('/presentations/{presentation}',        [AdminPresentationController::class, 'destroy']);

    // Staff (À propos / L'équipe) - photo via multipart, _method=PUT spoofing.
    Route::get('/staff',                       [AdminStaffController::class, 'index']);
    Route::post('/staff',                      [AdminStaffController::class, 'store']);
    Route::post('/staff/reorder',              [AdminStaffController::class, 'reorder']);
    Route::get('/staff/{staff:slug}',          [AdminStaffController::class, 'show']);
    Route::put('/staff/{staff:slug}',          [AdminStaffController::class, 'update']);
    Route::patch('/staff/{staff:slug}',        [AdminStaffController::class, 'update']);
    Route::post('/staff/{staff:slug}',         [AdminStaffController::class, 'update']);
    Route::delete('/staff/{staff:slug}',       [AdminStaffController::class, 'destroy']);

    /* -----------------------------------------------------------------
     * SCOUTING COCKPIT
     * Mirrors the /admin/scouting React page. Same Sanctum + admin guard.
     * Reused player slug binding stays consistent across the rest of the API.
     * --------------------------------------------------------------- */
    Route::prefix('scouting')->group(function () {
        Route::get('/dashboard',    [ScoutingDashboardController::class, 'show']);
        Route::get('/intelligence', [ScoutingIntelligenceController::class, 'index']);
        Route::get('/inbox',        [ScoutingInboxController::class, 'show']);

        // Scouting-flavoured player workflow (status, scores, completeness).
        Route::get('/players',                                  [ScoutingPlayerController::class, 'index']);
        Route::get('/players/{player:slug}',                    [ScoutingPlayerController::class, 'show']);
        Route::patch('/players/{player:slug}',                  [ScoutingPlayerController::class, 'update']);
        Route::post('/players/{player:slug}/refresh-scores',    [ScoutingPlayerController::class, 'refreshScores']);

        // Nested CRUD on player aliases / sources / risks.
        Route::get('/players/{player:slug}/aliases',                  [ScoutingPlayerAliasController::class, 'index']);
        Route::post('/players/{player:slug}/aliases',                 [ScoutingPlayerAliasController::class, 'store']);
        Route::delete('/players/{player:slug}/aliases/{alias}',       [ScoutingPlayerAliasController::class, 'destroy']);

        Route::get('/players/{player:slug}/sources',                  [ScoutingPlayerSourceController::class, 'index']);
        Route::post('/players/{player:slug}/sources',                 [ScoutingPlayerSourceController::class, 'store']);
        Route::patch('/players/{player:slug}/sources/{source}',       [ScoutingPlayerSourceController::class, 'update']);
        Route::delete('/players/{player:slug}/sources/{source}',      [ScoutingPlayerSourceController::class, 'destroy']);

        Route::get('/players/{player:slug}/risks',                    [ScoutingPlayerRiskController::class, 'index']);
        Route::post('/players/{player:slug}/risks',                   [ScoutingPlayerRiskController::class, 'store']);
        Route::patch('/players/{player:slug}/risks/{risk}',           [ScoutingPlayerRiskController::class, 'update']);
        Route::delete('/players/{player:slug}/risks/{risk}',          [ScoutingPlayerRiskController::class, 'destroy']);

        // Football matches (calendar entity).
        Route::get('/matches',                  [FootballMatchController::class, 'index']);
        Route::post('/matches',                 [FootballMatchController::class, 'store']);
        Route::get('/matches/{match:slug}',     [FootballMatchController::class, 'show']);
        Route::patch('/matches/{match:slug}',   [FootballMatchController::class, 'update']);
        Route::delete('/matches/{match:slug}',  [FootballMatchController::class, 'destroy']);

        // Reports.
        Route::get('/reports',                              [ScoutingReportController::class, 'index']);
        Route::post('/reports',                             [ScoutingReportController::class, 'store']);
        Route::get('/reports/{report}',                     [ScoutingReportController::class, 'show']);
        Route::patch('/reports/{report}',                   [ScoutingReportController::class, 'update']);
        Route::delete('/reports/{report}',                  [ScoutingReportController::class, 'destroy']);
        Route::post('/reports/{report}/submit',             [ScoutingReportController::class, 'submit']);
        Route::post('/reports/{report}/validate',           [ScoutingReportController::class, 'validateReport']);
        Route::post('/reports/{report}/request-changes',    [ScoutingReportController::class, 'requestChanges']);
        Route::post('/reports/{report}/archive',            [ScoutingReportController::class, 'archive']);

        // Quick in-stadium observations.
        Route::get('/observations',                  [QuickObservationController::class, 'index']);
        Route::post('/observations',                 [QuickObservationController::class, 'store']);
        Route::delete('/observations/{observation}', [QuickObservationController::class, 'destroy']);

        // Missions (kanban).
        Route::get('/missions',                       [ScoutAssignmentController::class, 'index']);
        Route::post('/missions',                      [ScoutAssignmentController::class, 'store']);
        Route::get('/missions/{assignment}',          [ScoutAssignmentController::class, 'show']);
        Route::patch('/missions/{assignment}',        [ScoutAssignmentController::class, 'update']);
        Route::patch('/missions/{assignment}/status', [ScoutAssignmentController::class, 'setStatus']);
        Route::delete('/missions/{assignment}',       [ScoutAssignmentController::class, 'destroy']);

        // Shortlists (kanban).
        Route::get('/shortlists',                                            [ShortlistController::class, 'index']);
        Route::post('/shortlists',                                           [ShortlistController::class, 'store']);
        Route::get('/shortlists/{shortlist:slug}',                           [ShortlistController::class, 'show']);
        Route::patch('/shortlists/{shortlist:slug}',                         [ShortlistController::class, 'update']);
        Route::delete('/shortlists/{shortlist:slug}',                        [ShortlistController::class, 'destroy']);
        Route::post('/shortlists/{shortlist:slug}/players',                  [ShortlistController::class, 'addPlayer']);
        Route::patch('/shortlists/{shortlist:slug}/players/{entry}',         [ShortlistController::class, 'updateEntry']);
        Route::delete('/shortlists/{shortlist:slug}/players/{entry}',        [ShortlistController::class, 'removePlayer']);

        // Recruitment needs.
        Route::get('/needs',                  [RecruitmentNeedController::class, 'index']);
        Route::post('/needs',                 [RecruitmentNeedController::class, 'store']);
        Route::get('/needs/{need:slug}',      [RecruitmentNeedController::class, 'show']);
        Route::patch('/needs/{need:slug}',    [RecruitmentNeedController::class, 'update']);
        Route::delete('/needs/{need:slug}',   [RecruitmentNeedController::class, 'destroy']);

        // Club DNA profiles.
        Route::get('/dna',                       [ScoutingClubDnaProfileController::class, 'index']);
        Route::post('/dna',                      [ScoutingClubDnaProfileController::class, 'store']);
        Route::get('/dna/{profile:slug}',        [ScoutingClubDnaProfileController::class, 'show']);
        Route::patch('/dna/{profile:slug}',      [ScoutingClubDnaProfileController::class, 'update']);
        Route::delete('/dna/{profile:slug}',     [ScoutingClubDnaProfileController::class, 'destroy']);
    });
});
