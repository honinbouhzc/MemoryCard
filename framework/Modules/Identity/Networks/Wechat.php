<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Networks;

use SCRMHub;
use SCRMHub\SDK\API;
use SCRMHub\ActivationSDK\Modules\Identity\BaseSocialNetwork;

class Wechat extends BaseSocialNetwork {
	protected $network = 'wechat';

    protected $assets_js = ['//res.wx.qq.com/open/js/jweixin-1.0.0.js'];

    /**
     * Builds the meta data for this network
     */
    protected function buildMeta() {
        parent::    buildMeta();

        $signedPackage = $this->getSignPackage();

        $this->meta['signedPackage'] = $signedPackage;
        $this->meta['debug']        = $this->app['debug'];

        $shortUrl = $this->buildShortUrl();
        $this->meta['link'] = $shortUrl;
        $this->meta['hash'] = $shortUrl;

        //
        $this->app['htmlblock']->addTemplate('body.end', '@CoreModules/Identity/templates/wechat_js.html.twig', $this->meta);
    }

    private function getSignPackage() {
        $ticketResult = $this->getJsApiTicket();

        // Do not hardcode the URL
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
        $url = "$protocol$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

        $timestamp = time();
        $nonceStr = $this->createNonceStr();

        // sorting all parameters used for signature in the ordered by each field names’ ASCII code from small to large (lexicographical order)
        $string = "jsapi_ticket=$ticketResult[ticket]&noncestr=$nonceStr&timestamp=$timestamp&url=$url";

        $signature = sha1($string);

        $signPackage = array(
            "appId" => $ticketResult['appId'],
            "nonceStr" => $nonceStr,
            "timestamp" => $timestamp,
            "url" => $url,
            "signature" => $signature,
            "rawString" => $string
        );
        return $signPackage; 
    }

    private function createNonceStr($length = 16) {
        $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        $str = "";
        for ($i = 0; $i < $length; $i++) {
            $str .= substr($chars, mt_rand(0, strlen($chars) - 1), 1);
        }
        return $str;
    }

    private function getJsApiTicket() {
        $cacheKey = ['wechat', 'jsapi-ticket', $this->app['app.appkey']];
        $ttl = 7200;

        if ($this->identity->hasCache($cacheKey)) {
            $ticketResult = $this->identity->getCache($cacheKey);
        } else {
            $api = new API\Helper();
            $response = $api->wechatjsapiticket();

            if (!$response->isOk()) {
                // don't throw exception when it can't get a ticket, just log it
                // throw new \Exception("Unable to get wechat jsapi ticket");
            }

            $res = $response->getResult();
            $ticketResult = array(
                'appId' => $res['appId'],
                'ticket' => $res['ticket'],
            );

            $this->identity->setCache($cacheKey, $ticketResult, $ttl);
        }

        return $ticketResult;
    }
}