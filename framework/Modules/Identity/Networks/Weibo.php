<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Networks;

use Silex\Application;

use SCRMHub;
use SCRMHub\SDK\API\AUth;
use SCRMHub\ActivationSDK\Modules\Identity\BaseSocialNetwork;
use SCRMHub\ActivationSDK\Modules\Identity;

class Weibo extends BaseSocialNetwork {
	protected $network = 'weibo';

    protected $assets_js = ['//tjs.sjs.sinajs.cn/open/thirdpart/js/frame/appclient.js'];

    private $shareLink = 'http://service.weibo.com/share/share.php';

    //Construct
    function __construct(Application $app, Identity $identityClass, $config, $dataShare) {
        parent::__construct($app, $identityClass, $config, $dataShare);

        // check if opened as weibo activation and is already connected to weibo
        $pageController = $app['page_controller'];

        if (isset($app['app.current_location'])
            && $this->network == $app['app.current_location']['type']
            && !in_array($this->network, $pageController->get('connected_networks', []))
        ) {
            // Create a new Weibo object
            $o = new \SaeTOAuthV2($this->config['appid'], $this->config['secret']);

            // And parse the request
            if(!$decoded = $o->parseSignedRequest($_POST['signed_request'])) {
                throw new Exception('Invalid Weibo request');
            } else if(!isset($decoded['ouid'])) {
                throw new Exception('Invalid Weibo request');
            }

            //Arguments to be sent
            $data = [
                'appkey'     => $app['app.appkey'],
                'provider'   => $this->network,
                'auth_token' => $decoded['oauth_token'],
            ];

            // exchange weibo token with scrmhub token and get puuid
            $api = new Auth();
            $response = $api->oauth($data);

            $data = $response->getData();
            if (is_array($data) && !$response->isOk()) {
                // TODO ignore or throw exception
                $error = $response->getError();
                throw new \Exception($error['message']);
            } else {
                $puuid = $data['puuid'];
                $accessToken = $data['result'];

                if (empty($accessToken)) {
                    throw new \Exception('Unable to exchange token');
                }

                $pageController->set('access_token', $accessToken);

                if ($puuid && $puuid != $pageController->get('puuid')) {
                    $pageController->set('puuid', $puuid);
                }

                $connectedNetworks = $pageController->get('connected_networks', []);
                $connectedNetworks[] = $this->network;
                $pageController->set('connected_networks', $connectedNetworks);
            }
        }
    }

	/**
     * Build an external share link
     * @param array         $data       The data to build the share url
     * @return url
     * @todo track inbound clicks
     */
    protected function buildShareLink($data) {
    	$query = [];
        $query['appkey'] 		= $this->config['appid'];
        $query['url'] 			= $data['link'];
        $query['title'] 		= $data['caption'];
        $query['caption'] 		= $data['sitename'];
        $query['description'] 	= $data['description'];
        $query['pic'] 		    = $data['picture'];
        $query['redirect_uri']	= $data['redirect_uri'];
        $query['source']        = 'bookmark';

        //Return it
        return $this->shareLink.'?'.http_build_query($query);
    }

}