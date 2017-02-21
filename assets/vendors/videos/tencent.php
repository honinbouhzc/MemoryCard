<?php

$id = $_REQUEST['id'];

$app = require __DIR__.'/../../../app/bootstrap.php';
$cachePool = $app['cache_factory']('videotencent');
$item = $cachePool->getItem($id);
if (!$item->isMiss()) {
    $json = $item->get();
} else {
    $client = new GuzzleHttp\Client();
    $res = $client->get('http://vv.video.qq.com/geturl?vid=' . $id . '&otype=json&platform=1&ran=0%2E9652906153351068&defaultfmt=mp4');
    $response = (string) $res->getBody();
    preg_match('/QZOutputJson=(.*);/', $response, $matches);
    $data = json_decode($matches[1], true);
    $json = json_encode(array(
        'videos' => array(
            'high' => array(
                array(
                    'type' => 'mp4',
                    'url' => $data['vd']['vi'][0]['url'],
                ),
            ),
        ),
    ));

    // cache for an hour
    $item->set($json, 3600);
}

header('Content-Type: application/json');
echo $json;
