(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');



    module.exports = class CapabilityLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;



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
                    this.db.capability('identifier', {id: id}).raw().findOne().then((capability) => {
                        if (capability) resolve(capability.identifier);
                        else resolve();
                    }).catch(reject);
                }).catch((err) => {

                    // remove from cache
                    this.cache.remove(id);

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
