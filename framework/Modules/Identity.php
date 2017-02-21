<?php
namespace SCRMHub\ActivationSDK\Modules;

use SCRMHub;
use SCRMHub\ActivationSDK\BaseModule;
use SCRMHub\ActivationSDK\Modules\Identity\Action\Connect;
use SCRMHub\ActivationSDK\Modules\Identity\Action\Share;
use SCRMHub\SDK\API\Identity as IdentityAPI;

use Silex\Application;

/**
 * Identity Module
 *
 * The identity module handles a lot of the complex calls to the SCRM Hub APIs for connecting and sharing
 * *
 * @link   www.scrmhub.com
 * @since  1.0
 * @author Gregory Brine <greg.brine@scrmhub.com>
 */
class Identity extends BaseModule {
    /**
     * @var array $networks A local store of all loaded files
     */
    private $networks = [];

    /**
     * @var \SCRMHub\ActivationSDK\Modules\Identity\Action\Share $shareClass Instance of the Share class if loaded
     * @var \SCRMHub\ActivationSDK\Modules\Identity\Action\Connect connectClass Instance of the Connect class if loaded
     */
    private
        $shareClass,
        $connectClass;

    /** 
     * Construct the class
     * @param \Silex\Application $app   The Silex Application
     * @param string $customKey         Key for the class
     * @param array $moduleConfig       Configuration Array for the class
     * @todo remove temporary fix
     */
    public function __construct(Application $app, $customKey, $moduleConfig) {
        //Load the parent
        parent::__construct($app, $customKey, $moduleConfig);

        //If no link specified in the share, assume homepage
        if(!isset($this->moduleConfig['dataShare']['default']['link']) || empty($this->moduleConfig['dataShare']['default']['link'])) {
            $this->moduleConfig['dataShare']['default']['link'] = $this->app['app_urls']['home'];
        }

        //Loop through the networks and set them up
        foreach($this->moduleConfig['networks'] as $network => $config) {
            //Get the network
            $this->getNetwork($network);
        }

        //Temporary fix
        if(isset($_GET['connect_action'])) {
            $this->fixDemoQuerystring();
        }

        //track an inbound link
        if(isset($_GET['ref_puuid'])) {
            $this->trackInbound();
        }

        //Pickup hooks to within the sub classes
        if(isset($_GET['share_action']) && isset($this->moduleConfig['networks'][$_GET['network']])) {
            $this->shareProcess($_GET['network']);
        } else if(isset($_GET['connect_action']) && isset($this->moduleConfig['networks'][$_GET['network']])) {
            $this->connectProcess($_GET['network']);
        }
    }

    /**
     * Fix for test build bug
     * @todo Remove this function
     */
    private function fixDemoQuerystring() {
        $query = explode('&', $_GET['connect_action']);
        foreach($query as $queryString) {
            $queryString = explode('=', $queryString);
            if(count($queryString) == 1){
                $_GET['connect_action'] = $queryString[0];
            } else {
                $_GET[$queryString[0]] = $queryString[1];
            }
        }
    }

    /**
     * Load the Connect class
     * @return \SCRMHub\ActivationSDK\Modules\Identity\Action\Connect Instance of the Connect Class
     */
    private function getConnectClass() {
        //Check if we have an instance already
        if(!$this->connectClass) {

            //If not load it
            $this->connectClass = new Connect($this->app, $this, $this->customKey);
        }

        //Return the object
        return $this->connectClass;
    }

    /**
     * Connect process
     * @param string $network The Social Network to load
     * @return mixed Response from the process
     */
    private function connectProcess($network) {
        return $this->getConnectClass()->run($network);
    }


    /**
     * Load the Share class
     * @return \SCRMHub\ActivationSDK\Modules\Identity\Action\share Instance of the Share Class
     */
    private function getShareClass() {
        //Check if we have an instance already
        if(!$this->shareClass) {
            //If not load it
            $this->shareClass = new Share($this->app, $this, $this->customKey);
        }

        //Return the loaded instance
        return $this->shareClass;
    }

    /**
     * Share Process
     * @param string $network The Social Network to load
     * @return mixed Response from the process
     */
    private function shareProcess($network) {
        //Run it
        return $this->getShareClass()->run($network);
    }

    /**
     * Add in the meta data
     */
    public function preload() {
        //Any other preloading in the parent class
        parent::preload();

        //$this->app['htmlblock']->add('header.end', $this->renderMeta());
        $this->app['htmlblock']->addTemplate('header.end', $this->getTemplateFile('meta'), $this->getMeta());
    }

    /**
     * Build the meta data
     * @return array
     * @todo add in link for short url
     */
    private function getMeta() {
        //start building the meta list
        $meta = [
            'meta' => $this->moduleConfig['dataShare']['default']
        ];

        //$shorturl = 'abcd1234';
        $meta['meta']['link'] = $this->app['app_urls']['home'] . '?ref_puuid=';

        //Default link is the homepage
        //$meta['meta']['link'] = $this->app['app_urls']['home'];

        //Loop through the networks
        foreach($this->networks as $network => $class) {
            $meta[$network] = $class->getMeta();
        }

        //Return the data
        return $meta;
    }

    
    /**
     * Build an external share link from the passed through data
     * @param array         $templateData       The data to build the share url
     * @return template
     */
    public function renderShare($templateData = []) {
        return $this->getShareClass()->renderAction($templateData);        
    }

    /**
     * Build an external connect link from the passed through data
     * @param array         $templateData       The data to build the connect
     * @return template
     */
    public function renderConnect($templateData = []) {
        return $this->getConnectClass()->renderAction($templateData);        
    }

    public function handleConnectComplete($eventResponse, $data) {
        $eventResponse->callReplaceWith($this->getTemplateSelector('connect'), 
            (string) $this->render("connect"));
    }

    public function getProfile($extended = false) {
        $api = new IdentityAPI();

        $data = array(
            'extended' => $extended ? 'true' : 'false',
        );
        $response = $api->me($data);

        if (!$response->isOk()) {
            throw new \Exception("Unable to get profile");
        }

        return $response->getResult();
    }

    /**
     * Return all the loaded networks
     * @return array The loaded networks
     */
    public function getNetworks() {
        return $this->networks;
    }

    /**
     * Get the module configuration
     * @return array Module config
     */
    public function getModuleConfig() {
        return $this->moduleConfig;
    } 

    /** 
     * Get an instance of a network class
     * @param string $network The Social Network to load
     * @return object The Network class
     */
    public function getNetwork($network) {
        //Check if it's loaded already
        if(!array_key_exists($network, $this->networks)) {
            //If not, load an instance
            $this->networks[$network] = $this->loadNetwork($network);
        }

        //Return the the network instance
        return $this->networks[$network];
    }       

    /** 
     * Creates an instance of a network
     * @param string $network The Social Network to load
     * @return mixed Instance of a network
     */
    private function loadNetwork($network) {
        //Grab the config for the network
        $config     = $this->moduleConfig['networks'][$network];
        //Grab the share data
        $dataShare  = $this->moduleConfig['dataShare'];

        //build the path
        $libraryClass = 'SCRMHub\\ActivationSDK\\Modules\\Identity\\Networks\\'.ucfirst(strtolower($network));

        //Create the class and return it
        return new $libraryClass($this->app, $this, $config, $dataShare);
    }

    private function trackInbound() {
        $ref_puuid = $_GET['ref_puuid'] ?: null;

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
        $url = "$protocol$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

        if ($url) {
            //Tracking
            $trackData = [
                'type'          => 'inbound',
                'target'        => null,
                'puuid'         => $this->app['page_controller']->get('puuid'), // The current user
                'useraction'    => 'shorturl',
                'id'            => $url,
            ];

            //Track it
            (new SCRMHub\SDK\API\Activity())->create($trackData);
        }

        $redirect = $this->moduleConfig['dataShare']['default']['link'];
        $this->app['page_controller']->forward($redirect, true);
    }
}