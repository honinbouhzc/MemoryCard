<?php

namespace SCRMHub\ActivationSDK;

trait Cache {
    protected $cachePool;

    protected function setupCache($namespace) {
        $this->cachePool = $this->app['cache_factory']($namespace);
    }

    protected function setCache($key, $value, $ttl = null) {
        $item = $this->cachePool->getItem($key);
        $item->lock();
        $item->set($value, $ttl);
    }

    protected function getCache($key) {
        $item = $this->cachePool->getItem($key);
        return $item->get();
    }

    protected function hasCache($key) {
        $item = $this->cachePool->getItem($key);
        return !$item->isMiss();
    }
}