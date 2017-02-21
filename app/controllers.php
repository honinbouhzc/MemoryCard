<?php

use Symfony\Component\Debug\ErrorHandler;
use Symfony\Component\Debug\ExceptionHandler;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use SCRMHub\ActivationSDK\PageController;

error_reporting(E_ALL & ~E_NOTICE);
ErrorHandler::register();
if ('cli' !== php_sapi_name()) {
    ExceptionHandler::register();
}

$routes = require __DIR__.'/config/routes.php';

$activation = $app['controllers_factory'];
foreach ($routes as $route => $pageName) {
    $activation->match($route, function (Silex\Application $app) use ($app, $pageName) {
        try {
            $page = PageController::createByPageName($app, $pageName);
        } catch (\Exception $e) {
            $app->abort(500, $e->getMessage());
        }

        return $page->run();
    })->method('GET|POST')->bind($route == '/' ? 'home' : preg_replace('|/|','',$route));
}

if ($app['use_locale']) {
    $app->mount('/{_locale}/', $activation);
    $app->get('/', function() use($app) {
        $maps = ['en' => 'en', 'cn' => 'cn', 'zh' => 'cn'];
        $request = $app['request_stack']->getCurrentRequest();
        $locale = $request->getPreferredLanguage(array_keys($maps));

        return $app->redirect(
            $app['url_generator']->generate('home', ['_locale' => $maps[$locale]])
        );
    });
} else {
    $app->mount('/', $activation);
}

$app->get('/expired', function() use($app) {
    $templateData['home'] = $app['url_generator']->generate('home', [], true);
    return $app['twig']->render('expired.html.twig', $templateData);
});

$app->error(function (\Exception $e, Request $request, $code) use ($app) {
    $app['monolog']->addError($e->getMessage());
    if ($app['debug']) {
        return;
    }

    // 404.html, or 40x.html, or 4xx.html, or error.html
    $templates = array(
        'errors/'.$code.'.html.twig',
        'errors/'.substr($code, 0, 2).'x.html.twig',
        'errors/'.substr($code, 0, 1).'xx.html.twig',
        'errors/default.html.twig',
    );

    return new Response($app['twig']->resolveTemplate($templates)->render(array('code' => $code)), $code);
});
