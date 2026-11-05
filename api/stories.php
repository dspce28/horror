<?php
// Receives a story from the site's form and saves it as "pending".
// Nothing is published until it is approved in admin.php.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const DATA = __DIR__ . '/../data';

function out(int $code, array $body): never { http_response_code($code); echo json_encode($body); exit; }
function clean($v, int $max): string {
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) ($v ?? '')) ?? '';
    return mb_substr(trim($s), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, ['error' => 'method']);
$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) out(400, ['error' => 'bad_json']);
if (!empty($in['website'])) out(201, ['ok' => true]); // honeypot field: bots fill it, people never see it

$story = clean($in['story'] ?? '', 3000);
if (mb_strlen($story) < 40) out(422, ['error' => 'too_short']);
$kind = in_array($in['kind'] ?? '', ['prank', 'real', 'heard'], true) ? $in['kind'] : 'heard';
$lang = in_array($in['lang'] ?? '', ['en', 'hi', 'gu'], true) ? $in['lang'] : 'en';

if (!is_dir(DATA . '/pending') && !mkdir(DATA . '/pending', 0750, true) && !is_dir(DATA . '/pending')) out(500, ['error' => 'store']);
if (!is_dir(DATA . '/rate')) @mkdir(DATA . '/rate', 0750, true);

// At most 5 stories per hour from one connection. The address is hashed with the date and never stored as-is.
$key = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . date('Y-m-d')), 0, 32);
$rateFile = DATA . '/rate/' . $key;
$hits = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > time() - 3600));
if (count($hits) >= 5) out(429, ['error' => 'rate']);
$hits[] = time();
file_put_contents($rateFile, json_encode($hits), LOCK_EX);

$id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
$record = [
    'id' => $id, 'name' => clean($in['name'] ?? '', 40), 'city' => clean($in['city'] ?? '', 40),
    'kind' => $kind, 'lang' => $lang, 'story' => $story, 'received' => date('c'),
];
if (file_put_contents(DATA . "/pending/$id.json", json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) === false) {
    out(500, ['error' => 'store']);
}
out(201, ['ok' => true]);
