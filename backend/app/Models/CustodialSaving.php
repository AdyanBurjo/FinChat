<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustodialSaving extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'holder_name',
        'monthly_amount',
        'total_amount',
        'color',
        'icon',
        'status',
        'notes',
    ];

    protected $casts = [
        'monthly_amount' => 'decimal:2',
        'total_amount'   => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(CustodialSavingsTransaction::class, 'custodial_saving_id')->latest('transaction_date')->latest('id');
    }
}
