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
                  ttl: 3600*1000
                , maxLength: 10000
                , removalStrategy: 'oldest'
            });
        }






        list(request, response) {
            const items = Array.from(this.cache).map(item => Object.assign({}, item));
            items.forEach(item => item.permissions = Array.from(item.permissions.values()));

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
