<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ClubDnaProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubDnaProfileController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ClubDnaProfile::orderBy('name')->get()]);
    }

    public function show(ClubDnaProfile $profile): JsonResponse
    {
        return response()->json(['data' => $profile]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $profile = ClubDnaProfile::create($data);
        return response()->json(['data' => $profile], 201);
    }

    public function update(Request $request, ClubDnaProfile $profile): JsonResponse
    {
        $data = $this->validateData($request);
        $profile->update($data);
        return response()->json(['data' => $profile->fresh()]);
    }

    public function destroy(ClubDnaProfile $profile): JsonResponse
    {
        $profile->delete();
        return response()->json(['ok' => true]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'name'        => ['required', 'string', 'max:160'],
            'position'    => ['required', 'string', 'max:80'],
            'category'    => ['nullable', 'string', 'in:Pro,U23,U19,U18,U16'],
            'description' => ['nullable', 'string'],
            'attributes'  => ['nullable', 'array'],
            'active'      => ['nullable', 'boolean'],
        ]);
    }
}
