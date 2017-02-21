<?php
namespace SCRMHub\ActivationSDK\Services\HtmlBlock;

use SCRMHub;

use Silex\Application;


/**
 * Controller managing html chunks
 *
 *
 *
 * @author Gregory Brine <greg.brine@scrmhub.com>
 */
class HtmlBlockStorage {
	/**
	 * @var \Silex\Application $app        The Silex Application Wrapper
	 */
	private
		$app;

	/**
	 * @var mixed $blocks        Store for the blocks of code
	 */
	private
		$blocks = [];

	/**
	 * Add a template to a block with data
	 * @param \Silex\Application 	$app 		The Silex Application
	 */
	function __construct(Application $app) {
		$this->app = $app;
	}

	/**
	 * Add a pre-rendered block of html
	 * @param string 	$region 		The reference to store against. E.g. header.end
	 * @param string 	$html 			The pre-rendered html
	 */
	public function add($region, $html) {
		$this->blocks[$region][] = [
		'html' => $html
		];
	}

	/**
	 * Add a template to a block with data
	 * @param string 	$region 		The reference to store against. E.g. header.end
	 * @param string 	$template 		The path to the template file to load
	 * @param mixed|string 	$data 			The data to render that template with
	 */
	public function addTemplate($region, $template, $data) {
		$this->blocks[$region][] = ['template' => $template, 'data' => $data];
	}

	/**
	 * Render out all the blocks in a specific region
	 * @param string 	$region 		The region to render
	 * @return string 					The completed block of html for output
	 */
	public function render($region) {
		$html = null;

		//Check the block exists and is not empty
        if(isset($this->blocks[$region]) && !empty($this->blocks[$region])) {
        	//Loop through the blocks
            foreach($this->blocks[$region] as $block) {
                if(isset($block['html'])) {
                	$html .= $block['html'];
                } else if(isset($block['template'])) {
                	$html .= $this->app['twig']->render($block['template'], $block['data']);
                }

                
            }
        }
        return $html;
	}
}