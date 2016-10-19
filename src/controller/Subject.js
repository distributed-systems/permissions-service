(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');



    module.exports = class Subject extends ResourceController {


        constructor(options) {
            super('subject');

            // db from the service
            this.db = options.db;

            // permissions listings
            this.enableAction('createOrUpdateOne');
        }






        createOrUpdateOne(request, response) {


            const transaction = this.db.createTransaction();


            // we need a valid subject type
            transaction.subjectType({
                identifier: request.data.type
            }).findOne().then((subjectType) => {
                if (subjectType) return Promise.resolve(subjectType);
                else return Promise.reject(`The subject type ${request.data.type} is not registered!`);
            }).then((subjectType) => {


                // check for the group
                return transaction.group({
                    identifier: request.data.group
                }).findOne().then((group) => {
                    if (group) return Promise.resolve(group);
                    else return new transaction.group({identifier: request.data.group}).save();
                }).then((group) => {


                    // check for the subject
                    return transaction.subject({
                          subjectType: subjectType
                        , subjectId: request.data.id
                    }).findOne().then((subject) => {
                        if (subject) return Promise.resolve(subject);
                        else return new transaction.subject({subjectType: subjectType, subjectId: request.data.id}).save();
                    }).then((subject) => {


                        // commit
                        return transaction.commit().then(() => {
                            response.created(subject.id);
                        });
                    });
                });
            }).catch(err => response.error('creation_error', `Failed to create subject!`, err));
        }
    }
})();
