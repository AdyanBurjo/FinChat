<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = $request->user()
            ->categories()
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:income,expense'],
        ]);

        $exists = $request->user()
            ->categories()
            ->where('name', $validated['name'])
            ->where('type', $validated['type'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Category already exists.',
            ], 422);
        }

        $category = $request->user()
            ->categories()
            ->create($validated);

        return response()->json([
            'message' => 'Category created successfully.',
            'category' => $category,
        ], 201);
    }

    public function destroy(Request $request, $id)
    {
        $category = $request->user()
            ->categories()
            ->findOrFail($id);

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ]);
    }
}