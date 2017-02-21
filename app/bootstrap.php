<?php

$autoloader = require_once __DIR__ . '/../vendor/autoload.php';

use Silex\Provider\MonologServiceProvider;

use Silex\Provider\TwigServiceProvider;
use Silex\Provider\RoutingServiceProvider;
use Silex\Provider\ValidatorServiceProvider;
use Silex\Provider\ServiceControllerServiceProvider;
use Silex\Provider\HttpFragmentServiceProvider;

use Silex\Provider\FormServiceProvider;
use Silex\Provider\CsrfServiceProvider;

use Silex\Provider\SessionServiceProvider;

use Silex\Provider\LocaleServiceProvider;

use Silex\Provider\TranslationServiceProvider;
use Symfony\Component\Translation\Loader\YamlFileLoader;
use SCRMHub\SDK\API;

$config = require __DIR__ . '/config/env/dev.php';

$app = new Silex\Application($config);
$app->register(new MonologServiceProvider(), $config);

$app->register(new LocaleServiceProvider());
$app->register(new TranslationServiceProvider(), $config);
$app->register(new RoutingServiceProvider());
$app->register(new ValidatorServiceProvider());
$app->register(new ServiceControllerServiceProvider());
$app->register(new TwigServiceProvider(), $config);
$app->register(new HttpFragmentServiceProvider());

$app->register(new SessionServiceProvider(), $config);
$app->register(new FormServiceProvider());
$app->register(new CsrfServiceProvider());

if ($config['forceSSL']) {
    $app['controllers']
        ->requireHttps()
    ;
}

$apiCore = API::getInstance();

// override API url
if(!empty($apiUrl = $config['api_url']['core'])) {
    $apiCore->setup(array('url' => $apiUrl));
}

if(!empty($overrideUrl = $config['api_url']['override'])) {
    $apiCore->setOverrideUrl($overrideUrl);
}

$am = new Assetic\AssetManager();
$fm = new Assetic\FilterManager();

$cssRewrite = new Assetic\Filter\CssRewriteFilter();
$styles = new Assetic\Asset\GlobAsset($config['assetic.input.path_to_styles'], array($cssRewrite), realpath($app['path']['base']));
$scripts = new Assetic\Asset\GlobAsset($config['assetic.input.path_to_scripts'], array(), realpath($app['path']['base']));
$globs = array(
    'styles' => $styles,
    'scripts' => $scripts
);

$app['assets.styles'] = array();
$app['assets.scripts'] = array();

if ($config['assetic.auto_dump_assets']) {
    $am->set('styles', new Assetic\Asset\AssetCache(
        $styles,
        new Assetic\Cache\FilesystemCache($config['assetic.path_to_cache'])
    ));
    $am->get('styles')->setTargetPath($config['assetic.output.path_to_styles']);

    $am->set('scripts', new Assetic\Asset\AssetCache(
        $scripts,
        new Assetic\Cache\FilesystemCache($config['assetic.path_to_cache'])
    ));
    $am->get('scripts')->setTargetPath($config['assetic.output.path_to_scripts']);

    $writer = new Assetic\AssetWriter($config['assetic.path_to_web']);
    $am->get('styles');
    $writer->writeManagerAssets($am);
}

$app['translator'] = $app->extend('translator', function($translator, $app) {
    $translator->addLoader('yaml', new YamlFileLoader());

    return $translator;
});


$app['twig'] = $app->extend('twig', function ($twig, $app) use ($globs) {
    $twig->addFunction(new \Twig_SimpleFunction('assets', function ($name) use ($app, $globs) {
        $path = array('scripts' => 'js', 'styles' => 'css');
        $files = array('assets/' . $path[$name] . '/core.' . $path[$name]);

        foreach ($app['assets.' . $name] as $asset) {
            $files[] = $asset;
        }

        if (!$app['assetic.debug']) {
            $files[] = $app['assetic.output.path_to_'.$name];
        } else {
            $globAsset = $globs[$name];
            if (empty($globAsset)) {
                throw new Twig_Error_Runtime('The assets function only accepts (' . implode(", ", array_keys($globs)) . ')');
            }

            $assets = $globAsset->all();
            foreach ($assets as $asset) {
                $files[] = $asset->getSourcePath() . '?now='.time();
            }
        }

        return array_unique($files);
    }));

    $twig->addFunction(new \Twig_SimpleFunction('puuid', function () use ($app) {
        return $app['page_controller']->get('puuid');
    }));

    // include modules template path
    $app['twig.loader.filesystem']->addPath($app['path']['core_modules'], 'CoreModules');
    $app['twig.loader.filesystem']->addPath($app['path']['custom_modules'], 'CustomModules');

    if (is_dir($app['path']['app'] . "pages/templates/{$app['locale']}")) {
        $app['twig.loader.filesystem']->addPath($app['path']['app'] . "pages/templates/{$app['locale']}", 'Pages');
    }
    $app['twig.loader.filesystem']->addPath($app['path']['app'] . 'pages/templates', 'Pages');

    if (is_dir($app['path']['app'] . "templates/{$app['locale']}")) {
        $app['twig.loader.filesystem']->addPath($app['path']['app'] . "templates/{$app['locale']}", 'CustomTemplates');
    }
    $app['twig.loader.filesystem']->addPath($app['path']['app'] . 'templates', 'CustomTemplates');

    return $twig;
});

use SCRMHub\ActivationSDK\Services\HtmlBlock\HtmlBlock;
$app->register(new HtmlBlock(), []);

// Set cache
$driver  = $app['cache']['driver'];
$options = $app['cache']['options'];

$driverClass = 'Stash\Driver\\' . $driver;
$driver      = new $driverClass($options);

$app['cache_factory'] = $app->protect(function($cacheKey) use ($driver) {
    $pool = new Stash\Pool($driver);
    $pool->setNamespace($cacheKey);
    return $pool;
});

return $app;