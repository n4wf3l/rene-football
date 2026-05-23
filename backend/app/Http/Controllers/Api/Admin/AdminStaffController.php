<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Admin CRUD for the "À propos / L'équipe" roster. Mirrors the article and
 * player controllers: photo arrives as multipart with `_method=PUT` spoofing,
 * is stored on the public disk, and the persisted URL is the /storage/... one.
 */
class AdminStaffController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => StaffMember::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function show(StaffMember $staff): JsonResponse
    {
        return response()->json(['data' => $staff]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $data['slug'] = $this->ensureUniqueSlug($data['name']);

        if (! array_key_exists('sort_order', $data) || $data['sort_order'] === null) {
            $data['sort_order'] = (int) (StaffMember::max('sort_order') ?? -1) + 1;
        }

        if ($request->hasFile('photo')) {
            $data['photo_url'] = $this->storePhoto($request, $data['slug']);
        }
        unset($data['photo'], $data['photo_remove']);

        $member = StaffMember::create($data);

        return response()->json(['data' => $member], 201);
    }

    public function update(Request $request, StaffMember $staff): JsonResponse
    {
        $data = $this->validateData($request, $staff);

        if (isset($data['name']) && $data['name'] !== $staff->name) {
            $data['slug'] = $this->ensureUniqueSlug($data['name'], $staff->id);
        }

        if ($request->hasFile('photo')) {
            $this->deleteLocalPhoto($staff->photo_url);
            $data['photo_url'] = $this->storePhoto($request, $data['slug'] ?? $staff->slug);
        } elseif ($request->boolean('photo_remove')) {
            $this->deleteLocalPhoto($staff->photo_url);
            $data['photo_url'] = null;
        }
        unset($data['photo'], $data['photo_remove']);

        $staff->update($data);

        return response()->json(['data' => $staff->fresh()]);
    }

    public function destroy(StaffMember $staff): JsonResponse
    {
        $this->deleteLocalPhoto($staff->photo_url);
        $staff->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Reorder helper: accepts a JSON array of {id, sort_order} pairs and
     * persists them in one go. Lets the admin drag/drop the staff list
     * without saving each row individually.
     */
    public function reorder(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'items'              => ['required', 'array'],
            'items.*.id'         => ['required', 'integer', 'exists:staff_members,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);

        foreach ($payload['items'] as $row) {
            StaffMember::where('id', $row['id'])->update(['sort_order' => $row['sort_order']]);
        }

        return response()->json(['ok' => true]);
    }

    // -------------------- helpers --------------------

    private function validateData(Request $request, ?StaffMember $staff = null): array
    {
        foreach (['is_published', 'photo_remove'] as $boolField) {
            if ($request->has($boolField)) {
                $request->merge([
                    $boolField => filter_var($request->input($boolField), FILTER_VALIDATE_BOOLEAN),
                ]);
            }
        }

        return $request->validate([
            'name'         => ['required', 'string', 'max:160'],
            'role'         => ['required', 'string', 'max:200'],
            'bio'          => ['nullable', 'string', 'max:2000'],
            'photo_url'    => ['nullable', 'string', 'max:500'],
            'photo'        => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
            'photo_remove' => ['nullable', 'boolean'],
            'sort_order'   => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published' => ['nullable', 'boolean'],
        ]);
    }

    private function storePhoto(Request $request, string $slugForName): string
    {
        $file = $request->file('photo');
        $ext = $file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'jpg';
        $name = $slugForName.'-'.substr(bin2hex(random_bytes(4)), 0, 8).'.'.$ext;
        $path = $file->storeAs('staff', $name, 'public');
        return Storage::url($path);
    }

    private function deleteLocalPhoto(?string $url): void
    {
        if (! $url) return;
        if (! Str::startsWith($url, '/storage/')) return;
        $relative = Str::after($url, '/storage/');
        Storage::disk('public')->delete($relative);
    }

    private function ensureUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') $base = 'membre';
        $slug = $base;
        $i = 2;
        while (StaffMember::where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
