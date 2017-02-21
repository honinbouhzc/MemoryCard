<?php

require_once dirname(__FILE__) . '/BasePage.php';
class Thanks extends BasePage {
    public function preload() {
        $this->app['page_controller']->forward('http://www.wemart.cn/mobile/?chanId=110&defId=4ca714feb74a4c579664f635d9089753&sellerId=3625&a=center&m=coupon&scenType=2&oauthFlag=false&ja=center&jm=coupon&noPushState=true');
    }
}