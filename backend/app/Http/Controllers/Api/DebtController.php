<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DebtController extends Controller
{
    /**
     * Display a listing of debts/receivables with summary stats.
     */
    public function index(Request $request)
    {
        $request->validate([
            'type'   => ['nullable', 'in:debt,receivable'],
            'status' => ['nullable', 'in:unpaid,partial,paid'],
        ]);

        $user  = $request->user();
        $query = $user->debts()->with('payments.wallet');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $debts = $query->latest()->get()->map(function ($item) {
            $remaining = max(0, (float) $item->amount - (float) $item->paid_amount);
            $percentage = (float) $item->amount > 0
                ? min(100, round(((float) $item->paid_amount / (float) $item->amount) * 100, 1))
                : 0;

            $item->remaining = $remaining;
            $item->percentage = $percentage;
            return $item;
        });

        // Summary Calculations (All unpaid/partial)
        $totalDebt = $user->debts()
            ->where('type', 'debt')
            ->whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('SUM(amount - paid_amount) as remaining')
            ->value('remaining') ?? 0;

        $totalReceivable = $user->debts()
            ->where('type', 'receivable')
            ->whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('SUM(amount - paid_amount) as remaining')
            ->value('remaining') ?? 0;

        // Count overdue or approaching due date
        $now = now()->toDateString();
        $upcomingLimit = now()->addDays(7)->toDateString();

        $overdueCount = $user->debts()
            ->whereIn('status', ['unpaid', 'partial'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now)
            ->count();

        $upcomingCount = $user->debts()
            ->whereIn('status', ['unpaid', 'partial'])
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$now, $upcomingLimit])
            ->count();

        return response()->json([
            'summary' => [
                'total_debt'       => (float) $totalDebt,
                'total_receivable' => (float) $totalReceivable,
                'overdue_count'    => $overdueCount,
                'upcoming_count'   => $upcomingCount,
            ],
            'debts' => $debts,
        ]);
    }

    /**
     * Store a newly created debt / receivable.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'        => ['required', 'in:debt,receivable'],
            'person_name' => ['required', 'string', 'max:100'],
            'amount'      => ['required', 'numeric', 'min:1'],
            'due_date'    => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $debt = $request->user()->debts()->create([
            ...$validated,
            'paid_amount' => 0,
            'status'      => 'unpaid',
        ]);

        return response()->json([
            'message' => 'Catatan berhasil dibuat.',
            'debt'    => $debt->load('payments.wallet'),
        ], 201);
    }

    /**
     * Show detail of a debt record.
     */
    public function show(Request $request, Debt $debt)
    {
        $this->authorizeDebt($request, $debt);

        $debt->load('payments.wallet');
        $debt->remaining = max(0, (float) $debt->amount - (float) $debt->paid_amount);
        $debt->percentage = (float) $debt->amount > 0
            ? min(100, round(((float) $debt->paid_amount / (float) $debt->amount) * 100, 1))
            : 0;

        return response()->json(['debt' => $debt]);
    }

    /**
     * Update a debt record.
     */
    public function update(Request $request, Debt $debt)
    {
        $this->authorizeDebt($request, $debt);

        $validated = $request->validate([
            'type'        => ['required', 'in:debt,receivable'],
            'person_name' => ['required', 'string', 'max:100'],
            'amount'      => ['required', 'numeric', 'min:1'],
            'due_date'    => ['nullable', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $debt->update($validated);

        // Re-evaluate status against total paid
        $totalPaid = (float) $debt->payments()->sum('amount');
        $newStatus = 'unpaid';
        if ($totalPaid >= (float) $debt->amount) {
            $newStatus = 'paid';
        } elseif ($totalPaid > 0) {
            $newStatus = 'partial';
        }

        $debt->update([
            'paid_amount' => $totalPaid,
            'status'      => $newStatus,
        ]);

        return response()->json([
            'message' => 'Data berhasil diperbarui.',
            'debt'    => $debt->load('payments.wallet'),
        ]);
    }

    /**
     * Pay / add an installment to a debt.
     */
    public function addPayment(Request $request, Debt $debt)
    {
        $this->authorizeDebt($request, $debt);

        $remaining = max(0, (float) $debt->amount - (float) $debt->paid_amount);

        $validated = $request->validate([
            'amount'       => ['required', 'numeric', 'min:1', "max:{$remaining}"],
            'payment_date' => ['required', 'date'],
            'wallet_id'    => ['nullable', 'exists:wallets,id'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();

        // Validasi wallet kepemilikan user jika diisi
        if (!empty($validated['wallet_id'])) {
            $walletExists = $user->wallets()->where('id', $validated['wallet_id'])->exists();
            if (!$walletExists) {
                return response()->json(['message' => 'Dompet yang dipilih tidak valid.'], 422);
            }
        }

        DB::transaction(function () use ($user, $debt, $validated) {
            $transactionId = null;

            // Jika wallet_id dipilih, catat transaksi kas otomatis
            if (!empty($validated['wallet_id'])) {
                $categoryName = $debt->type === 'debt' ? 'Bayar Hutang' : 'Terima Piutang';
                $txType = $debt->type === 'debt' ? 'expense' : 'income';

                // Auto-create category jika belum ada
                $category = $user->categories()->firstOrCreate(
                    ['name' => $categoryName, 'type' => $txType],
                    ['name' => $categoryName, 'type' => $txType]
                );

                $desc = ($debt->type === 'debt' ? 'Pembayaran hutang ke ' : 'Penerimaan piutang dari ') . $debt->person_name;
                if (!empty($validated['notes'])) {
                    $desc .= ' (' . $validated['notes'] . ')';
                }

                $tx = $user->transactions()->create([
                    'wallet_id'        => $validated['wallet_id'],
                    'category_id'      => $category->id,
                    'type'             => $txType,
                    'amount'           => $validated['amount'],
                    'description'      => $desc,
                    'transaction_date' => $validated['payment_date'],
                    'source'           => 'web',
                ]);

                $transactionId = $tx->id;
            }

            $debt->payments()->create([
                'amount'         => $validated['amount'],
                'payment_date'   => $validated['payment_date'],
                'wallet_id'      => $validated['wallet_id'] ?? null,
                'transaction_id' => $transactionId,
                'notes'          => $validated['notes'] ?? null,
            ]);

            $newPaidAmount = (float) $debt->payments()->sum('amount');
            $newStatus = 'unpaid';

            if ($newPaidAmount >= (float) $debt->amount) {
                $newStatus = 'paid';
            } elseif ($newPaidAmount > 0) {
                $newStatus = 'partial';
            }

            $debt->update([
                'paid_amount' => $newPaidAmount,
                'status'      => $newStatus,
            ]);
        });

        return response()->json([
            'message' => 'Pembayaran/cicilan berhasil dicatat.',
            'debt'    => $debt->fresh('payments.wallet'),
        ]);
    }

    /**
     * Delete a debt payment.
     */
    public function deletePayment(Request $request, Debt $debt, $paymentId)
    {
        $this->authorizeDebt($request, $debt);

        $payment = $debt->payments()->findOrFail($paymentId);

        DB::transaction(function () use ($debt, $payment) {
            // Hapus transaksi kas terkait jika ada
            if ($payment->transaction_id) {
                \App\Models\Transaction::where('id', $payment->transaction_id)->delete();
            }

            $payment->delete();

            $newPaidAmount = (float) $debt->payments()->sum('amount');
            $newStatus = 'unpaid';

            if ($newPaidAmount >= (float) $debt->amount) {
                $newStatus = 'paid';
            } elseif ($newPaidAmount > 0) {
                $newStatus = 'partial';
            }

            $debt->update([
                'paid_amount' => $newPaidAmount,
                'status'      => $newStatus,
            ]);
        });

        return response()->json([
            'message' => 'Riwayat pembayaran berhasil dihapus.',
            'debt'    => $debt->fresh('payments.wallet'),
        ]);
    }

    /**
     * Delete a debt record.
     */
    public function destroy(Request $request, Debt $debt)
    {
        $this->authorizeDebt($request, $debt);

        DB::transaction(function () use ($debt) {
            // Hapus semua transaksi kas yang terhubung ke cicilan hutang ini jika kolom transaction_id sudah ada di DB
            if (Schema::hasColumn('debt_payments', 'transaction_id')) {
                $txIds = $debt->payments()->whereNotNull('transaction_id')->pluck('transaction_id');
                if ($txIds->isNotEmpty()) {
                    \App\Models\Transaction::whereIn('id', $txIds)->delete();
                }
            }

            $debt->delete();
        });

        return response()->json([
            'message' => 'Catatan hutang-piutang berhasil dihapus.',
        ]);
    }

    private function authorizeDebt(Request $request, Debt $debt): void
    {
        abort_unless(
            $debt->user_id === $request->user()->id,
            403,
            'Unauthorized.'
        );
    }
}

