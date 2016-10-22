(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');



    module.exports = class Authorization extends ResourceController {


        constructor(options) {
            super('authorization');

            // db from the service
            this.db = options.db;
            this.Related = options.Related;

            // permissions listings
            this.enableAction('listOne');
            this.enableAction('createOne');
        }








        listOne(request, response) {
            const serviceFilter     = {};
            const resourceFilter    = {};
            const actionFilter      = {};


            if (!type.string(request.resourceId) || request.resourceId.length !== 64) response.forbidden('invlaid_accessToken', `The accesToken provided is invalid!`);


            if (request.data) {
                if (request.data.serviceName)   serviceFilter.identifier    = request.data.serviceName;
                if (request.data.resourceName)  resourceFilter.identifier   = request.data.resourceName;
                if (request.data.actionName)    actionFilter.identifier     = request.data.actionName;
            }



            const roleQuery = this.db.accessToken('token', {
                  token: request.resourceId
                , expires: this.Related.or(null, this.Related.gt(new Date()))
            }).getSubject('*')
                .fetchSubjectType('identifier')
                .getGroup('identifier')
                .getRole('identifier');

            roleQuery.getCapability('*');
            roleQuery.getRateLimit('*');

            const permissionQuery = roleQuery.getPermission('*');

            permissionQuery.getResource('identifier').filter(resourceFilter)
                .getService('identifier').filter(serviceFilter);


            permissionQuery.getAction('identifier').filter(actionFilter)


            // row restrictions
            roleQuery.getRowRestriction('*')
                .fetchValueType('identifier')
                .fetchComparator('identifier')
                .fetchAction('identifier', actionFilter)
                .fetchResource('identifier', resourceFilter);



            roleQuery.raw().findOne().then((token) => {
                try {
                    if (token && token.subject) {

                        // ask the subjects service for additional data
                        return this.collectSubjectInfo(token.subject).then((userData) => {
                            const data = {
                                  token         : token.token
                                , type          : token.subject.subjectType.identifier
                                , id            : token.subject.subjectId
                                , data          : userData
                                , roles         : []
                                , permissions   : []
                                , capabilities  : []
                                , restrictions  : []
                            };

                            if (token.subject.group) {
                                token.subject.group.forEach((group) => {
                                    if (group.role) {
                                        group.role.forEach((role) => {
                                            data.roles.push(role.identifier);

                                            if (role.permission) {
                                                role.permission.forEach((permission) => {
                                                    if (permission.resource && permission.resource.service && permission.action) {
                                                        data.permissions.push({
                                                              service   : permission.resource.service.identifier
                                                            , resource  : permission.resource.identifier
                                                            , action    : permission.action.identifier
                                                            , allowed   : true
                                                        });
                                                    }
                                                });
                                            }


                                            if (role.capability) {
                                                role.capability.forEach(c => role.capabilities.push(c.identifier));
                                            }

                                            if (role.rateLimit) {
                                                data.rateLimit = {
                                                      id            : role.rateLimit.id
                                                    , interval      : role.rateLimit.interval
                                                    , credits       : role.rateLimit.credits
                                                    , currentValue  : role.rateLimit.currentValue
                                                };
                                            }


                                            if (role.rowRestriction) {
                                                role.rowRestriction.forEach((restriction) => {
                                                    data.restrictions.push({
                                                          valueType     : restriction.valueType.identifier
                                                        , value         : restriction.value
                                                        , property      : restriction.property
                                                        , comparator    : restriction.comparator.identifier
                                                        , nullable      : restriction.nullable
                                                        , global        : restriction.global
                                                        , resources     : restriction.resource.map(r => r.identifier)
                                                        , actions       : restriction.action.map(a => a.identifier)
                                                    });
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            response.ok([data]);
                        });
                    } else response.ok([]);
                } catch (err) {
                    return Promise.reject(err);
                }
            }).catch(err => response.error('authorization_error', `Failed to load authorization for the token ${request.resourceId}!`, err));
        }







        collectSubjectInfo(subject) { return Promise.resolve({userId: 1});
            return new RelationalRequest({
                  action        : 'listOne'
                , service       : subject.subjectType.service
                , resource      : subject.subjectType.resource
                , resourceId    : subject.subjectId
            }).send(this).then((response) => {
                if (response.status === 'ok') {
                    if (response.hasObjectData()) return Promise.resolve(response.data);
                    else return Promise.resolve({});
                } else return Promise.reject(new Error(`Failed to load subject info from ${subject.subjectType.service}/${subject.subjectType.resource} for subject ${subject.subjectType.identifier}:${subject.subjectId}!`));
            });
        }







        createOne(request, response) {


            // try to load role from db, create it
            // if required
            this.db.role({
                identifier: request.data.role
            }).findOne().then((role) => {
                if (role) return Promise.resolve(role);
                else return new this.db.role({identifier: request.data.role}).save();
            }).then((role) => {


                // check for the service
                return this.db.service({
                    identifier: request.data.service
                }).findOne().then((service) => {
                    if (service) return Promise.resolve(service);
                    else return new this.db.service({identifier: request.data.service}).save();
                }).then((service) => {


                    // check for the resource
                    return this.db.resource({
                          identifier: request.data.resource
                        , service: service
                    }).findOne().then((resource) => {
                        if (resource) return Promise.resolve(resource);
                        else return new this.db.resource({identifier: request.data.resource, service: service}).save();
                    }).then((resource) => {


                        // the action
                        return this.db.action({
                            identifier: request.data.action
                        }).findOne().then((action) => {
                            if (action) return Promise.resolve(action);
                            else return new this.db.action({identifier: request.data.action}).save();
                        }).then((action) => {


                            // the permission
                            return this.db.permission({
                                  action: action
                                , resource: resource
                            }).getRole('*').findOne().then((permission) => {
                                if (permission) return Promise.resolve(permission);
                                else return new this.db.permission({action: action, resource: resource}).save();
                            }).then((permission) => {


                                // add the role
                                if (!permission.role.some(r => r.identifier === role.identifier)) permission.role.push(role);
                                return permission.save().then(() => {


                                    response.created(permission.id);
                                });
                            });
                        });
                    });
                });
            }).catch(err => response.error('creation_error', `Failed to create permission!`, err));
        }
    }
})();
