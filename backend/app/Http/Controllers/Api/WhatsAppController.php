<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ChatSession;
use Illuminate\Http\Request;
use App\Services\TransactionParser;
use App\Services\WhatsAppService;

class WhatsAppController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Meta Webhook Verification
    |--------------------------------------------------------------------------
    */

    public function verifyWebhook(Request $request)
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if (
            $mode === 'subscribe' &&
            $token === config('services.whatsapp.verify_token')
        ) {
            return response($challenge, 200);
        }

        return response('Forbidden', 403);
    }

    /*
    |--------------------------------------------------------------------------
    | Incoming WhatsApp Message
    |--------------------------------------------------------------------------
    */

    public function webhook(
        Request $request,
        WhatsAppService $whatsapp
    ) {
        /*
        |--------------------------------------------------------------------------
        | Ambil data dari payload Meta
        |--------------------------------------------------------------------------
        */

        $phone = $request->input(
            'entry.0.changes.0.value.messages.0.from'
        );

        $message = $request->input(
            'entry.0.changes.0.value.messages.0.text.body'
        );

        /*
        |--------------------------------------------------------------------------
        | Abaikan webhook yang bukan pesan text
        |--------------------------------------------------------------------------
        */

        if (!$phone || !$message) {
            return response()->json([
                'success' => true,
                'message' => 'Webhook received.',
            ]);
        }

        $message = trim($message);

        /*
        |--------------------------------------------------------------------------
        | Cari User berdasarkan nomor WhatsApp
        |--------------------------------------------------------------------------
        */

        $user = User::where(
            'whatsapp_number',
            $phone
        )->first();

        if (!$user) {
            $whatsapp->sendMessage(
                $phone,
                "❌ Nomor WhatsApp ini belum terhubung ke akun FinChat.\n\n" .
                "Silakan hubungkan nomor WhatsApp lo terlebih dahulu."
            );

            return response()->json([
                'success' => false,
                'message' => 'WhatsApp number is not registered.',
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | Chat Session
        |--------------------------------------------------------------------------
        */

        $session = ChatSession::firstOrCreate(
            [
                'user_id' => $user->id,
            ],
            [
                'status' => 'idle',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Generate Reply
        |--------------------------------------------------------------------------
        */

        if ($session->status === 'waiting_confirmation') {

            $response = $this->handleConfirmation(
                $session,
                $message
            );

        } else {

            $response = $this->handleNewTransaction(
                $user,
                $session,
                $message,
                app(TransactionParser::class)
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Ambil reply dari response Laravel
        |--------------------------------------------------------------------------
        */

        $data = $response->getData(true);

        $reply = $data['reply']
            ?? $data['message']
            ?? 'Maaf, gue belum bisa memproses pesan itu 😅';

        /*
        |--------------------------------------------------------------------------
        | Kirim reply ke WhatsApp
        |--------------------------------------------------------------------------
        */

        $whatsapp->sendMessage(
            $phone,
            $reply
        );

        return response()->json([
            'success' => true,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | New Transaction
    |--------------------------------------------------------------------------
    */

    private function handleNewTransaction(
        User $user,
        ChatSession $session,
        string $message,
        TransactionParser $parser
    ) {
        $transactions = $parser->parseMultiple($message);

        if (count($transactions) === 0) {
            return response()->json([
                'success' => false,
                'reply' =>
                    "Gue belum ngerti transaksinya 😅\n\n" .
                    "Contoh:\n" .
                    "makan 25rb\n" .
                    "bensin 50rb\n" .
                    "gaji 5jt",
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Resolve Category
        |--------------------------------------------------------------------------
        */

        foreach ($transactions as &$transaction) {

            $categoryModel = null;

            if ($transaction['category']) {

                $categoryModel = $user->categories()
                    ->whereRaw(
                        'LOWER(name) = ?',
                        [strtolower($transaction['category'])]
                    )
                    ->where(
                        'type',
                        $transaction['type']
                    )
                    ->first();
            }

            $transaction['category_id'] =
                $categoryModel?->id;

            $transaction['category'] =
                $categoryModel?->name
                ?? $transaction['category'];
        }

        /*
        |--------------------------------------------------------------------------
        | Save Pending Transactions
        |--------------------------------------------------------------------------
        */

        $session->update([
            'status' => 'waiting_confirmation',
            'pending_transaction' => $transactions,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Build Confirmation Message
        |--------------------------------------------------------------------------
        */

        $reply =
            "Gue menemukan " .
            count($transactions) .
            " transaksi:\n\n";

        foreach (
            $transactions
            as $index => $transaction
        ) {

            $number = $index + 1;

            $icon =
                $transaction['type'] === 'expense'
                ? '💸'
                : '💰';

            $amount = number_format(
                $transaction['amount'],
                0,
                ',',
                '.'
            );

            $category =
                $transaction['category']
                ?? 'Belum ditentukan';

            $reply .=
                "{$number}. {$icon} " .
                "{$category} — Rp{$amount}\n";
        }

        $reply .=
            "\nSimpan semua transaksi ini?\n\n" .
            "1. Ya\n" .
            "2. Batal";

        return response()->json([
            'success' => true,
            'reply' => $reply,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Confirmation + Edit
    |--------------------------------------------------------------------------
    */

    private function handleConfirmation(
        ChatSession $session,
        string $message
    ) {
        $answer = strtolower(trim($message));

        /*
        |--------------------------------------------------------------------------
        | Edit Pending Transaction
        |--------------------------------------------------------------------------
        */

        if (
            preg_match(
                '/(?:ubah|ganti)\s+(?:yang\s+)?(\d+)\s+(?:jadi|menjadi)\s+(.+)/i',
                $message,
                $matches
            )
        ) {

            $index = ((int) $matches[1]) - 1;

            $newAmount =
                $this->extractAmountFromText(
                    strtolower($matches[2])
                );

            $pending =
                $session->pending_transaction;

            if (
                !isset($pending[$index]) ||
                !$newAmount
            ) {

                return response()->json([
                    'success' => false,
                    'reply' =>
                        "Format edit nggak valid 😅\n\n" .
                        "Contoh:\n" .
                        "ubah 1 jadi 35rb",
                ], 422);
            }

            $pending[$index]['amount'] =
                $newAmount;

            $session->update([
                'pending_transaction' => $pending,
            ]);

            return response()->json([
                'success' => true,
                'reply' =>
                    "✅ Nominal transaksi #{$matches[1]} " .
                    "sudah gue ubah jadi Rp" .
                    number_format(
                        $newAmount,
                        0,
                        ',',
                        '.'
                    ) .
                    ".\n\n" .
                    "Kirim 1 untuk simpan atau 2 untuk batal.",
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | YES
        |--------------------------------------------------------------------------
        */

        if (
            in_array(
                $answer,
                [
                    '1',
                    'ya',
                    'iya',
                    'yes',
                    'y',
                    'oke',
                    'ok',
                ]
            )
        ) {

            $transactionData =
                $session->pending_transaction;

            $user = $session->user;

            $createdTransactions = [];

            foreach (
                $transactionData
                as $data
            ) {

                $createdTransactions[] =
                    $user->transactions()->create([
                        'category_id' =>
                            $data['category_id'] ?? null,

                        'type' =>
                            $data['type'],

                        'amount' =>
                            $data['amount'],

                        'description' =>
                            $data['description'],

                        'transaction_date' =>
                            $data['transaction_date'],

                        'source' => 'chat',
                    ]);
            }

            $count =
                count($createdTransactions);

            $session->update([
                'status' => 'idle',
                'pending_transaction' => null,
            ]);

            return response()->json([
                'success' => true,
                'reply' =>
                    "✅ Berhasil mencatat {$count} transaksi!",
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | NO
        |--------------------------------------------------------------------------
        */

        if (
            in_array(
                $answer,
                [
                    '2',
                    'tidak',
                    'nggak',
                    'gak',
                    'batal',
                    'cancel',
                    'no',
                    'n',
                ]
            )
        ) {

            $session->update([
                'status' => 'idle',
                'pending_transaction' => null,
            ]);

            return response()->json([
                'success' => true,
                'reply' =>
                    "❌ Oke, transaksi nggak gue simpan.",
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Unknown Answer
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,
            'reply' =>
                "Pilih aja:\n\n" .
                "1. Ya\n" .
                "2. Batal\n\n" .
                "Atau edit dulu, contoh:\n" .
                "ubah 1 jadi 35rb",
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Extract Amount
    |--------------------------------------------------------------------------
    */

    private function extractAmountFromText(
        string $message
    ): ?int {

        if (
            preg_match(
                '/(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/i',
                $message,
                $matches
            )
        ) {

            $number =
                str_replace(
                    ',',
                    '.',
                    $matches[1]
                );

            return (int) round(
                ((float) $number) * 1_000_000
            );
        }

        if (
            preg_match(
                '/(\d+(?:[.,]\d+)?)\s*(ribu|rb|k)\b/i',
                $message,
                $matches
            )
        ) {

            $number =
                str_replace(
                    ',',
                    '.',
                    $matches[1]
                );

            return (int) round(
                ((float) $number) * 1_000
            );
        }

        if (
            preg_match(
                '/(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})\b/i',
                $message,
                $matches
            )
        ) {

            return (int) preg_replace(
                '/[.,]/',
                '',
                $matches[1]
            );
        }

        return null;
    }
}