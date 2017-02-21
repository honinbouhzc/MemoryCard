<?php

namespace SCRMHub\ActivationSDK;

use SCRMHub\SDK\API;
use Silex\Application;
use Doctrine\Common\Inflector;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class PageController {
    use SessionStorage, Cache, UserCache;

    private $app;
    private $page;

    public function __construct(Application $app, $appConfig) {
        $this->app = $app;
        $app['page_controller'] = $this;

        $this->initialiseSession($appConfig);
        if (!isset($app['isAPI'])) {
            $this->set('locale', $this->app['locale']);
        }

        $this->initialiseAPI($appConfig);
        $this->initialiseCache();
        $this->initialiseUserCache();
        $this->initialiseUrls();
    }

    public static function createByPageName($app, $pageName) {
        $pageFile = $app['path']['app'] . 'pages/' . $pageName . '.php';
        if (!file_exists($pageFile)) {
            throw new \Exception("Pagefile doesn't exist");
        }

        require_once $pageFile;
        $className = Inflector\Inflector::classify(
            preg_replace('/\.[^.]+$/','', basename($pageFile))
        );

        if (!class_exists($className)) {
            throw new \Exception("Class '" . $className . "' doesn't exist.");
        }

        $appConfig = require_once $app['path']['app'] . 'config/app_config.php';

        $instance = new self($app, $appConfig);
        $page = new $className($app, $appConfig);

        $instance->setPage($page);

        return $instance;
    }

    public static function createByPageId($app, $pageId) {
        $pageName = Inflector\Inflector::classify($pageId);
        return self::createByPageName($app, $pageName);
    }

    public function setPage($page) {
        $this->page = $page;
    }

    private function isUrlEqual($url1, $url2, $ignorePath = false) {
        $mustMatch = array_flip($ignorePath ? ['host', 'port'] : ['host', 'port', 'path']);

        $url1 = array_intersect_key(parse_url($url1), $mustMatch);
        $url2 = array_intersect_key(parse_url($url2), $mustMatch);

        return $url1 === $url2;
    }

    private function initialiseSession($config) {
        // register session with app's uuid
        $bagId = 'app-' . $config['core']['uuid'];
        $this->registerBagId($bagId);

        $sessionKey = 'core';
        $this->setupSession($sessionKey);
    }

    private function initialiseAPI($config) {
        $app = $this->app;

        // Workout the location token
        $referer = $_SERVER['HTTP_REFERER'];
        $fullUrl = $app['request_stack']->getMasterRequest()->getUri();

        $currentLocation = null;

        if (is_array($config['core']['locations'])) foreach ($config['core']['locations'] as $location) {
            $locationUrl = $location['url'];
            $installedLocationUrl = $location['installed_url'];

            // resolve location by referrer (iframe)
            if ($this->isUrlEqual($referer, $locationUrl)) {
                $currentLocation = $location;
                break;

            // resolve location by referrer (iframe) where installed url is different form platform page url
            } elseif ($this->isUrlEqual($referer, $installedLocationUrl, true)) {
                $currentLocation = $location;
                break;

            // resolve location by URL (website)
            } else if ($this->isUrlEqual($fullUrl, $locationUrl, true)) {
                $currentLocation = $location;
                break;
            // resolve location by subdomain (mobile native app, wechat)
            } else if ($config['core']['use_wildcard_domain']) {
                $domain = $_SERVER['HTTP_HOST'];
                $subDomain = explode(".", $domain)[0];
                if ($subDomain == $location['wildcard_domain']) {
                    $currentLocation = $location;
                    break;
                }
            }
        }

        if (!empty($currentLocation)) {
            $app['app.current_location'] = $currentLocation;
        }

        if ($app['environment'] == 'development') {
            $firstLocation = $config['core']['locations'][0] ?: null;
            $appKey = $firstLocation['api_token'];
        } elseif ($currentLocation) {
            $appKey = $currentLocation['api_token'];
        }

        if (empty($appKey)) {
            throw new \Exception("Unable to resolve appkey, please check locations are valid");
        }

        $appSecret = $config['core']['secret'] ?: null;
        if (empty($appSecret)) {
            throw new \Exception("Unable to resolve appSecret");
        }

        // initialise SCRMHub API
        $apiCore = API::init(array(
            'appkey' => $appKey,
        ));

        $apiCore->set('appsecret', $appSecret);
        $app['app.appkey'] = $appKey;

        $pageController = $this;
        // remove invalid token
        API::onTokenError(function() use($pageController) {
            $pageController->remove('access_token');
            $pageController->remove('connected_networks');
            $pageController->forwardExpired();
        });

        // remove invalid puuid
        API::onPuuidError(function() use($pageController) {
            $pageController->remove('puuid');
            $pageController->forwardExpired();
        });

        API::onError(function($error) use($app) {
            $app['monolog']->warning(print_r($error, true));
        });

        $accessToken = $this->get('access_token');
        if ($accessToken) {
            $apiCore->set('token', $accessToken);
        }

        $puuid = $this->get('puuid');
        if (empty($puuid)) {
            $api = new API\Person();

            $response = $api->get();
            if ($response->isOk()) {
                $result = $response->getResult();
                $puuid = $result;
                $this->set('puuid', $puuid);
            } else {
                // handle error
                $error = $response->getError();
                throw new \Exception("Unable to initialise person uuid");
            }
        }

        if ($puuid) {
            $apiCore->set('puuid', $puuid);
        }
    }

    private function initialiseCache() {
        $cacheNamespace = 'core';
        $this->setupCache($cacheNamespace);
    }

    private function initialiseUserCache() {
        $puuid = $this->get('puuid');
        $this->setupUserCache($puuid);
    }

    private function initialiseUrls() {
        if (isset($this->app['isAPI'])) {
            $this->app['app_urls'] = ['home' => null, 'page' => null];
        } else {
            $routeName = $this->app['request_stack']->getCurrentRequest()->get('_route');

            //Generate urls
            $this->app['app_urls'] = [
                'home'  => $this->app['url_generator']->generate('home', [], UrlGeneratorInterface::ABSOLUTE_URL),
                'page'  => $this->app['url_generator']->generate($routeName, [], UrlGeneratorInterface::ABSOLUTE_URL)
            ];
        }
    }

    public function forwardExpired() {
        $url = $this->app['app_urls']['home'] . 'expired';
        $this->forward($url, true);
    }

    public function forward($url, $noCache = false) {
        if ($noCache || $this->app['debug']) {
            header("Cache-Control: no-cache, must-revalidate");
        }

        header("Location: " . $url);
        exit;
    }

    public function run() {
        $app = $this->app;
        $page = $this->page;

        $page->preload();
        $html = $page->render();
        $page->postload();

        return $html;
    }

    public function runHandle($moduleId, $key, $data) {
        $page = $this->page;
        $module = $page->getModule($moduleId);
        if ($moduleId && empty($module)) {
            throw new \Exception('Invalid module id');
        }

        $eventResponse = new EventResponse($key, $module);

        try {
            if ($module) {
                $module->handleEvent($eventResponse, $data);
            }

            $page->handleEvent($eventResponse, $data);

            $scripts = $eventResponse->getCalls();

            $results = array(
                'success' => true,
                'scripts' => $scripts,
            );
        } catch (Exception $e) {
            $results = array(
                'success' => false,
                'error' => $e->getMessage(),
            );
        }


        return new JsonResponse($results);
    }
}