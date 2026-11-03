<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustodialSaving;
use App\Models\CustodialSavingsTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CustodialSavingController extends Controller
{
    /**
     * Display a listing of custodial savings with summary.
     * Also computes is_this_month_paid for each saving.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $currentYear  = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        $savings = $user->custodialSavings()
            ->with(['logs' => function ($query) {
                $query->with('wallet')->latest('transaction_date')->latest('id');
            }])
            ->latest('id')
            ->get()
            ->map(function ($saving) use ($currentYear, $currentMonth) {
                // Check if there's a deposit log this month
                $paidThisMonth = $saving->logs->contains(function ($log) use ($currentYear, $currentMonth) {
                    if ($log->type !== 'deposit') return false;
                    $date = Carbon::parse($log->transaction_date);
                    return $date->year === $currentYear && $date->month === $currentMonth;
                });

                $saving->is_this_month_paid = $paidThisMonth;
                return $saving;
            });

        $totalActive = $savings->where('status', 'active')->sum('total_amount');
        $totalWithdrawn = CustodialSavingsTransaction::whereHas('custodialSaving', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->where('type', 'withdraw')->sum('amount');

        $activeCount = $savings->where('status', 'active')->count();

        // Count how many active savings are already paid this month
        $paidThisMonthCount = $savings->where('status', 'active')->where('is_this_month_paid', true)->count();

        return response()->json([
            'savings' => $savings->values(),
            'summary' => [
                'total_active_amount'    => (float) $totalActive,
                'total_withdrawn_amount' => (float) $totalWithdrawn,
                'active_count'           => $activeCount,
                'total_count'            => $savings->count(),
                'paid_this_month_count'  => $paidThisMonthCount,
            ],
        ]);
    }

    /**
     * Store a newly created custodial saving.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:150',
            'holder_name'      => 'required|string|max:150',
            'monthly_amount'   => 'required|numeric|min:1',
            'color'            => 'nullable|string|max:30',
            'icon'             => 'nullable|string|max:50',
            'notes'            => 'nullable|string',
            // Optional initial deposit
            'initial_amount'   => 'nullable|numeric|min:0',
            'wallet_id'        => 'nullable|exists:wallets,id',
            'transaction_date' => 'nullable|date',
        ]);

        $user = $request->user();

        $saving = DB::transaction(function () use ($validated, $user) {
            $initialAmount = (float) ($validated['initial_amount'] ?? 0);

            $saving = $user->custodialSavings()->create([
                'name'           => $validated['name'],
                'holder_name'    => $validated['holder_name'],
                'monthly_amount' => $validated['monthly_amount'],
                'total_amount'   => $initialAmount,
                'color'          => $validated['color'] ?? '#00f5ff',
                'icon'           => $validated['icon'] ?? 'Landmark',
                'status'         => 'active',
                'notes'          => $validated['notes'] ?? null,
            ]);

            // Record initial deposit log if provided
            if ($initialAmount > 0) {
                $transactionId = null;
                $walletId      = $validated['wallet_id'] ?? null;
                $tDate         = $validated['transaction_date'] ?? now()->toDateString();

                if ($walletId) {
                    $category = $user->categories()->firstOrCreate(
                        ['name' => 'Simpanan & Deposito', 'type' => 'expense'],
                        ['icon' => 'Landmark', 'color' => '#00f5ff']
                    );

                    $tx = $user->transactions()->create([
                        'wallet_id'        => $walletId,
                        'category_id'      => $category->id,
                        'type'             => 'expense',
                        'amount'           => $initialAmount,
                        'description'      => "Setor awal simpanan {$saving->name} ({$saving->holder_name})",
                        'transaction_date' => $tDate,
                        'source'           => 'web',
                    ]);
                    $transactionId = $tx->id;
                }

                $saving->logs()->create([
                    'wallet_id'        => $walletId,
                    'transaction_id'   => $transactionId,
                    'type'             => 'deposit',
                    'amount'           => $initialAmount,
                    'transaction_date' => $tDate,
                    'notes'            => 'Setoran awal saat pendaftaran simpanan',
                ]);
            }

            return $saving;
        });

        return response()->json([
            'message' => 'Simpanan berhasil ditambahkan',
            'saving'  => $saving->fresh()->load('logs.wallet'),
        ], 201);
    }

    /**
     * Update an existing custodial saving.
     */
    public function update(Request $request, CustodialSaving $custodialSaving)
    {
        if ($custodialSaving->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name'           => 'sometimes|required|string|max:150',
            'holder_name'    => 'sometimes|required|string|max:150',
            'monthly_amount' => 'sometimes|required|numeric|min:1',
            'color'          => 'nullable|string|max:30',
            'icon'           => 'nullable|string|max:50',
            'notes'          => 'nullable|string',
            'status'         => 'nullable|in:active,withdrawn,closed',
        ]);

        $custodialSaving->update($validated);

        return response()->json([
            'message' => 'Simpanan berhasil diperbarui',
            'saving'  => $custodialSaving->fresh()->load('logs.wallet'),
        ]);
    }

    /**
     * Delete a custodial saving and all its logs.
     */
    public function destroy(Request $request, CustodialSaving $custodialSaving)
    {
        if ($custodialSaving->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $custodialSaving->logs()->delete();
        $custodialSaving->delete();

        return response()->json(['message' => 'Simpanan berhasil dihapus']);
    }

    /**
     * Record a deposit (setor) to a custodial saving.
     */
    public function deposit(Request $request, CustodialSaving $custodialSaving)
    {
        if ($custodialSaving->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount'           => 'required|numeric|min:1',
            'wallet_id'        => 'nullable|exists:wallets,id',
            'transaction_date' => 'required|date',
            'notes'            => 'nullable|string',
        ]);

        $user = $request->user();

        DB::transaction(function () use ($validated, $user, $custodialSaving) {
            $amount        = (float) $validated['amount'];
            $walletId      = $validated['wallet_id'] ?? null;
            $transactionId = null;

            if ($walletId) {
                $category = $user->categories()->firstOrCreate(
                    ['name' => 'Simpanan & Deposito', 'type' => 'expense'],
                    ['icon' => 'Landmark', 'color' => '#00f5ff']
                );

                $tx = $user->transactions()->create([
                    'wallet_id'        => $walletId,
                    'category_id'      => $category->id,
                    'type'             => 'expense',
                    'amount'           => $amount,
                    'description'      => "Setor ke simpanan {$custodialSaving->name} ({$custodialSaving->holder_name})",
                    'transaction_date' => $validated['transaction_date'],
                    'source'           => 'web',
                ]);
                $transactionId = $tx->id;
            }

            $custodialSaving->logs()->create([
                'wallet_id'        => $walletId,
                'transaction_id'   => $transactionId,
                'type'             => 'deposit',
                'amount'           => $amount,
                'transaction_date' => $validated['transaction_date'],
                'notes'            => $validated['notes'] ?? null,
            ]);

            $custodialSaving->increment('total_amount', $amount);

            // Re-activate if it was previously closed/withdrawn
            if ($custodialSaving->status === 'closed' || $custodialSaving->status === 'withdrawn') {
                $custodialSaving->update(['status' => 'active']);
            }
        });

        return response()->json([
            'message' => 'Setoran berhasil dicatat',
            'saving'  => $custodialSaving->fresh()->load('logs.wallet'),
        ]);
    }

    /**
     * Withdraw funds from a custodial saving back to a wallet.
     */
    public function withdraw(Request $request, CustodialSaving $custodialSaving)
    {
        if ($custodialSaving->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount'           => 'required|numeric|min:1|max:' . $custodialSaving->total_amount,
            'wallet_id'        => 'nullable|exists:wallets,id',
            'transaction_date' => 'required|date',
            'notes'            => 'nullable|string',
        ]);

        $user = $request->user();

        DB::transaction(function () use ($validated, $user, $custodialSaving) {
            $amount        = (float) $validated['amount'];
            $walletId      = $validated['wallet_id'] ?? null;
            $transactionId = null;

            if ($walletId) {
                $category = $user->categories()->firstOrCreate(
                    ['name' => 'Pencairan Simpanan', 'type' => 'income'],
                    ['icon' => 'ArrowDownLeft', 'color' => '#39ff14']
                );

                $tx = $user->transactions()->create([
                    'wallet_id'        => $walletId,
                    'category_id'      => $category->id,
                    'type'             => 'income',
                    'amount'           => $amount,
                    'description'      => "Pencairan dari simpanan {$custodialSaving->name} ({$custodialSaving->holder_name})",
                    'transaction_date' => $validated['transaction_date'],
                    'source'           => 'web',
                ]);
                $transactionId = $tx->id;
            }

            $custodialSaving->logs()->create([
                'wallet_id'        => $walletId,
                'transaction_id'   => $transactionId,
                'type'             => 'withdraw',
                'amount'           => $amount,
                'transaction_date' => $validated['transaction_date'],
                'notes'            => $validated['notes'] ?? null,
            ]);

            $newTotal  = max(0, (float) $custodialSaving->total_amount - $amount);
            $newStatus = $newTotal == 0 ? 'withdrawn' : 'active';

            $custodialSaving->update([
                'total_amount' => $newTotal,
                'status'       => $newStatus,
            ]);
        });

        return response()->json([
            'message' => 'Penarikan dana berhasil dicatat',
            'saving'  => $custodialSaving->fresh()->load('logs.wallet'),
        ]);
    }
}
