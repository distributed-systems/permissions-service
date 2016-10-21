(function() {
    'use strict';
    // donj't restrict permissions
    process.env.allowAll = true;
    //process.env.learnPermissions = true;

    // donj't restrict permissions
    process.env.allowAll = true;


    const PermissionsService = require('../index');
    const config = require('../config.local.js');



    describe('Service', () => {
        it('should not crash when instantiated', () => {
            new PermissionsService({
                db: config.db
            });
        });
    });
})();
