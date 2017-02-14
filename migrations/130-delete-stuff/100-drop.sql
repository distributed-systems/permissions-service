

    set search_path to "permissions_service";



    drop table "devAuthentication" cascade;
    drop table "rateLimitBucket" cascade;
    drop table "rateLimit" cascade;
    drop table "role_rowRestriction" cascade;
    drop table "rowRestriction_action" cascade;
    drop table "rowRestriction_resource" cascade;
    drop table "rowRestriction" cascade;
    drop table "valueType" cascade;
    drop table "comparator" cascade;


    alter table "subjectType" alter column "service" drop not null;
    alter table "subjectType" alter column "resource" drop not null;
    
    alter table "subject" alter column "subjectId" drop not null;
    alter table "subject" drop column "id_rateLimitBucket";

    insert into "subjectType" ("identifier") values ('externalService');