(function() {
    'use strict';


    const log                   = require('ee-log');
    const Cachd                 = require('cachd');

    const ValueTypeLoader       = require('./ValueTypeLoader');
    const ComparatorLoader       = require('./ComparatorLoader');



    module.exports = class RowRestrictionLoader {



        constructor(options) {

            this.db = options.db;
            this.Related = options.Related;


            this.resourceLoader = options.resourceLoader;
            this.actionLoader = options.actionLoader;


            this.valueTypeLoader = new ValueTypeLoader(options);
            this.comparatorLoader = new ComparatorLoader(options);


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
                    this.db.rowRestriction(['name', 'global', 'nullable', 'value', 'property', 'id_comparator', 'id_valueType'], {
                        id: id
                    }).fetchRowRestriction_action('*').fetchRowRestriction_resource('*').raw().findOne().then((rowRestriction) => {
                        if (rowRestriction) {
                            const restriction = {
                                  actions: []
                                , resources: []
                                , name: rowRestriction.name
                                , global: rowRestriction.global
                                , nullable: rowRestriction.nullable
                                , value: rowRestriction.value.value
                                , property: rowRestriction.property
                            };

                            return this.valueTypeLoader.load(rowRestriction.id_valueType).then((valueType) => {
                                restriction.valueType = valueType;

                                return this.comparatorLoader.load(rowRestriction.id_comparator);
                            }).then((comparator) => {
                                restriction.comparator = comparator;

                                return Promise.all(rowRestriction.rowRestriction_resource.map((mapping) => {
                                    return this.resourceLoader.load(mapping.id_resource).then((resource) => {
                                        restriction.resources.push(resource);

                                        return Promise.resolve();
                                    });
                                }));
                            }).then(() => {
                                return Promise.all(rowRestriction.rowRestriction_action.map((mapping) => {
                                    return this.actionLoader.load(mapping.id_action).then((action) => {
                                        restriction.actions.push(action);

                                        return Promise.resolve();
                                    });
                                }));
                            }).then(() => {

                                resolve(restriction);
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
