(function() {
    'use strict';

    const distributed                   = require('distributed-prototype');
    const RelatedResourceController     = distributed.RelatedResourceController;
    const RelationalRequest             = distributed.RelationalRequest;


    const log                           = require('ee-log');
    const type                          = require('ee-types');



    module.exports = class Role extends RelatedResourceController {


        constructor(options) {
            super(options, 'role');
        }



        enableActions() {
            this.enableAction('createOneRelation');
            this.enableAction('createOne');
            this.enableAction('create');
            this.enableAction('delete');
        }






        createOneRelation(request, response) {
            if (request.remoteResource !== 'group') return response.forbidden('access_restriction', `a role can only be added to a group!`, err);
            else {
                new this.db.group_role({
                      id_role   : request.resourceId
                    , id_group  : request.remoteResourceId
                }).save().then((mapping) => {
                    response.created([mapping.id_group, mapping.id_role]);
                }).catch(err => response.error('db_error', `Failed to create relation!`, err));
            }
        }
    }
})();
