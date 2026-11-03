<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('debt_payments', 'wallet_id')) {
                $table->foreignId('wallet_id')->nullable()->after('debt_id')->constrained('wallets')->nullOnDelete();
            }
            if (!Schema::hasColumn('debt_payments', 'transaction_id')) {
                $table->foreignId('transaction_id')->nullable()->after('wallet_id')->constrained('transactions')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            if (Schema::hasColumn('debt_payments', 'transaction_id')) {
                $table->dropForeign(['transaction_id']);
                $table->dropColumn('transaction_id');
            }
            if (Schema::hasColumn('debt_payments', 'wallet_id')) {
                $table->dropForeign(['wallet_id']);
                $table->dropColumn('wallet_id');
            }
        });
    }
};

