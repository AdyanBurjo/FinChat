<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('custodial_savings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');                      // e.g. "Deposito BSI 6 Bulan", "Titip Tabungan ke Ibu"
            $table->string('holder_name');               // e.g. "Bank Mandiri", "Ibu", "Koperasi Karyawan"
            $table->enum('type', ['flexible', 'term'])->default('flexible'); // flexible = kapanpun, term = ada tanggal jatuh tempo
            $table->date('due_date')->nullable();        // tanggal jatuh tempo (jika term)
            $table->decimal('total_amount', 15, 2)->default(0);  // saldo tersimpan saat ini
            $table->decimal('target_amount', 15, 2)->nullable(); // target jika ada
            $table->string('color')->default('#00f5ff'); // neon color
            $table->string('icon')->default('Landmark');  // Lucide icon name
            $table->enum('status', ['active', 'withdrawn', 'closed'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('custodial_savings_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custodial_saving_id')->constrained('custodial_savings')->cascadeOnDelete();
            $table->foreignId('wallet_id')->nullable()->constrained('wallets')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->enum('type', ['deposit', 'withdraw']); // deposit = setor/titip, withdraw = tarik kembali
            $table->decimal('amount', 15, 2);
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custodial_savings_transactions');
        Schema::dropIfExists('custodial_savings');
    }
};

