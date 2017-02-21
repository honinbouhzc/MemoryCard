<?php

class Acxiom {
    public function update($wechatOpenId, $data = [], $isQRCode = false) {
        $url = 'https://prcws.acxiom.com.cn/PRC/rest/customer/dataCollect';
        $sourceName = $isQRCode ? "abe00f08c31bd0dbdbdc6b37f1cca5ad" : "0d6b1880a2bed6a5337ff0dd5bc5efa9";
        $client = new GuzzleHttp\Client();

        $ts = date('Y-m-d H:i:s');
        $sign = md5(md5("PRC".$ts).$ts);

        $jsonData = [
            "openId" => $wechatOpenId,
            "sign" => $sign,
            "source_name" => $sourceName,
            "ts" => $ts,
        ];

        if ($data['name']) {
            $jsonData["username"] = $data['name'];
        }

        if ($data['phone']) {
            $jsonData["cellphone"] = $data['phone'];
        }

        try {
            $response = $client->post($url, [
                'verify' => false,
                'body' => json_encode($jsonData),
                'headers' => [
                    'Content-Type' => 'application/json; charset=UTF-8',
                ],
            ]);
        } catch (Exception $e) {
        }
    }

    public function sendSms($phone, $message, $isQRCode = false) {
        $url = 'https://prcws.acxiom.com.cn/PRC/rest/customer/sendSMS';
        $sourceName = $isQRCode ? "abe00f08c31bd0dbdbdc6b37f1cca5ad" : "0d6b1880a2bed6a5337ff0dd5bc5efa9";
        $client = new GuzzleHttp\Client();

        $ts = date('Y-m-d H:i:s');
        $sign = md5(md5("PRC".$ts).$ts);

        $jsonData = [
            "sign" => $sign,
            "source_name" => $sourceName,
            "ts" => $ts,

            "cellphone" => $phone,
            "smsContent" => $message,
        ];

        try {
            $response = $client->post($url, [
                'verify' => false,
                'body' => json_encode($jsonData),
                'headers' => [
                    'Content-Type' => 'application/json; charset=UTF-8',
                ],
            ]);
        } catch (Exception $e) {
        }
    }
}