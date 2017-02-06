(function() {
    'use strict';

    const log = require('ee-log');
    const type = require('ee-types');
    const distributed = require('distributed-prototype');
    const RelationalRequest = distributed.RelationalRequest;
    const Hook = distributed.Hook;




    const allowAll = process.env.allowAll || process.argv.some(a => a === '--allow-all' ||  a === '--no-permissions');





    const hasProperty = (obj, property) => {
        return type.object(obj) && Object.hasOwnProperty.call(obj, property);
    };

    const hasData = (obj) => {
        return type.object(obj) && Object.keys(obj).length;
    }










    module.exports = class PermissionInstance extends Hook {


        constructor(permissions, type) {
            super();

            // the permissions a received from the
            // permission service
            this.permissions = permissions || [];

            // the type if this is a subset of the permissions
            // filtered by subject type
            this.type = type || 'root';


            // cache the question if a certain action is allowef
            this.allowedCache = new Map();


            // cache row restrictions stuff
            this.restrictionsCache = new Map();
            this.restrictionsAvailabilityCache = new Map();

            // cahce instances
            this.instanceCache = new Map();


            // those objects get shared between action calls, dont ever
            // let them be modified!
            //Object.freeze(this);
        }





        /**
         * returns all the tokens that are part 
         * of this permission configuration
         */
        getTokens() {
            return this.permissions.map(p => p.token);
        }




    
        
        /**
         * filter the set of permissions by the user type
         */
        users(id) {
            if (this.type !== 'root') throw new Error(`Cannot get users from permissions, you're already working on a user set!`);

            const cacheId = `user:${(id || '[all]')}`;

            if (!this.instanceCache.has(cacheId)) {
                const instance = new PermissionInstance(this.permissions.filter((p) => {
                    return p.subject.type === 'user' && (type.undefined(id) || p.subject.id == id);
                }), 'user');


                // pass requests to the paretn
                instance.onRequest = (request, response) => {this.sendRequest(request, response)};

                this.instanceCache.set(cacheId, instance);
            }

            return this.instanceCache.get(cacheId);
        }


        
        /**
         * filter the set of permissions by the service type
         */
        services(id) {
            if (this.type !== 'root') throw new Error(`Cannot get services from permissions, you're already working on a user service!`);
            const cacheId = `service:${(id || '[all]')}`;

            if (!this.instanceCache.has(cacheId)) {
                const instance = new PermissionInstance(this.permissions.filter((p) => {
                    return p.subject.type === 'service' && (type.undefined(id) || p.id == id);
                }), 'service');


                // pass requests to the paretn
                instance.onRequest = (request, response) => {this.sendRequest(request, response)};

                this.instanceCache.set(cacheId, instance);
            }

            return this.instanceCache.get(cacheId);
        }


        
        /**
         * filter the set of permissions by the app type
         */
        apps(id) {
            if (this.type !== 'root') throw new Error(`Cannot get apps from permissions, you're already working on a app set!`);
            const cacheId = `app:${(id || '[all]')}`;

            if (!this.instanceCache.has(cacheId)) {
                const instance = new PermissionInstance(this.permissions.filter((p) => {
                    return p.subject.type === 'app' && (type.undefined(id) || p.id == id);
                }), 'app');


                // pass requests to the paretn
                instance.onRequest = (request, response) => {this.sendRequest(request, response)};

                this.instanceCache.set(cacheId, instance);
            }

            return this.instanceCache.get(cacheId);
        }



        
        /**
         * filter the set of permissions by the external type
         */
        external() {
            if (this.type !== 'root') throw new Error(`Cannot get external from permissions, you're already working on an external set!`);
            const cacheId = `external:[all]`;

            if (!this.instanceCache.has(cacheId)) {
                const instance = new PermissionInstance(this.permissions.filter((p) => {
                    return p.subject.type === 'app' || p.subject.type === 'user';
                }), 'external');


                // pass requests to the paretn
                instance.onRequest = (request, response) => {this.sendRequest(request, response)};

                this.instanceCache.set(cacheId, instance);
            }

            return this.instanceCache.get(cacheId);
        }


        
        /**
         * filter the set of permissions by the token type
         */
        token(token) {
            if (this.type !== 'root') throw new Error(`Cannot get token from permissions, you're already working on a token set!`);
            const cacheId = `token:${token}`;

            if (!this.instanceCache.has(cacheId)) {
                const instance = new PermissionInstance(this.permissions.filter((p) => {
                    return p.token === token;
                }), 'token');


                // pass requests to the paretn
                instance.onRequest = (request, response) => {this.sendRequest(request, response)};



                this.instanceCache.set(cacheId, instance);
            }

            return this.instanceCache.get(cacheId);
        }





        hasApp() {
            return this.permissions.some(p => p.subject.type === 'app');
        }

        isApp() {
            return !this.permissions.some(p => p.subject.type !== 'app');
        }





        hasService() {
            return this.permissions.some(p => p.subject.type === 'service');
        }

        isService() {
            return !this.permissions.some(p => p.subject.type !== 'service');
        }





        hasUser() {
            return this.permissions.some(p => p.subject.type === 'user');
        }

        isUser() {
            return !this.permissions.some(p => p.subject.type !== 'user');
        }







        isAuthenticated() {
            return this.permissions.length;
        }






        /**
         * checks if a certain action is allowed
         */
        isActionAllowed(service, resource, actionName) {

            // we need all the information for making the decisions
            if (!type.string(service) || !service.length) return false;
            if (!type.string(resource) || !resource.length) return false;
            if (!type.string(actionName) || !actionName.length) return false;

            // whitelist some endpoints
            if (resource === 'authorization' && actionName === 'listOne' && service === 'permissions') return true;
            if (resource === 'failedAuthorization' && actionName === 'create' && service === 'permissions') return true;
            if (resource === 'serviceInfo' && actionName === 'listOne' && service === 'user') return true;
            if (resource === 'appInfo' && actionName === 'listOne' && service === 'user') return true;
            if (resource === 'userInfo' && actionName === 'listOne' && service === 'user') return true;


            const cacheId = `${service}/${resource}:${actionName}`;


            // action specific permissions
            if (this.allowedCache.has(cacheId) && this.allowedCache.get(cacheId)) return true;
            else {
                const isAllowed = this.permissions.some((permission) => {
                    return permission.roles && permission.roles.some((role) => {
                        return role.permissions && role.permissions.some((p) => {
                            return p.service === service && p.resource === resource && p.action === actionName;
                        });
                    });
                });

                // cache for later use
                this.allowedCache.set(cacheId, isAllowed);


                // tell the permissions service, so that we
                // kwow how is not getting what he wants
                if (!isAllowed) this.reportDeniedAuthorization(service, resource, actionName);
 
                return allowAll || isAllowed;
            }
        }





        /**
        * notified the permissins service about
        * failed authorizations
        */
        reportDeniedAuthorization(service, resource, actionName) {
            
            // let the other do their stuff first
            process.nextTick(() => {
                new RelationalRequest({
                      service: 'permissions'
                    , resource: 'failedAuthorization'
                    , action: 'create'
                    , data: Array.from(this.getRoles()).map(role => ({
                          role: role
                        , action: actionName
                        , resource: resource
                        , service: service
                    }))
                }).send(this).then((response) => {
                    if (response.status !== 'created') log(response.toError());
                }).catch(log);
            });
        }









        hasRole(roleName) {
            return this.permissions.some(p => p.roles && p.roles.some(r => r.identifier === roleName));
        }

        getRoles() {
            const roles = new Set();
                
            // get all roles
            this.permissions.forEach(p => p.roles && p.roles.forEach(r => roles.add(r.identifier)));

            return roles;
        }


        getRoleIds() {
            const roleIds = new Set();
                
            // get all roles
            this.permissions.forEach(p => p.roles && p.roles.forEach(r => roleIds.add(r.id)));

            return roleIds;
        }







        hasCapability(name) {
            return this.permissions.some(p => p.roles && p.roles.some(r => r.capabilities && r.capabilities.some(c => c === name)));
        }

        getCapabilities() {
            const capabilities = new Set();

            // get all capabilities
            this.permissions.forEach(p => p.roles && p.roles.forEach(r => r.capabilities && r.capabilities.forEach(c => capabilities.add(c))));

            return capabilities;
        }






        hasValue(valueName) {
            const value = this.getValue(valueName);
            return value !== undefined && value !== null;
        }


        getValue(valueName) {
            for (const permission of this.permissions) {
                if (hasProperty(permission.subject.data, valueName)) return permission.subject.data[valueName];
            }

            return undefined;
        }

        getValues(valueName) {
            const values = new Set();

            for (const permission of this.permissions) {
                if (hasProperty(permission.subject.data, valueName)) values.add(permission.subject.data[valueName]);
            }

            return values;
        }


        getAllValues() {
            const values = new Set();

            for (const permission of this.permissions) {
                if (hasData(permission.subject.data)) {
                    const map = new Map();

                    Object.keys(permission.subject.data).forEach((key) => {
                        map.set(key, permission.subject.data[key]);
                    });

                    values.add(map);
                }
            }

            return values;
        }

        getUniqueValues() {
            const values = new Map();

            for (const permission of this.permissions) {
                if (hasData(permission.subject.data)) {
                    Object.keys(permission.subject.data).forEach((key) => {
                        values.set(key, permission.subject.data[key]);
                    });
                }
            }

            return values;
        }






        /**
        * store hooks properly
        */
        set onRequest(listener) {
            this.storeHook('request', listener);
        }



        /**
        * is used to send requests through the framework
        */
        sendRequest(request, response) {
            this.executeHook('request', request, response);
        }
    }
})();
