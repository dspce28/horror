<?php
// Private page to approve or reject submitted stories.
// Setup: put a password hash in data/config.php (see the instructions this page shows).
declare(strict_types=1);
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

const DATA = __DIR__ . '/data';
const PUBLIC_FILE = __DIR__ . '/stories.json';
$config = is_file(DATA . '/config.php') ? (include DATA . '/config.php') : null;
$hash = is_array($config) ? (string) ($config['password_hash'] ?? '') : '';

function h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function readJson(string $f): array { $d = is_file($f) ? json_decode((string) file_get_contents($f), true) : null; return is_array($d) ? $d : []; }
function writeJson(string $f, array $d): bool {
    $tmp = $f . '.tmp' . bin2hex(random_bytes(3));
    if (file_put_contents($tmp, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) === false) return false;
    return rename($tmp, $f);
}
function validId($id): bool { return is_string($id) && preg_match('/^\d{8}-\d{6}-[a-f0-9]{8}$/', $id) === 1; }
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], (string) ($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Form expired. Go back and reload.'); }
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'hash') {
        $msg = 'hash:' . password_hash((string) ($_POST['new'] ?? ''), PASSWORD_DEFAULT);
    } elseif ($action === 'login') {
        if ($hash !== '' && password_verify((string) ($_POST['password'] ?? ''), $hash)) { session_regenerate_id(true); $_SESSION['ok'] = true; }
        else { sleep(2); $msg = 'Wrong password.'; }
    } elseif ($action === 'logout') {
        $_SESSION = []; session_destroy(); header('Location: admin.php'); exit;
    } elseif (!empty($_SESSION['ok'])) {
        $id = $_POST['id'] ?? '';
        if (!validId($id)) { $msg = 'Unknown story.'; }
        elseif ($action === 'approve') {
            $p = DATA . "/pending/$id.json"; $s = readJson($p);
            if (!$s) $msg = 'That story is no longer pending.';
            else {
                $pub = readJson(PUBLIC_FILE);
                array_unshift($pub, ['id' => $id, 'kind' => $s['kind'] ?? 'heard', 'name' => $s['name'] ?? '', 'city' => $s['city'] ?? '', 'story' => $s['story'] ?? '', 'lang' => $s['lang'] ?? 'en']);
                if (writeJson(PUBLIC_FILE, $pub)) { unlink($p); $msg = 'Published.'; } else $msg = 'Could not write stories.json. Check file permissions.';
            }
        } elseif ($action === 'reject') {
            $p = DATA . "/pending/$id.json"; if (is_file($p)) unlink($p); $msg = 'Deleted.';
        } elseif ($action === 'unpublish') {
            $pub = array_values(array_filter(readJson(PUBLIC_FILE), fn($s) => ($s['id'] ?? '') !== $id));
            $msg = writeJson(PUBLIC_FILE, $pub) ? 'Removed from the site.' : 'Could not write stories.json.';
        }
    }
}
$authed = !empty($_SESSION['ok']) && $hash !== '';
$pending = [];
if ($authed) { foreach (glob(DATA . '/pending/*.json') ?: [] as $f) $pending[] = readJson($f); usort($pending, fn($a, $b) => strcmp($b['id'] ?? '', $a['id'] ?? '')); }
$published = $authed ? readJson(PUBLIC_FILE) : [];
$csrf = h($_SESSION['csrf']);
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Stories admin</title>
<style>
body { font: 15px/1.55 system-ui, sans-serif; background: #0b090d; color: #eee6d8; margin: 0; padding: 24px 16px; }
main { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
h1 { margin: 0; font-size: 24px; } h2 { margin: 18px 0 0; font-size: 18px; color: #f2c230; }
.card { background: #16121a; border: 1px solid #2c2530; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.meta { font-size: 13px; color: #9a90a3; } .story { white-space: pre-line; }
.row { display: flex; gap: 8px; flex-wrap: wrap; } form { margin: 0; }
button { font: inherit; border: 0; border-radius: 6px; padding: 7px 14px; cursor: pointer; }
.ok { background: #3ddc6f; color: #04210e; } .no { background: #3a2a30; color: #ffb4b4; } .plain { background: #2c2530; color: #eee6d8; }
input { font: inherit; padding: 8px 10px; border-radius: 6px; border: 1px solid #3a3040; background: #000; color: #eee; }
.msg { color: #f2c230; } code { background: #000; padding: 2px 6px; border-radius: 4px; word-break: break-all; }
</style></head><body><main>
<h1>Ghost stories: admin</h1>
<?php if ($msg !== '' && !str_starts_with($msg, 'hash:')): ?><p class="msg"><?= h($msg) ?></p><?php endif; ?>
<?php if ($hash === ''): ?>
  <div class="card">
    <strong>One-time setup</strong>
    <p>1. Type the password you want and press <em>Make hash</em>. Nothing is saved yet.</p>
    <form method="post" class="row"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="hash"><input type="password" name="new" required minlength="10" placeholder="At least 10 characters"><button class="plain">Make hash</button></form>
    <?php if (str_starts_with($msg, 'hash:')): ?>
      <p>2. In Hostinger File Manager, create the file <code>data/config.php</code> with exactly this content:</p>
      <p><code>&lt;?php return ['password_hash' =&gt; '<?= h(substr($msg, 5)) ?>'];</code></p>
      <p>3. Reload this page and log in.</p>
    <?php endif; ?>
  </div>
<?php elseif (!$authed): ?>
  <form method="post" class="card"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="login"><label>Password <input type="password" name="password" required autofocus></label><div><button class="ok">Log in</button></div></form>
<?php else: ?>
  <form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="action" value="logout"><button class="plain">Log out</button></form>
  <h2>Waiting for you (<?= count($pending) ?>)</h2>
  <?php if (!$pending): ?><p class="meta">No new stories.</p><?php endif; ?>
  <?php foreach ($pending as $s): ?>
    <div class="card">
      <div class="meta"><?= h(strtoupper($s['kind'] ?? '')) ?> · <?= h(($s['name'] ?? '') ?: 'Anonymous') ?><?= ($s['city'] ?? '') ? ' · ' . h($s['city']) : '' ?> · <?= h($s['lang'] ?? '') ?> · <?= h($s['received'] ?? '') ?></div>
      <div class="story"><?= h($s['story'] ?? '') ?></div>
      <div class="row">
        <form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="id" value="<?= h($s['id'] ?? '') ?>"><input type="hidden" name="action" value="approve"><button class="ok">Publish</button></form>
        <form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="id" value="<?= h($s['id'] ?? '') ?>"><input type="hidden" name="action" value="reject"><button class="no">Delete</button></form>
      </div>
    </div>
  <?php endforeach; ?>
  <h2>On the site (<?= count($published) ?>)</h2>
  <?php foreach ($published as $s): ?>
    <div class="card">
      <div class="meta"><?= h(strtoupper($s['kind'] ?? '')) ?> · <?= h(($s['name'] ?? '') ?: 'Anonymous') ?><?= ($s['city'] ?? '') ? ' · ' . h($s['city']) : '' ?></div>
      <div class="story"><?= h($s['story'] ?? '') ?></div>
      <form method="post"><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="id" value="<?= h($s['id'] ?? '') ?>"><input type="hidden" name="action" value="unpublish"><button class="no">Remove from site</button></form>
    </div>
  <?php endforeach; ?>
<?php endif; ?>
</main></body></html>
