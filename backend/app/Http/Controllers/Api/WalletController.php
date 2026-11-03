<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    /**
     * List all wallets for the authenticated user with computed balance.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $wallets = $user->wallets()->get()->map(function ($wallet) {
            $income = $wallet->transactions()
                ->where('type', 'income')
                ->sum('amount');

            $expense = $wallet->transactions()
                ->where('type', 'expense')
                ->sum('amount');

            $wallet->balance = (float) $wallet->initial_balance + (float) $income - (float) $expense;

            return $wallet;
        });

        return response()->json([
            'wallets' => $wallets,
        ]);
    }

    /**
     * Create a new wallet.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:100'],
            'type'               => ['required', 'in:cash,bank,ewallet,investment'],
            'color'              => ['nullable', 'string', 'max:7'],
            'icon'               => ['nullable', 'string', 'max:50'],
            'initial_balance'    => ['nullable', 'numeric', 'min:0'],
            'is_default'         => ['nullable', 'boolean'],
            'transfer_fee'       => ['nullable', 'numeric', 'min:0'],
            'transfer_fee_type'  => ['nullable', 'in:sender,receiver'],
        ]);

        $user = $request->user();

        if (!empty($validated['is_default'])) {
            // Unset default on all other wallets
            $user->wallets()->update(['is_default' => false]);
        }

        $wallet = $user->wallets()->create([
            'name'              => $validated['name'],
            'type'              => $validated['type'],
            'color'             => $validated['color'] ?? '#39ff14',
            'icon'              => $validated['icon'] ?? 'Wallet',
            'initial_balance'   => $validated['initial_balance'] ?? 0,
            'is_default'        => $validated['is_default'] ?? false,
            'transfer_fee'      => $validated['transfer_fee'] ?? 0,
            'transfer_fee_type' => $validated['transfer_fee_type'] ?? 'sender',
        ]);

        return response()->json([
            'message' => 'Wallet created successfully.',
            'wallet'  => $wallet,
        ], 201);
    }

    /**
     * Show a single wallet.
     */
    public function show(Request $request, Wallet $wallet)
    {
        $this->authorizeWallet($request, $wallet);

        return response()->json([
            'wallet' => $wallet,
        ]);
    }

    /**
     * Update a wallet.
     */
    public function update(Request $request, Wallet $wallet)
    {
        $this->authorizeWallet($request, $wallet);

        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:100'],
            'type'              => ['required', 'in:cash,bank,ewallet,investment'],
            'color'             => ['nullable', 'string', 'max:7'],
            'icon'              => ['nullable', 'string', 'max:50'],
            'initial_balance'   => ['nullable', 'numeric', 'min:0'],
            'is_default'        => ['nullable', 'boolean'],
            'transfer_fee'      => ['nullable', 'numeric', 'min:0'],
            'transfer_fee_type' => ['nullable', 'in:sender,receiver'],
        ]);

        $user = $request->user();

        if (!empty($validated['is_default'])) {
            // Unset default on all other wallets
            $user->wallets()->where('id', '!=', $wallet->id)->update(['is_default' => false]);
        }

        $wallet->update($validated);

        return response()->json([
            'message' => 'Wallet updated successfully.',
            'wallet'  => $wallet,
        ]);
    }

    /**
     * Delete a wallet. Transactions linked to this wallet have their wallet_id set to null.
     */
    public function destroy(Request $request, Wallet $wallet)
    {
        $this->authorizeWallet($request, $wallet);

        // Detach linked transactions (set wallet_id to null)
        $wallet->transactions()->update(['wallet_id' => null]);

        $wallet->delete();

        return response()->json([
            'message' => 'Wallet deleted successfully.',
        ]);
    }

    /**
     * Set a wallet as the default for the authenticated user.
     */
    public function setDefault(Request $request, Wallet $wallet)
    {
        $this->authorizeWallet($request, $wallet);

        $user = $request->user();

        // Unset all, then set the chosen one
        $user->wallets()->update(['is_default' => false]);
        $wallet->update(['is_default' => true]);

        return response()->json([
            'message' => 'Default wallet updated.',
            'wallet'  => $wallet,
        ]);
    }

    /**
     * Transfer funds between two wallets.
     *
     * Admin fee logic (based on destination wallet settings):
     *  - fee_type = 'sender'   → fee added on top of the transfer amount.
     *                            Source pays (amount + fee), destination receives full amount.
     *                            e.g. transfer 20k to GoPay (fee 1k sender) → source -21k, GoPay +20k
     *  - fee_type = 'receiver' → fee deducted from the transfer amount.
     *                            Source pays amount, destination receives (amount - fee).
     *                            e.g. transfer 20k to ShopeePay (fee 500 receiver) → source -20k, ShopeePay +19.5k
     *
     * When admin fee > 0, an extra expense transaction is recorded on the source wallet
     * under "Biaya Admin Transfer" category so it appears in spending history.
     */
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_wallet_id'   => ['required', 'integer'],
            'to_wallet_id'     => ['required', 'integer', 'different:from_wallet_id'],
            'amount'           => ['required', 'numeric', 'min:1'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'transaction_date' => ['required', 'date'],
        ]);

        $user = $request->user();

        $fromWallet = $user->wallets()->find($validated['from_wallet_id']);
        $toWallet   = $user->wallets()->find($validated['to_wallet_id']);

        if (!$fromWallet) {
            return response()->json(['message' => 'Wallet asal tidak ditemukan atau bukan milik Anda.'], 422);
        }
        if (!$toWallet) {
            return response()->json(['message' => 'Wallet tujuan tidak ditemukan atau bukan milik Anda.'], 422);
        }

        $transferAmount = (float) $validated['amount'];
        $adminFee       = (float) ($toWallet->transfer_fee ?? 0);
        $feeType        = $toWallet->transfer_fee_type ?? 'sender';

        // Compute debit from source and credit to destination
        if ($adminFee > 0 && $feeType === 'sender') {
            // Sender pays the fee on top
            $sourceDebit  = $transferAmount + $adminFee;
            $destCredit   = $transferAmount;
        } elseif ($adminFee > 0 && $feeType === 'receiver') {
            // Fee is deducted from what destination receives
            $sourceDebit  = $transferAmount;
            $destCredit   = $transferAmount - $adminFee;
        } else {
            $sourceDebit  = $transferAmount;
            $destCredit   = $transferAmount;
        }

        $transferId = (string) \Illuminate\Support\Str::uuid();

        $description = $validated['description']
            ?? ('Transfer dari ' . $fromWallet->name . ' ke ' . $toWallet->name);

        // Auto-create Transfer categories
        $expenseCategory = $user->categories()->firstOrCreate(
            ['name' => 'Transfer', 'type' => 'expense'],
            ['name' => 'Transfer', 'type' => 'expense']
        );

        $incomeCategory = $user->categories()->firstOrCreate(
            ['name' => 'Transfer', 'type' => 'income'],
            ['name' => 'Transfer', 'type' => 'income']
        );

        $transactions = \Illuminate\Support\Facades\DB::transaction(function () use (
            $user, $fromWallet, $toWallet,
            $transferAmount, $sourceDebit, $destCredit, $adminFee, $feeType,
            $transferId, $description, $validated,
            $expenseCategory, $incomeCategory
        ) {
            $results = [];

            // Expense from source wallet (net transfer amount, not including fee separately)
            $expense = $user->transactions()->create([
                'wallet_id'        => $fromWallet->id,
                'category_id'      => $expenseCategory->id,
                'type'             => 'expense',
                'amount'           => $feeType === 'sender' ? $transferAmount : $sourceDebit,
                'description'      => $description,
                'transaction_date' => $validated['transaction_date'],
                'transfer_id'      => $transferId,
                'source'           => 'web',
            ]);
            $results[] = $expense->load('category', 'wallet');

            // If sender-type fee, record the admin fee as a separate expense on source
            if ($adminFee > 0 && $feeType === 'sender') {
                $adminCategory = $user->categories()->firstOrCreate(
                    ['name' => 'Biaya Admin Transfer', 'type' => 'expense'],
                    ['icon' => 'Landmark', 'color' => '#ffcc00']
                );

                $feeExpense = $user->transactions()->create([
                    'wallet_id'        => $fromWallet->id,
                    'category_id'      => $adminCategory->id,
                    'type'             => 'expense',
                    'amount'           => $adminFee,
                    'description'      => "Biaya admin transfer ke {$toWallet->name}",
                    'transaction_date' => $validated['transaction_date'],
                    'transfer_id'      => $transferId,
                    'source'           => 'web',
                ]);
                $results[] = $feeExpense->load('category', 'wallet');
            }

            // Income to destination wallet (what they actually receive)
            $income = $user->transactions()->create([
                'wallet_id'        => $toWallet->id,
                'category_id'      => $incomeCategory->id,
                'type'             => 'income',
                'amount'           => $destCredit,
                'description'      => $description,
                'transaction_date' => $validated['transaction_date'],
                'transfer_id'      => $transferId,
                'source'           => 'web',
            ]);
            $results[] = $income->load('category', 'wallet');

            return $results;
        });

        return response()->json([
            'message'      => 'Transfer berhasil.',
            'transfer_id'  => $transferId,
            'admin_fee'    => $adminFee,
            'fee_type'     => $feeType,
            'source_debit' => $sourceDebit,
            'dest_credit'  => $destCredit,
            'transactions' => $transactions,
        ], 201);
    }

    /**
     * Abort if the wallet does not belong to the authenticated user.
     */
    private function authorizeWallet(Request $request, Wallet $wallet): void
    {
        abort_unless(
            $wallet->user_id === $request->user()->id,
            403,
            'Unauthorized.'
        );
    }
}
