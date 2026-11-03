<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            // Fee that is charged when money is sent TO this wallet
            // transfer_fee_type:
            //   'sender'   → fee is added on top: sender pays amount + fee (receiver gets full amount)
            //   'receiver' → fee is deducted from the amount: sender pays amount, receiver gets amount - fee
            $table->decimal('transfer_fee', 15, 2)->default(0)->after('is_default');
            $table->enum('transfer_fee_type', ['sender', 'receiver'])->default('sender')->after('transfer_fee');
        });
    }

    public function down(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropColumn(['transfer_fee', 'transfer_fee_type']);
        });
    }
};

