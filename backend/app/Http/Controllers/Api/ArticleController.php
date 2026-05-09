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

    public function show(Article $article): JsonResponse
    {
        abort_unless($article->is_published, 404);

        $article->load([
            'player:id,slug,name,photo_url,position,club',
            'images',
            'clips.player:id,slug,name',
        ]);

        return response()->json(['data' => $article]);
    }
}
