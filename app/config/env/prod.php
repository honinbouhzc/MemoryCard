<?php

ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE);

$basePath = realpath(dirname(__FILE__).'/../../../').'/';
$appPath = $basePath . 'app/';
$cachePath = $appPath . 'cache/';
$webPath = $basePath . '/';
$srcPath = $basePath . 'framework/';
$coreModulesPath = $srcPath . 'Modules/';
$customModulesPath = $appPath . 'modules/';

$config = array(
    'debug' => false,
    'environment' => 'production',

    'use_locale' => true,
    'locale_fallbacks' => ['en', 'cn'],

    'forceSSL' => false,

    'api_url' => array(
        'core' => null,
        'override' => null,
    ),

    // Log
    'monolog.name' => 'ActivationSDK',
    'monolog.level' => \Monolog\Logger::WARNING,
    'monolog.logfile' => $appPath.'logs/error.log',

    // Session
    'session.storage.save_path' => $cachePath . 'session/',

    // Cache
    'cache' => array(
        'driver' => 'FileSystem',
        'options' => array(
            'path' => $cachePath . 'stash/',
        ),
    ),

    // Form secret to prevent CSRF attack
    'form.secret' => md5(__DIR__),

    // Twig
    'twig.path' => $appPath . 'templates',
    'twig.options' => array(
        'cache' => $cachePath .'twig',
        'auto_reload' => false
    ),

    // Assetic
    'assetic.debug' => false,
    'assetic.auto_dump_assets' => true,

    'assetic.path_to_cache' => $cachePath . 'assetic/',
    'assetic.path_to_web' => $webPath,
    'assetic.path_to_source' => $basePath,

    'assetic.input.path_to_styles' => array(
        $coreModulesPath . '*/assets/css/*.css',
        $customModulesPath . '*/assets/css/*.css',
    ),
    'assetic.output.path_to_styles' => 'assets/css/styles.css',
    'assetic.input.path_to_scripts' => array(
        $coreModulesPath . '*/assets/js/*.js',
        $customModulesPath . '*/assets/js/*.js',
    ),
    'assetic.output.path_to_scripts' => 'assets/js/scripts.js',

    'path' => array(
        'base' => $basePath,
        'vendor' => $basePath . 'vendor/',
        'app' => $appPath,
        'src' => $srcPath,
        'web' => $webPath,
        'core_modules' => $coreModulesPath,
        'custom_modules' => $customModulesPath,
    )
);

return $config;
