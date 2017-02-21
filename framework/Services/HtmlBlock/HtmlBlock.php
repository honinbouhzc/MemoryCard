<?php
namespace SCRMHub\ActivationSDK\Services\HtmlBlock;

use SCRMHub\ActivationSDK\Services\HtmlBlock\HtmlBlockStorage;

use Pimple\Container;
use Pimple\ServiceProviderInterface;


class HtmlBlock implements ServiceProviderInterface {
	public function register(Container $app) {
		//The tools wrapper
		$app['htmlblock'] = function ($app) {
            return new HtmlBlockStorage($app);
        };

        //Add the twig hook
        $app['twig'] = $app->extend('twig', function ($twig, $app) {
	        	//Add the render function
		    	$twig->addFunction(new \Twig_SimpleFunction('htmlblock', function ($name) use ($app) {
		    		return $app['htmlblock']->render($name);
		    	}));

		    	//Return the updated twig instance
			    return $twig;
			}, array(
				'is_safe' => array('html')
			)
		);
	}
}