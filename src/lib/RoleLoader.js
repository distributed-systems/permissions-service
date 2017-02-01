(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');


    const PermissionLoader      = require('./PermissionLoader');
    const RowRestrictionLoader  = require('./RowRestrictionLoader');
    const CapabilityLoader      = require('./CapabilityLoader');
    const RateLimitLoader       = require('./RateLimitLoader');


    module.exports = class RoleLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;


            this.resourceLoader = options.resourceLoader;
            this.actionLoader = options.actionLoader;


            this.permissionLoader = new PermissionLoader({
                  db: this.db
                , Related: this.Related
                , resourceLoader: options.resourceLoader
                , actionLoader: options.actionLoader
            });


            this.rowRestrictionLoader = new RowRestrictionLoader({
                  db: this.db
                , Related: this.Related
                , resourceLoader: options.resourceLoader
                , actionLoader: options.actionLoader
            });


            this.capabilityLoader = new CapabilityLoader({
                  db: this.db
                , Related: this.Related
            });


            this.rateLimitLoader = new RateLimitLoader({
                  db: this.db
                , Related: this.Related
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
                    this.db.role(['identifier', 'id_rateLimit'], {
                        id: id
                    }).fetchRole_capability('*').fetchRole_permission('*').fetchRole_rowRestriction('*').raw().findOne().then((dbRole) => {
                        if (dbRole) {
                            const role = {
                                  identifier: dbRole.identifier
                                , capabilities: []
                                , permissions: []
                                , restrictions: []
                            };

                            return Promise.resolve().then(() => {

                                if (dbRole.id_rateLimit) {
                                    return this.rateLimitLoader.load(dbRole.id_rateLimit).then((rateLimit) => {
                                        role.rateLimit = rateLimit;
                                        return Promise.resolve();
                                    });
                                } else return Promise.resolve();
                            }).then(() => {

                                if (!dbRole.role_capability) return Promise.resolve();
                                else {
                                    return Promise.all(dbRole.role_capability.map((mapping) => {
                                        return this.capabilityLoader.load(mapping.id_capability).then((capability) => {
                                            role.capabilities.push(capability);
                                            return Promise.resolve();
                                        });
                                    }));
                                }
                            }).then(() => {

                                if (!dbRole.role_permission) return Promise.resolve();
                                else {
                                    return Promise.all(dbRole.role_permission.map((mapping) => {
                                        return this.permissionLoader.load(mapping.id_permission).then((permission) => {
                                            role.permissions.push(permission);
                                            return Promise.resolve();
                                        });
                                    }));
                                }
                            }).then(() => {

                                if (!dbRole.role_rowRestriction) return Promise.resolve();
                                else {
                                    return Promise.all(dbRole.role_rowRestriction.map((mapping) => {
                                        return this.rowRestrictionLoader.load(mapping.id_rowRestriction).then((restriction) => {
                                            role.restrictions.push(restriction);
                                            return Promise.resolve();
                                        });
                                    }));
                                }
                            }).then(() => {

                                resolve(role);
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
