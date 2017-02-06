

    set search_path to "permissions_service";

    insert into "subjectType" ("identifier", "service", "resource") values ('user', 'legacy', 'userInfo');
    insert into "subjectType" ("identifier", "service", "resource") values ('app', 'legacy', 'appInfo');
    insert into "subjectType" ("identifier", "service", "resource") values ('service', 'legacy', 'serviceInfo');
    INSERT INTO "subjectType" ("identifier", "service", "resource", "fetchInfo") VALUES ('controller', 'legacy', 'controllerInfo', FALSE);


