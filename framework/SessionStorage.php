<?php

namespace SCRMHub\ActivationSDK;

use Symfony\Component\HttpFoundation\Session\Attribute\AttributeBag;

trait SessionStorage {
    protected $bag;
    protected $sessionKey;

    private function setupSession($sessionKey) {
        $this->sessionKey = $sessionKey;

        if ($this->app['session']->has($sessionKey))
            $this->bag = $this->app['session']->get($sessionKey);
    }

    private function registerBagId($bagId) {
        $bag = new AttributeBag($bagId);
        $this->app['session']->registerBag($bag);
    }

    public function has($key) {
        return isset($this->bag, $this->bag->$key);
    }

    public function set($key, $value) {
        // Set session bag
        if (!$this->bag) {
            $bag = new \stdClass;
            $this->app['session']->set($this->sessionKey, $bag);

            $this->bag = $this->app['session']->get($this->sessionKey);
        }

        $this->bag->$key = $value;
    }

    public function remove($key) {
        unset($this->bag->$key);
    }

    public function get($key, $default = null) {
        return $this->has($key) ? $this->bag->$key : $default;
    }
}