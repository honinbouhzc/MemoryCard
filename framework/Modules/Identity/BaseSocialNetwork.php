<?php
namespace SCRMHub\ActivationSDK\Modules\Identity;

use SCRMHub;
use SCRMHub\SDK\API\ShortUrl;
use SCRMHub\ActivationSDK\BaseModule;
use SCRMHub\ActivationSDK\Modules\Identity;

use Silex\Application;


class BaseSocialNetwork extends BaseModule {
	//Allow the config to be accessed by the classes
	protected $config = [];

	//Is sharing enabled?
	protected
		$canShare 	= false,
		$canConnect = false;

	//The raw data
	protected $meta = [];

	protected $network = null;

	protected $app, $identity;

	protected
	    $stateRequestField = 'state';

	protected
		$assets_css 	= [],
		$assets_js		= [];

	//Construct
	function __construct(Application $app, Identity $identityClass, $config, $dataShare) {
		$this->app = $app;
		$this->identity = $identityClass;

		$this->config = $config;
		$this->dataShare = $dataShare;

		//Is sharing enabled
		if(isset($config['share'])) {
			$this->share = $config['share'];
		}

		//Build the meta data
		$this->buildMeta();

		//Any assets to load
		$this->addRequiredAssets();
	}

	/**
	 * Can this network share?
	 * @return bool Can you share
	 */ 
	public function canShare() {
		if(isset($this->config['share'])) {
			return $this->config['share'];
		}

		return $this->canShare;
	}

	/**
	 * Can this network connect?
	 * @return bool Can you connect to this network
	 */ 
	public function canConnect() {
		if(isset($this->config['connect'])) {
			return $this->config['connect'];
		}
		return $this->canConnect;
	}

	/*
	 * Improvement on the baseModule version
	 */
    public function getRequiredAssets() {
        return array(
            'styles' 	=> $this->assets_css,
            'scripts' 	=> $this->assets_js,
        );
    }

    public function getRequestStateField() {
    	return $this->stateRequestField;
    }

	/**
	 * Builds the meta data for this network
	 */
	protected function buildMeta() {
		if (isset($this->dataShare[$this->network])) {
			$this->meta = array_replace_recursive($this->dataShare['default'], $this->dataShare[$this->network]);
		} else {
			$this->meta = $this->dataShare['default'];
		}
	}

	public function getMeta() {
		return $this->meta;
	}

	/**
	 * Create the url for sharing
	 * If no share setup, will return false
	 *
	 * @return string url
	 */
	function popupShare($query) {
		if($this->share) {
			//Stop caching
			$query['share_action']  = click;
			$query['network']		= $this->network;
			$query['_ts'] 			= time();
			$query['puuid']			= null;

			//build the link
			return $this->app['app_urls']['home'].'?'.http_build_query($query);
		}
		return false;
	}


	/**
	 * Create the redirect to 3rd party link
	 * If no share setup, will return false
	 *
	 * @return string url
	 */
	function shareLink($config) {
		if($this->share) {
			return $this->buildShareLink($config);
		}

		return false;
	}

	protected function buildShareLink($config) {
		return false;
	}

	public function buildShortUrl() {
        //Get the short url
        $data = array(
            'ref_puuid' => $this->app['page_controller']->get('puuid')
        );

		$shortUrl = $this->identity->moduleConfig['dataShare']['default']['link'] . '?' . http_build_query($data);

        return $shortUrl;
	}
}