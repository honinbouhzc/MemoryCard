<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Networks;

use SCRMHub;
use SCRMHub\ActivationSDK\Modules\Identity\BaseSocialNetwork;

class Twitter extends BaseSocialNetwork {
	private $shareLink = 'https://twitter.com/intent/tweet';

	protected $network = 'twitter';

    /**
     * Builds the meta data for this network
     */
    protected function buildMeta() {
        if(isset($this->dataShare['twitter']['site'])) {
            $this->meta['site'] = $this->dataShare['twitter']['site'];
        }
    }

	/**
     * Build an external share link
     * @param array         $data       The data to build the share url
     * @return url
     */
    public function shareLink($data) {
    	$query = [];
        $query['tw_p']         = 'tweetbutton';
        $query['url']          = $data['link'];
        $query['text']         = $data['description'];
        $query['hashtags']     = implode(',',$data['hashtags']);
        $query['picture']      = $data['picture'];
        $query['redirect_uri'] = $data['redirect_uri'];

        //Return it
        return $this->shareLink.'?'.http_build_query($query);
    }
}