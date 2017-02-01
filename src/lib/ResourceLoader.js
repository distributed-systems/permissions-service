(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');
    const ServiceLoader         = require('./ServiceLoader');



    module.exports = class ResourceLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;


            // load service info
            this.serviceLoader = new ServiceLoader(options);


            // cache permissions
            this.cache = new Cachd({
                  ttl: 3600000 // 1h
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });
        }






        load(id) {
            if (this.cache.has(id)) return this.cache.get(id);
            else {
                const promise = new Promise((resolve, reject) => {

                    // get from db
                    this.db.resource(['id_service', 'identifier'], {id: id}).findOne().then((resource) => {
                        if (resource) {
                            return this.serviceLoader.load(resource.id_service).then((identifier) => {
                                resolve({
                                      identifier: resource.identifier
                                    , serviceIdentifier: identifier
                                });
                            });
                        } else resolve();
                    }).catch(reject);
                }).catch((err) => {

                    // remove from cache
                    this.cache.remove(token);

                    return Promise.reject(err);
                });


                // return to all requesters
                this.cache.set(promise);


                // Return
                return promise;
            }
        }
    };
})();
