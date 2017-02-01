(function() {
    'use strict';


    module.exports = class SubjectPermission {



        constructor() {
            this.created = Date.now();
            this.addedRoles = new Set();
            this.data = {
                  roles: []
                , subject: {
                    data: {}
                }
            };
        }




        setToken(token) {
            this.data.token = token;
        }


        setType(type) {
            this.data.subject.type = type.identifier;
        }


        setId(id) {
            this.data.subject.id = id;
        }


        setInfo(info) {
            if (typeof info === 'object' && info !== null) this.data.subject.data = info;
        }


        addGroup(group) {
            group.roles.forEach((role) => {
                if (!this.addedRoles.has(role.identifier)) {
                    this.addedRoles.add(role.identifier);
                    this.data.roles.push(role);
                }
            });
        }

        getData() {
            return this.data;
        }
    };
})();
