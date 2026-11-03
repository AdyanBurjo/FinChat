<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('custodial_savings', function (Blueprint $table) {
            // Add new column: fixed monthly setoran amount
            $table->decimal('monthly_amount', 15, 2)->default(0)->after('total_amount');

            // Drop old columns that are no longer needed
            $table->dropColumn(['type', 'due_date', 'target_amount']);
        });
    }

    public function down(): void
    {
        Schema::table('custodial_savings', function (Blueprint $table) {
            $table->dropColumn('monthly_amount');

            $table->string('type', 20)->default('flexible')->after('holder_name');
            $table->date('due_date')->nullable()->after('type');
            $table->decimal('target_amount', 15, 2)->nullable()->after('total_amount');
        });
    }
};

