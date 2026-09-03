<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    public function sendMessage(
        string $to,
        string $message
    ): array {
        $phoneNumberId = config(
            'services.whatsapp.phone_number_id'
        );

        $token = config(
            'services.whatsapp.token'
        );

        $response = Http::withToken($token)
            ->post(
                "https://graph.facebook.com/{$this->getApiVersion()}/{$phoneNumberId}/messages",
                [
                    'messaging_product' => 'whatsapp',
                    'to' => $to,
                    'type' => 'text',
                    'text' => [
                        'body' => $message,
                    ],
                ]
            );

        return $response->json();
    }

    private function getApiVersion(): string
    {
        return env('WHATSAPP_API_VERSION', 'v23.0');
    }
}