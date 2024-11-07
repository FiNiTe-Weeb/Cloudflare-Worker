import {appendPromiseArr} from "util.js";
/**
 * NOTES:
 * 1. leaderboard can be inaccurate when players have same score across page borders, same player may be shown a 2nd time instead of another player
 * 2. score/leaderboard cache will end when they hit 0 score, but only stops at loading next page, so u might see a few trailing 0 score-entries
 */
export default{
    pageLoader(afterPage=0,pageLength=100,limit=Infinity){
        let url="https://pointercrate.com/api/v1/players/ranking/";
        console.log("loading page "+(afterPage+1));
        let thisRef=this;
        let fetchPromise=new Promise(function(res,rej){//todo: handle error idk
            fetch(url+"?limit="+Math.min(pageLength,limit)+"&after="+(afterPage*pageLength)).then(function(resp){
                if(!resp.ok){
                    return Promise.reject(resp);
                }
                return resp.json();
            }).then(function(data){
                if(data.length>=pageLength&&limit>pageLength&&data[data.length-1].score>0){//probably not last page
                    let prom=appendPromiseArr(data,thisRef.pageLoader(afterPage+1,pageLength,limit-pageLength));
                    res(prom);
                }else{//last page
                    res(data);
                }
            }).catch(rej);
        });
        return fetchPromise;
    }
}