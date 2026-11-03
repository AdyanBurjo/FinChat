<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CalendarController extends Controller
{
    /**
     * Get financial calendar events and daily spending heatmap.
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
        $daysInMonth  = $startOfMonth->daysInMonth;

        // 1. Ambil semua transaksi pada bulan tersebut
        $transactions = $user->transactions()
            ->with(['category', 'wallet'])
            ->whereBetween('transaction_date', [$startOfMonth, $endOfMonth])
            ->orderBy('transaction_date')
            ->get();

        // 2. Ambil jatuh tempo hutang & piutang pada bulan tersebut
        $debtDueDates = $user->debts()
            ->whereBetween('due_date', [$startOfMonth, $endOfMonth])
            ->whereIn('status', ['unpaid', 'partial'])
            ->get();

        // 3. Ambil Transaksi Berulang (Recurring Transactions) aktif
        $recurringItems = $user->recurringTransactions()
            ->with(['category', 'wallet'])
            ->where('is_active', true)
            ->where('start_date', '<=', $endOfMonth)
            ->where(function ($q) use ($startOfMonth) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $startOfMonth);
            })
            ->get();

        // 3. Kelompokkan data per tanggal (1 s/d daysInMonth)
        $dailyData = [];
        $maxDailyExpense = 0;
        $peakDay = null;
        $totalMonthExpense = 0;
        $totalMonthIncome = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dateString = Carbon::createFromDate($year, $month, $day)->toDateString();

            // Filter transaksi pada tanggal ini
            $dayTxs = $transactions->filter(function ($tx) use ($dateString) {
                return Carbon::parse($tx->transaction_date)->toDateString() === $dateString;
            });

            $dayExpense = (float) $dayTxs->where('type', 'expense')->sum('amount');
            $dayIncome  = (float) $dayTxs->where('type', 'income')->sum('amount');

            $totalMonthExpense += $dayExpense;
            $totalMonthIncome  += $dayIncome;

            if ($dayExpense > $maxDailyExpense) {
                $maxDailyExpense = $dayExpense;
                $peakDay = [
                    'day'    => $day,
                    'date'   => $dateString,
                    'amount' => $dayExpense,
                ];
            }

            // Filter events pada tanggal ini (hutang/piutang)
            $dayDebts = $debtDueDates->filter(function ($debt) use ($dateString) {
                return Carbon::parse($debt->due_date)->toDateString() === $dateString;
            });

            $events = [];

            foreach ($dayDebts as $d) {
                $remaining = max(0, (float) $d->amount - (float) $d->paid_amount);
                $events[] = [
                    'type'        => $d->type, // 'debt' or 'receivable'
                    'title'       => ($d->type === 'debt' ? 'Jatuh Tempo Hutang: ' : 'Jatuh Tempo Piutang: ') . $d->person_name,
                    'person_name' => $d->person_name,
                    'amount'      => $remaining,
                    'id'          => $d->id,
                ];
            }

            // Recurring transactions pada billing_day yang pas
            $matchedRecurring = $recurringItems->filter(function ($item) use ($day, $daysInMonth) {
                // Handle billing_day 31 di bulan yang hanya sampai tgl 30/28
                $targetDay = min($item->billing_day, $daysInMonth);
                return $targetDay === $day;
            });

            foreach ($matchedRecurring as $rec) {
                $events[] = [
                    'type'        => $rec->type === 'income' ? 'salary' : 'recurring',
                    'title'       => $rec->name,
                    'amount'      => (float) $rec->amount,
                    'is_recurring'=> true,
                    'id'          => $rec->id,
                    'category'    => $rec->category?->name,
                    'wallet'      => $rec->wallet?->name,
                ];
            }

            // Cek apakah ada transaksi bertipe gaji (Income Salary) jika belum tercatat di recurring
            $salaryTx = $dayTxs->first(function ($tx) {
                $desc = strtolower($tx->description ?? '');
                $cat = strtolower($tx->category?->name ?? '');
                return $tx->type === 'income' && (str_contains($desc, 'gaji') || str_contains($cat, 'gaji'));
            });

            if ($salaryTx) {
                $events[] = [
                    'type'   => 'salary',
                    'title'  => 'Hari Gajian',
                    'amount' => (float) $salaryTx->amount,
                ];
            }

            $dailyData[$dateString] = [
                'day'                => $day,
                'date'               => $dateString,
                'day_of_week'        => Carbon::parse($dateString)->dayOfWeek, // 0 = Sunday, 1 = Monday, etc.
                'expense'            => $dayExpense,
                'income'             => $dayIncome,
                'transactions_count' => $dayTxs->count(),
                'transactions'       => $dayTxs->values(),
                'events'             => $events,
                'has_events'         => count($events) > 0,
            ];
        }

        // 4. Hitung Heatmap Level (0 - 4) untuk tiap tanggal berdasarkan maxDailyExpense
        foreach ($dailyData as $dateStr => &$info) {
            $exp = $info['expense'];
            $level = 0;

            if ($exp > 0 && $maxDailyExpense > 0) {
                $ratio = $exp / $maxDailyExpense;
                if ($ratio > 0.75) {
                    $level = 4; // Sangat Boros (Merah Neon)
                } elseif ($ratio > 0.45) {
                    $level = 3; // Sedang - Boros (Oranye/Kuning)
                } elseif ($ratio > 0.20) {
                    $level = 2; // Menengah (Hijau Sedang)
                } else {
                    $level = 1; // Rendah (Hijau Redup)
                }
            }

            $info['heatmap_level'] = $level;
        }

        return response()->json([
            'meta' => [
                'month'              => $month,
                'year'               => $year,
                'days_in_month'      => $daysInMonth,
                'start_day_of_week'  => $startOfMonth->dayOfWeek, // 0 = Sunday
            ],
            'summary' => [
                'total_expense'     => (float) $totalMonthExpense,
                'total_income'      => (float) $totalMonthIncome,
                'max_daily_expense' => (float) $maxDailyExpense,
                'peak_day'          => $peakDay,
                'total_events'      => $debtDueDates->count(),
            ],
            'calendar_days' => array_values($dailyData),
        ]);
    }
}

