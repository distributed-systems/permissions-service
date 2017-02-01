(function() {
    'use strict';

    const log                   = require('ee-log');
    const Cachd                 = require('cachd');
    const distributed           = require('distributed-prototype');
    const RelationalRequest     = distributed.RelationalRequest;






    module.exports = class SubjectInfoLoader {


        constructor(gateway) {
            this.gateway = gateway;


            this.cache = new Cachd({
                  ttl: 3600000 // 1h
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });
        }







        load(type, subjectId, service, resource) {
            const cacheId = `${service}/${resource};${type}${subjectId}`;
            
            if (this.cache.has(cacheId)) return this.cache.get(cacheId);
            else {
                const promise = new Promise((resolve, reject) => {
                    new RelationalRequest({
                          action        : 'listOne'
                        , service       : service
                        , resource      : resource
                        , resourceId    : subjectId
                    }).send(this).then((response) => {
                        if (response.status === 'ok') {
                            if (response.hasObjectData()) resolve(response.data);
                            else resolve({});
                        } else reject(new Error(`Failed to load subject info from ${service}/${resource} for subject ${type}:${subjectId}!`));
                    });
                }).catch((err) => {

                    // remove from cache
                    this.cache.remove(token);

                    return Promise.reject(err);
                });

                // make sure the promnsie is returned to all
                // waiting requests
                this.cache.set(cacheId, promise);

                return promise;
            }
        }






        /**
         * send requests to other services
         */
        sendRequest(request, response) {
            this.gateway.sendRequest(request, response);
        }
    };
})();
