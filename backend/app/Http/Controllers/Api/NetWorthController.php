<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NetWorthController extends Controller
{
    /**
     * Calculate and return user's total net worth breakdown.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // 1. Ambil semua wallet beserta saldo terhitung
        $wallets = $user->wallets()->get()->map(function ($wallet) {
            $income = (float) $wallet->transactions()->where('type', 'income')->sum('amount');
            $expense = (float) $wallet->transactions()->where('type', 'expense')->sum('amount');
            $wallet->balance = (float) $wallet->initial_balance + $income - $expense;
            return $wallet;
        });

        // Pengelompokan aset dompet berdasarkan tipe
        $cashBalance = 0;
        $bankBalance = 0;
        $ewalletBalance = 0;
        $investmentBalance = 0;

        foreach ($wallets as $w) {
            switch ($w->type) {
                case 'bank':
                    $bankBalance += $w->balance;
                    break;
                case 'ewallet':
                    $ewalletBalance += $w->balance;
                    break;
                case 'investment':
                    $investmentBalance += $w->balance;
                    break;
                default:
                    $cashBalance += $w->balance;
                    break;
            }
        }

        $totalWalletAssets = $cashBalance + $bankBalance + $ewalletBalance + $investmentBalance;

        // 2. Ambil Piutang (Receivables yang belum lunas sebagai Aset)
        $receivables = $user->debts()
            ->where('type', 'receivable')
            ->whereIn('status', ['unpaid', 'partial'])
            ->get()
            ->map(function ($item) {
                $rem = max(0, (float) $item->amount - (float) $item->paid_amount);
                return [
                    'id'          => $item->id,
                    'person_name' => $item->person_name,
                    'remaining'   => $rem,
                    'due_date'    => $item->due_date,
                ];
            });

        $totalReceivables = $receivables->sum('remaining');

        // 3. Ambil Simpanan & Deposito (Custodial Savings yang masih aktif sebagai Aset)
        $custodialSavings = $user->custodialSavings()
            ->where('status', 'active')
            ->where('total_amount', '>', 0)
            ->get()
            ->map(function ($item) {
                return [
                    'id'           => $item->id,
                    'name'         => $item->name,
                    'holder_name'  => $item->holder_name,
                    'total_amount' => (float) $item->total_amount,
                    'type'         => $item->type,
                    'due_date'     => $item->due_date,
                    'color'        => $item->color,
                ];
            });

        $totalCustodialSavings = $custodialSavings->sum('total_amount');

        // Total Seluruh Aset (Wallets + Piutang + Simpanan/Deposito)
        $totalAssets = $totalWalletAssets + $totalReceivables + $totalCustodialSavings;

        // 4. Ambil Hutang (Debts yang belum lunas sebagai Liabilitas/Kewajiban)
        $debts = $user->debts()
            ->where('type', 'debt')
            ->whereIn('status', ['unpaid', 'partial'])
            ->get()
            ->map(function ($item) {
                $rem = max(0, (float) $item->amount - (float) $item->paid_amount);
                return [
                    'id'          => $item->id,
                    'person_name' => $item->person_name,
                    'remaining'   => $rem,
                    'due_date'    => $item->due_date,
                ];
            });

        $totalLiabilities = $debts->sum('remaining');

        // 5. Net Worth (Aset - Liabilitas)
        $netWorth = $totalAssets - $totalLiabilities;

        // 5. Rasio Keuangan (Debt-to-Asset Ratio)
        $debtToAssetRatio = $totalAssets > 0 ? round(($totalLiabilities / $totalAssets) * 100, 1) : ($totalLiabilities > 0 ? 100 : 0);

        $healthStatus = 'Sangat Sehat';
        $healthColor = 'var(--neon-green)';
        if ($netWorth < 0) {
            $healthStatus = 'Kekayaan Negatif (Defisit)';
            $healthColor = '#ff5080';
        } elseif ($debtToAssetRatio > 50) {
            $healthStatus = 'Beban Hutang Tinggi';
            $healthColor = '#ff5080';
        } elseif ($debtToAssetRatio > 25) {
            $healthStatus = 'Cukup Sehat (Moderat)';
            $healthColor = '#ffcc00';
        }

        // 6. Asset Breakdown Distribution
        $assetBreakdown = [
            [
                'name'  => 'Rekening Bank',
                'total' => $bankBalance,
                'color' => '#00f5ff',
                'type'  => 'bank',
            ],
            [
                'name'  => 'Simpanan & Deposito',
                'total' => $totalCustodialSavings,
                'color' => '#10b981',
                'type'  => 'custodial',
            ],
            [
                'name'  => 'Investasi',
                'total' => $investmentBalance,
                'color' => '#bf00ff',
                'type'  => 'investment',
            ],
            [
                'name'  => 'Dompet Digital',
                'total' => $ewalletBalance,
                'color' => '#39ff14',
                'type'  => 'ewallet',
            ],
            [
                'name'  => 'Uang Tunai (Cash)',
                'total' => $cashBalance,
                'color' => '#ffcc00',
                'type'  => 'cash',
            ],
            [
                'name'  => 'Piutang (Uang di Orang)',
                'total' => $totalReceivables,
                'color' => '#00e5ff',
                'type'  => 'receivable',
            ],
        ];

        return response()->json([
            'net_worth' => (float) $netWorth,
            'summary'   => [
                'total_assets'            => (float) $totalAssets,
                'total_liabilities'       => (float) $totalLiabilities,
                'total_wallets'           => (float) $totalWalletAssets,
                'total_receivables'       => (float) $totalReceivables,
                'total_custodial_savings' => (float) $totalCustodialSavings,
                'debt_to_asset_ratio'     => $debtToAssetRatio,
                'health_status'           => $healthStatus,
                'health_color'            => $healthColor,
            ],
            'asset_breakdown' => $assetBreakdown,
            'details' => [
                'wallets'           => $wallets,
                'receivables'       => $receivables,
                'custodial_savings' => $custodialSavings,
                'debts'             => $debts,
            ],
        ]);
    }
}

