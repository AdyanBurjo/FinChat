<?php

namespace App\Services;

use Carbon\Carbon;

class TransactionParser
{
    public function parse(string $message): array
    {
        $normalized = strtolower(trim($message));

        $type = $this->detectType($normalized);
        $amount = $this->extractAmount($normalized);
        $category = $this->detectCategory($normalized);
        $date = $this->detectDate($normalized);

        return [
            'type' => $type,
            'amount' => $amount,
            'category' => $category,
            'description' => $message,
            'transaction_date' => $date,
        ];
    }

    public function parseMultiple(string $message): array
    {
        $normalized = strtolower(trim($message));

        $parts = preg_split(
            '/\s+(?:dan|terus|kemudian|lalu)\s+|,\s*/i',
            $normalized
        );

        $transactions = [];

        foreach ($parts as $part) {
            $part = trim($part);

            if (!$part) {
                continue;
            }

            $amount = $this->extractAmount($part);

            if (!$amount) {
                continue;
            }

            $transactions[] = [
                'type' => $this->detectType($part),
                'amount' => $amount,
                'category' => $this->detectCategory($part),
                'description' => $part,
                'transaction_date' => $this->detectDate($part),
            ];
        }

        return $transactions;
    }

    private function detectType(string $message): string
    {
        $incomeKeywords = [
            'gaji',
            'bonus',
            'pendapatan',
            'pemasukan',
            'dapat uang',
            'terima uang',
            'uang masuk',
            'transfer masuk',
            'dibayar',
            'bayaran',
            'honor',
            'komisi',
            'thr',
            'reimburse',
        ];

        foreach ($incomeKeywords as $keyword) {
            if (str_contains($message, $keyword)) {
                return 'income';
            }
        }

        return 'expense';
    }

    private function extractAmount(string $message): ?int
    {
        // 2,5 juta / 2.5 juta / 2,5jt
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

        // 25 ribu / 25rb / 25k
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

        // 25.000 / 25,000 / 25000
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

    private function detectCategory(string $message): ?string
    {
        $categories = [
            'Kopi' => [
                'kopi',
                'ngopi',
                'es kopi',
                'kopi susu',
                'coffee',
                'espresso',
                'americano',
                'cappuccino',
                'latte',
                'cafelatte',
                'cafe latte',
                'kopsu',
                'kenangan',
                'janji jiwa',
                'fore',
                'starbucks',
                'sbux',
                'point coffee',
                'tomoro',
                'kafe',
                'cafe',
                'warkop',
            ],

            'Rokok' => [
                'rokok',
                'sebat',
                'ngebul',
                'surya',
                'sampoerna',
                'marlboro',
                'magnum',
                'djarum',
                'gudang garam',
                'esse',
                'camel',
                'vape',
                'pod',
                'liquid',
                'cartridge',
                'coil',
                'tembakau',
                'cerutu',
                'juul',
                'relx',
                'iqos',
                'terea',
            ],

            'Makanan' => [
                'makan',
                'minum',
                'ayam',
                'nasi',
                'bakso',
                'mie',
                'mie goreng',
                'restoran',
                'warung',
                'jajan',
                'snack',
                'cemilan',
                'traktir',
                'nraktir',
                'gorengan',
                'sate',
                'pizza',
                'burger',
                'sushi',
                'ramen',
                'seafood',
                'steak',
                'grill',
                'martabak',
                'pecel',
                'gado',
                'soto',
                'rawon',
                'pempek',
                'boba',
                'bubble',
                'minuman',
                'jus',
                'es teh',
                'indomie',
                'mcd',
                'kfc',
                'mcdonald',
                'grabfood',
                'gofood',
                'shopeefood',
                'delivery',
                'ojek makan',
                'dinner',
                'lunch',
                'breakfast',
                'sarapan',
                'makan siang',
                'makan malam',
                'makan pagi',
                'nongkrong',
            ],

            'Transportasi' => [
                'bensin',
                'pertalite',
                'pertamax',
                'solar',
                'bahan bakar',
                'grab',
                'gojek',
                'ojek',
                'taxi',
                'taksi',
                'tol',
                'parkir',
                'transport',
                'bus',
                'angkot',
                'kereta',
                'commuter',
                'mrt',
                'lrt',
                'transjakarta',
                'ojol',
                'motor',
                'mobil',
                'bbm',
                'servis',
                'service',
                'bengkel',
                'ban',
                'oli',
                'spbu',
                'shell',
                'pertamina',
                'blue bird',
                'maxim',
                'indriver',
                'airport',
                'bandara',
                'tiket pesawat',
                'pesawat',
                'kapal',
                'ferry',
                'pelni',
            ],

            'Belanja' => [
                'belanja',
                'shopee',
                'tokopedia',
                'lazada',
                'bukalapak',
                'tiktok shop',
                'blibli',
                'amazon',
                'zalora',
                'sepatu',
                'baju',
                'celana',
                'kaos',
                'kemeja',
                'jaket',
                'tas',
                'dompet',
                'jam tangan',
                'aksesoris',
                'kosmetik',
                'skincare',
                'perawatan',
                'toiletries',
                'sabun',
                'sampo',
                'parfum',
                'deterjen',
                'pembersih',
                'alat tulis',
                'stationary',
                'elektronik',
                'gadget',
                'hp',
                'laptop',
                'headset',
                'earphone',
                'charger',
                'kabel',
                'furniture',
                'perabot',
                'dapur',
                'minimarket',
                'alfamart',
                'indomaret',
                'supermarket',
                'hypermart',
                'carrefour',
                'giant',
                'mall',
                'pasar',
            ],

            'Tagihan' => [
                'listrik',
                'pln',
                'wifi',
                'internet',
                'tagihan',
                'pulsa',
                'air',
                'pdam',
                'hutang',
                'angsuran',
                'cicilan',
                'kredit',
                'pinjaman',
                'telpon',
                'telepon',
                'tv kabel',
                'streaming',
                'netflix',
                'spotify',
                'youtube',
                'disney',
                'icloud',
                'google storage',
                'langganan',
                'sewa',
                'kos',
                'kontrakan',
                'ipk',
                'ipl',
                'bpjs',
                'asuransi',
                'premi',
                'pajak',
                'pbb',
            ],

            'Hiburan' => [
                'bioskop',
                'cinema',
                'cgv',
                'xxi',
                'cinepolis',
                'game',
                'gaming',
                'steam',
                'playstation',
                'ps',
                'xbox',
                'nonton',
                'hiburan',
                'karaoke',
                'bowling',
                'wahana',
                'taman',
                'wisata',
                'liburan',
                'jalan-jalan',
                'jalan jalan',
                'hotel',
                'resort',
                'villa',
                'airbnb',
                'ticket',
                'konser',
                'event',
                'festival',
                'fitness',
                'gym',
                'renang',
                'olahraga',
                'futsal',
                'badminton',
                'tenis',
            ],

            'Kesehatan' => [
                'dokter',
                'obat',
                'rumah sakit',
                'apotek',
                'kesehatan',
                'rs',
                'puskesmas',
                'klinik',
                'laboratorium',
                'lab',
                'cek darah',
                'vitamin',
                'suplemen',
                'masker',
                'hand sanitizer',
                'apotik',
                'bpjs kesehatan',
                'konsultasi',
                'periksa',
                'rawat',
                'operasi',
                'fisioterapi',
                'psikolog',
                'gigi',
                'dokter gigi',
                'kacamata',
                'lensa',
                'optik',
            ],

            'Pendidikan' => [
                'kuliah',
                'sekolah',
                'buku',
                'kursus',
                'pendidikan',
                'spp',
                'ukt',
                'uang sekolah',
                'les',
                'bimbel',
                'udemy',
                'coursera',
                'skillshare',
                'ruangguru',
                'zenius',
                'alat tulis',
                'foto kopi',
                'print',
                'skripsi',
                'tesis',
                'seminar',
                'workshop',
                'pelatihan',
                'sertifikasi',
                'biaya kuliah',
                'iuran',
                'denda',
                'administrasi',
            ],

            'Gaji' => [
                'gaji',
                'salary',
                'payroll',
                'upah',
                'honor',
                'honorarium',
                'komisi',
                'fee',
                'jasa',
                'bayaran',
                'pendapatan',
            ],

            'Bonus' => [
                'bonus',
                'insentif',
                'thr',
                'tf',
                'reward',
                'hadiah',
                'cashback',
                'refund',
                'reimburse',
                'pengembalian',
                'dana kembali',
                'uang kembali',
            ],

            'Investasi' => [
                'investasi',
                'saham',
                'reksa dana',
                'reksadana',
                'crypto',
                'bitcoin',
                'ethereum',
                'deposito',
                'tabungan',
                'nabung',
                'emas',
                'logam mulia',
                'obligasi',
                'sukuk',
                'p2p',
                'bibit',
                'stockbit',
                'ajaib',
                'pluang',
                'invest',
            ],

            'Sosial' => [
                'sedekah',
                'zakat',
                'infak',
                'donasi',
                'sumbangan',
                'iuran',
                'arisan',
                'kondangan',
                'nikahan',
                'wedding',
                'hajatan',
                'kado',
                'hadiah ulang tahun',
                'transfer ke',
                'kirim uang',
                'bantu',
                'patungan',
                'urunan',
            ],
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (!empty($keyword) && str_contains($message, $keyword)) {
                    return $category;
                }
            }
        }

        return 'Lain-lain';
    }

    private function detectDate(string $message): string
    {
        if (str_contains($message, 'kemarin lusa')) {
            return Carbon::today()
                ->subDays(2)
                ->toDateString();
        }

        if (str_contains($message, 'kemarin')) {
            return Carbon::today()
                ->subDay()
                ->toDateString();
        }

        if (
            str_contains($message, 'hari ini') ||
            str_contains($message, 'tadi') ||
            str_contains($message, 'barusan')
        ) {
            return Carbon::today()->toDateString();
        }

        return Carbon::today()->toDateString();
    }
}