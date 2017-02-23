(function() {
    'use strict';

    const distributed                   = require('distributed-prototype');
    const RelatedResourceController     = distributed.RelatedResourceController;
    const RelationalRequest             = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');



    module.exports = class Subject extends RelatedResourceController {


        constructor(options) {
            super(options, 'subject');

            // db from the service
            this.db = options.db;

            // permissions listings
            this.enableAction('createOrUpdateOne');
            this.enableAction('list');
            this.enableAction('listOne');
        }






        createOrUpdateOne(request, response) {


            const transaction = this.db.createTransaction();


            // we need a valid subject type
            transaction.subjectType({
                identifier: request.data.type
            }).findOne().then((subjectType) => {
                if (subjectType) return Promise.resolve(subjectType);
                else return Promise.reject(`The subject type ${request.data.type ? request.data.type : 'undefined'} is not registered!`);
            }).then((subjectType) => {


                // check for the group(s)
                return Promise.all((request.data.groups || [request.data.group]).map((groupName) => {
                    return transaction.group({
                        identifier: groupName
                    }).findOne().then((group) => {
                        if (group) return Promise.resolve(group);
                        else return new transaction.group({identifier: groupName}).save();
                    });
                })).then((groups) => {


                    // check for the subject
                    return Promise.resolve().then(() => {
                        if (request.data.identifier) {
                            return transaction.subject({
                                  subjectType   : subjectType
                                , identifier    : request.data.identifier
                            }).getGroup('*').findOne();
                        } 
                        else if (request.data.id) {
                            return transaction.subject({
                                  subjectType   : subjectType
                                , subjectId     : request.data.id
                            }).getGroup('*').findOne();
                        }
                        else return Promise.resolve();
                    }).then((subject) => {
                        if (subject) return Promise.resolve(subject);
                        else return new transaction.subject({subjectType: subjectType, subjectId: request.data.id}).save();
                    }).then((subject) => {


                        // add the groups
                        groups.forEach((group) => {
                            if (!subject.group.some(g => g.identifier === group.identifier)) subject.group.push(group);
                        });

                        
                        // save shit
                        return subject.save().then(() => {

                            // commit
                            return transaction.commit().then(() => {
                                response.created(subject.id);
                            });
                        });
                    });
                });
            }).catch(err => response.error('creation_error', `Failed to create subject!`, err));
        }
    }
})();
