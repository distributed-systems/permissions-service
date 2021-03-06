(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');



    module.exports = class PermissionsLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;


            this.resourceLoader = options.resourceLoader;
            this.actionLoader = options.actionLoader;


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
                    this.db.permission(['id_action', 'id_resource'], {id: id}).findOne().then((permission) => {
                        if (permission) {
                            return this.resourceLoader.load(permission.id_resource).then((resource) => {
                                return this.actionLoader.load(permission.id_action).then((action) => {
                                    return Promise.resolve({
                                          service   : resource.serviceIdentifier
                                        , resource  : resource.identifier
                                        , action    : action
                                        , allowed   : true
                                    });
                                });
                            });
                        } else return Promise.resolve();
                    }).then(resolve).catch(reject);
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
