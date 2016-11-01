

    set search_path to "permissions_service";



    insert into "valueType" ("identifier", "description") values ('constant', 'the column must be compared to a constant value');
    insert into "valueType" ("identifier", "description") values ('function', 'the column must be compared to the result fo a function');
    insert into "valueType" ("identifier", "description") values ('variable', 'the column must be compared to a variable');



    insert into "comparator" ("identifier", "description") values ('equal', 'the value in the column must equal to');
    insert into "comparator" ("identifier", "description") values ('notEqual', 'the value in the column must not equal to');
    insert into "comparator" ("identifier", "description") values ('in', 'the value in the column must be one of');
    insert into "comparator" ("identifier", "description") values ('notIn', 'the value in the column must be not on of');
    insert into "comparator" ("identifier", "description") values ('gt', 'the value in the column must be greather than');
    insert into "comparator" ("identifier", "description") values ('lt', 'the value in the column must be less than');
    insert into "comparator" ("identifier", "description") values ('gte', 'the value in the column must be greather than or equal to');
    insert into "comparator" ("identifier", "description") values ('lte', 'the value in the column must be less than or equal to');



    insert into "subjectType" ("identifier", "service", "resource") values ('user', 'legacy', 'userInfo');
    insert into "subjectType" ("identifier", "service", "resource") values ('app', 'legacy', 'appInfo');
    insert into "subjectType" ("identifier", "service", "resource") values ('service', 'legacy', 'serviceInfo');
    INSERT INTO "subjectType" ("identifier", "service", "resource", "fetchInfo") VALUES ('controller', 'legacy', 'controllerInfo', FALSE);


