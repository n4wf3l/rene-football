<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Article::query()
            ->where('is_published', true)
            ->with(['player:id,slug,name,photo_url'])
            ->orderByDesc('featured')
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }
        if ($playerSlug = $request->query('player')) {
            $query->whereHas('player', fn ($q) => $q->where('slug', $playerSlug));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * Also answers a former slug (title edited since): the article comes back
     * with its current slug, which the SPA puts in the address bar.
     */
    public function show(string $slug): JsonResponse
    {
        $article = Article::where('slug', $slug)->where('is_published', true)->first()
            ?? Article::publishedFormerlyAt($slug);
        abort_unless($article, 404);

        $article->load([
            'player:id,slug,name,photo_url,position,club',
            'images',
            // Public-safe clip columns only (no internal notes / raw annotations).
            'clips' => fn ($q) => $q->select(array_map(
                fn (string $c) => 'player_clips.'.$c,
                PlayerController::PUBLIC_CLIP_FIELDS,
            )),
            'clips.player:id,slug,name',
        ]);

        return response()->json(['data' => $article]);
    }
}
