<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavingsGoalDeposit extends Model
{
    use HasFactory;

    protected $fillable = [
        'savings_goal_id',
        'wallet_id',
        'transaction_id',
        'amount',
        'deposit_date',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'deposit_date' => 'date:Y-m-d',
    ];

    public function goal(): BelongsTo
    {
        return $this->belongsTo(SavingsGoal::class, 'savings_goal_id');
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}

