<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SavingsGoal;
use App\Models\SavingsGoalDeposit;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SavingsGoalController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $goals = SavingsGoal::where('user_id', $user->id)
            ->with(['wallet', 'deposits.wallet'])
            ->orderBy('status', 'asc') // active first, achieved later
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($goal) {
                return $this->formatGoal($goal);
            });

        $totalTarget = $goals->where('status', '!=', 'cancelled')->sum('target_amount');
        $totalCollected = $goals->where('status', '!=', 'cancelled')->sum('current_amount');
        $activeGoalsCount = $goals->where('status', 'active')->count();
        $achievedGoalsCount = $goals->where('status', 'achieved')->count();

        return response()->json([
            'goals' => $goals,
            'summary' => [
                'total_target' => (float) $totalTarget,
                'total_collected' => (float) $totalCollected,
                'active_goals' => $activeGoalsCount,
                'achieved_goals' => $achievedGoalsCount,
                'overall_percentage' => $totalTarget > 0 ? round(($totalCollected / $totalTarget) * 100, 1) : 0,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'target_amount' => 'required|numeric|min:1',
            'current_amount' => 'nullable|numeric|min:0',
            'target_date' => 'nullable|date',
            'wallet_id' => 'nullable|exists:wallets,id',
            'color' => 'nullable|string|max:30',
            'icon' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['current_amount'] = $validated['current_amount'] ?? 0;
        $validated['status'] = $validated['current_amount'] >= $validated['target_amount'] ? 'achieved' : 'active';
        $validated['color'] = $validated['color'] ?? '#10b981';
        $validated['icon'] = $validated['icon'] ?? 'PiggyBank';

        $goal = SavingsGoal::create($validated);

        return response()->json([
            'message' => 'Target tabungan berhasil dibuat.',
            'goal' => $this->formatGoal($goal->load(['wallet', 'deposits']))
        ], 201);
    }

    public function show(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $savingsGoal->load(['wallet', 'deposits.wallet']);
        return response()->json($this->formatGoal($savingsGoal));
    }

    public function update(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'target_amount' => 'sometimes|required|numeric|min:1',
            'target_date' => 'nullable|date',
            'wallet_id' => 'nullable|exists:wallets,id',
            'color' => 'nullable|string|max:30',
            'icon' => 'nullable|string|max:50',
            'status' => 'sometimes|in:active,achieved,paused',
            'notes' => 'nullable|string|max:500',
        ]);

        $savingsGoal->update($validated);

        // Recalculate status if target changed
        if (isset($validated['target_amount'])) {
            if ($savingsGoal->current_amount >= $savingsGoal->target_amount) {
                $savingsGoal->status = 'achieved';
            } else if ($savingsGoal->status === 'achieved') {
                $savingsGoal->status = 'active';
            }
            $savingsGoal->save();
        }

        return response()->json([
            'message' => 'Target tabungan berhasil diupdate.',
            'goal' => $this->formatGoal($savingsGoal->fresh(['wallet', 'deposits.wallet']))
        ]);
    }

    public function deposit(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'deposit_date' => 'required|date',
            'wallet_id' => 'nullable|exists:wallets,id',
            'notes' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($validated, $savingsGoal, $request) {
            $transactionId = null;

            // If a wallet is provided, create a corresponding expense transaction
            if (!empty($validated['wallet_id'])) {
                // Find or create 'Tabungan' expense category
                $category = Category::firstOrCreate([
                    'user_id' => $request->user()->id,
                    'name' => 'Tabungan',
                    'type' => 'expense'
                ], [
                    'color' => '#10b981',
                    'icon' => 'PiggyBank'
                ]);

                $tx = Transaction::create([
                    'user_id' => $request->user()->id,
                    'category_id' => $category->id,
                    'wallet_id' => $validated['wallet_id'],
                    'type' => 'expense',
                    'amount' => $validated['amount'],
                    'transaction_date' => $validated['deposit_date'],
                    'description' => "Nabung: {$savingsGoal->name}" . (!empty($validated['notes']) ? " - {$validated['notes']}" : ""),
                ]);

                $transactionId = $tx->id;
            }

            $deposit = SavingsGoalDeposit::create([
                'savings_goal_id' => $savingsGoal->id,
                'wallet_id' => $validated['wallet_id'] ?? null,
                'transaction_id' => $transactionId,
                'amount' => $validated['amount'],
                'deposit_date' => $validated['deposit_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Update goal current_amount
            $savingsGoal->current_amount += $validated['amount'];
            if ($savingsGoal->current_amount >= $savingsGoal->target_amount) {
                $savingsGoal->status = 'achieved';
            }
            $savingsGoal->save();

            return response()->json([
                'message' => 'Setoran tabungan berhasil disimpan!',
                'deposit' => $deposit->load('wallet'),
                'goal' => $this->formatGoal($savingsGoal->fresh(['wallet', 'deposits.wallet']))
            ]);
        });
    }

    public function deleteDeposit(Request $request, SavingsGoal $savingsGoal, SavingsGoalDeposit $deposit)
    {
        if ($savingsGoal->user_id !== $request->user()->id || $deposit->savings_goal_id !== $savingsGoal->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return DB::transaction(function () use ($savingsGoal, $deposit) {
            // Delete associated wallet transaction if any
            if ($deposit->transaction_id) {
                Transaction::where('id', $deposit->transaction_id)->delete();
            }

            // Deduct from current_amount
            $savingsGoal->current_amount = max(0, $savingsGoal->current_amount - $deposit->amount);
            if ($savingsGoal->current_amount < $savingsGoal->target_amount && $savingsGoal->status === 'achieved') {
                $savingsGoal->status = 'active';
            }
            $savingsGoal->save();

            $deposit->delete();

            return response()->json([
                'message' => 'Catatan setoran berhasil dihapus.',
                'goal' => $this->formatGoal($savingsGoal->fresh(['wallet', 'deposits.wallet']))
            ]);
        });
    }

    public function destroy(Request $request, SavingsGoal $savingsGoal)
    {
        if ($savingsGoal->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return DB::transaction(function () use ($savingsGoal) {
            // Optional: delete associated transactions for deposits
            $txIds = $savingsGoal->deposits()->whereNotNull('transaction_id')->pluck('transaction_id');
            if ($txIds->isNotEmpty()) {
                Transaction::whereIn('id', $txIds)->delete();
            }

            $savingsGoal->delete();

            return response()->json(['message' => 'Target tabungan berhasil dihapus.']);
        });
    }

    private function formatGoal(SavingsGoal $goal): array
    {
        $target = (float) $goal->target_amount;
        $current = (float) $goal->current_amount;
        $remaining = max(0, $target - $current);
        $percentage = $target > 0 ? min(100, round(($current / $target) * 100, 1)) : 0;

        // Calculate Estimation / ETA
        $deposits = $goal->deposits ?? collect();
        $totalDeposited = (float) $deposits->sum('amount');
        $firstDeposit = $deposits->sortBy('deposit_date')->first();

        $monthlyPace = 0;
        $etaMonths = null;
        $etaText = null;
        $requiredMonthlySavings = null;

        // 1. Calculate Required Monthly Savings if target_date exists
        if ($goal->target_date && $remaining > 0) {
            $now = Carbon::now()->startOfDay();
            $targetDate = Carbon::parse($goal->target_date)->startOfDay();
            $daysLeft = $now->diffInDays($targetDate, false);

            if ($daysLeft > 0) {
                $monthsLeft = max(0.5, round($daysLeft / 30.4, 1));
                $requiredMonthlySavings = round($remaining / $monthsLeft, 0);
            } else {
                $requiredMonthlySavings = $remaining; // Past due date or due today
            }
        }

        // 2. Calculate Pace from deposits history or creation date
        if ($remaining <= 0) {
            $etaText = 'Target Sudah Tercapai! 🎉';
        } else {
            $startDate = $firstDeposit ? Carbon::parse($firstDeposit->deposit_date) : Carbon::parse($goal->created_at);
            $daysActive = max(1, Carbon::now()->diffInDays($startDate));

            if ($totalDeposited > 0 && $daysActive >= 5) {
                $dailyPace = $totalDeposited / $daysActive;
                $monthlyPace = $dailyPace * 30.4;
            } elseif ($current > 0) {
                // If direct initial amount without deposit history, estimate over creation days
                $dailyPace = $current / max(1, Carbon::now()->diffInDays($goal->created_at));
                $monthlyPace = $dailyPace * 30.4;
            }

            if ($monthlyPace > 0) {
                $etaMonths = round($remaining / $monthlyPace, 1);
                if ($etaMonths < 1) {
                    $days = max(1, ceil($remaining / ($monthlyPace / 30.4)));
                    $etaText = "Sekitar {$days} hari lagi (laju Rp " . number_format($monthlyPace, 0, ',', '.') . "/bln)";
                } elseif ($etaMonths == 1) {
                    $etaText = "Sekitar 1 bulan lagi (laju Rp " . number_format($monthlyPace, 0, ',', '.') . "/bln)";
                } else {
                    $etaText = "Sekitar {$etaMonths} bulan lagi (laju Rp " . number_format($monthlyPace, 0, ',', '.') . "/bln)";
                }
            } elseif ($goal->target_date) {
                $now = Carbon::now()->startOfDay();
                $targetDate = Carbon::parse($goal->target_date)->startOfDay();
                $daysLeft = $now->diffInDays($targetDate, false);

                if ($daysLeft > 0) {
                    $months = round($daysLeft / 30.4, 1);
                    $etaText = "Tenggat {$months} bulan lagi (butuh Rp " . number_format($requiredMonthlySavings, 0, ',', '.') . "/bln)";
                } else {
                    $etaText = "Tenggat waktu sudah lewat";
                }
            } else {
                $etaText = 'Mulai menabung untuk melihat estimasi waktu';
            }
        }

        return [
            'id' => $goal->id,
            'user_id' => $goal->user_id,
            'wallet_id' => $goal->wallet_id,
            'wallet' => $goal->wallet,
            'name' => $goal->name,
            'target_amount' => $target,
            'current_amount' => $current,
            'remaining_amount' => $remaining,
            'percentage' => $percentage,
            'target_date' => $goal->target_date ? $goal->target_date->format('Y-m-d') : null,
            'color' => $goal->color,
            'icon' => $goal->icon,
            'status' => $goal->status,
            'notes' => $goal->notes,
            'eta_text' => $etaText,
            'eta_months' => $etaMonths,
            'required_monthly_savings' => $requiredMonthlySavings,
            'deposits_count' => $deposits->count(),
            'deposits' => $deposits->map(function ($dep) {
                return [
                    'id' => $dep->id,
                    'savings_goal_id' => $dep->savings_goal_id,
                    'wallet_id' => $dep->wallet_id,
                    'wallet' => $dep->wallet,
                    'transaction_id' => $dep->transaction_id,
                    'amount' => (float) $dep->amount,
                    'deposit_date' => $dep->deposit_date ? $dep->deposit_date->format('Y-m-d') : null,
                    'notes' => $dep->notes,
                    'created_at' => $dep->created_at,
                ];
            })->values(),
            'created_at' => $goal->created_at,
            'updated_at' => $goal->updated_at,
        ];
    }
}

