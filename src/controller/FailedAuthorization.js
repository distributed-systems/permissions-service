(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');
    const Cachd                 = require('cachd');



    module.exports = class FailedAuthorization extends ResourceController {


        constructor(options) {
            super('failedAuthorization');


            // permissions listings
            this.enableAction('list');
            this.enableAction('create');



            this.cache = new Cachd({
                  ttl: 3600*1000*24
                , maxLength: 2000
                , removalStrategy: 'oldest'
            });
        }






        list(request, response) {
            const items = Array.from(this.cache).map(item => Object.assign({}, item));
            items.forEach(item => item.permissions = Array.from(item.permissions.values()));


            // a map used to record which roles require which permissions
            const permissionsMap = new Map();


            items.sort((a, b) => {
                if (a.role > b.role) return 1;
                if (a.role < b.role) return -1;
                return 0;
            });


            items.forEach((set) => {
                set.permissions.sort((a, b) => {

                    // first level
                    if (a.service > b.service) return 1;
                    if (a.service < b.service) return -1;

                    // second level
                    if (a.resource > b.resource) return 1;
                    if (a.resource < b.resource) return -1;

                    // third level
                    if (a.action > b.action) return 1;
                    if (a.action < b.action) return -1;
                    
                    return 0;
                });


                // we'd like to know which roles require each permission
                // we're adding this here to the json response
                set.permissions.forEach((permissionRequest) => {
                    const key = `${permissionRequest.service}/${permissionRequest.resource}:${permissionRequest.action}`;

                    if (!permissionsMap.has(key)) permissionsMap.set(key, []);
                    const roles = permissionsMap.get(key);

                    // add the current role
                    roles.push(set.role);

                    // add the same array to all of those permissions
                    permissionRequest.requestingRoles = roles.join(', ');
                });
            });

            response.ok(items);
        }







        create(request, response) {
            if (request.data && Array.isArray(request.data)) {
                request.data.forEach((permissionsRequest) => {
                    if (!this.cache.has(permissionsRequest.role)) {
                        this.cache.set(permissionsRequest.role, {
                              role: permissionsRequest.role
                            , permissions: new Map()
                        });
                    }


                    const map = this.cache.get(permissionsRequest.role).permissions;
                    const id = `${permissionsRequest.action}:${permissionsRequest.service}/${permissionsRequest.resource}`;
                    
                    if (!map.has(id)){
                        map.set(id, {
                              service   : permissionsRequest.service
                            , resource  : permissionsRequest.resource
                            , action    : permissionsRequest.action
                        })
                    }
                });
            }

            response.created();
        }
    }
})();
