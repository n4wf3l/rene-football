<?php

use App\Http\Controllers\Api\Admin\AdminPlayerController;
use App\Http\Controllers\Api\AnalysisController;
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
    Route::delete('/players/{player:slug}', [AdminPlayerController::class, 'destroy']);

    Route::get('/analysis/metrics', [AnalysisController::class, 'metrics']);
});
