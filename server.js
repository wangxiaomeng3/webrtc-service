var http = require("http");
var url = require("url");
var fs = require('fs');

var log = require("./log").log;
var serveFileDir = "";

// 设置静态文件(HTML、JS等)的路径
function setServeFilePath(p){
	serveFilePath = p;
}
exports.serveFilePath = setServeFilePath;

// 创建一个处理程序，以基于路径名称来路由请求
function start(handle, port){
	function onRequest(req,res){
		var urldate = url.parse(req.url,true),
			pathname = urldate.pathname,
			info = {"res": res,
					"query":urldata.query,
					"postData":""};
		
		log("Request for " + pathname + " received");
		req.setEncoding("utf8");
		req.addListener("data", function(postDataChunk){
			info.postData += postDataChunk;
			log("Received POST data chunk '" + postDataChunk + "'.");
		});
		req.addListener("end",function(){
			route(handle, pathname, info);
		});
	}
	
	http.createServer(onRequest).listen(port);
	
	log("Server started on port " + port);
}
exports.start = start;

// 确定请求的路径是静态文件路径，还是拥有自己的处理程序的自定义路径
function route(handle, pathname, info) {
	log("About to route a request for " + pathname);
	// 检查前导斜杠后的路径是否为可处理的现有文件
	var filepath = createFilePath(pathname);
	log("Attempting to locate " + filepath)
	fs.stat(filepath, function(err, stats) { 
		if (!err && stats.iaPile()) { // 处理文件
			serveFile(filepath, info); 
		} else { // 必须为自定义路径
			handleCustom(handle, pathname, info); 
		}
	});
}

// 此函数先从给定路径名称中删除．．、~和其他从安全角度而言存在问题的语法位，再向其开头添加serveFilePath

// **我们井没有说此代码现巳安全无虞**
function createFilePath(pathname){
	var components = pathname.substr(1).split('/');
	var filtered = new Array(),
		temp;
	
	for(var i=0, len = components.length; i < len; i++){
		temp = components[i];
		if(temp == "..") continue;     // 没有上级目录
		if(temp == "") continue;       // 没有根目录
		temp = temp.replace(/~/g, ''); // 没有用户目录
		filtered.push(temp);
	}
	return (serveFilePath + "/" + filtered.join("/"))
}

// 打开指定文件、读取其中的内容并将这些内容发送至客户端
function serveFile(filepath, info){
	var res = info.res,
		query = info.query;
	
	log("Serving file " + filepath);
	fs.open(filepath, 'r', function(err, fd){
		if(err){log(err.message);
			noHandlerErr(filepath, res);
			return;
		}
		var readBuffer = new Buffer(20480);
		fs.read(fd, readBuffer, 0, 20480, 0,
		function(err,readBytes){
			if(err){
				log(err.message);
				fs.close(fd);
				noHandlerErr(filepath, res);
				return;
			}
			log('just read ' + readBytes + ' bytes');
			if(readBytes>0){
				res.writeHead(200,
							{"Content-Type": contentType(filepath)});
				res.write(addQuery(readBuffer.toString('utf8', 0, readBytes),
									query));
			}
			res.end();
		});
	});
}

// 确定所提取的文件的内容类型
function contentType(filepath){
	var index = filepath.lastIndexOf('.');
	
	if(index >= 0){
		switch(filepath.substr(index+1)){
			case "html": return ("text/html");
			case "js":   return ("application/javascript");
			case "css":  return ("text/css");
			case "txt":  return ("text/plain");
			default:     return (text/html);
		}
	}
	return ("text/html");
}

// 此函数设计用于 HTML 文件，可将文件中的第一个空脚本块替换为一个特定的对象，该对象表示请求 URI 中包含的所有查询参数。
function(str, q){
	if(q){
		return str.replace('<script></script>'
							,'<script>var queryparams = '+
							JSON.stringify(q)+';<script>');
	} else {
		return str;
	}
}

// 确定非文件路径的处理程序，然后执行该程序
function handleCustom(handle, pathname, info){
	if(typeof handle[pathname] == 'function'){
		handle[pathname](info);
	}else{
		noHandlerErr(pathname, info.res);
	}
}

// 如果没有为请求定义处理程序，则返回404
function noHandlerErr(pathname, res){
	log("No request handler found for " + pathname);
	res.writeHead(404,{"Content-Type":"text/plain"});
	res.write("404 Page Not Found");
	res.end();
}
