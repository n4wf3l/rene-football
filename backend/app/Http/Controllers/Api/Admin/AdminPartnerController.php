<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin CRUD for the "Partenaires" strip on the public site. Mirrors
 * AdminStaffController — logo arrives as multipart, stored on the public
 * disk under storage/app/public/partners.
 */
class AdminPartnerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Partner::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function show(Partner $partner): JsonResponse
    {
        return response()->json(['data' => $partner]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->ensureUniqueSlug($data['name']);

        if (! array_key_exists('sort_order', $data) || $data['sort_order'] === null) {
            $data['sort_order'] = (int) (Partner::max('sort_order') ?? -1) + 1;
        }

        if ($request->hasFile('logo')) {
            $data['logo_url'] = $this->storeLogo($request, $data['slug']);
        }
        unset($data['logo'], $data['logo_remove']);

        $partner = Partner::create($data);

        return response()->json(['data' => $partner], 201);
    }

    public function update(Request $request, Partner $partner): JsonResponse
    {
        $data = $this->validateData($request, $partner);

        if (isset($data['name']) && $data['name'] !== $partner->name) {
            $data['slug'] = $this->ensureUniqueSlug($data['name'], $partner->id);
        }

        if ($request->hasFile('logo')) {
            $this->deleteLocalLogo($partner->logo_url);
            $data['logo_url'] = $this->storeLogo($request, $data['slug'] ?? $partner->slug);
        } elseif ($request->boolean('logo_remove')) {
            $this->deleteLocalLogo($partner->logo_url);
            $data['logo_url'] = null;
        }
        unset($data['logo'], $data['logo_remove']);

        if (isset($data['country_code']) && is_string($data['country_code'])) {
            $data['country_code'] = strtolower(trim($data['country_code']));
            if ($data['country_code'] === '') $data['country_code'] = null;
        }

        $partner->update($data);

        return response()->json(['data' => $partner->fresh()]);
    }

    public function destroy(Partner $partner): JsonResponse
    {
        $this->deleteLocalLogo($partner->logo_url);
        $partner->delete();

        return response()->json(['ok' => true]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'items'              => ['required', 'array'],
            'items.*.id'         => ['required', 'integer', 'exists:partners,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);

        foreach ($payload['items'] as $row) {
            Partner::where('id', $row['id'])->update(['sort_order' => $row['sort_order']]);
        }

        return response()->json(['ok' => true]);
    }

    // -------------------- helpers --------------------

    private function validateData(Request $request, ?Partner $partner = null): array
    {
        foreach (['is_published', 'logo_remove'] as $boolField) {
            if ($request->has($boolField)) {
                $request->merge([
                    $boolField => filter_var($request->input($boolField), FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }

        $req = $partner ? 'sometimes' : 'required';

        return $request->validate([
            'name'          => [$req, 'string', 'max:160'],
            'role'          => ['nullable', 'string', 'max:200'],
            'logo_url'      => ['nullable', 'string', 'max:500'],
            'logo'          => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,svg', 'max:4096'],
            'logo_remove'   => ['nullable', 'boolean'],
            'website_url'   => ['nullable', 'string', 'max:500', 'url:http,https'],
            'country_code'  => ['nullable', 'string', 'max:4'],
            'country_label' => ['nullable', 'string', 'max:80'],
            'sort_order'    => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published'  => ['nullable', 'boolean'],
        ]);
    }

    private function storeLogo(Request $request, string $slugForName): string
    {
        $file = $request->file('logo');
        $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'png';
        $name = $slugForName.'-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('partners', $name, 'public');
        return Storage::url($path);
    }

    private function deleteLocalLogo(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }

    private function ensureUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') $base = 'partenaire';
        $slug = $base;
        $i = 2;
        while (Partner::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
