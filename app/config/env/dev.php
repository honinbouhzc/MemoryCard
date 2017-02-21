<?php

ini_set('display_errors', 1);

$config = require_once "prod.php";

$config_dev = array(
    'debug' => true,
    'environment' => 'development',

    'assetic.debug' => true,

    'forceSSL' => false,

    'api_url' => array(
    ),

    'twig.options' => array(
        'auto_reload' => true
    )
);

$config = array_replace_recursive($config, $config_dev);
return $config;