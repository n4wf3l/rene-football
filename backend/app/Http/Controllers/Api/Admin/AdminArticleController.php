<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleImage;
use App\Models\PlayerClip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin CRUD on news articles. Supports:
 *   - Cover image upload (single file)
 *   - Optional Loop on a specific player (player_id FK)
 *   - Gallery uploads (multiple files, kept ordered)
 *   - Attaching pre-existing PlayerClip annotations (no re-upload)
 *
 * Multipart-friendly: all writes go through POST (the frontend uses
 * _method=PUT spoofing for updates).
 */
class AdminArticleController extends Controller
{
    public function index(): JsonResponse
    {
        $articles = Article::query()
            ->with(['player:id,slug,name,photo_url', 'images', 'clips'])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        return response()->json(['data' => $articles]);
    }

    public function show(Article $article): JsonResponse
    {
        $article->load(['player:id,slug,name,photo_url', 'images', 'clips.player:id,slug,name']);
        return response()->json(['data' => $article]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);

        $data['slug'] = $this->ensureUniqueSlug($data['title']);
        if ($request->hasFile('cover')) {
            $data['cover_url'] = $this->storeCover($request, $data['slug']);
        }
        // Default published_at to now if publishing without an explicit date.
        if (! empty($data['is_published']) && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $clipIds = $this->extractClipIds($request);
        $galleryFiles = $this->extractGalleryFiles($request);
        $galleryCaptions = $this->extractGalleryCaptions($request);

        unset($data['cover'], $data['cover_remove'], $data['clip_ids'], $data['gallery_images'], $data['gallery_captions']);

        $article = Article::create($data);

        $this->syncClips($article, $clipIds);
        $this->addGalleryImages($article, $galleryFiles, $galleryCaptions);

        $article->load(['player:id,slug,name,photo_url', 'images', 'clips']);
        return response()->json(['data' => $article], 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $this->validateData($request, $article);

        if (isset($data['title']) && $data['title'] !== $article->title) {
            $data['slug'] = $this->ensureUniqueSlug($data['title'], $article->id);
        }

        if ($request->hasFile('cover')) {
            $this->deleteLocal($article->cover_url);
            $data['cover_url'] = $this->storeCover($request, $data['slug'] ?? $article->slug);
        } elseif ($request->boolean('cover_remove')) {
            $this->deleteLocal($article->cover_url);
            $data['cover_url'] = null;
        }

        // Auto-stamp published_at on first publish.
        if (
            array_key_exists('is_published', $data) && $data['is_published']
            && empty($data['published_at']) && empty($article->published_at)
        ) {
            $data['published_at'] = now();
        }

        $clipIds = $this->extractClipIds($request);
        $galleryFiles = $this->extractGalleryFiles($request);
        $galleryCaptions = $this->extractGalleryCaptions($request);
        $imageRemoveIds = $this->extractImageRemoveIds($request);

        unset($data['cover'], $data['cover_remove'], $data['clip_ids'], $data['gallery_images'], $data['gallery_captions'], $data['image_remove_ids']);

        $article->update($data);

        if ($request->has('clip_ids')) {
            $this->syncClips($article, $clipIds);
        }

        if (! empty($imageRemoveIds)) {
            $this->removeGalleryImages($article, $imageRemoveIds);
        }
        $this->addGalleryImages($article, $galleryFiles, $galleryCaptions);

        $article->load(['player:id,slug,name,photo_url', 'images', 'clips']);
        return response()->json(['data' => $article->fresh(['player', 'images', 'clips'])]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $this->deleteLocal($article->cover_url);
        foreach ($article->images as $img) {
            $this->deleteLocal($img->image_path);
        }
        // Pivot rows are removed by cascadeOnDelete; clip files are NOT touched
        // because clips live independently (they're owned by their player).
        $article->delete();

        return response()->json(['ok' => true]);
    }

    // -------------------- helpers --------------------

    private function validateData(Request $request, ?Article $article = null): array
    {
        // Booleans coming from FormData arrive as "0"/"1" strings.
        foreach (['is_published', 'featured', 'cover_remove'] as $boolField) {
            if ($request->has($boolField)) {
                $request->merge([
                    $boolField => filter_var($request->input($boolField), FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }

        // Multipart can't carry nested arrays as JSON cleanly; the frontend
        // serializes clip_ids / image_remove_ids / gallery_captions as JSON
        // strings. Decode them back so validators see real arrays.
        foreach (['clip_ids', 'image_remove_ids', 'gallery_captions'] as $jsonField) {
            $val = $request->input($jsonField);
            if (is_string($val) && $val !== '') {
                $decoded = json_decode($val, true);
                if (is_array($decoded)) {
                    $request->merge([$jsonField => $decoded]);
                }
            }
        }

        return $request->validate([
            'title'        => ['required', 'string', 'max:200'],
            'excerpt'      => ['nullable', 'string', 'max:500'],
            'content'      => ['nullable', 'string'],
            'category'     => ['required', 'string', 'max:60'],
            'cover'        => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:6144'],
            'cover_url'    => ['nullable', 'string', 'max:500'],
            'cover_remove' => ['nullable', 'boolean'],
            'featured'     => ['nullable', 'boolean'],
            'player_id'    => ['nullable', 'integer', 'exists:players,id'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],

            'clip_ids'      => ['nullable', 'array', 'max:30'],
            'clip_ids.*'    => ['integer', 'exists:player_clips,id'],

            'image_remove_ids'   => ['nullable', 'array', 'max:50'],
            'image_remove_ids.*' => ['integer'],

            'gallery_images'    => ['nullable', 'array', 'max:20'],
            'gallery_images.*'  => ['image', 'mimes:jpeg,jpg,png,webp', 'max:6144'],

            'gallery_captions'   => ['nullable', 'array', 'max:20'],
            'gallery_captions.*' => ['nullable', 'string', 'max:200'],
        ]);
    }

    private function extractClipIds(Request $request): array
    {
        $val = $request->input('clip_ids');
        if (! is_array($val)) return [];
        return array_values(array_unique(array_map('intval', $val)));
    }

    private function extractImageRemoveIds(Request $request): array
    {
        $val = $request->input('image_remove_ids');
        if (! is_array($val)) return [];
        return array_values(array_unique(array_map('intval', $val)));
    }

    /** @return \Illuminate\Http\UploadedFile[] */
    private function extractGalleryFiles(Request $request): array
    {
        $files = $request->file('gallery_images');
        if (! $files) return [];
        return is_array($files) ? array_values($files) : [$files];
    }

    private function extractGalleryCaptions(Request $request): array
    {
        $val = $request->input('gallery_captions');
        return is_array($val) ? array_values($val) : [];
    }

    private function syncClips(Article $article, array $clipIds): void
    {
        if (empty($clipIds)) {
            $article->clips()->detach();
            return;
        }
        $payload = [];
        foreach (array_values($clipIds) as $i => $id) {
            $payload[$id] = ['sort_order' => $i];
        }
        $article->clips()->sync($payload);
    }

    /**
     * @param \Illuminate\Http\UploadedFile[] $files
     */
    private function addGalleryImages(Article $article, array $files, array $captions): void
    {
        if (empty($files)) return;

        $startOrder = (int) ($article->images()->max('sort_order') ?? -1) + 1;

        foreach ($files as $i => $file) {
            $url = $this->storeGalleryFile($file, $article->slug);
            ArticleImage::create([
                'article_id' => $article->id,
                'image_path' => $url,
                'caption'    => $captions[$i] ?? null,
                'sort_order' => $startOrder + $i,
            ]);
        }
    }

    private function removeGalleryImages(Article $article, array $imageIds): void
    {
        $images = $article->images()->whereIn('id', $imageIds)->get();
        foreach ($images as $img) {
            $this->deleteLocal($img->image_path);
            $img->delete();
        }
    }

    private function storeCover(Request $request, string $slugForName): string
    {
        $file = $request->file('cover');
        $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $name = $slugForName.'-cover-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('articles', $name, 'public');
        return Storage::url($path);
    }

    private function storeGalleryFile($file, string $slugForName): string
    {
        $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $name = $slugForName.'-img-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('articles', $name, 'public');
        return Storage::url($path);
    }

    private function deleteLocal(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }

    private function ensureUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        if ($base === '') {
            $base = 'article';
        }
        $slug = $base;
        $i = 2;
        while (Article::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
