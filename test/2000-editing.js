(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;


    const distributed           = require('distributed-prototype');
    const PermissionsService    = require('../index');
    const config                = require('../config.local.js');
    const log                   = require('ee-log');
    const assert                = require('assert');


    let app;


    const testService           = new distributed.TestService();


    describe('PermissionsService', () => {
        it('preparing the app', (done) => {
            app = new distributed.ServiceManager();

            app.registerService(new PermissionsService({db: config.db}));
            app.registerService(testService);


            app.load().then(done).catch(done);
        });



        it('adding permissions to the db', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'createOne'
                , service: 'permissions'
                , resource: 'authorization'
                , data: {
                      service   : 'test-service'+Math.random()
                    , resource  : 'test-resource'+Math.random()
                    , action    : 'test-action'+Math.random()
                    , role      : 'test-role'+Math.random()
                }
            })).then((response) => {
                assert.equal(response.status, 'created');
                assert(response.data.id);
                done();
            }).catch(done);
        });



        it('registering a subject', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'createOrUpdateOne'
                , service: 'permissions'
                , resource: 'subject'
                , data: {
                      id: 345345
                    , type: 'user'
                    , group: 'events.ch-users'
                }
            })).then((response) => {
                assert.equal(response.status, 'created');
                assert(response.data.id);
                done();
            }).catch(done);
        });



        it('creating an accessToken', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'createOne'
                , service: 'permissions'
                , resource: 'accessToken'
                , data: {
                      id: 345345
                    , type: 'user'
                }
            })).then((response) => {
                assert.equal(response.status, 'created');
                assert(response.data.id);
                done();
            }).catch(done);
        });



        it('invalidating all accessTokens for a subject', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'delete'
                , service: 'permissions'
                , resource: 'accessToken'
                , data: {
                      id: 345345
                    , type: 'user'
                }
            })).then((response) => {
                assert.equal(response.status, 'ok');
                done();
            }).catch(done);
        });

    });
})();
