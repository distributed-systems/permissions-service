(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');
    const RoleLoader            = require('./RoleLoader');



    module.exports = class GroupLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;

            this.resourceLoader = options.resourceLoader;
            this.actionLoader = options.actionLoader;


            this.roleLoader = new RoleLoader({
                  db: this.db
                , Related: this.Related
                , resourceLoader: this.resourceLoader
                , actionLoader: this.actionLoader
            });


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
                    this.db.group('identifier', {id: id}).getGroup_role('*').raw().findOne().then((dbGroup) => {
                        if (dbGroup) {
                            const group = {
                                  identifier: dbGroup.identifier
                                , roles: []
                            };


                            if (!dbGroup.group_role) resolve(group);
                            else {
                                return Promise.all(dbGroup.group_role.map((mapping) => {
                                    return this.roleLoader.load(mapping.id_role).then((role) => {
                                        group.roles.push(role);
                                        return Promise.resolve();
                                    });
                                })).then(() => {

                                    resolve(group);
                                });
                            }
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
