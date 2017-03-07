(function() {
    'use strict';


    const distributed               = require('distributed-prototype');
    const RelationalRequest         = distributed.RelationalRequest;
    const FilterBuilder             = distributed.FilterBuilder;
    const RequestMiddleware         = distributed.RequestMiddleware;

    const PermissionInstance        = require('./PermissionInstance');
    const TokenManager              = require('./TokenManager');


    const Cachd     = require('cachd');
    const type      = require('ee-types');
    const log       = require('ee-log');
    const crypto    = require('crypto');





    module.exports = class PermissionsClient extends RequestMiddleware {


        constructor(gateway) {
            super();

            this.gateway = gateway;

            // set up a cache, we'll use it for the permissions
            // in order to reduce latency and traffic
            this.cache = new Cachd({
                  ttl: 3600000 // 1h
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });

            // cache the combination of tokens
            this.instanceCache = new Cachd({
                  ttl: 300000 // 30 seconds
                , maxLength: 10000
                , removalStrategy: 'leastUsed'
            });


            // null permissions for returnquests lacking a token
            this.nullPermission = new PermissionInstance([]);
        }







        load(service) {
            this.tokenManager = new TokenManager(this.gateway);

            return this.tokenManager.load().then((token) => {
                this.gatewayToken = token;
                service.setToken(token);
                return Promise.resolve();
            });
        }







        hookIncomingRequests() {
            return true;
        }









        /**
        * get the permissions for the current request
        */
        processIncomingRequest(request, response) {


            // check permissions
            return this.getPermissions(request.tokens).then((permissions) => {
                if (permissions.isActionAllowed(request.service, request.resource, request.action)) {
                    

                    // set the permissions as trusted module
                    request.setTrustedModule('permissions', permissions);


                    // continue
                    return Promise.resolve();
                } else {
                    response.authorizationRequired(request.resource, request.action);

                    // this was the last middleware that has to be called
                    // the response is sent
                    return Promise.resolve(true);
                }
            }).catch((err) => {
                response.error('permissions_error', `Failed to load permissions while processing the request -> ${request.action}:${request.service}/${request.resource}!`, err)
                
                // this was the last middleware that has to be called
                // the response is sent
                return Promise.resolve(true);
            });
        }







        /**
        * laod a set of permissions
        */
        getPermissions(tokens) {
            if (type.array(tokens) && tokens.length) {
                tokens = tokens.filter(t => !!t);


                const cacheId = tokens.sort().join(':');


                // maybe the combinition fo token permissions
                // was cached already
                if (this.instanceCache.has(cacheId)) return this.instanceCache.get(cacheId);
                else {
                    const instancePromise = new Promise((resolve, reject) => {
                        // load permission for the individual tokens
                        // either from the cache or from the permissions
                        // service
                        return Promise.all(tokens.map((token) => {

                            if (this.cache.has(token)) return this.cache.get(token);
                            else {
                                const promise = this.loadPermission(token).catch((err) => {

                                    // dont cache errors
                                    this.cache.remove(token);

                                    return Promise.reject(err);
                                });

                                // cache the promise, not tha value
                                this.cache.set(token, promise);


                                return promise;
                            }
                        })).then((permissionPormises) => {


                            // we're getting promises, wait for all to
                            // be resolved
                            return Promise.all(permissionPormises).then((permissions) => {
                                const instance = new PermissionInstance(permissions.filter(p => type.object(p)));

                                // pass requestuests to the parent
                                instance.onRequest = (request, response) => {
                                    this.gateway.sendRequest(request, response);
                                };

                                // filter empty ones and create a new instance
                                resolve(instance);
                            });
                        }).catch((err) => {

                            // dont cache this one, we should cache errors, but not too long. 
                            // yes, this is a todo :D
                            this.instanceCache.remove(cacheId);

                            reject(err);
                        });
                    });


                    // cache the promise
                    this.instanceCache.set(cacheId, instancePromise);


                    return instancePromise;
                }
            } else return Promise.resolve(this.nullPermission);
        }






        loadPermission(token) {
            return new RelationalRequest({
                  service       : 'permissions'
                , resource      : 'authorization'
                , resourceId    : token
                , selection     : ['*']
                , action        : 'listOne'
            }).send(this.gateway).then((response) => {//log(this.gateway.getName(), response);
                if (response.status === 'ok' || response.status === 'notFound') return Promise.resolve(response.data);
                else return Promise.reject(response.toError());
            }).catch((err) => {
                //log(err);
                return Promise.reject(new Error(`Failed to load permissions: ${err.message}`))
            });
        }
    }
})();
