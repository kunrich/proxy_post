<?php
	header("access-control-allow-origin: *");
	header("content-type: application/json; charset=UTF-8");
	if(isset($_POST['url'])){
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $_POST['url']);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_HEADER, 1);
		
		if(isset($_POST['method'])){
			$method=strtolower($_POST['method']);
			if($method=='post'){
				curl_setopt($ch, CURLOPT_POST, 1);
				if(isset($_POST['body'])){
					$body=json_decode($_POST['body'],true);
					if(is_array($body)){
						$body_obj=array();
						foreach($body as $key=>$val){
							
							$body_obj[]=urlencode((string)$key)."=".urlencode((string)$val);
						}
						$body_obj=join('&',$body_obj);
						curl_setopt($ch, CURLOPT_POSTFIELDS, $body_obj);
					}else{
						curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST['body']);
					}
				}
			}
		}
		$head_obj=array();
		if(isset($_POST['head'])){
			$head=json_decode($_POST['head'],true);
			if(is_array($head)){
				foreach($head as $key=>$val){
					$head_obj[]="$key: $val";
				}
			}
		}
		if(isset($_POST['agent'])){
			$head_obj[]="User-Agen: ".$_POST['agent'];
			curl_setopt($ch, CURLOPT_USERAGENT, $_POST['agent']);
		}
		if(isset($_POST['ref'])){
			$head_obj[]="Referer: ".$_POST['ref'];
			curl_setopt($ch, CURLOPT_REFERER, $_POST['ref']);
		}
		
		if(count($head_obj)>0){
			curl_setopt($ch, CURLOPT_HTTPHEADER, $head_obj);
		}

		$rtn=curl_exec($ch);
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

          $rtn=explode("\r\n\r\nHTTP/", $rtn, 2);
		  
          $rtn=(count($rtn)>1 ? 'HTTP/' : '').array_pop($rtn);
          list($str_resp_headers, $rtn)=explode("\r\n\r\n", $rtn, 2);

          $str_resp_headers=explode("\r\n", $str_resp_headers);
          array_shift($str_resp_headers);
          $resp_headers=array();
          foreach ($str_resp_headers as $k=>$v)
                  {$v=explode(': ', $v, 2);
                   $resp_headers[strtolower($v[0])]=$v[1];
                  }
		$out=array(
			"status"=>true,
			"data"=>array(
				"code"=>$httpcode,
				"data"=>$rtn,
				"head"=>$resp_headers
			)
		);
		echo(json_encode($out));
	}else{
		echo(json_encode(array(
			"status"=>false,
		)));
	}
?>