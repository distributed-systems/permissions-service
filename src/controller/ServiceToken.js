(function() {
    'use strict';

    const distributed                   = require('distributed-prototype');
    const RelationalResourceController  = distributed.RelationalResourceController;
    const RelationalRequest             = distributed.RelationalRequest;


    const log                           = require('ee-log');
    const type                          = require('ee-types');



    module.exports = class ServiceToken extends RelationalResourceController {


        constructor(options) {
            super('serviceToken');

            this.db = options.db;
            this.Related = options.Related;

            this.enableAction('createOrUpdate');
            this.enableAction('describe');
        }






        createOrUpdate(request, response) {
            const identifier = `default-${request.data.service}-service`;


            // check pw
            this.db.devAuthentication({
                identifier: 'root-user'
            }, '*').findOne().then((authRecord) => {
                if (authRecord) {
                    if (authRecord.password === request.data.password) return Promise.resolve(authRecord);
                    else return Promise.resolve();
                } else {
                    return new this.db.devAuthentication({
                          identifier: 'root-user'
                        , password: request.data.password
                    }).save();
                }
            }).then((authRecord) => {
                if (authRecord) {

                    // user is authenticated
                    // make sure the service is registred
                    return this.db.service({
                        identifier: request.data.service
                    }).findOne().then((service) => {
                        if (service) return Promise.resolve(service);
                        else return new this.db.service({identifier: request.data.service}).save();
                    }).then((service) => {


                        // subject
                        return this.db.subject({
                              subjectId: service.id
                            , subjectType: this.db.subjectType({identifier: 'service'})
                        }).findOne().then((subject) => {
                            if (subject) return Promise.resolve(subject);
                            else return new this.db.subject({subjectId: service.id, subjectType: this.db.subjectType({identifier: 'service'})}).save();
                        }).then((subject) => {


                            // group
                            return this.db.group({
                                identifier: identifier
                            }).getSubject('*').findOne().then((group) => {
                                if (group) return Promise.resolve(group);
                                else return new this.db.group({identifier: identifier}).save();
                            }).then((group) => {


                                // add subject
                                if (!group.subject.some(s => s.subjectId === subject.subjectId && s.id_subjectType === subject.id_subjectType)) group.subject.push(subject);
                                return group.save().then(() => {


                                    // role
                                    return this.db.role({
                                        identifier: identifier
                                    }).getGroup('*').findOne().then((role) => {
                                        if (role) return Promise.resolve(role);
                                        else return new this.db.role({identifier: identifier}).save();
                                    }).then((role) => {


                                        // add group to role
                                        if (!role.group.some(g => g.identifier === group.identifier)) role.group.push(group);
                                        return role.save().then(() => {


                                            // ok, ther is the basic infrastructure
                                            // check for the accessToken
                                            return this.db.accessToken({
                                                  id_subject: subject.id
                                                , expires: this.Related.or(null, this.Related.gt(new Date()))
                                            }, '*').findOne().then((token) => {
                                                if (token) response.ok({token: token.token});
                                                else {

                                                    // create a new token
                                                    return new RelationalRequest({
                                                          action: 'createOne'
                                                        , service: 'permissions'
                                                        , resource: 'accessToken'
                                                        , data: {
                                                              id: subject.subjectId
                                                            , type: 'service'
                                                        }
                                                    }).send(this).then((subResponse) => {
                                                        if (subResponse.status === 'created') response.ok({token: subResponse.data.id});
                                                        else response.error('token_error', `Failed to create service token: ${response.message}`);
                                                    });
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else response.authorizationRequired(this.getName(), 'createOrUpdate');
            }).catch(err => response.error('db_error', `Failed to manage the serviceToken for the service ${request.data.service}`, err));
        }
    }
})();
