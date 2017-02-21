<?php

namespace SCRMHub\ActivationSDK;

use Silex;
use Doctrine\Common\Inflector;

class BaseModule {
    use SessionStorage, Cache;

    protected $app;
    protected $customKey;
    protected $moduleConfig;
    protected $events;
    protected $isEvent;

    public function __construct(\Silex\Application $app, $customKey, $moduleConfig) {
        $this->app = $app;
        $this->customKey = $customKey;

        $defaultConfig = $this->getDefaultConfig();
        $this->moduleConfig = array_replace_recursive($defaultConfig, (array) $moduleConfig);

        $this->addTranslations();
        $this->initialiseSession();
        $this->initialiseCache();
    }

    private function initialiseSession() {
        $sessionKey = 'module-'.$this->getId();
        $this->setupSession($sessionKey);
    }

    private function initialiseCache() {
        $moduleName = preg_replace("/[^a-zA-Z0-9 ]/", "", $this->getId());
        $cacheNamespace = 'module' . $moduleName;
        $this->setupCache($cacheNamespace);
    }

    protected function getDefaultConfig() {
        if($this->isCore())
            $path = $this->app['path']['core_modules'] . $this->getClass() . '/defaultConfig.php';
        else
            $path = $this->app['path']['custom_modules'] . $this->getClass() . '/defaultConfig.php';

        return (file_exists($path)) ? include $path : [];
    }

    private function isCore() {
        return preg_match("/\\\\/", get_class($this));
    }

    protected function useBaseForm() {
        return true;
    }

    public function preload() {
        $this->addRequiredAssets();
    }

    public function getRequiredAssets() {
        return array(
            'styles' => array(),
            'scripts' => array(),
        );
    }

    public function addRequiredAssets() {
        $app = $this->app;
        $requiredAssets = $this->getRequiredAssets();
        $app['assets.styles'] = array_merge($app['assets.styles'], $requiredAssets['styles']);
        $app['assets.scripts'] = array_merge($app['assets.scripts'], $requiredAssets['scripts']);
    }

    public function addTranslations() {
        $app = $this->app;
        $locales = $app['locale_fallbacks'];

        foreach ($locales as $locale) {
            $moduleTranslation = $app['path']['core_modules'] . $this->getClass() . "/i18n/{$locale}/translation.yml";
            $customTranslation = $app['path']['app'] . 'i18n/' . $this->getId() . "/{$locale}/translation.yml";

            if (file_exists($moduleTranslation)) {
                $app['translator']->addResource('yaml', $moduleTranslation, $locale, $this->getId());
            }

            if (file_exists($customTranslation)) {
                $app['translator']->addResource('yaml', $customTranslation, $locale, $this->getId());
            }
        }
    }

    public function getId() {
        return $this->customKey;
    }

    public function getClass() {
        return (new \ReflectionClass($this))->getShortName();
    }

    public function getIdSelector() {
        return '[data-module-id=' . $this->getId() . ']';
    }

    public function getTemplateSelector($templateName = 'default') {
        return self::getIdSelector() . '[data-module-template=' . $templateName . ']';
    }

    public function render($templateName = "default", $templateData = array()) {
        $funcName = 'render' . Inflector\Inflector::classify($templateName);

        if (method_exists($this, $funcName)) {
            return $this->$funcName($templateData);
        } else {
            return $this->renderTemplate($templateName, $templateData);
        }
    }

    /**
     * Function to allow sub classes to make use of the rendering functions associated with the parent class
     * @param string template The file to be loaded
     * @param array $data Data to be rendered
     * @return string The rendered element
     */
    public function renderSubClass($template, $data) {
        return $this->renderTemplate($template, $data);
    }

    public function getTemplateFile($templateName) {
        $templateName .= '.html.twig';

        $templateFile = '@CustomTemplates/' . $this->getId() . '/' . $templateName;
        if ($this->isCore() && $this->app['twig.loader.filesystem']->exists($templateFile)) {
            return $templateFile;
        }

        $lang = $this->app['locale'];
        $className = $this->getClass();
        $namespace = $this->isCore() ? 'CoreModules' : 'CustomModules';
        $templatePath = "@{$namespace}/{$className}/templates";
        $templateLocalePath = "{$templatePath}/{$lang}";

        if ($this->app['twig.loader.filesystem']->exists("{$templateLocalePath}/{$templateName}")) {
            return "{$templateLocalePath}/{$templateName}";
        }

        return "{$templatePath}/{$templateName}";
    }

    protected function getTemplateData() {
        return array();
    }

    protected function renderTemplate($templateName, $templateData = array()) {
        $app = $this->app;
        $classInfo = new \ReflectionClass($this);
        $modulePath = str_replace($app['path']['base'], "", dirname($classInfo->getFileName()) . '/' . $this->getClass() . '/');

        $templateFile = $this->getTemplateFile($templateName);
        $templateData['module'] = $this;
        $templateData['config'] = $this->moduleConfig;
        $templateData['module_id'] = $this->getId();
        $templateData['module_class'] = lcfirst($this->getClass());
        $templateData['module_path'] = $modulePath;
        $templateData['use_form'] = $this->useBaseForm();
        $templateData['template'] = $templateFile;
        $templateData['templateName'] = $templateName;
        $templateData['data'] = $this->getTemplateData();

        if ($this->isEvent) {
            return $app['twig']->render($templateFile, $templateData);
        } else {
            return $app['twig']->render('@CoreModules/_shared/templates/base_module.html.twig', $templateData);
        }
    }

    public function handleEvent($eventResponse, $data) {
        $this->isEvent = true;
        $eventKey = $eventResponse->getEventKey();
        $funcName = 'handle' . Inflector\Inflector::classify($eventKey);
        if (method_exists($this, $funcName)) {
            $this->$funcName($eventResponse, $data);
        }
   }
}