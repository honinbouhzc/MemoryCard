<?php

$app = require __DIR__.'/app/bootstrap.php';

if ($app instanceof Silex\Application) {
    require_once __DIR__ . '/app/controllers_api.php';
    $app->run();
} else {
    echo 'Failed to initialize application.';
}