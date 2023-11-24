process.env.TZ="Asia/Bangkok";
let url=require("url");
let fs=require('fs');
let zlib=require('zlib');
let crypto=require('crypto');

let _server=0;
let _start=0;
let _user={};

let server=class{
	#add={
		users:_user,
		url:'',
		_length:0,
		size:0,
		sendData:0,
		sendCode:200,
		method:'close',
		powered:'proxy/12.0',
		log:function(txt){
			let load=this.contime((new Date()).getTime()-this.time),ms='\x1b[33m';
	
			ms+=this.method.toUpperCase();
			if(ms.length<12)ms+=Array(13-ms.length).join(' ');
			
			ms+='\x1b[37m'+load;
			if(ms.length<24)ms+=Array(25-ms.length).join(' ');

			ms+='\x1b[32m'+this.bytes(this.sendData);
			if(ms.length<36)ms+=Array(37-ms.length).join(' ');

			ms+='\x1b[36m'+this.bytes(this.size);
			if(ms.length<48)ms+=Array(49-ms.length).join(' ');
			
			ms+='\x1b['+(typeof txt!='undefined'?('31m'+txt):(([200,101].includes(this.sendCode)?'32m':'31m')+this.sendCode));
			if(ms.length<61)ms+=Array(62-ms.length).join(' ');
			
			ms+='\x1b[37m'+(typeof this.ip=='string'?this.ip:'-');
			if(ms.length<80)ms+=Array(81-ms.length).join(' ');

			ms+='\x1b[37m'+(typeof this.head=='object'?this.servername:'#')+this.url;
			this.cat(ms);
			
			this.size=0;
			this.sendData=0;
			this.time=(new Date()).getTime();
		},
		cat:function(e){
			console.log(e)
		},
		code:function(code){
			this.sendCode=code;
			return this;
		},
		set:function(a,b){
			if(typeof a=='string'){
				this.headDB[a.toLowerCase()]=b;
			}else if(typeof a=='object'){
				for(let x in a)
					this.headDB[x.toLowerCase()]=a[x];
			}
			return this;
		},
		headCreate:function(c,h){
			if(this.writable){
				if(typeof c=='number')this.code(c);
				if(typeof h=='object')this.set(h);
				if(typeof this.headDB['content-type']=='undefined'&&this.headDB.upgrade!='websocket')
					this.headDB['content-type']='text/html; charset=UTF-8';
				if(typeof this.headDB['x-frame-options']=='undefined')
					this.headDB['x-frame-options']='DENY';
				
				this.headDB['x-powered-by']=this.powered;
				
				let head='',code=this.sendCode,http={
					101:'Switching Protocols',
					200:'OK',
					206:'Partial Content',
					400:'Bad Request',
					401:'Unauthorized',
					403:'Forbidden',
					404:'Not Found',
					408:'Request Timeout',
					411:'Length Required',
					415:'Unsupported Media Type',
					
					502:'Bad Gateway',
					504:'Gateway Timeout',
				}[code];
				
				for(let x in this.headDB){
					let hd=this.headDB[x];
					if(typeof hd=='object'){
						for(let v in hd){
							head+=x+': '+hd[v].replace(/[\n\r]/g,'')+'\r\n';
						}
					}else if(typeof hd=='string'){
						head+=x+': '+hd.replace(/[\n\r]/g,'')+'\r\n';
					}else if(typeof hd=='number'){
						head+=x+': '+hd.toString()+'\r\n';
					}else{
						head+=x+': \r\n';
					}
				}
				
				this.write(Buffer.from('HTTP/1.1 '+code+' '+http+'\r\n'+head+'\r\n'));
			}
		},
		sendEnd:function(data){
			if(this.writable){
				if(typeof data=='string'||typeof data=='number'){
					data=Buffer.from(data);
				}else if(typeof data!='object'){
					data=Buffer.from('');
				}
				
				let accept=[];
				if(this.head.hasOwnProperty('accept-encoding'))
					accept=this.head['accept-encoding'].split(', ');
					
				if(accept.includes('gzip'))
					this.acceptCode(data,'gzip');
				else if(accept.includes('br'))
					this.acceptCode(data,'br');
				else if(accept.includes('deflate'))
					this.acceptCode(data,'deflate');
				else this.offSend(data);
			}
		},
		acceptCode:function(data,code){
			let req=this,run={
				gzip:'gzip',
				br:'brotliCompress',
				deflate:'deflate'
			};
			if(run.hasOwnProperty(code)){
				zlib[run[code]](data,(err,body)=>{
					if(!err){
						req.set({
							vary:'accept-encoding',
							'content-encoding':code,
						});
						req.offSend(body);
					}else req.error(500);
				});
			}else req.error(500);
		},
		offSend:function(data){
			this.headCreate();
			this.end(data);
			this.sendData=data.length;
			this.log();
		},
		wwwform:function(data){
			if(typeof data=='object')
				data=new TextDecoder('utf8').decode(data);
			var db={};
			for(let x of data.split('&')){
				var abc=x.search('='),name='',val='';
				if(abc==-1){
					name=decodeURIComponent(x.trim());
					val='';
				}else{
					try{
						name=decodeURIComponent(x.substring(0,abc).trim());
						val=decodeURIComponent(x.substr(abc+1));
					}catch(e){}
				}
				if(typeof db[name]=='undefined')db[name]=[val];
				else db[name][db[name].length]=val;
			}
			return db;
		},
		formdata:function(buf,key){
			buf=Buffer.concat([Buffer.from('\r\n'),buf]);
			key='\r\n--'+key;

			let i=0,z=0,c=1,db={},l=key.length+2;
			while(c){
				z=buf.indexOf(key,i)+l;
				i=buf.indexOf(key,z);
				if(i>0){
					var b=buf.slice(z,i),abc;
					var name=' name="';
					var fname=b.indexOf(name)+name.length;
					name=b.slice(fname,b.indexOf('"',fname));
					
					var data='\r\n\r\n';
					data=b.slice(b.indexOf(data)+data.length);
					
					
					var file=' filename="';
					var ffile=b.indexOf(file);
					if(ffile!=-1){
						ffile+=file.length;
						file=b.slice(ffile,b.indexOf('"',ffile));
						
						var type='Content-Type: ';
						var ftype=b.indexOf(type)+type.length;
						type=b.slice(ftype,b.indexOf('\r\n',ftype)).toString();
						abc={
							name:file.toString(),
							type:type,
							data:data
						};
					}else{
						abc=new TextDecoder('utf8').decode(data);
					}
					
					if(typeof db[name]=='undefined')db[name]=[abc];
					else db[name][db[name].length]=abc;
					
				}else c=0;
			}
			return db;
		},
		sendWrite:function(data){
			if(this.writable)
				this.write(data);
		},
		cancel:function(){
			this.pause();
			if(this.hasOwnProperty('stop'))this.stop();
			if(this.hasOwnProperty('reader')){
				this.reader.unpipe(this);
				if(this.reader.destroy)
					this.reader.destroy();
			}else if(!this.hasOwnProperty('readfile'))this.log('cancel');
			this.destroy();
			this.cancel=function(){};
		},
		error:function(code){
			this.pause();
			if(this.writable){
				this.code(code);
				this.sendEnd('');
			}else this.cancel();
		},
		contime:function(t){
			if(t>=86400000)t=(t/86400000).toFixed()+"d";
			else if(t>=3600000)t=(t/3600000).toFixed()+"hr";
			else if(t>=60000)t=(t/60000).toFixed()+"min";
			else if(t>=1000)t=(t/1000).toFixed()+'s';
			else if(t>=1)t=t+"ms";
			else t="0ms";
			return t
		},
		bytes:function(b){
			if(b>=1073741824)b=(b/1073741824).toFixed()+"g";
			else if(b>=1048576)b=(b/1048576).toFixed()+"m";
			else if(b>=1024)b=(b/1024).toFixed()+"k";
			else if(b>=1)b=b;
			else b="0";
			return b+"b"
		}
	}
	#checkDB={}
	#tooldomain={}
	#path={}
	#isContent=['post']
	#allow=[]
	#maxData=0
	#timeout=1e4
	#maxSocket=10
	#method=['get','post']
	#domainObj={}
	#RunCall={}
	#has=function(val,type,turn){
		if(typeof type=='undefined')type='string';
		if(typeof turn=='undefined')turn='';
		return typeof val==type?val:turn;
	}
	#is=function(val){
		return typeof val!='undefined';
	}
	
	#CoreHTTP=function(req){
		req.q=function(a,b){
			let i=this.body;
			if(i.hasOwnProperty(a)){
				i=i[a];
				if(typeof i=='object')
					return i.hasOwnProperty(b)?i[b]:i[i.length-1];
				else return i;
			}else return undefined;
		};
		req.check=function(id){
			for(let x of id.split(','))
				if(!this.body.hasOwnProperty(x))return 0;
			return 1;
		};
		req.send=function(data){
			this.sendEnd(data);
		};
		req.json=function(a){
			this.set('content-type','application/json; charset=UTF-8');
			this.send(JSON.stringify(a));
		};
		if(req.head.hasOwnProperty('content-length')){
			let type=req.head['content-type'],
			data=req.raw;
			if(typeof type=='string'){
				req.size=data.length;
				if(type.search('/x-www-form-urlencoded')>0){
					req.body=req.wwwform(data);
				}else if(type.search('/form-data')>0){
					req.body=req.formdata(data,type.split('multipart/form-data; boundary=')[1]);
				}else if(type.search('/json')>0){
					try{req.body=JSON.parse(data.toString('utf8'))}catch(e){req.body={}}
				}else{
					return req.error(415);
				}
			}
		}
		req.callback(req);
	}
	
	#callback=function(req){
		let path=this.#path;
		let host=req.servername;
		let mainID=this.#domainObj[host]||'d41d8cd98f00b204e9800998ecf8427e';

		if(this.#checkDB.hasOwnProperty(mainID)&&this.#checkDB[mainID](req)!==true){
			return req.error(400);
		}
		
		if(path.hasOwnProperty(mainID)){
			path=path[mainID];
		}else{
			return req.error(400);
		}
		
		if(path.hasOwnProperty(req.method)){
			path=path[req.method];
		}else{
			return req.error(400);
		}
		
		let url=req.url.substr(1).split('/');
		let i=0;
		let ustar=0;
		let star=false;
		let search=[];
		
		for(let x of url){
			if(path.hasOwnProperty('*')){
				star=path['*'];
				ustar=i;
			}
			if(path.hasOwnProperty('%')){
				return req.error(400);
			}else if(path.hasOwnProperty(x)){
				path=path[x];
			}else if(path.hasOwnProperty(':')){
				path=path[':'];
				search.push(x);
			}else{
				if(star===false)return req.error(404);
				else path=star;
				break;
			}
			i++;
		}

		if(!path.hasOwnProperty('#')&&star!==false)path=star;

		if(path.hasOwnProperty('#')){
			path=path['#'];
			let parse=path['$'];
			let mode=path['&'];
			let id=path['%'];
			
			if(!this.#RunCall.hasOwnProperty(id)){
				return req.error(400);
			}
			
			req.callback=this.#RunCall[id];
			
			try{
				if(mode==':'){
					for(let x in parse){
						req.key[parse[x]]=decodeURI(search[x]||'')||'';
					}
				}else if(mode=='*'){
					req.key[parse[0]]=decodeURI(url.slice(ustar).join('/'))||'';
				}
			}catch(e){
				return req.error(400);
			}

			this.#CoreHTTP(req);
		}else req.error(400);
	}
	#hashChack=function(data){
		return crypto.createHash('md5').update(data.toString()).digest('hex');
	}
	use=function(method,url,cell,domain){
		if(this.#method.indexOf(method)!=-1){
			let path=this.#path;
			
			if(!Array.isArray(url)){
				url=[url];
			}
			if(!Array.isArray(domain)){
				domain=[domain];
			}
			
			if(typeof path[domain]=='undefined'){path[domain]={}}
			path=path[domain];
			
			if(typeof path[method]=='undefined'){path[method]={}}
			path=path[method];
			
			for(let u of url){
				let paths=path;
				if(method=='websocket'){
					if(u.search(/\:|\*/)==-1)
						this.#add.users[u]={};
					else return console.log('websocket not suport url [:|*]');
				}
				
				let bin=encodeURI(u.substr(1)).split('/');
				
				let box=[];
				let mode='';
				
				for(let x of bin){
					if(x[0]==':'||x[0]=='*'){
						box.push(x.substr(1));
						mode=x=x[0];
					}
					if(typeof paths[x]=='undefined'){paths[x]={}}
					paths=paths[x];
				}
				
				paths['#']={
					'&':mode,
					'$':box,
					'%':this.#checkCall(cell)
				};
			}
		}
	}
	#checkCall=function(f){
		for(let x in this.#RunCall){
			if(this.#RunCall[x]==f){
				return x;
			}
		}
		let id=this.#hashChack(f.toString()+Math.random().toString());
		this.#RunCall[id]=f;
		return id;
	}
	domain=function(host){
		if(!Array.isArray(host)){
			host=[host||''];
		}
		let mo=host.join(',');
		let id=this.#hashChack(mo=='@'?'':mo);
		
		if(!this.#tooldomain.hasOwnProperty(id)){
			let obj={
				id:id,
				q:this,
				filter:function(call){
					return (this.q.#checkDB[this.id]=call),this;
				}
			};
			for(let x in this.#method){
				let r=this.#method[x].replace(/[^a-z]/g,'');
				if(!obj.hasOwnProperty(r)){
					obj[r]=new Function("url","cell",`return this.q.use("${r}",url,cell,this.id),this`);
				}else{
					return console.log(`\t * \x1b[31mServer:\x1b[37m not add method ${r}\x1b[0m`);
				}
			}
			
			for(let x of host){
				this.#domainObj[x]=id;
			}
			
			return (this.#tooldomain[id]=obj);
		}else{
			return console.log(`\x1b[37mDuplicate domain.\x1b[0m`);
		}
	}
	#objcheck=function(key,val,c){
		if(key.length==0)return 0;
		let is=key.indexOf(val);
		return c?(is!=-1):(is==-1)
	}
	#moop=function(r){
		if(typeof r=='string')
			r=r.split(',');
		
		if(typeof r=='object'&&r.length>0){
			let d=[];
			r.forEach(a=>{
				if(a!='')
					d.push(a)
			})
			return d
		}else return [];
	}
	constructor(option){
		let config={};
		if(typeof option!='object')option={};
		
		if(_server==0){
			if(option.clear)console.clear();
			console.log('');
			console.log('\tFrameworks "\x1b[32m'+this.#add.powered+'\x1b[0m"');
		}
		_server++;
		
		if(!this.#is(option.use))
			option.use='net';
		else if(option.use!='net'&&option.use!='tls')
			return console.log('\t * \x1b[31mServer:\x1b[37m please config use [net|tls]\x1b[0m');
		
		if(this.#is(option.add)){
			for(let x in option.add){
				if(typeof this.#add[x]=='undefined')
					this.#add[x]=option.add[x];
				else return console.log('\t * \x1b[31mServer:\x1b[37m not add "'+x+'"\x1b[0m');
			}
		}
		
		for(let x in option){
			let y=option[x];
			if(x=='maxData')this.#maxData=y
			else if(x=='maxSocket')this.#maxSocket=y
			else if(x=='timeout')this.#timeout=y
			else if(x=='isContent')this.#isContent=this.#moop(y)
			else if(x=='method')this.#method=this.#moop(y)
			else if(x=='allow')this.#allow=this.#moop(y)
			else if(x=='ssl'&&option.use=='tls'){
				let domain={};
				for(let x in y.domain){
					for(let z of y.domain[x]){
						domain[z]=y.cert[x];
					}
				}
				config.SNICallback=function(servername,callback){
					let ssl=this._SNICallback.prototype.ssl;
					if(ssl.hasOwnProperty(servername)){
						callback(null,ssl[servername])
					}else{
						this.destroy();
					}
				}
				
				config.SNICallback.prototype.ssl=domain;
			}
		}
		
		let port=this.#has(option.port,'number',process.env.PORT||(option.use=='tls'?443:80)),
		host=this.#has(option.host,'string',process.env.HOST||'0.0.0.0');

		try{
			require(option.use).createServer(config,(req)=>{
				if(_start==0){
					console.log('\n\x1b[43m\x1b[30mMODE   LOAD   OUT    IN     STATUS  IP            URL            \x1b[0m');
					_start++;
				}
				
				if(this.#objcheck(this.#allow,req.remoteAddress))
					return req.destroy();
				
				if(this.#timeout!==0)req.setTimeout(this.#timeout);

				req.time=(new Date()).getTime();
				req.ip=req.remoteAddress;
				req.raw=Buffer.alloc(0);
				req.headDB={};
				req.body={};
				req.key={};
				req.head={};
				let _data=[],doraw=1;
				
				for(let x in this.#add)req[x]=this.#add[x];
				
				req.on('data',(db)=>{
					try{
						req._length+=db.length;
						if(this.#maxData!==0&&req._length>this.#maxData){
							return req.error(411);
						}else{
							if(doraw==1){
								let str=db.toString('utf8'),_head=0,_end=0;
								if(str.search('\r\n\r\n')!=-1){
									let split=db.indexOf('\r\n\r\n');
									_head=db.slice(0,split).toString('utf8');
									let dt=db.slice(split+4);
									req.size+=dt.length;
									_data.push(dt);
									_end=1;
								}else if(str.substr(-2)=='\r\n'){
									_head=str;
								}else return req.error(400);
								
								let h=_head.split('\r\n');
								if(!req.hasOwnProperty('http')){
									let fh=h[0].split(' ');
									if(fh.length==3){
										req.method=fh[0].toLowerCase();
										
										if(req.size>0&&this.#objcheck(this.#isContent,req.method))
										return req.error(400);
										
										let search=fh[1].search(/\?/);
										if(search==-1){
											req.url=fh[1];
											req.query={}; 
										}else{
											req.url=fh[1].substring(0,search);
											req.query=this.#add.wwwform(fh[1].substr(search+1).replace(/\+/gm,'%20'));
										}
										
										if(req.url[0]!='/')req.url=req.url.replace(/http(|s)\:\/\/([^\/]*)/,'');
										
										req.http=fh[2];
										h=h.slice(1);
									}else return req.error(400);
								}
								
								for(let x of h){
									let i=x.search(':');
									let name=x.substring(0,i);
									let value=x.substring(i+2);
									if(name!=''&&value!='')
										try{
											req.head[name.toLowerCase()]=decodeURIComponent(value);
										}catch(e){
											return req.error(400);
										}
									else return req.error(400);
								}
								
								if(!_end)return 0;
								
								if(typeof req.servername!='string')
									req.servername=typeof req.head.host=='string'?req.head.host:'';
								
								if(req.head.hasOwnProperty('cf-connecting-ip'))
									req.ip=req.head['cf-connecting-ip'];
								else if(req.head.hasOwnProperty('x-forwarded-for'))
									req.ip=req.head['x-forwarded-for'].split(',')[0];
								
								if(req.head.hasOwnProperty('content-length')){
									req._len=parseInt(req.head['content-length'],0);
									
									if(req.size==req._len){
										req.raw=Buffer.concat(_data);
										req.pause();
										this.#callback(req);
									}else doraw=2;
								}else{
									req.pause();
									this.#callback(req);
								}
							}else if(doraw==2){
								_data.push(db);
								req.size+=db.length;
								if(req.size==req._len){
									req.raw=Buffer.concat(_data);
									req.pause();
									this.#callback(req);
								}else if(req.size>req._len){
									req.pause();
									return req.error(400);
								}
							}
						}
					}catch(e){
						req.cat(e);
						req.error(500);
					}
				}).on('timeout',()=>{
					req.error(408);
				}).on('error',(e)=>{
					req.error(500);
				})
			}).on('error',(e)=>{
				if(e.code=='EADDRINUSE')
					console.log('\t * \x1b[31mError:\x1b[37mport '+port+'\x1b[0m');
				else console.log(e)
			}).listen(port,host,(a)=>{
				let met='';
				this.#method.forEach(m=>{
					met+=(met==''?'':'\x1b[37m,\x1b[36m')+m.toUpperCase()
				});
				let use=option.use.toUpperCase();
				console.log('\t * \x1b[33m'+use+'\x1b[37m:'+port+' \x1b[36m'+met+'\x1b[0m');
				for(let x in this.#domainObj){
					if(x==''){
						console.log(`\t   \x1b[35m> \x1b[0mAll Domain\x1b[0m`);
					}else{
						console.log(`\t   \x1b[35m> \x1b[0mhttp${use=='TLS'?'s':''}://${x}\x1b[0m`);
					}
				}
			});
		}catch(e){console.log(e)}
	}
};
let base={
  jsons:function(a){
    try{
      return JSON.parse(a)
    }catch(e){
      return {}
    }
  },
  iurl:async function(op){
    let send='',data=[],st=1;
    if(typeof op=='string')op={url:op};
    op.headers={};
    if(typeof op.url=='string'){
      let u=url.parse(op.url);
      if(typeof u=='object'){
        op.port=u.protocol=='https:'?443:80;
        op.use=u.protocol=='https:'?'https':'http';
        op.hostname=u.host;
        op.path=u.path;
      }
    }
    if(typeof op.timeout=='undefined')op.timeout=3000;

    if(typeof op.json=='object'){
      send=JSON.stringify(op.json);
      op.headers['content-type']='application/json';
      op.headers['content-length']=send.length;
      if(typeof op.method=='undefined')op.method='POST';
    }
    if(typeof op.body!='undefined'){
      if(typeof op.body=='object'){
        for(x in op.body)
          send+=(send==''?'':'&')+x+'='+encodeURI(op.body[x]);
      }else if(typeof op.body=='string'){
        send=op.body;
      }
      op.headers['content-type']='application/x-www-form-urlencoded';
      if(typeof op.method=='undefined')op.method='POST';
    }

    if(typeof op.raw!='undefined'){
      send=op.raw;
    }

    if(typeof op.agent=='string'){
      op.headers['user-agent']=op.agent;
      delete op.agent;
    }else{
      op.headers['user-agent']='NodeJS(R983/8.0)';
    }
    if(typeof op.ref=='string'){
      op.headers['referer']=op.ref;
    }

    if(typeof op.cookie=='object'){
      let ck='';
      for(x in op.cookie)
        ck+=(ck==''?'':'; ')+x+'='+encodeURI(op.cookie[x]);
      op.headers['cookie']=ck;
    }else if(typeof op.cookie=='string'){
      op.headers['cookie']=op.cookie;
    }

    if(typeof op.method=='undefined')op.method='GET';
    if(typeof op.encode=='undefined')op.encode='utf8';
    if(typeof op.head=='object'){
      for(x in op.head)op.headers[x]=op.head[x];
    }

    if(send.length>0)op.headers['content-length']=send.length;

    let status='error',head={};
    try{
      await new Promise((resolve)=>{
        require(op.use).request(op,(res)=>{
          try{
            res.on('data',(chunk)=>{
              data.push(chunk);
            }).on("end",()=>{
              status=res.statusCode;
              head=res.headers;
              if(typeof res.destroy=='function')res.destroy();
              resolve();
            }).on('error',(err)=>{
              status='error';
              head={};
              if(typeof res.destroy=='function')res.destroy();
              resolve();
            }).on('timeout',()=>{
              status='timeout';
              head={};
              if(typeof res.destroy=='function')res.destroy();
              resolve();
            })
          }catch(e){status='request',head={},resolve();}
        }).on('error',(e)=>{
          status='domain';
          head={};
          resolve();
        }).end(send);
      })
    }catch(e){status='system',head={},console.log(e)}

    data=Buffer.concat(data);
    if(op.encode!='raw')data=data.toString(op.encode);
    return {
      status:status,
      head:head,
      data:data
    };
  }
};

let app=new server({
	use:'net',
	clear:false,
	method:['get','post','websocket','options'],
	set:{}
});

app.domain('')
.options('/api',async(req)=>{
  req.set('access-control-allow-origin','*');
  req.send('');
})
.post('/api',async(req)=>{
  req.set('access-control-allow-origin','*');
  if(req.check('url')){
    let config={
      url:req.q('url'),
      method:req.q('method')||'get'
    };
    if(req.check('head')){
      let head=base.jsons(req.q('head'));
      config.head=head;
    }
    if(req.check('agent')){
      let agent=req.q('agent');
      config.agent=agent;
    }
    if(req.check('ref')){
      let ref=req.q('ref');
      config.ref=ref;
    }
    if(req.check('encode')){
      let encode=req.q('encode');
      config.encode=encode;
    }

    if(req.check('body')){
      let body;
      try{
        body=JSON.parse(req.q('body'));
      }catch(e){
        body=req.q('body');
      }
      config.body=body;
    }else if(req.check('json')){
      let json=base.jsons(req.q('json'));
      config.json=json;
    }else if(req.check('raw')){
      let raw=req.q('raw');
      config.raw=raw;
    }
    let load=await base.iurl(config);
    req.json({
      status:true,
      data:{
        code:load.status,
        head:load.head,
        data:load.data
      }
    });
  }else{
    req.json({
      status:false,
      err:'not have URL.'
    });
  }
});