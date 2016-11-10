(function() {
    'use strict';

    const distributed           = require('distributed-prototype');
    const ResourceController    = distributed.ResourceController;
    const RelationalRequest     = distributed.RelationalRequest;


    const log                   = require('ee-log');
    const type                  = require('ee-types');






    module.exports = class RateLimit extends ResourceController {


        constructor(options) {
            super('rateLimit');

            // db from the service
            this.db = options.db;
            this.Related = options.Related;

            // permissions listings
            this.enableAction('updateOne');
        }





        updateOne(request, response) {
            this.db.subject('id').fetchAccessToken({
                token: request.resourceId
            }).fetchRateLimitBucket('*')
              .getGroup()
              .getRole()
              .getRateLimit().findOne().then((subject) => {
                const rateLimit  = getLowestLimit(subject);

                if (rateLimit) {
                    if (subject.rateLimitBucket) {


                        // update, use in db procedure
                         let query = `UPDATE "${dbName}"."rateLimitBucket" set updated = now(), "currentValue" = cast((SELECT "${dbName}"."getUpdatedRateLimitValue"("${dbName}"."rateLimit".*, cast($1 as bigint)) as "currentValue") as bigint) WHERE id in (
                    SELECT
                        "rateLimit"."id"
                    FROM
                        "${dbName}"."rateLimit"
                    LEFT JOIN
                        "${dbName}"."app" as "app1"
                            ON "rateLimit"."id"="app1"."id_rateLimit"
                    LEFT JOIN
                        "${dbName}"."accessToken" as "accessToken2"
                            ON "app1"."id"="accessToken2"."id_app"
                    WHERE
                        "accessToken2"."token" = $2
                );`;
                    } else {

                        // create a new bucket
                        subject.rateLimitBucket = new this.db.rateLimitBucket({
                            currentValue: rateLimit.credits - request.data.usedCredits
                        });

                        return subject.save();
                    }
                } else {

                    // remove the bucket, there is no need
                    // for it anymore
                    if (subject.rateLimitBucket) {
                        delete subject.rateLimitBucket;
                        return subject.save();
                    }
                }
            }).catch(err => response.error('db_errors', `Failed to load the subject belonging to the ${request.resourceId} token!`, err));
        }




        getLowestLimit(subject) {
            let rateLimit;

            if (subject.group) {
                subject.group.forEach((group) => {
                    if (group.role) {
                        group.role.forEach((role) => {
                            if (!rateLimit || role.rateLimit.credits < rateLimit.credits) rateLimit = role.rateLimit;
                        });
                    }
                });
            }

            return rateLimit;
        }
    }
})();
