(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');
    const crypto                = require('crypto');



    module.exports = class AccessToken extends ResourceController {


        constructor(options) {
            super('token');

            // db from the service
            this.db = options.db;

            // permissions listings
            this.enableAction('createOne');
            this.enableAction('delete');
        }






        delete(request, response) {
            if (!request.hasObjectData()) response.badRequest('missing_data', `Missing request body!`);
            if (!type.number(request.data.id)) response.badRequest('missing_data', `Missing the the subject id!`);
            if (!type.string(request.data.type) || !request.data.type.length) response.badRequest('missing_data', `Missing the the subject type!`);

            // delete all
            this.db.accessToken().getSubject({
                subjectId: request.data.id
            }).getSubjectType({
                identifier: request.data.type
            }).delete().then(() => {

                response.ok();
            }).catch(err => response.error('creation_error', `Failed to create permission!`, err));
        }






        createOne(request, response) {
            if (!request.hasObjectData()) response.badRequest('missing_data', `Missing request body!`);
            if (!type.number(request.data.id)) response.badRequest('missing_data', `Missing the the subject id!`);
            if (!type.string(request.data.type) || !request.data.type.length) response.badRequest('missing_data', `Missing the the subject type!`);


            // check if the subject is registered
            this.db.subject({
                subjectId: request.data.id
            }).getSubjectType({
                identifier: request.data.type
            }).findOne().then((subject) => {
                if (subject) {
                    return new Promise((resolve, reject) => {

                        // get random bytes
                        crypto.randomBytes(32, (err, bytes) => {
                            if (err) reject(err);
                            else resolve(bytes.toString('hex'));
                        });
                    }).then((token) => {

                        return new this.db.accessToken({
                              subject: subject
                            , expires: (request.data.type === 'user' ? (request.data.expires || new Date(new Date().setMonth(new Date().getMonth()+6))) : null)
                            , token: token
                        }).save();
                    }).then((accessToken) => {


                        // there you go
                        response.created(accessToken.token);
                    });
                } else response.notFound(`ailed to create accessToken, the ${request.data.type} ${request.data.id} was not registered as subject!`);
            }).catch(err => response.error('creation_error', `Failed to create permission!`, err));
        }
    }
})();
