<?php

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use SCRMHub\ActivationSDK\PageController;

$routes = require __DIR__.'/config/routes.php';

$activation = $app['controllers_factory'];
$activation->post('/handle/{key}', function(Request $request, $key) use ($app) {
    $pageId = $request->get('page_id');
    $moduleId = $request->get('module_id');
    $data = $request->get('data');
    $app['isAPI'] = true;

    try {
        $page = PageController::createByPageId($app, $pageId);
        $app['locale'] = $page->get('locale');
    } catch (\Exception $e) {
        $app->abort(500, $e->getMessage());
    }

    return $page->runHandle($moduleId, $key, $data);
});

$app->mount('/api', $activation);

//handling CORS preflight request
$app->before(function (Request $request) {
   if ($request->getMethod() === "OPTIONS") {
       $response = new Response();
       $response->headers->set("Access-Control-Allow-Origin","*");
       $response->headers->set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");
       $response->headers->set("Access-Control-Allow-Headers","Content-Type");
       $response->setStatusCode(200);
       return $response->send();
   }
}, Silex\Application::EARLY_EVENT);

//handling CORS respons with right headers
$app->after(function (Request $request, Response $response) {
   $response->headers->set("Access-Control-Allow-Origin","*");
   $response->headers->set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS");
});

//accepting JSON
$app->before(function (Request $request) {
    if (0 === strpos($request->headers->get('Content-Type'), 'application/json')) {
        $data = json_decode($request->getContent(), true);
        $request->request->replace(is_array($data) ? $data : array());
    }
});

// Register the error handler
$errorHandler = new SCRMHub\ActivationSDK\JsonErrorHandler($app);
$app->error(function (\Exception $e, Request $request, $code) use ($errorHandler) {
    $errorHandler->setRequest($request);
    return $errorHandler->handle($e, $code);
});

set_exception_handler(array($errorHandler, 'exception'));
register_shutdown_function(array($errorHandler, 'fatal'));
