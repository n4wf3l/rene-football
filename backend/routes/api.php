<?php

use App\Http\Controllers\Api\Admin\AdminAppearanceController;
use App\Http\Controllers\Api\Admin\AdminArticleController;
use App\Http\Controllers\Api\Admin\AdminClipController;
use App\Http\Controllers\Api\Admin\AdminPlayerController;
use App\Http\Controllers\Api\AnalysisController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\PlayerController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('/admin/login', [AuthController::class, 'login']);

Route::get('/players', [PlayerController::class, 'index']);
Route::get('/players/{player:slug}', [PlayerController::class, 'show']);
Route::get('/players/{player:slug}/pdf', [PdfController::class, 'playerProfile']);

Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{article:slug}', [ArticleController::class, 'show']);

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
    // without method spoofing — keeping the alias avoids any spoofing dance).
    Route::post('/players/{player:slug}', [AdminPlayerController::class, 'update']);
    Route::delete('/players/{player:slug}', [AdminPlayerController::class, 'destroy']);

    // Match appearances — nested under a player.
    Route::get('/players/{player:slug}/appearances',                   [AdminAppearanceController::class, 'index']);
    Route::post('/players/{player:slug}/appearances',                  [AdminAppearanceController::class, 'store']);
    Route::put('/players/{player:slug}/appearances/{appearance}',      [AdminAppearanceController::class, 'update']);
    Route::patch('/players/{player:slug}/appearances/{appearance}',    [AdminAppearanceController::class, 'update']);
    Route::delete('/players/{player:slug}/appearances/{appearance}',   [AdminAppearanceController::class, 'destroy']);

    // Annotated frame clips — only PNGs and metadata, no video files server-side.
    Route::get('/clips',                                      [AdminClipController::class, 'indexAll']);
    Route::get('/players/{player:slug}/clips',                [AdminClipController::class, 'index']);
    Route::post('/players/{player:slug}/clips',               [AdminClipController::class, 'store']);
    Route::post('/players/{player:slug}/clips/{clip}',        [AdminClipController::class, 'update']); // multipart-friendly alias
    Route::put('/players/{player:slug}/clips/{clip}',         [AdminClipController::class, 'update']);
    Route::delete('/players/{player:slug}/clips/{clip}',      [AdminClipController::class, 'destroy']);

    Route::get('/analysis/metrics',     [AnalysisController::class, 'metrics']);
    Route::get('/analysis/percentiles', [AnalysisController::class, 'percentiles']);

    // Articles (news CMS) — multipart-friendly POST aliases for updates so the
    // browser can send cover/gallery files without _method spoofing dance.
    Route::get('/articles',                       [AdminArticleController::class, 'index']);
    Route::post('/articles',                      [AdminArticleController::class, 'store']);
    Route::get('/articles/{article:slug}',        [AdminArticleController::class, 'show']);
    Route::put('/articles/{article:slug}',        [AdminArticleController::class, 'update']);
    Route::patch('/articles/{article:slug}',      [AdminArticleController::class, 'update']);
    Route::post('/articles/{article:slug}',       [AdminArticleController::class, 'update']);
    Route::delete('/articles/{article:slug}',     [AdminArticleController::class, 'destroy']);
});
