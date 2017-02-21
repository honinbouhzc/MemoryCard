<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Networks;

use SCRMHub;
use SCRMHub\ActivationSDK\Modules\Identity\BaseSocialNetwork;

class Linkedin extends BaseSocialNetwork {
    private $shareLink = 'https://www.linkedin.com/shareArticle';

    protected $network = 'linkedin';

    /**
     * Builds the meta data for this network
     */
    protected function buildMeta() {
        parent::buildMeta();

        $this->app['htmlblock']->addTemplate('body.end', '@CoreModules/Identity/templates/linkedin_js.html.twig', $this->meta);
    }

    /**
     * Build an external share link
     * @param array $data The data to build the share url
     * @return url
     */
    protected function buildShareLink($data) {
        $query = [];
        $query['url']     = $data['link'];
        $query['mini']    = $data['mini'];
        $query['title']   = $data['title'];
        $query['summary'] = $data['description'];
        $query['source']  = $data['source'];

        //Return it
        return $this->shareLink.'?'.http_build_query($query);
    }
}
