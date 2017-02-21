<?php
namespace SCRMHub\ActivationSDK\Modules\Identity;

use SCRMHub;
use SCRMHub\ActivationSDK\BaseModule;
use SCRMHub\ActivationSDK\Modules\Identity;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManager;

use Silex\Application;

/**
 * Identity Action Base
 *
 * This class forms a base for all of the actions the Identity class can perform
 * *
 * @link   www.scrmhub.com
 * @since  1.0
 * @author Gregory Brine <greg.brine@scrmhub.com>
 */
class BaseAction extends BaseModule {

	/** 
	 * @var \Silex\Application $app The Silex Application
	 * @var SCRMHub\ActivationSDK\Modules\Identity $identityClass The SDK Identity class
	 */
	protected 
        $app,
        $identityClass;


    /** 
	 * @var string $module_id The ID of the module for translation references
	 */
    protected
    	$module_id;

    /**
     * @var string 	$network 		The Network name being worked with currently
     * @var mixed 	$networkClass	The Network Class loaded
     */
	protected
		$network,
		$networkClass;

	/**
	 * Construct the class
	 * @param object $app 				The Silex app
	 * @param object $identityClass 	The identity class
	 * @param string $network 			The network to load
	 */
	function __construct(Application $app, Identity $identityClass, $module_id) {
		$this->app 				= $app;
		$this->identityClass 	= $identityClass;
		$this->module_id 		= $module_id;
	}

    /**
     * Load the network we're using
     * @param string $network The social Network to load
     * @return class The Network class requested
     */
    protected function getNetwork($network) {
    	//Only run if needed
    	if($this->network != $network) {
    		//Set the current network
    		$this->network      = $network;
        
        	//Load the network
	        $this->networkClass = $this->identityClass->getNetwork($network);
    	}        

    	//Still no class so throw an error
    	if(!$this->networkClass || empty($this->networkClass)) {
    		//Our error message
            $msg = sprintf("Unable to load the [%s] network for connecting.", $network);

            //throw the error
            throw new \Exception($msg);
        }

    	//Return the object
        return $this->networkClass;
    }


    /**
	 * Generate a token
	 * @param string $tokenName The reference for the token
	 * @return string A CSRF Token
	 */
	protected function generateCsrfToken($tokenName) {
		//Generate a token object
		$token = $this->CsrfTokenManager()->getToken($tokenName);

		//Return the value
		return $token->getValue();
	}

	/**
	 * Validate Callback is correct
	 * @param string $tokenName The reference for the token
	 * @param string $csrfToken The Token to check
	 * @return bool Did it pass
	 */
	protected function validateToken($tokenName, $csrfToken) {
		if($this->CsrfTokenManager()->isTokenValid(new CsrfToken($tokenName, $csrfToken))) {
			//expire tokens if not in dev / debug mode
			if(!$this->app['debug'])
				$this->CsrfTokenManager()->removeToken($this->network);

			//Return true;
			return true;
		}

		//Fail all other cases
		return false;
	}

	/**
	 * CSRF Token Manager - creates an instance for each action
	 * @return object \Symfony\Component\Security\Csrf\CsrfTokenManager
	 */
	protected function CsrfTokenManager() {
		//do we have the token manager yet?
		if(!$this->csrfTokenManager) {
			//If not, load it
			$this->csrfTokenManager = new CsrfTokenManager();
		}

		//Return the class
		return $this->csrfTokenManager;
	}

	/**
	 * Holder function
	 * @param array templateData Data to render with
	 * @return null
	 */
	public function renderAction($templateData = []) {
		return null;
	}

	/**
	 * Get a user's real IP
	 * Handles situations such as Amazon forwarding the address
	 * @return string The User's IP
	 */
	protected function realIp() {
		//Get user's URL
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        }

        //Not the best value
        return $_SERVER['REMOTE_ADDR'];
	}
}