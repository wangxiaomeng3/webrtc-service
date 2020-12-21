var log = require("./log").log;

var connections = {},
	partner = {},
	messagesFor = {};
	
// 排队发送 JSON 响应
function webrtcResponse(response, res){
	log("replying with webrtc response " +
		JSON.stringify(response));
	res.writeHead(200, {"Content-Type":"application/json"});
	res.write(JSON.stringify(response));
	res.end();
}

// 发送错误作为 JSON WebRTC 响应
function webrtcError(err, res){
	log("replying with webrtc error: " + err);
	webrtcResponse({"err": err}, res);	
}

// 处理 XML HTTP 请求以使用给定秘钥进行连接
function connect(info){
	var res = info.res,
		query = info.query,
		thisconnection,
		newID = function(){
			// 创建一个大的随机数字，此数字应不可能在服务器生命周期中很快重复出现
			return Math.floor(Math.random()*1000000000);
		},
		connectFirstParty = function(){
			if(thisconnection.status == "connected"){
				// 删除配对和任何存储的消息
				delete partner[thisconnection.ids[0]];
				delete partner[thisconnection.ids[1]];
				delete messagesFor[thisconnection.ids[0]];
				delete messagesFor[thisconnection.ids[1]];
			}
			connections[query.key] = {};
			thisconnection = connections[query.key];
			thisconnection.status = "waiting";
			thisconnection.ids = [newID()];
			webrtcResponse({"id":thisconnection.ids[0],
							"status":thisconnection.static},res);
		},
		connectSecondParty = function(){
			thisconnection.ids[1] = newID();
			partner[thisconnection.ids[0]] = thisconnection.ids[1];
			partner[thisconnection.ids[1]] = thisconnection.ids[0];
			messagesFor[thisconnection.ids[0]] = [];
			messagesFor[thisconnection.ids[1]] = [];
			thisconnection.status = "connected";
			webrtcResponse({"id":thisconnection.ids[1],
							"status":thisconnection.static},res);
		};
		
	log("Request handler 'connect' was called.");
	if(query && query.key){
		var thisconnection = connections[query.key] || 
							{status:"new"};
		if(thisconnection.status == "waiting"){ // 前半部分就行
			connectSecondParty();
			return;
		} else { // 必须为新连接或 "connected" 状态
			connectFirstParty();
			return
		}
	} else {
		webrtcError("No recognizable query key", res);
	}
}
exports.connect = connect;

// 对 info.postData.message 中的消息排队，以发送至具有
// info.postData.id 中的ID的伙伴
function sendMessage(info){
	log("postData received is ***" + info.postData + "***");
	var postData = JSON.parse(info.postData),
		res = info.res;
	
	if(typeof postData === "undefined"){
		webrtcError("No posted data in JSON format!", res);
		return;
	}
	if(typeof (postData.message) === "undefined"){
		webrtcError("No message received!", res);
		return;
	}
	if(typeof (postData.id) === "undefined"){
		webrtcError("No id received with messgae!", res);
		return;
	}
	if(typeof (partner[postData.id]) === "undefined"){
		webrtcError("Invalid id " + postData.id, res);
		return;
	}
	if(typeof (messagesFor[partner[postData.id]]) === "undefined"){
		webrtcError("Invalid id " + postData.id, res);
		return;
	}
	messagesFor[partner[postData.id]].push(postData.message);
	log("Saving message ***" + postData.message + 
		"*** for delivery to id " + partner[postData.id]);
	webrtcResponse("Saving message ***" + postData.message + 
					"*** for delivery to id " + 
					partner[postData.id], res);
}
exports.send  = sendMessage;


// 返回所有排队获取 info.postData.id 的消息
function getMessage(info){
	var postData = JSON.parse(info.postData),
		res = info.res;
		
	if(typeof postData === "undefined"){
		webrtcError("No posted data in JSON format!", res);
		return;
	}
	if(typeof (postData.id) === "undefined"){
		webrtcError("No id received with messgae!", res);
		return;
	}
	if(typeof (messagesFor[partner[postData.id]]) === "undefined"){
		webrtcError("Invalid id " + postData.id, res);
		return;
	}
	
	log("Sending message ***" + 
		JSON.stringify(messagesFor[postData.id]) + "*** to id " +
		postData.id);
	webrtcResponse({'msgs':messagesFor[postData.id]}, res);
	messagesFor[postData.id] = [];
}
exports.get  = getMessage;





























