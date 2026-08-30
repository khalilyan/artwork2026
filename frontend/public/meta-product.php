<?php
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$defaultTitle = 'ARTWORK | Դիզայներական կահույք Հայաստանում';
$defaultDescription = 'ARTWORK-ի դիզայներական կահույք, հավաքածուներ, անհատական լուծումներ և վերականգնման ծառայություններ Հայաստանում։';
$defaultImage = '/artwork-logo.png';

$siteUrl = getenv('PUBLIC_SITE_URL');
if (!$siteUrl) {
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'artwork.am';
  $siteUrl = $scheme . '://' . $host;
}
$siteUrl = rtrim($siteUrl, '/');

$apiBase = getenv('PUBLIC_API_URL');
if (!$apiBase) {
  $apiBase = 'https://api.artwork.am/api';
}
$apiBase = rtrim($apiBase, '/');
$apiOrigin = preg_replace('#/api/?$#', '', $apiBase);

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$segments = array_values(array_filter(explode('/', trim($requestPath, '/'))));

$productSlug = '';
if (count($segments) >= 4 && strtolower($segments[0]) === 'rooms') {
  $productSlug = $segments[3];
}

$title = $defaultTitle;
$description = $defaultDescription;
$image = $defaultImage;
$type = 'website';
$priceAmount = null;

function fetch_json($url) {
  $context = stream_context_create([
    'http' => [
      'timeout' => 5,
      'method' => 'GET',
      'header' => "Accept: application/json\r\nUser-Agent: artwork-meta-proxy/1.0\r\n",
    ],
    'ssl' => [
      'verify_peer' => true,
      'verify_peer_name' => true,
    ],
  ]);

  $raw = @file_get_contents($url, false, $context);
  if ($raw !== false) {
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
  }

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 3,
      CURLOPT_TIMEOUT => 5,
      CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: artwork-meta-proxy/1.0',
      ],
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($response !== false && $status >= 200 && $status < 300) {
      $decoded = json_decode($response, true);
      return is_array($decoded) ? $decoded : null;
    }
  }

  return null;
}

if ($productSlug !== '') {
  $endpoint = $apiBase . '/catalog/products/' . rawurlencode($productSlug);

  $payload = fetch_json($endpoint);
  if (is_array($payload)) {
    $product = $payload['product'] ?? null;

    if (is_array($product)) {
      $productName = trim((string)($product['name'] ?? ''));
      $productDescription = trim((string)($product['description'] ?? ''));
      $productImage = $product['image'] ?? '';
      $productPriceText = trim((string)($product['price'] ?? ''));

      if ($productName !== '') {
        $title = $productName . ' | ARTWORK';
      }

      if ($productDescription !== '') {
        $description = $productPriceText !== ''
          ? ($productPriceText . ' · ' . $productDescription)
          : $productDescription;
      } elseif ($productPriceText !== '') {
        $description = $productPriceText;
      }

      if (is_string($productImage) && $productImage !== '') {
        $image = $productImage;
      }

      if (isset($product['priceAmount']) && is_numeric($product['priceAmount'])) {
        $priceAmount = (string)($product['priceAmount'] + 0);
      }

      $type = 'product';
    }
  }
}

function esc($value) {
  return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function absolute_url($value, $baseUrl) {
  $value = (string)$value;
  if ($value === '') return '';
  if (preg_match('/^https?:\/\//i', $value)) return $value;
  return rtrim($baseUrl, '/') . '/' . ltrim($value, '/');
}

$canonical = absolute_url($requestUri, $siteUrl);
$imageBase = (is_string($image) && strpos($image, '/uploads/') === 0) ? $apiOrigin : $siteUrl;
$imageUrl = absolute_url($image, $imageBase);
?>
<!doctype html>
<html lang="hy">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo esc($title); ?></title>
    <meta name="description" content="<?php echo esc($description); ?>" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="<?php echo esc($canonical); ?>" />

    <meta property="og:title" content="<?php echo esc($title); ?>" />
    <meta property="og:description" content="<?php echo esc($description); ?>" />
    <meta property="og:type" content="<?php echo esc($type); ?>" />
    <meta property="og:url" content="<?php echo esc($canonical); ?>" />
    <meta property="og:site_name" content="ARTWORK Կահույք" />
    <meta property="og:locale" content="hy_AM" />
    <meta property="og:image" content="<?php echo esc($imageUrl); ?>" />
    <meta property="og:image:alt" content="<?php echo esc($title); ?>" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo esc($title); ?>" />
    <meta name="twitter:description" content="<?php echo esc($description); ?>" />
    <meta name="twitter:image" content="<?php echo esc($imageUrl); ?>" />

<?php if ($priceAmount !== null && $priceAmount !== ''): ?>
    <meta property="product:price:amount" content="<?php echo esc($priceAmount); ?>" />
    <meta property="product:price:currency" content="AMD" />
<?php endif; ?>

    <meta http-equiv="refresh" content="0;url=<?php echo esc($canonical); ?>" />
    <script>
      window.location.replace(<?php echo json_encode($canonical, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>);
    </script>
  </head>
  <body>
    <p>Redirecting...</p>
  </body>
</html>
