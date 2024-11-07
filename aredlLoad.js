import {appendPromiseArr} from "util.js";
/**
 * NOTES:
 * limit only prevents loading next page here lol
 */
export default{
    pageLoader(afterPage=0,pageLength=200,limit=Infinity){
        let url="https://api.aredl.net/api/aredl/leaderboard";
        console.log("loading page "+(afterPage+1));
        let thisRef=this;
        let fetchPromise=new Promise(function(res,rej){//todo: handle error idk
            fetch(url+"?per_page="+pageLength+"&page="+(afterPage+1)).then(function(resp){
                if(!resp.ok){
                    return Promise.reject(resp);
                }
                return resp.json();
            }).then(function(data){
                if(data.list.length>=pageLength&&limit>pageLength&&data.list[data.list.length-1].points>0&&data.pages>data.page){//probably not last page
                    let prom=appendPromiseArr(data.list,thisRef.pageLoader(afterPage+1,pageLength,limit-pageLength));
                    res(prom);
                }else{//last page
                    res(data.list);
                }
            }).catch(rej);
        });
        return fetchPromise;
    }
}