<?php

namespace SCRMHub\ActivationSDK;

trait UserCache {
    protected $userCachePool;

    protected function setupUserCache($userPuuid) {
        $userPuuid = str_replace('-', '', $userPuuid);
        $this->userCachePool = $this->app['cache_factory']($userPuuid);
    }

    public function setUserCache($key, $value, $ttl = null) {
        $item = $this->userCachePool->getItem($key);
        $item->lock();
        $item->set($value, $ttl);
    }

    public function getUserCache($key) {
        $item = $this->userCachePool->getItem($key);
        return $item->get();
    }

    public function hasUserCache($key) {
        $item = $this->userCachePool->getItem($key);
        return !$item->isMiss();
    }
}