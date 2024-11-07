import welcome from "welcome.html";
import pointercrateLoad from "pointercrateLoad.js";
import aredlLoad from "./aredlLoad.js";

/**
 * @typedef {Object} Env
 */

const AREDL="aredl";
const POINTERCRATE="pointercrate";
const allowedLists=["test",POINTERCRATE,"insaneDemonList","lowRefreshRateList",AREDL,"challengeList"];
const allowedEvents=["initLoad","apiGetPlayer","apiSearchPlayer"];
const allowedTargets=["score","leaderboard"];
const JSON_HEADERS=new Headers({
	"content-type": "application/json",
	"Access-Control-Allow-Headers": "*",
	"Access-Control-Allow-Origin": "*",
});

export default {
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetchDefault(request, env, ctx) {
		const url = new URL(request.url);
		console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`);

		if (url.pathname === "/api") {
			// You could also call a third party API here
			const data = await import("./data.js");
			return Response.json(data);
		}
		return new Response(welcome, {
			headers: {
				"content-type": "text/html",
			},
		});
	},
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		if(request.method=="OPTIONS"){
			let headers=new Headers();
			headers.append("Access-Control-Allow-Headers","*");
			headers.append("Access-Control-Allow-Origin","*");
			return new Response("hi",{headers:headers});
		}
		const url = new URL(request.url);
		let path=url.pathname.substring(1);
		//console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`);
		let splitPath=path.split('/');

		console.log("Method: "+request.method+", path: "+path+", splitPath: "+splitPath);

		switch(splitPath[0]){
			case "api":
				return await handleApi(request,env,ctx,splitPath.slice(1));
			case "rankcache":
				return await handleRankCache(request,env,ctx,splitPath.slice(1));
			case "test":
				//return await handleTest(request,env,ctx,splitPath.slice(1));
		}

		return badReq();
	},
	/**
	 * @param {ScheduledEvent} event
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 */
	async scheduled(event, env, ctx) {
		console.log(event.scheduledTime);
		console.log(event.cron.length);
		switch (event.cron) {
			case "*0 0 * * *":
				await update(env,POINTERCRATE);
				break;
			case "*5 0 * * *":
				await update(env,AREDL);
				break;
		  }
	},
};



/**
 * @param {Env} env
 * @param {string} list
 */
async function update(env,list){
	let leaderboard=null;
	console.log("Running update for "+list);
	switch(list){
		case AREDL:
			leaderboard=await aredlLoad.pageLoader();
			break;
		case POINTERCRATE:
			leaderboard=await pointercrateLoad.pageLoader(0,100);
			break;
		default:
			console.error("update function given bad list: ",list);
			badReq();
	}
	let pointsArr=[];
	for(let i=0;i<leaderboard.length;i++){
		pointsArr.push(leaderboard[i].points);
	}
	console.log(pointsArr.length);
	await env.rankingsCache.put(list+"-leaderboard",JSON.stringify(leaderboard));
	await env.rankingsCache.put(list+"-score",JSON.stringify(pointsArr));
	console.log("Finished update for "+list);
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 * @param {Array} splitPath
 * @returns {Promise<Response>}
 */
async function handleApi(request,env,ctx,splitPath){
	if(request.headers.get("content-type")!="application/json"){
		return badReq("Only content-type:application/json requests are supported");
	}
	if(request.method!="POST"){
		return badReq("POST Request pls!!!");
	}
	try{
		let requestBody=await request.json();
		console.log(requestBody);

		let list=requestBody.list;
		let event=requestBody.event;
		if(list==undefined){return badReq("Missing list")}
		if(event==undefined){return badReq("Missing event")}
		if(allowedLists.indexOf(list)<0){return badReq("Invalid list")}
		if(allowedEvents.indexOf(event)<0){return badReq("Invalid event")}


		let listData=JSON.parse(await env.usages.get(list));
		if(listData==null){
			listData={
				event:{totals:{}}
			}
		}
		if(listData.event==undefined){listData.event={};}
		if(listData.event.totals==undefined){listData.event.totals={};}
		if(listData.event.totals[event]==undefined){listData.event.totals[event]=0;}
		listData.event.totals[event]++;
		await env.usages.put(list,JSON.stringify(listData));


		return new Response("{\"data\":"+JSON.stringify({
			...requestBody,
			count:listData.event.totals[event]
		})+",\"status\":\"201\"}", {
			headers:JSON_HEADERS,
			status:201
		});
	}catch(exception){
		console.log(exception.message);
		return badReq(exception.message);
	}
	return badReq("Bad Request to API");

}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 * @param {Array} splitPath
 * @returns {Promise<Response>}
 */
async function handleRankCache(request,env,ctx,splitPath){
	let list=splitPath[0];
	let target=splitPath[1];
	if(list==undefined||list==""){
		return badReq("Missing path segment (e.g: /rankcache/pointercrate/score)");
	}
	if(allowedLists.indexOf(list)<0){
		return badReq("Invalid list");
	}
	if(allowedTargets.indexOf(target)<0){
		return badReq("Invalid target, allowed targets: "+allowedTargets.join(', '));
	}
	//if(target=="leaderboard"){
	//	return badReq("Temporarily disabled target");
	//}
	let rankCache=await env.rankingsCache.get(list+"-"+target);
	if(rankCache==null){
		let responseDat={
			message:"There is currently no rank cache for this list",
			status:404
		};
		return new Response(JSON.stringify(responseDat),{
			headers:JSON_HEADERS,
			status:404
		});
	}
	return new Response(rankCache,{
		headers:JSON_HEADERS,
		status:200
	});
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 * @param {Array} splitPath
 * @returns {Promise<Response>}
 */
async function handleTest(request,env,ctx,splitPath){

	//let pointercrateLeaderboard=await pointercrateLoad.pageLoader(0,100);
	//let aredlLeaderboard=await aredlLoad.pageLoader(0,100,300);
	//let aredlLeaderboard=await aredlLoad.pageLoader();
	//console.log(aredlLeaderboard);

	//await update(env,AREDL);
	return new Response(JSON.stringify({}),{
		headers:JSON_HEADERS,
		status:200
	});
}

/**
 * @param {String} msgOverride
 * @returns {Response}
 */
function badReq(msgOverride="Nuh uh! Bad Request!!"){
	let responseDat={
		message:msgOverride,
		status:400
	};
	return new Response(JSON.stringify(responseDat), {
		headers:JSON_HEADERS,
		status:400
	});
}

/**
 * @param {Request} request
 */
function logHeaders(request){
	for(let entry of request.headers.entries()){
		console.log(entry[0]+": "+request.headers.get(entry[0]));
	}
}

/*
send:
fetch("https://workers-playground-hidden-frost-1d0a.finite-10-07.workers.dev/api",{
  method:"POST",
	body:"{\"list\":\"test\",\"event\":\"initLoad\"}",
	headers:new Headers({"content-type":"application/json"})
}).then(function(resp){return resp.json();}).then(console.log);
*/

//https://pointercrate.com/api/v1/players/ranking/?limit=100&after=100