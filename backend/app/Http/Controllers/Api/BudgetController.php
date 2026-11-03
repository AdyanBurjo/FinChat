<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\Request;
use Carbon\Carbon;

class BudgetController extends Controller
{
    /**
     * Display a listing of budgets with calculated spending and status for a month/year.
     */
    public function index(Request $request)
    {
        $request->validate([
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'year'  => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $user  = $request->user();
        $year  = (int) ($request->query('year', now()->year));
        $month = (int) ($request->query('month', now()->month));

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth();

        // Ambil semua kategori pengeluaran milik user
        $expenseCategories = $user->categories()
            ->where('type', 'expense')
            ->orderBy('name')
            ->get();

        // Ambil budget yang sudah di-set untuk bulan & tahun ini
        $existingBudgets = $user->budgets()
            ->where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('category_id');

        // Hitung pengeluaran per kategori untuk rentang bulan ini
        $spendingByCategory = $user->transactions()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->whereNotNull('category_id')
            ->selectRaw('category_id, SUM(amount) as total_spent')
            ->groupBy('category_id')
            ->pluck('total_spent', 'category_id');

        $budgets = [];
        $totalBudget = 0;
        $totalSpentWithBudget = 0;
        $alertsCount = 0;

        foreach ($expenseCategories as $category) {
            $budgetModel = $existingBudgets->get($category->id);
            $limit = $budgetModel ? (float) $budgetModel->amount : 0;
            $spent = (float) ($spendingByCategory->get($category->id, 0));

            $hasBudget = $budgetModel !== null && $limit > 0;
            $percentage = $hasBudget ? round(($spent / $limit) * 100, 1) : 0;
            $remaining  = $hasBudget ? max(0, $limit - $spent) : 0;

            // Status: safe (< 80%), warning (80-99%), exceeded (>= 100%)
            $status = 'safe';
            if ($hasBudget) {
                if ($percentage >= 100) {
                    $status = 'exceeded';
                    $alertsCount++;
                } elseif ($percentage >= 80) {
                    $status = 'warning';
                    $alertsCount++;
                }
                $totalBudget += $limit;
                $totalSpentWithBudget += $spent;
            }

            $budgets[] = [
                'id'          => $budgetModel?->id,
                'category_id' => $category->id,
                'category'    => $category,
                'limit'       => $limit,
                'spent'       => $spent,
                'remaining'   => $remaining,
                'percentage'  => $percentage,
                'status'      => $status,
                'has_budget'  => $hasBudget,
            ];
        }

        return response()->json([
            'meta' => [
                'month' => $month,
                'year'  => $year,
            ],
            'summary' => [
                'total_budget' => (float) $totalBudget,
                'total_spent'  => (float) $totalSpentWithBudget,
                'remaining'    => (float) max(0, $totalBudget - $totalSpentWithBudget),
                'overall_percentage' => $totalBudget > 0 ? round(($totalSpentWithBudget / $totalBudget) * 100, 1) : 0,
                'alerts_count' => $alertsCount,
            ],
            'budgets' => $budgets,
        ]);
    }

    /**
     * Store or update a budget for a category in a specific month/year.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'month'       => ['required', 'integer', 'min:1', 'max:12'],
            'year'        => ['required', 'integer', 'min:2000', 'max:2100'],
            'amount'      => ['required', 'numeric', 'min:0'],
        ]);

        $user = $request->user();

        // Pastikan category milik user dan bertipe expense
        $category = $user->categories()
            ->where('id', $validated['category_id'])
            ->where('type', 'expense')
            ->first();

        if (!$category) {
            return response()->json([
                'message' => 'Kategori pengeluaran tidak valid atau bukan milik Anda.',
            ], 422);
        }

        // Update or create budget
        $budget = $user->budgets()->updateOrCreate(
            [
                'category_id' => $validated['category_id'],
                'month'       => $validated['month'],
                'year'        => $validated['year'],
            ],
            [
                'amount'      => $validated['amount'],
            ]
        );

        return response()->json([
            'message' => 'Anggaran berhasil disimpan.',
            'budget'  => $budget->load('category'),
        ], 200);
    }

    /**
     * Copy budgets from the previous month to the current month.
     */
    public function copyFromPreviousMonth(Request $request)
    {
        $validated = $request->validate([
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year'  => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $user = $request->user();
        $targetDate = Carbon::createFromDate($validated['year'], $validated['month'], 1);
        $prevDate   = $targetDate->copy()->subMonth();

        $prevBudgets = $user->budgets()
            ->where('month', $prevDate->month)
            ->where('year', $prevDate->year)
            ->get();

        if ($prevBudgets->isEmpty()) {
            return response()->json([
                'message' => 'Tidak ada data anggaran pada bulan sebelumnya untuk disalin.',
            ], 422);
        }

        $copiedCount = 0;
        foreach ($prevBudgets as $prev) {
            $user->budgets()->updateOrCreate(
                [
                    'category_id' => $prev->category_id,
                    'month'       => $validated['month'],
                    'year'        => $validated['year'],
                ],
                [
                    'amount'      => $prev->amount,
                ]
            );
            $copiedCount++;
        }

        return response()->json([
            'message' => "Berhasil menyalin {$copiedCount} anggaran dari bulan sebelumnya.",
        ]);
    }

    /**
     * Delete a budget setting for a category.
     */
    public function destroy(Request $request, $id)
    {
        $budget = $request->user()->budgets()->findOrFail($id);
        $budget->delete();

        return response()->json([
            'message' => 'Anggaran berhasil dihapus.',
        ]);
    }

    /**
     * Quick alerts for active over/warning budgets in the current month.
     */
    public function alerts(Request $request)
    {
        $year  = (int) ($request->query('year', now()->year));
        $month = (int) ($request->query('month', now()->month));

        // Use same calculation
        $request->merge(['year' => $year, 'month' => $month]);
        $response = $this->index($request);
        $data = $response->getData(true);

        $alerts = array_filter($data['budgets'], function ($b) {
            return in_array($b['status'], ['warning', 'exceeded']);
        });

        return response()->json([
            'alerts' => array_values($alerts),
            'count'  => count($alerts),
        ]);
    }
}

