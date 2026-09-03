<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\TransactionParser;

class ChatController extends Controller
{
    public function parse(
        Request $request,
        TransactionParser $parser
    ) {
        $request->validate([
            'message' => ['required', 'string'],
        ]);

        $user = $request->user();

        $message = trim($request->message);

        $parsed = $parser->parse($message);

        if (!$parsed['amount']) {
            return response()->json([
                'success' => false,
                'message' => 'Nominal transaksi tidak ditemukan.',
            ], 422);
        }

        $categoryModel = null;

        if ($parsed['category']) {
            $detectedName = $parsed['category'];

            // Strategy 1: Exact match (case-insensitive)
            $categoryModel = $user->categories()
                ->whereRaw('LOWER(name) = ?', [strtolower($detectedName)])
                ->where('type', $parsed['type'])
                ->first();

            // Strategy 2: User category name CONTAINS detected name (e.g. "Makanan" in "Makanan & Minuman")
            if (!$categoryModel) {
                $categoryModel = $user->categories()
                    ->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($detectedName) . '%'])
                    ->where('type', $parsed['type'])
                    ->first();
            }

            // Strategy 3: Detected name CONTAINS user category name (e.g. "Food" in "Makanan atau Food")
            if (!$categoryModel) {
                $userCategories = $user->categories()
                    ->where('type', $parsed['type'])
                    ->get();

                foreach ($userCategories as $cat) {
                    if (
                        str_contains(
                            strtolower($detectedName),
                            strtolower($cat->name)
                        )
                    ) {
                        $categoryModel = $cat;
                        break;
                    }
                }
            }

            // Strategy 4: Match by checking if message contains user's category name
            if (!$categoryModel) {
                $normalizedMsg = strtolower($message);
                $userCategories = $user->categories()
                    ->where('type', $parsed['type'])
                    ->get();

                foreach ($userCategories as $cat) {
                    if (str_contains($normalizedMsg, strtolower($cat->name))) {
                        $categoryModel = $cat;
                        break;
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil diproses.',

            'data' => [
                'type' => $parsed['type'],
                'amount' => $parsed['amount'],
                'category_id' => $categoryModel?->id,
                'category' => $categoryModel?->name ?? $parsed['category'],
                'description' => $parsed['description'],
                'transaction_date' => $parsed['transaction_date'],
            ],
        ]);
    }

    public function parseMultiple(
        Request $request,
        TransactionParser $parser
    ) {
        $request->validate([
            'message' => ['required', 'string'],
        ]);

        $user = $request->user();

        $transactions = $parser->parseMultiple(
            $request->message
        );

        if (count($transactions) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada transaksi yang ditemukan.',
            ], 422);
        }

        foreach ($transactions as &$transaction) {
            $categoryModel = null;

            if ($transaction['category']) {
                $categoryModel = $user->categories()
                    ->whereRaw(
                        'LOWER(name) = ?',
                        [strtolower($transaction['category'])]
                    )
                    ->where('type', $transaction['type'])
                    ->first();
            }

            $transaction['category_id'] =
                $categoryModel?->id;

            $transaction['category'] =
                $categoryModel?->name
                ?? $transaction['category'];
        }

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil diproses.',
            'data' => $transactions,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Detect Transaction Type
    |--------------------------------------------------------------------------
    */

    private function detectType(string $message): string
    {
        $incomeKeywords = [
            'gaji',
            'bonus',
            'pendapatan',
            'pemasukan',
            'dapat',
            'terima',
            'transfer masuk',
            'dibayar',
            'bayaran',
            'tf',
            'reimburse',
        ];

        foreach ($incomeKeywords as $keyword) {
            if (str_contains($message, $keyword)) {
                return 'income';
            }
        }

        return 'expense';
    }

    /*
    |--------------------------------------------------------------------------
    | Extract Amount
    |--------------------------------------------------------------------------
    */

    private function extractAmount(string $message): ?int
    {
        /*
        |--------------------------------------------------------------------------
        | 2,5 juta / 2.5 juta / 2,5jt
        |--------------------------------------------------------------------------
        */

        if (
            preg_match(
                '/(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/i',
                $message,
                $matches
            )
        ) {
            $number = str_replace(',', '.', $matches[1]);

            return (int) round(
                ((float) $number) * 1_000_000
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 25 ribu / 25rb / 25k
        |--------------------------------------------------------------------------
        */

        if (
            preg_match(
                '/(\d+(?:[.,]\d+)?)\s*(ribu|rb|k)\b/i',
                $message,
                $matches
            )
        ) {
            $number = str_replace(',', '.', $matches[1]);

            return (int) round(
                ((float) $number) * 1_000
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 25.000 / 25,000 / 25000
        |--------------------------------------------------------------------------
        */

        if (
            preg_match(
                '/(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})\b/i',
                $message,
                $matches
            )
        ) {
            $number = preg_replace(
                '/[.,]/',
                '',
                $matches[1]
            );

            return (int) $number;
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Detect Category
    |--------------------------------------------------------------------------
    */

    private function detectCategory(string $message): ?string
    {
        $categories = [

            'Makanan' => [
                'makan',
                'ayam',
                'nasi',
                'bakso',
                'mie',
                'minum',
                'kopi',
                'kuliner',
                'restoran',
                'warung',
                'jajan',
            ],

            'Transportasi' => [
                'bensin',
                'pertalite',
                'pertamax',
                'solar',
                'grab',
                'gojek',
                'ojek',
                'taxi',
                'tol',
                'parkir',
                'transport',
                'servis',
            ],

            'Belanja' => [
                'belanja',
                'sepatu',
                'baju',
                'celana',
                'shopee',
                'tokopedia',
                'lazada',
            ],

            'Tagihan' => [
                'listrik',
                'wifi',
                'internet',
                'tagihan',
                'pulsa',
                'air',
                'pdam',
                'hutang',
                'angsuran',
            ],

            'Hiburan' => [
                'bioskop',
                'game',
                'nonton',
                'hiburan',
                'steam',
                'playstation',
            ],

            'Kesehatan' => [
                'dokter',
                'obat',
                'rumah sakit',
                'apotek',
                'kesehatan',
            ],

            'Pendidikan' => [
                'kuliah',
                'sekolah',
                'buku',
                'kursus',
                'pendidikan',
            ],

            'Gaji' => [
                'gaji',
                'salary',
                'payroll',
            ],

            'Bonus' => [
                'bonus',
                'insentif',
                'thr',
                'tf',
            ],
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (!empty($keyword) && str_contains($message, $keyword)) {
                    return $category;
                }
            }
        }

        return 'Lainnya';
    }

    /*
    |--------------------------------------------------------------------------
    | Detect Date
    |--------------------------------------------------------------------------
    */

    private function detectDate(string $message): string
    {
        if (str_contains($message, 'kemarin lusa')) {
            return now()
                ->subDays(2)
                ->toDateString();
        }

        if (str_contains($message, 'kemarin')) {
            return now()
                ->subDay()
                ->toDateString();
        }

        if (
            str_contains($message, 'hari ini') ||
            str_contains($message, 'tadi') ||
            str_contains($message, 'barusan')
        ) {
            return now()->toDateString();
        }

        return now()->toDateString();
    }

    /*
    |--------------------------------------------------------------------------
    | Confirm & Save Transaction
    |--------------------------------------------------------------------------
    */

    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'in:income,expense'],
            'amount' => ['required', 'numeric', 'min:1'],
            'category_id' => ['nullable', 'integer'],
            'description' => ['nullable', 'string'],
            'transaction_date' => ['required', 'date'],
        ]);

        $user = $request->user();

        if (!empty($validated['category_id'])) {
            $categoryExists = $user->categories()
                ->where('id', $validated['category_id'])
                ->where('type', $validated['type'])
                ->exists();

            if (!$categoryExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kategori tidak valid.',
                ], 422);
            }
        }

        $transaction = $user->transactions()->create([
            'category_id' => $validated['category_id'] ?? null,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'description' => $validated['description'] ?? null,
            'transaction_date' => $validated['transaction_date'],
            'source' => 'chat',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil disimpan.',
            'data' => $transaction->load('category'),
        ]);
    }
}