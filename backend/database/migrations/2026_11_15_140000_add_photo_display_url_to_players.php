<?php

use App\Support\PlayerPhoto;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lightweight display photo for the website (see App\Support\PlayerPhoto),
 * then built once for every player already in the database. New uploads
 * get theirs from the Player model's saving hook.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('photo_display_url', 500)->nullable()->after('photo_url');
        });

        if (app()->environment('testing')) {
            return;
        }

        DB::table('players')->whereNotNull('photo_url')->orderBy('id')->get(['id', 'photo_url'])
            ->each(function ($row) {
                $display = PlayerPhoto::displayFor($row->photo_url);
                if ($display) {
                    DB::table('players')->where('id', $row->id)->update(['photo_display_url' => $display]);
                }
            });
    }

    public function down(): void
    {
        DB::table('players')->whereNotNull('photo_display_url')->pluck('photo_display_url')
            ->each(fn ($url) => PlayerPhoto::delete($url));

        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('photo_display_url');
        });
    }
};
