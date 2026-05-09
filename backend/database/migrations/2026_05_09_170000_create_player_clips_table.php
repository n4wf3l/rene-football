<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Annotated frame snapshots — NOT the source video. The admin uploads
     * a video LOCALLY in the browser, pauses, draws on a frame, and we
     * persist only the resulting PNG (~100-300 KB) plus optional re-editable
     * annotation JSON. The original video never touches the server.
     */
    public function up(): void
    {
        Schema::create('player_clips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');                               // /storage/clips/xxx.png
            $table->string('title', 160);
            $table->decimal('timestamp_seconds', 8, 2)->nullable();      // moment within the source video
            $table->string('video_source_label', 200)->nullable();      // free-text "Borussia vs Bayern, 67e"
            $table->text('notes')->nullable();
            // Re-editable annotations: list of { type, x1, y1, x2, y2, color, ... }
            $table->json('annotations_json')->nullable();
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->timestamps();

            $table->index(['player_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_clips');
    }
};
