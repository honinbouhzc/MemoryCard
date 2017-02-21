<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Action;

use SCRMHub;
use SCRMHub\ActivationSDK\BaseModule;
use SCRMHub\ActivationSDK\Modules\Identity\BaseAction;

use Silex\Application;

class Share extends BaseAction {
	/** 
	 * Run the process
	 */
	function run($network) {
		//Get the network - will fail if it's bad
        $this->getNetwork($network);

        //Share actions
		switch($_GET['share_action']) {
            case 'click':
                $share = $this->start();
                break;

            case 'complete':
                $this->finish();
                break;

            default:
                throw new \Exception('Incorrect action supplied');
                exit;
        }
	}

	/**
	 * Start the share process
	 */
	private function start() {
		$shareData = $_GET;

		unset($shareData['network'], $shareData['_ts'], $shareData['share_action']);

        //gets double encoded otherwise
        foreach($shareData as $key => $value) {
            if(is_array($value)) {
                $shareData[$key] = [];
                foreach($value as $splitValue) {
                    $shareData[$key][] = urldecode($splitValue);
                }                
            } else {
                $shareData[$key] = urldecode($value);
            }
        }    

        $shareData['link'] = $this->networkClass->buildShortUrl();

        //Tracking
        $trackData = [
            'puuid'         => $this->app['page_controller']->get('puuid'),
            'type'          => 'social',
            'target'        => $this->network,
            'useraction'    => 'share-start',
            'id'            => $shareData['link'],
        ];

        // TODO: This should be removed, and done at server side
        // Track it
        (new SCRMHub\SDK\API\Activity())->create($trackData);

		//Redirecting
        $redirectUrl = [
        	'share_action'	=> 'complete',
        	'network'		=> $this->network,
        	'link'			=> $shareData['link'],
            '_t'            => (new \DateTime())->format('YmdHis'),
            'referrer'      => $_SERVER['HTTP_REFERER'],
        ];

        //Build the redirection
        $shareData['redirect_uri'] = $this->app['app_urls']['home']."?".http_build_query($redirectUrl);

        //Load the class
        $shareUrl = $this->networkClass->shareLink($shareData);

        //redirect
        $this->app['page_controller']->forward($shareUrl, true);
	}

	/**
     * Track a completed link share
     * @param array         $shareData       The data to build the share url from a $_GET request
     * @return url
     */
	private function finish() {
        $shareData = $_GET;

        //The data to send
        $trackData = [
            'puuid'         => $this->app['page_controller']->get('puuid'),
            'type'          => 'social',
            'target'        => $shareData['network'],
            'useraction'    => isset($shareData['post_id']) ? 'share' : 'share-cancelled',
            'id'            => $shareData['link'],
        ];

        //Was there a 3rd party callback id
        switch($shareData['network']) {
            case 'facebook':
                $trackData['refdata'] = $shareData['post_id'];
                break;
        }

        //Track complete
        (new SCRMHub\SDK\API\Activity())->create($trackData);

        $templateData = array(
            'response'      => 'ok',
            'network'       => $this->network,
            'module_id'     => $this->module_id,
            'referrer'      => $_GET['referrer'],
        );
        //Render the close page
        echo $this->app['twig']->render('@CoreModules/Identity/templates/action_finished.html.twig', $templateData);
        exit;
	}

    /**
     * Build an external share link from the passed through data
     * @param array         $templateData       The data to build the share url
     * @return string template
     * @todo Make better use of the individual network class for creating this data.
     * @todo Reviewing using the meta data already loaded
     */
    public function renderAction($templateData = []) {
        //Store for all the returns shares
        $shares = ['networks' => []];

        //Get the latest config
        $moduleConfig = $this->identityClass->getModuleConfig();

        //Get the networks
        $networks = $this->identityClass->getNetworks();

        //Nothing set so use the master share
        if(empty($templateData) || !isset($templateData['dataShare']['default'])) {
            $shareData = $moduleConfig['dataShare']['default'];
        } else {
            $shareData = $templateData['dataShare']['default'];
        }        

        //Loop through all networks and get the details
        foreach($networks as $network => $class) {
            //If there's an override and this network is no in it, skip
            if(isset($templateData['networks']) && !in_array($network, $templateData['networks'])) {
                continue;
            }

            //reset what to share
            $thisShare = $shareData;

            //Only use the default overrides if this is not a share
            if(isset($templateData['dataShare'][$network])) {
                $thisShare = array_replace_recursive($thisShare, $templateData['dataShare'][$network]);
            } else {
                //Is there a network overide?
                if(isset($moduleConfig['dataShare'][$network])) {
                    $thisShare = array_replace_recursive($thisShare, $moduleConfig['dataShare'][$network]);
                }
            }
            
            //Make the share link
            if($shareUrl = $class->popupShare($thisShare)) {
                //Set the share data
                $shares['networks'][$network] = [
                    'link'  => $shareUrl,
                    'label' => 'share_'.$network
                ];
            }
        }

        //Render it
        return $this->identityClass->renderSubClass('share', $shares);
    }
}