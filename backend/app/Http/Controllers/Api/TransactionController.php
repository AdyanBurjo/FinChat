<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'category_id' => ['nullable', 'exists:categories,id'],
            'wallet_id'   => ['nullable', 'integer'],
            'month'       => ['nullable', 'integer', 'min:1', 'max:12'],
            'year'        => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $query = $request->user()->transactions()->with('category', 'wallet');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('wallet_id')) {
            $query->where('wallet_id', $request->wallet_id);
        }

        if ($request->filled('month') && $request->filled('year')) {
            $startOfMonth = \Carbon\Carbon::createFromDate($request->year, $request->month, 1)->startOfMonth();
            $endOfMonth   = $startOfMonth->copy()->endOfMonth();
            $query->whereBetween('transaction_date', [$startOfMonth, $endOfMonth]);
        }

        $transactions = $query
            ->latest('transaction_date')
            ->latest()
            ->paginate(15);

        return response()->json($transactions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id'      => ['nullable', 'exists:categories,id'],
            'wallet_id'        => ['nullable', 'integer'],
            'type'             => ['required', 'in:income,expense'],
            'amount'           => ['required', 'numeric', 'min:1'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'transaction_date' => ['required', 'date'],
        ]);

        if (!empty($validated['category_id'])) {
            $categoryBelongsToUser = $request->user()
                ->categories()
                ->where('id', $validated['category_id'])
                ->exists();

            if (!$categoryBelongsToUser) {
                return response()->json([
                    'message' => 'Invalid category.',
                ], 422);
            }
        }

        if (!empty($validated['wallet_id'])) {
            $walletBelongsToUser = $request->user()
                ->wallets()
                ->where('id', $validated['wallet_id'])
                ->exists();

            if (!$walletBelongsToUser) {
                return response()->json([
                    'message' => 'Invalid wallet.',
                ], 422);
            }
        }

        $transaction = $request->user()
            ->transactions()
            ->create([
                ...$validated,
                'source' => 'web',
            ]);

        $transaction->load('category', 'wallet');

        return response()->json([
            'message'     => 'Transaction created successfully.',
            'transaction' => $transaction,
        ], 201);
    }

    public function show(Request $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);

        $transaction->load('category');

        return response()->json([
            'transaction' => $transaction,
        ]);
    }

    public function update(Request $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);

        $validated = $request->validate([
            'category_id'      => ['nullable', 'exists:categories,id'],
            'wallet_id'        => ['nullable', 'integer'],
            'type'             => ['required', 'in:income,expense'],
            'amount'           => ['required', 'numeric', 'min:1'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'transaction_date' => ['required', 'date'],
        ]);

        if (!empty($validated['category_id'])) {
            $categoryBelongsToUser = $request->user()
                ->categories()
                ->where('id', $validated['category_id'])
                ->exists();

            if (!$categoryBelongsToUser) {
                return response()->json([
                    'message' => 'Invalid category.',
                ], 422);
            }
        }

        if (!empty($validated['wallet_id'])) {
            $walletBelongsToUser = $request->user()
                ->wallets()
                ->where('id', $validated['wallet_id'])
                ->exists();

            if (!$walletBelongsToUser) {
                return response()->json([
                    'message' => 'Invalid wallet.',
                ], 422);
            }
        }

        $transaction->update($validated);
        $transaction->load('category', 'wallet');

        return response()->json([
            'message'     => 'Transaction updated successfully.',
            'transaction' => $transaction,
        ]);
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);

        // If this transaction is part of a transfer, delete the paired transaction too
        if ($transaction->transfer_id) {
            Transaction::where('transfer_id', $transaction->transfer_id)
                ->where('id', '!=', $transaction->id)
                ->delete();
        }

        $transaction->delete();

        return response()->json([
            'message' => 'Transaction deleted successfully.',
        ]);
    }

    private function authorizeTransaction(
        Request $request,
        Transaction $transaction
    ): void {
        abort_unless(
            $transaction->user_id === $request->user()->id,
            403,
            'Unauthorized.'
        );
    }
}