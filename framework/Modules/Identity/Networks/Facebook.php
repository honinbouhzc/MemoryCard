<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Networks;

use SCRMHub;
use SCRMHub\ActivationSDK\Modules\Identity\BaseSocialNetwork;

class Facebook extends BaseSocialNetwork {
	private $shareLink = 'https://www.facebook.com/dialog/feed';

	protected $network = 'facebook';

    /**
     * Builds the meta data for this network
     */
    protected function buildMeta() {
        parent::buildMeta();
        if(isset($this->config['appid'])) {
            $this->meta['appid'] = $this->config['appid'];
        }
    }

	/**
     * Build an external share link
     * @param array         $data       The data to build the share url
     * @return url
     */
    protected function buildShareLink($data) {
    	$query = [];
        $query['app_id'] 		= $this->config['appid'];
        $query['link'] 			= $data['link'];
        $query['name'] 			= $data['title'];
        $query['caption'] 		= $data['sitename'];
        $query['description'] 	= $data['description'];
        if(isset($data['hashtags']) && is_array($data['hashtags'])) {
        	$query['description'].= "\n\r#".implode(" #", $data['hashtags']);
        }
        $query['picture'] 		= $data['picture'];
        $query['source'] 		= $data['source'];
        $query['display']       = $data['popup'];
        $query['redirect_uri']	= $data['redirect_uri'];

        //Return it
        return $this->shareLink.'?'.http_build_query($query);
    }
}