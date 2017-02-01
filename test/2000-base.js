(function() {
    'use strict';

    // donj't restrict permissions
    process.env.allowAll = true;
    //process.env.learnPermissions = true;


    const distributed           = require('distributed-prototype');
    const PermissionsService    = require('../index');
    const config                = require('../config.local.js');
    const log                   = require('ee-log');
    const assert                = require('assert');


    let app, token, role, group, roleName, groupName;


    const testService           = new distributed.TestService();


    describe('PermissionsService', () => {
        it('preparing the app', (done) => {
            app = new distributed.ServiceManager();

            app.registerService(new PermissionsService({db: config.db}));
            app.registerService(testService);


            app.load().then(done).catch(done);
        });




        it('removing test data', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'delete'
                , service: 'permissions'
                , resource: 'permission'
            })).then((response) => {
                assert.equal(response.status, 'ok');

                return testService.request(new distributed.RelationalRequest({
                      action: 'delete'
                    , service: 'permissions'
                    , resource: 'group'
                }));
            }).then((response) => {
                assert.equal(response.status, 'ok');

                return testService.request(new distributed.RelationalRequest({
                      action: 'delete'
                    , service: 'permissions'
                    , resource: 'role'
                }));
            }).then((response) => {
                assert.equal(response.status, 'ok');

                done();
            }).catch(done);
        });





        it('creating a role', (done) => {
            roleName = 'test-role'+Math.random();


            testService.request(new distributed.RelationalRequest({
                  action: 'createOne'
                , service: 'permissions'
                , resource: 'role'
                , data: {
                      identifier: roleName
                }
            })).then((response) => {
                assert.equal(response.status, 'created');
                assert(response.data.id);

                role = response.data.id;

                done();
            }).catch(done);
        });


        it('creating a group', (done) => {
            groupName = 'test-group'+Math.random();


            testService.request(new distributed.RelationalRequest({
                  action: 'createOne'
                , service: 'permissions'
                , resource: 'group'
                , data: {
                      identifier: groupName
                }
            })).then((response) => {
                assert.equal(response.status, 'created');
                assert(response.data.id);

                group = response.data.id;

                done();
            }).catch(done);
        });



        it('adding permissions to the db', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action    : 'createOne'
                , service   : 'permissions'
                , resource  : 'authorization'
                , data: {
                      service   : 'test-service'+Math.random()
                    , resource  : 'test-resource'+Math.random()
                    , action    : 'test-action'+Math.random()
                    , role      : roleName
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
                    , group: groupName
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

                token = response.data.id;

                done();
            }).catch(done);
        });


        it('adding a role to a group', (done) => {
            testService.request(new distributed.RelationalRequest({
                  action: 'createOneRelation'
                , service: 'permissions'
                , resource: 'role'
                , resourceId: role
                , remoteService: 'permissions'
                , remoteResource: 'group'
                , remoteResourceId: group
            })).then((response) => {
                assert.equal(response.status, 'created');
                done();
            }).catch(done);
        });



        it('loading the permissions for a token', (done) => {
            const legcyService = new distributed.TestService({name: 'legacy'});
            app.registerService(legcyService);

            legcyService.intercept('userInfo', 'listOne', (request, response) => {
                response.ok({
                      userId: 12314
                    , tenantId: 3456
                });
            });


            testService.request(new distributed.RelationalRequest({
                  action: 'listOne'
                , service: 'permissions'
                , resource: 'authorization'
                , resourceId: token
            })).then((response) => { //log(response);
                assert.equal(response.status, 'ok');
                assert(response.data);
                assert.equal(response.data.roles.length, 1);

                legcyService.cancelIntercept('userInfo');

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
