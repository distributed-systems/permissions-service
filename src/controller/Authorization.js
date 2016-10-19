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

            // permissions listings
            this.enableAction('listOne');
            this.enableAction('createOne');
        }






        createOne(request, response) {


            const transaction = this.db.createTransaction();


            // try to load role from db, create it
            // if required
            transaction.role({
                identifier: request.data.role
            }).findOne().then((role) => {
                if (role) return Promise.resolve(role);
                else return new transaction.role({identifier: request.data.role}).save();
            }).then((role) => {


                // check for the service
                return transaction.service({
                    identifier: request.data.service
                }).findOne().then((service) => {
                    if (service) return Promise.resolve(service);
                    else return new transaction.service({identifier: request.data.service}).save();
                }).then((service) => {


                    // check for the resource
                    return transaction.resource({
                          identifier: request.data.resource
                        , service: service
                    }).findOne().then((resource) => {
                        if (resource) return Promise.resolve(resource);
                        else return new transaction.resource({identifier: request.data.resource, service: service}).save();
                    }).then((resource) => {


                        // the action
                        return transaction.action({
                            identifier: request.data.action
                        }).findOne().then((action) => {
                            if (action) return Promise.resolve(action);
                            else return new transaction.action({identifier: request.data.action}).save();
                        }).then((action) => {


                            // the permission
                            return transaction.permission({
                                  action: action
                                , resource: resource
                            }).findOne().then((permission) => {
                                if (permission) return Promise.resolve(permission);
                                else return new transaction.permission({action: action, resource: resource}).save();
                            }).then((permission) => {

                                // commit
                                return transaction.commit().then(() => {

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
