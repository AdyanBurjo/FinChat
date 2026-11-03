<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustodialSavingsTransaction extends Model
{
    protected $fillable = [
        'custodial_saving_id',
        'wallet_id',
        'transaction_id',
        'type',
        'amount',
        'transaction_date',
        'notes',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'transaction_date' => 'date:Y-m-d',
    ];

    public function custodialSaving(): BelongsTo
    {
        return $this->belongsTo(CustodialSaving::class, 'custodial_saving_id');
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

