(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');
    const Cachd                 = require('cachd');



    module.exports = class Authorization extends ResourceController {


        constructor(options) {
            super('authorization');

            // db from the service
            this.db = options.db;
            this.Related = options.Related;

            // permissions listings
            this.enableAction('list');
            this.enableAction('listOne');
            this.enableAction('createOne');

            // cache subject info
            this.infoCache = new Cachd({
                  ttl: 3600000 // 1h
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });
        }







        list(request, response, permissions) {

            Promise.all(permissions.external().getTokens().map((token) => {
                return new RelationalRequest({
                      service   : this.getServiceName()
                    , resource  : this.getName()
                    , resourceId: token
                    , action    : 'listOne'
                }).send(this).then((subResponse) => {
                    if (subResponse.status === 'ok') return Promise.resolve(subResponse.data);
                    else return Promise.reject(new Error(`Failed to load authorization, the remote enpoint responded with the status ${subResponse.status}: subResponse.message`));
                });
            })).then((permissionsList) => {

                // flatten the array
                const list = [];
                permissionsList.forEach(l => l.forEach(i => list.push(i)));



                // get selections
                const loadPermissions   = request.hasSelection('permissions');
                const loadRoles         = request.hasSelection('roles');
                const loadCapabilities  = request.hasSelection('capabilities');
                const loadData          = request.hasSelection('data');

                const data = new Map();
                const roles = new Set();
                const permissions = new Map();
                const restrictions = new Map();
                const capabilities = new Map();


                list.forEach((permission) => {
                    if (loadData && permission.data) {
                        Object.keys(permission.data).forEach((key) => {
                            data.set(key, permission.data[key]);
                        });
                    }


                    if (loadRoles && permission.roles) {
                        permission.roles.forEach((role) => {
                            roles.add(role);
                        });
                    }


                    if (loadPermissions && permission.permissions) {
                        permission.permissions.forEach((item) => {
                            if (!permissions.has(item.service)) permissions.set(item.service, new Map());
                            const service = permissions.get(item.service);

                            if (!service.has(item.resource)) service.set(item.resource, new Map());
                            const resource = service.get(item.resource);

                            resource.set(item.action, resource.has(item.action) && esource.get(item.action) || item.allowed);
                        });
                    }


                    if (loadCapabilities && permission.capabilities) {
                        permission.capabilities.forEach((capability) => {
                            capabilities.add(capability);
                        });
                    }
                });


                const result = {
                      roles         : Array.from(roles)
                    , capabilities  : Array.from(capabilities)
                    , data: {}
                    , permissions: []
                };


                for (const key of data.keys()) result.data[key] = data.get(key);

                for (const serviceName of permissions.keys()) {
                    const svc = permissions.get(serviceName);

                    for (const resourceName of svc.keys()) {
                        const rsc = svc.get(resourceName);

                        for (const action of rsc.keys()) {
                            result.permissions.push({
                                  service   : serviceName
                                , resource  : resourceName
                                , action    : action
                                , allowed   : rsc.get(action)
                            });
                        }
                    }
                }


                response.ok(result);
            }).catch(err => response.error('remote_gateway_error', `Failed to get status: ${err.message}!`, err));
        }








        listOne(request, response) {
            const serviceFilter     = {};
            const resourceFilter    = {};
            const actionFilter      = {};


            if (!type.string(request.resourceId) || request.resourceId.length !== 64) response.forbidden('invalid_accessToken', `The accesToken provided is invalid!`);



            if (request.data) {
                if (request.data.serviceName)   serviceFilter.identifier    = request.data.serviceName;
                if (request.data.resourceName)  resourceFilter.identifier   = request.data.resourceName;
                if (request.data.actionName)    actionFilter.identifier     = request.data.actionName;
            }


            // subject
            const subjectQuery = this.db.accessToken('token', {
                  token: request.resourceId
                , expires: this.Related.or(null, this.Related.gt(new Date()))
            }).getSubject('*');


            // roles
            const roleQuery = subjectQuery.fetchSubjectType('*')
                .getGroup('identifier')
                .getRole('identifier')
                .fetchCapability('identifier');


            // permissions
            const permissionQuery = roleQuery.getPermission('id');

            permissionQuery.getResource('identifier').filter(resourceFilter)
                .getService('identifier').filter(serviceFilter);

            permissionQuery.getAction('identifier').filter(actionFilter)



            // rate limiting
            roleQuery.getRateLimit(['interval', 'credits']);
            subjectQuery.getRateLimitBucket(['currentValue', 'updated']);



            // row restrictions
            const restrictionQuery = roleQuery.getRowRestriction(['property', 'value', 'nullable', 'global'])
                .fetchValueType('identifier')
                .fetchComparator('identifier');

            restrictionQuery.getAction('identifier').filter(actionFilter);
            restrictionQuery.getResource('identifier').filter(resourceFilter);





            roleQuery.raw().findOne().then((token) => {//log(token);
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


                            let rateLimit;


                            if (token.subject.group) {
                                token.subject.group.forEach((group) => {
                                    if (group.role) {
                                        group.role.forEach((role) => {
                                            data.roles.push(role.identifier);

                                            if (role.rateLimit && (!rateLimit || role.rateLimit.credits < rateLimit.credits)) rateLimit = role.rateLimit;

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
                                                role.capability.forEach(c => data.capabilities.push(c.identifier));
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
                                                    if (restriction.resource && restriction.resource.length && restriction.action && restriction.action.length) {
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
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }



                            // check if there is a rateLimit
                            if (rateLimit) {
                                data.rateLimit = {
                                      credits       : rateLimit.credits
                                    , updated       : null
                                    , remaining     : null
                                };


                                if (token.subject.rateLimitBucket) {
                                    data.rateLimit.updated = token.subject.rateLimitBucket.updated;
                                    data.rateLimit.remaining = token.subject.rateLimitBucket.currentValue;
                                }
                            }



                            response.ok([data]);
                        });
                    } else response.ok([]);
                } catch (err) { log(err);
                    return Promise.reject(err);
                }
            }).catch(err => response.error('authorization_error', `Failed to load authorization for the token ${request.resourceId}!`, err));
        }










        collectSubjectInfo(subject) {
            if (subject.subjectType.fetchInfo) {
                const cacheId = `${subject.subjectType.service}/${subject.subjectType.resource}:${subject.subjectId}`;

                if (this.infoCache.has(cacheId)) return Promise.resolve(this.infoCache.get(cacheId));
                else {
                    return new RelationalRequest({
                          action        : 'listOne'
                        , service       : subject.subjectType.service
                        , resource      : subject.subjectType.resource
                        , resourceId    : subject.subjectId
                    }).send(this).then((response) => {// log(response);
                        if (response.status === 'ok') {
                            if (response.hasObjectData()) {
                                this.infoCache.set(cacheId, response.data);
                                return Promise.resolve(response.data);
                            } else {
                                this.infoCache.set(cacheId, {});
                                return Promise.resolve({});
                            }
                        } else return Promise.reject(new Error(`Failed to load subject info from ${subject.subjectType.service}/${subject.subjectType.resource} for subject ${subject.subjectType.identifier}:${subject.subjectId}!`));
                    });
                }
            } else return Promise.resolve({});
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
