<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecurringTransaction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RecurringTransactionController extends Controller
{
    /**
     * List all recurring transactions + next month projections.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $items = $user->recurringTransactions()
            ->with(['category', 'wallet'])
            ->orderBy('billing_day')
            ->get();

        // 1. Hitung total komitmen rutin per bulan (Active only)
        $activeItems = $items->where('is_active', true);

        $monthlyExpenseCommitment = (float) $activeItems
            ->where('type', 'expense')
            ->sum('amount');

        $monthlyIncomeCommitment = (float) $activeItems
            ->where('type', 'income')
            ->sum('amount');

        // 2. Proyeksi Bulan Depan
        $nextMonth = now()->addMonth();
        $nextMonthDays = $nextMonth->daysInMonth;

        // Proyeksi sisa dana setelah fixed cost rutin
        $netCommitment = $monthlyIncomeCommitment - $monthlyExpenseCommitment;

        return response()->json([
            'summary' => [
                'total_monthly_expense' => $monthlyExpenseCommitment,
                'total_monthly_income'  => $monthlyIncomeCommitment,
                'net_commitment'        => $netCommitment,
                'active_count'          => $activeItems->count(),
                'total_count'           => $items->count(),
            ],
            'projection' => [
                'next_month_name'       => $nextMonth->translatedFormat('F Y'),
                'projected_fixed_cost'  => $monthlyExpenseCommitment,
                'projected_income'      => $monthlyIncomeCommitment,
            ],
            'recurring_transactions' => $items,
        ]);
    }

    /**
     * Store a new recurring transaction.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'type'        => ['required', 'in:income,expense'],
            'amount'      => ['required', 'numeric', 'min:1'],
            'frequency'   => ['nullable', 'in:daily,weekly,monthly,yearly'],
            'billing_day' => ['required', 'integer', 'min:1', 'max:31'],
            'wallet_id'   => ['nullable', 'exists:wallets,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active'   => ['nullable', 'boolean'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();

        // Verifikasi wallet & category milik user jika diisi
        if (!empty($validated['wallet_id'])) {
            $walletBelongs = $user->wallets()->where('id', $validated['wallet_id'])->exists();
            if (!$walletBelongs) {
                return response()->json(['message' => 'Dompet tidak valid.'], 422);
            }
        }

        if (!empty($validated['category_id'])) {
            $catBelongs = $user->categories()->where('id', $validated['category_id'])->exists();
            if (!$catBelongs) {
                return response()->json(['message' => 'Kategori tidak valid.'], 422);
            }
        }

        $item = $user->recurringTransactions()->create([
            ...$validated,
            'frequency' => $validated['frequency'] ?? 'monthly',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Transaksi rutin berhasil ditambahkan.',
            'recurring_transaction' => $item->load(['category', 'wallet']),
        ], 201);
    }

    /**
     * Update a recurring transaction.
     */
    public function update(Request $request, RecurringTransaction $recurring)
    {
        $this->authorizeItem($request, $recurring);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'type'        => ['required', 'in:income,expense'],
            'amount'      => ['required', 'numeric', 'min:1'],
            'frequency'   => ['nullable', 'in:daily,weekly,monthly,yearly'],
            'billing_day' => ['required', 'integer', 'min:1', 'max:31'],
            'wallet_id'   => ['nullable', 'exists:wallets,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active'   => ['nullable', 'boolean'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ]);

        $recurring->update($validated);

        return response()->json([
            'message' => 'Transaksi rutin berhasil diperbarui.',
            'recurring_transaction' => $recurring->fresh(['category', 'wallet']),
        ]);
    }

    /**
     * Toggle active/pause status.
     */
    public function toggle(Request $request, RecurringTransaction $recurring)
    {
        $this->authorizeItem($request, $recurring);

        $recurring->update([
            'is_active' => !$recurring->is_active,
        ]);

        return response()->json([
            'message' => $recurring->is_active ? 'Transaksi rutin diaktifkan.' : 'Transaksi rutin dijeda.',
            'recurring_transaction' => $recurring->fresh(['category', 'wallet']),
        ]);
    }

    /**
     * Quickly log this recurring item into actual transactions for current month.
     */
    public function logTransaction(Request $request, RecurringTransaction $recurring)
    {
        $this->authorizeItem($request, $recurring);

        $validated = $request->validate([
            'transaction_date' => ['nullable', 'date'],
            'wallet_id'        => ['nullable', 'exists:wallets,id'],
            'amount'           => ['nullable', 'numeric', 'min:1'],
        ]);

        $user = $request->user();
        $date = $validated['transaction_date'] ?? now()->toDateString();
        $walletId = $validated['wallet_id'] ?? $recurring->wallet_id;
        $amount = $validated['amount'] ?? $recurring->amount;

        $tx = $user->transactions()->create([
            'wallet_id'        => $walletId,
            'category_id'      => $recurring->category_id,
            'type'             => $recurring->type,
            'amount'           => $amount,
            'description'      => $recurring->name . ($recurring->notes ? " ({$recurring->notes})" : ''),
            'transaction_date' => $date,
            'source'           => 'web',
        ]);

        return response()->json([
            'message'     => "Berhasil mencatat transaksi kas untuk {$recurring->name}.",
            'transaction' => $tx->load(['category', 'wallet']),
        ], 201);
    }

    /**
     * Delete a recurring transaction.
     */
    public function destroy(Request $request, RecurringTransaction $recurring)
    {
        $this->authorizeItem($request, $recurring);

        $recurring->delete();

        return response()->json([
            'message' => 'Transaksi rutin berhasil dihapus.',
        ]);
    }

    private function authorizeItem(Request $request, RecurringTransaction $recurring): void
    {
        abort_unless(
            $recurring->user_id === $request->user()->id,
            403,
            'Unauthorized.'
        );
    }
}

