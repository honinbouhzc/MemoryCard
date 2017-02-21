<?php

namespace SCRMHub\ActivationSDK;

use Silex;
use Doctrine\Common\Inflector;

use JsonSchema\Uri\UriRetriever;
use JsonSchema\RefResolver;
use JsonSchema\Validator;
use Detection\MobileDetect;

class BasePage {
    use Cache;

    private $_moduleCache;

    protected $modules;
    protected $app;
    protected $appConfig;
    protected $mobileDetect;

    public function __construct(\Silex\Application $app, $appConfig) {
        $this->app = $app;
        $this->appConfig = $appConfig;
        $this->mobileDetect = new MobileDetect();

        //Useful globals
        $app['isMobile'] = $this->mobileDetect->isMobile() ? 'true' : 'false';
        $app['isWechat'] = $this->_isWechat() ? 'true' : 'false';

        $app['twig']->addGlobal('lang', $app['locale']);

        $app['twig']->addGlobal('pageId', $this->getPageId());
        $app['twig']->addGlobal('appkey', $app['app.appkey']);
        $app['twig']->addGlobal('baseUrl', $app['app_urls']['home']);

        $app['twig']->addGlobal('isMobile', $app['isMobile']);
        $app['twig']->addGlobal('isWechat', $app['isWechat']);

        $this->initialiseCache();
        $this->addTranslations();
    }

    public function getClass() {
        return (new \ReflectionClass($this))->getShortName();
    }

    protected function _isWechat() {
        $microMsgrVersion = $this->mobileDetect->version('MicroMessenger');
        return ($microMsgrVersion && is_string($microMsgrVersion));
    }

    private function initialiseCache() {
        $pageName = preg_replace("/[^a-zA-Z0-9 ]/", "", $this->getPageId());
        $cacheNamespace = 'page' . $pageName;
        $this->setupCache($cacheNamespace);
    }

    public function addTranslations() {
        $app = $this->app;
        $locales = $app['locale_fallbacks'];

        foreach ($locales as $locale) {
            $translation = $app['path']['app'] . 'pages/i18n/' . $this->getClass() . "/{$locale}/translation.yml";

            if (file_exists($translation)) {
                $domain = $this->getPageId();
                $app['translator']->addResource('yaml', $translation, $locale, $domain);
            }
        }
    }

    public function getModules() {
        if ($this->_moduleCache) {
            return $this->_moduleCache;
        }

        $app = $this->app;
        $moduleConfigs = $this->appConfig['modules'];
        $moduleKeys = $this->modules;
        $modules = array();

        $retriever = new UriRetriever;
        $validator = new Validator;

        // global modules defined so add them
        if(!empty($this->appConfig['global_modules'])) {
            foreach($this->appConfig['global_modules'] as $moduleKey) {
                if(!isset($moduleKeys[$moduleKey])) {
                    //It exists so add it to the page module stack
                    if(isset($moduleConfigs[$moduleKey])) {
                        $moduleKeys[] = $moduleKey;
                    } else {
                        //throw error
                        $msg = sprintf("A global module [%s] has been specified but there is no configuration for it.", $moduleKey);
                        throw new \Exception($msg);
                    }
                }
            }
        }

        if (is_array($moduleKeys)) {
            foreach ($moduleKeys as $moduleKey) {
                if (empty($moduleConfigs[$moduleKey])) {
                    $msg = sprintf("A module [%s] has been specified but there is no configuration for it.", $moduleKey);
                    throw new \Exception($msg);
                }

                if ($modules[$moduleKey]) {
                    // already included
                    continue;
                }

                $moduleClassName = $moduleConfigs[$moduleKey]['module_class'];
                $moduleConfig = $moduleConfigs[$moduleKey]['config'];
                if ( $app['use_locale'] && isset($moduleConfig[$app['locale']]) ) {
                    $moduleConfig = $moduleConfig[$app['locale']];
                }

                // load custom modules
                if ($moduleClassName && !preg_match("/\\\\/", $moduleClassName)) {
                    require_once $app['path']['app'] . 'modules/' . $moduleClassName . '.php';
                }

                // check validity of module config
                if ($this->app['debug']) {
                    if (preg_match("/\\\\/", $moduleClassName)) {
                        $classNameParts = explode('\\', $moduleClassName);
                        $configSchema = $app['path']['core_modules'] . array_pop($classNameParts) . '/configSchema.json';
                    } else {
                        $configSchema = $app['path']['custom_modules'] . $moduleClassName . '/configSchema.json';
                    }

                    if (file_exists($configSchema)) {
                        $schema = $retriever->retrieve('file://' . $configSchema);
                        $data = (object) $moduleConfig;

                        $refResolver = new RefResolver($retriever);
                        $refResolver->resolve($schema, 'file://' . dirname($configSchema));

                        // Validate
                        $validator->check($data, $schema);

                        if (!$validator->isValid()) {
                            $msg = sprintf("Module config [%s] does not validate. Violations:\n", $moduleKey);
                            foreach ($validator->getErrors() as $error) {
                                $msg .= sprintf("[%s] %s\n", $error['property'], $error['message']);
                            }

                            throw new \Exception($msg);
                        }
                    }
                }

                $module = new $moduleClassName($app, $moduleKey, $moduleConfig);
                $modules[$moduleKey] = $module;
            }
        }

        $this->_moduleCache = $modules;
        return $modules;
    }

    public function getModule($moduleId) {
        $modules = $this->getModules();
        return $modules[$moduleId];
    }

    public function getPageId() {
        return Inflector\Inflector::tableize(get_class($this));
    }

    public function preload() {
    }

    public function render() {
        $app = $this->app;

        $template = '@Pages/' . $this->getPageId() . '.html.twig';
        $modules = $this->getModules();
        $templateData = array(
            'modules' => $modules,
        );

        foreach ($modules as $module) {
            $module->preload();
        }

        return $app['twig']->render($template, $templateData);
    }

    public function postload() {
    }

    public function handleEvent($eventResponse, $data) {
    }
}