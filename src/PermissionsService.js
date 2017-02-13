(function() {
    'use strict';

    const distributed       = require('distributed-prototype');
    const RelatedService    = distributed.RelatedService;


    const Related           = require('related');
    const Timestamps        = require('related-timestamps');
    const log               = require('ee-log');


    const Authorization         = require('./controller/Authorization');
    const FailedAuthorization   = require('./controller/FailedAuthorization');
    const Token                 = require('./controller/Token');
    const Subject               = require('./controller/Subject');
    const Role                  = require('./controller/Role');
    const ServiceToken          = require('./controller/ServiceToken');




    module.exports = class PermissionsService extends RelatedService {


        constructor(options) {

            // make sure the options exist and the service has a proper name
            options = options || {};

            // default name
            if (!options.name) options.name = 'permissions';


            // super will load the controllers
            super(options);



            // db conectivity
            this.related = new Related(options.db);
            this.related.use(new Timestamps());


            // register tables that should
            // autoload its controllers
            this.autoLoad('action');
            this.autoLoad('capability');
            this.autoLoad('group');
            this.autoLoad('permission');
            this.autoLoad('resource');
            this.autoLoad('service');
            this.autoLoad('subjectType');
            this.autoLoad('accessToken');
            this.autoLoad('role_capability');
        }






        // called before the related service loads
        // teh rest
        beforeLoad() {

            // load the db
            return this.related.load().then((db) => {
                this.db = db;

                const schema = this.db[this.dbName];


                this.resourceControllerOptions = {
                      db                    : db[this.dbName]
                    , Related               : Related
                    , dbName                : this.dbName
                };


                return Promise.resolve();
            });
        }






        afterLoad() {
            this.registerResource(new Authorization(this.resourceControllerOptions));
            this.registerResource(new Token(this.resourceControllerOptions));
            this.registerResource(new Subject(this.resourceControllerOptions));
            this.registerResource(new Role(this.resourceControllerOptions));
            this.registerResource(new ServiceToken(this.resourceControllerOptions));
            this.registerResource(new FailedAuthorization());

            return Promise.resolve();
        }
    };
})();
