<?php

namespace SCRMHub\ActivationSDK;

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;

class JsonErrorHandler
{
    private $app;
    private $request;

    public function __construct(Application $app) {
        $this->app = $app;
    }

    public function setRequest(Request $request) {
        $this->request = $request;
        return $this;
    }

    public function exception($exception) {
        return $this->handle($e, 500);
    }

    public function fatal() {
        $error = error_get_last();
        if($error !== NULL) {
            $errno   = $error["type"];
            $errfile = $error["file"];
            $errline = $error["line"];
            $errstr  = $error["message"];

            $response = $this->handle(new \Exception($errstr, $errno), 500);
            if ($response) {
                $response->send();
            }
        }
    }

    public function handle(\Exception $e, $code) {
        $errorCode = $e->getCode();
        if ($errorCode != 0 && !(error_reporting() & $errorCode)) {
            // This error code is not included in error_reporting
            return null;
        }

        if (!$this->request) {
            try {
                $this->request = $this->app['request_stack']->getMasterRequest();
            } catch (\RuntimeException $e) {
                return null;
            }
        }

        $acceptableContentTypes = $this->request->getAcceptableContentTypes();
        if (!in_array('application/json', $acceptableContentTypes) && !in_array('*/*', $acceptableContentTypes)) {
            return null;
        }

        $this->app['monolog']->addError($e->getMessage());
        $message = array(
            'success' => false,
            'error' => $e->getMessage()
        );

        return $this->app->json(
            $message,
            $code
        );
    }
}