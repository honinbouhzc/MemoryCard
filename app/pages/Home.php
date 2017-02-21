<?php

class Home extends SCRMHub\ActivationSDK\BasePage {
    public function postload() {
        $pageController = $this->app['page_controller'];
        $connectedNetworks = (array) $pageController->get('connected_networks');

        $shownWechatConnect = $pageController->get('shownWechatConnect');
        if ($this->_isWechat()) {
            if (!$shownWechatConnect && !in_array('wechat', $connectedNetworks)) {
                $wechatConnectUrl = $this->app['app_urls']['home'] . '?connect_action=connect&network=wechat';
                $shownWechatConnect = $pageController->set('shownWechatConnect', true);
                $pageController->forward($wechatConnectUrl, true);
            }
        }
    }

    public function handleEvent($eventResponse, $data) {
        $eventKey = $eventResponse->getEventKey();
        $module = $eventResponse->getModule();
        $moduleId = $module ? $module->getId() : null;

        $pageController = $this->app['page_controller'];
        $connectedNetworks = (array) $pageController->get('connected_networks');
        $pushedAcxiom = $pageController->get('pushedAcxiom');

        switch ([$moduleId, $eventKey]) {
            case [null, "pageLoaded"]:
                if (!$pushedAcxiom && in_array('wechat', $connectedNetworks)) {
                    require_once $this->app['path']['app'] . 'Acxiom.php';

                    $identity = $this->getModule('identity-manager');
                    $profile = $identity->getProfile(true);
                    $wechatOpenId = $profile['networks']['wechat']['uuid'];
                    if ($wechatOpenId) {
                        $acxiom = new Acxiom();
                        // $acxiom->update($wechatOpenId);
                        $pushedAcxiom = $pageController->set('pushedAcxiom', true);
                    }
               }

               break;
        }
    }
}