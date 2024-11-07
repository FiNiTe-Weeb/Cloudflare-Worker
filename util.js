/**
* Function I use to stack data from different pages
* @param {Array} existingArr - array to append to.
* @param {Promise<Array>} promiseArr - promise which is expected to resolve to an array, the elements of which will be appended to existingArr
* @returns - The concatanated array
*/
export function appendPromiseArr(existingArr,promiseArr){
    let appendArrPromise=new Promise(function(res,rej){//todo: error handling
        promiseArr.then(function(newArr){
            res(existingArr.concat(newArr));
        });
    });
    return appendArrPromise;
}