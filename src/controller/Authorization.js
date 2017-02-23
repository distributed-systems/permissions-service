(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;
    const AuthorizationLoader   = require('../lib/AuthorizationLoader');


    const log                   = require('ee-log');
    const type                  = require('ee-types');
    const Cachd                 = require('cachd');



    const debug = process.argv.includes('--debug-permissions')



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

            
            this.authorizationLoader = new AuthorizationLoader({
                  gateway: this
                , db: this.db
                , Related: this.Related
            });
        }






        listOne(request, response) {
            const serviceFilter     = {};
            const resourceFilter    = {};
            const actionFilter      = {};


            if (debug) log.debug(`Incoming request for token ${request.resourceId} ...`);
            if (!type.string(request.resourceId) || request.resourceId.length !== 64) return response.forbidden('invalid_accessToken', `The accesToken provided is invalid!`);


            if (debug) log.info(`Loading permissions for token ${request.resourceId} ...`);
            this.authorizationLoader.load(request.resourceId).then((permission) => {
                if (permission) {
                    const data = permission.getData();

                    if (debug) {
                        log.success(`Permissions for token ${request.resourceId} loaded:`);
                        log.info(`Roles loaded: ${data && data.roles ? data.roles.map(r => r.identifier).join(', ') : ''}`);
                        if (data && data.subject) log.info(`Subject: type=${data.subject.type}, subjectId=${data.subject.id}, internalSubjectId=${data.subject.internalId}${data.subject.data && data.subject.data.serviceName ? `, serviceName=${data.subject.data.serviceName}`: ''}${data.subject.data && data.subject.data.tenantIdentifier ? `, tenantIdentifier=${data.subject.data.tenantIdentifier}`: ''}`);
                    }

                    response.ok(Object.assign({}, data));
                }
                else {
                    if (debug) log.warn(`Failed to load permissions for token ${request.resourceId}!`);

                    response.notFound(`Failed to load permissions for ${request.resourceId}!`);
                }
            }).catch(err => response.error('permission_loader_error', `Failed to load permissions!`, err));
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
