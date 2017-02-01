(function() {
    'use strict';




    const log                   = require('ee-log');
    const Cachd                 = require('cachd');

    const SubjectInfoLoader     = require('./SubjectInfoLoader');
    const ResourceLoader        = require('./ResourceLoader');
    const ActionLoader          = require('./ActionLoader');
    const GroupLoader           = require('./GroupLoader');
    const SubjectTypeLoader     = require('./SubjectTypeLoader');
    const SubjectPermission     = require('./SubjectPermission');





    module.exports = class AuthorizationLoader {


        constructor(options) {

            this.gateway = options.gateway;
            this.db = options.db;
            this.Related = options.Related;


            // we've got a punch of loaders
            // that handle the caching of the
            // different resoruces
            this.resourceLoader = new ResourceLoader({
                  db: this.db
                , Related: this.Related
            });


            this.actionLoader = new ActionLoader({
                  db: this.db
                , Related: this.Related
            });


            this.subjectTypeLoader = new SubjectTypeLoader({
                  db: this.db
                , Related: this.Related
            });


            this.groupLoader = new GroupLoader({
                  db: this.db
                , Related: this.Related
                , actionLoader: this.actionLoader
                , resourceLoader: this.resourceLoader
            });


            this.subjectInfoLoader = new SubjectInfoLoader(this.gateway);

           

            // cache permissions
            this.cache = new Cachd({
                  ttl: 3600000 // 1h
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });
        }










        load(token) {
            if (this.cache.has(token)) return this.cache.get(token);
            else {
                const promise = new Promise((resolve, reject) => {

                    this.db.accessToken('token', {
                          token: token
                        , expires: this.Related.or(null, this.Related.gt(new Date()))
                    }).getSubject('*').getSubject_group('id_group').findOne().then((accessToken) => {
                        if (accessToken) {
                            const permission = new SubjectPermission();
                            const subject = accessToken.subject;

                            permission.setToken(accessToken.token);
                            permission.setId(subject.subjectId);


                            // subject info
                            return this.subjectTypeLoader.load(subject.id_subjectType).then((type) => {
                                permission.setType(type);

                                if (type.fetchInfo) return this.subjectInfoLoader.load(type.identifier, subject.subjectId, type.service, type.resource);
                                else return Promise.resolve();
                            }).then((info) => {
                                permission.setInfo(info);

                                return Promise.all(subject.subject_group.map((mapping) => {
                                    return this.groupLoader.load(mapping.id_group).then((group) => {
                                        if (group) permission.addGroup(group);

                                        return Promise.resolve();
                                    });
                                }));
                            }).then(() => {


                                resolve(permission);
                            });
                        } else resolve();            
                    }).catch(reject);
                }).catch((err) => {

                    // remove from cache
                    this.cache.remove(token);

                    return Promise.reject(err);
                });


                // for other calls for this token
                this.cache.set(token, promise);


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
