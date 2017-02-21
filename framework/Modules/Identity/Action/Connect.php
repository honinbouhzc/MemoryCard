<?php
namespace SCRMHub\ActivationSDK\Modules\Identity\Action;

use SCRMHub;
use SCRMHub\ActivationSDK\Modules\Identity\BaseAction;
use SCRMHub\SDK\API\Identity;
use SCRMHub\SDK\APIError;

use Silex\Application;

/**
 * SDK Connection Process
 *
 * This class will handle the connection process for any con figured network, and handle the token security through Symfony
 * *
 * @link   www.scrmhub.com
 * @since  1.0
 * @author Gregory Brine <greg.brine@scrmhub.com>
 */
class Connect extends BaseAction {
    /**
     * Run the connect process for the given network
     * @param string $network   The configured network to connect to
     * @return mixed            The process response
     */
    function run($network) {
        //Get the network - will fail if it's bad
        $this->getNetwork($network);

        //Which action are we running
        switch($_GET['connect_action']) {
            case 'connect':
                $share = $this->start();
                break;

            case 'finish':
                $this->finish();
                break;

            default:
                throw new \Exception('Incorrect action supplied');
                exit;
        }
    }

    /**
     * Start the connect process
     * @return redirect to the API Login page
     */
    private function start() {
        //Arguments to be sent
        $data = [
            'callback'      => $this->buildCallbackUrl(),
            'network'       => $this->network,
            'permissions'   => null,
            '_t'            => (new \DateTime())->format('YmdHis')
        ];

        $api = new Identity();
        $response = $api->connect($data);
        $data = $response->getData();
        if (is_array($data) && !$response->isOk()) {
            $error = $response->getError();
            throw new \Exception($error['message']);
        } else {
            $redirectUrl = $response->getHeaders()['url'];
            $this->app['page_controller']->forward($redirectUrl);
        }
    }

    /**
     * Finish the connect process
     * @return mixed the complete page
     */
    private function finish() {
        //Get the value from the response
        $csrfToken = $_GET['state'];
        if(!$this->validateToken($this->CSRFTokenName(), $csrfToken)) {
            throw new \Exception('Invalid security token returned');
        }

        if ((int) $_GET['error_code'] == APIError::$EXTERNAL_CONNECT_CANCEL[1]) {
            // user cancelled
        } elseif ($_GET['code']) {
            //Exchange token returned
            $result = $this->tokenExchange($csrfToken, $_GET['referrer']);
            $puuid = $result['puuid'];
            $accessToken = $result['result'];

            if (empty($accessToken)) {
                throw new \Exception('Unable to exchange code for token');
                exit;
            }

            //Set the access token
            $pageController = $this->app['page_controller'];
            $pageController->set('access_token', $accessToken);

            if ($puuid && $puuid != $pageController->get('puuid')) {
                $pageController->set('puuid', $puuid);
            }

            $connectedNetworks = $pageController->get('connected_networks', []);
            if (!in_array($this->network, $connectedNetworks)) {
                $connectedNetworks[] = $this->network;
            }

            $pageController->set('connected_networks', $connectedNetworks);
        } elseif (isset($_GET['error_code'])) {
            $this->app['monolog']->warning(print_r($_GET['error_message'], true));
            throw new \Exception('Something has gone wrong, please try again later');
        } else {
            throw new \Exception('Something has gone wrong, please try again later');
        }

        //The data for the template
        $responseData = [
            'response'      => 'ok',
            'network'       => $this->network,
            'module_id'     => $this->module_id,
            'referrer'      => $_GET['referrer'],
        ];

        //Render the close page
        echo $this->app['twig']->render('@CoreModules/Identity/templates/connect_finished.html.twig', $responseData);

        //And relax...
        exit;
    }

    /**
     * Exchange the token
     * @param string $csrfToken     The callback token used to verify the request
     */
    private function tokenExchange($csrfToken, $referrer) {
        if(!isset($_GET['code']))
            return false;

        //Request Arguments
        $data = [
            'code'      => $_GET['code'], //The code returned
            'callback'  => $this->buildCallbackUrl($csrfToken, $referrer) //This is attached for security on the token end
        ];

        $api = new Identity();
        $response = $api->connectexchange($data);
        $allData = $response->getData();

        return $allData;
    }

    /**
     * The request that will be called back from the API
     * @param string $csrfToken Optional existing value as we need to pass the nonce in to validate the callback correctly if developer adds this to their checks
     * @return string The Url to callback to
     */
    private function buildCallbackUrl($csrfToken = null, $referrer = null) {
        //Fresh request so make the csrf
        if(!$csrfToken)
            $csrfToken = $this->generateCsrfToken($this->CSRFTokenName());

        if (!$referrer)
            $referrer = $_SERVER['HTTP_REFERER'];

        //Arguments for the request
        $callbackArgs = [
            'connect_action'    => 'finish',
            'network'           => $this->network,
            'state'             => $csrfToken,
            'referrer'          => $referrer,
        ];

        //Build it and send it back
        return $this->app['app_urls']['home'].'?'.http_build_query($callbackArgs);
    }

    /**
     * Create the token name to validate with
     *
     * @return string The Token name
     */
    private function CSRFTokenName() {
        //Return the token name
        return 'Connect_'.$this->network;
    }

    /**
     * Build an external connect link from the passed through data
     * @param array         $templateData       The data to build the connect url
     * @return string template
     */
    public function renderAction($templateData = []) {
        //Store for all the connect data
        $connect = ['networks' => []];

        //Get the networks
        $networks = $this->identityClass->getNetworks();

        //Loop through all networks
        foreach($networks as $network => $class) {
            if(empty($templateData) || (isset($templateData['networks']) && in_array($network, $templateData['networks']))) {
                if($class->canConnect()) {
                    $connect['networks'][$network] = [
                        'link'      => $this->app['app_urls']['home'].'?connect_action=connect&network='.$network,
                        'label'     => 'connect_'.$network
                    ];
                }
            }
        }
        $connect['connected_networks'] = $this->app['page_controller']->get('connected_networks', []);

        //Render it
        return $this->identityClass->renderSubClass('connect', $connect);
    }
}