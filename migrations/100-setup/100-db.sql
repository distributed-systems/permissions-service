

    set search_path to "permissions_service";









    create table "subjectType" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "service"                     varchar(200) not null
        , "resource"                    varchar(200) not null
        , "fetchInfo"                   boolean not null default false
        , constraint "subjectType_pk"
            primary key ("id")
        , constraint "subjectType_unique_identifier"
            unique ("identifier")
    );

    create table "subject" (
          "id"                          serial not null
        , "id_subjectType"              int not null
        , "subjectId"                   int not null
        , constraint "subject_pk"
            primary key ("id")
        , constraint "subject_unique_subject"
            unique ("id_subjectType", "subjectId")
        , constraint "subject_fk_subjectType"
            foreign key ("id_subjectType")
            references "subjectType"("id")
            on update cascade
            on delete restrict
    );

    create table "accessToken" (
          "id"                          serial not null
        , "token"                       character varying(64) NOT NULL
        , "expires"                     timestamp without time zone
        , "id_subject"                  int not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "accessToken_pk"
            primary key ("id")
        , constraint "accessToken_unique_token"
            unique ("token")
        , constraint "accessToken_fk_subject"
            foreign key ("id_subject")
            references "subject"("id")
            on update cascade
            on delete restrict
    );

    create table "group" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "group_pk"
            primary key ("id")
        , constraint "group_unique_identifier"
            unique ("identifier")
    );

    create table "subject_group" (
          "id_subject"                  int not null
        , "id_group"                    int not null
        , constraint "subject_group_pk"
            primary key ("id_subject", "id_group")
        , constraint "subject_group_fk_subject"
            foreign key ("id_subject")
            references "subject"("id")
            on update cascade
            on delete restrict
        , constraint "subject_group_fk_group"
            foreign key ("id_group")
            references "group"("id")
            on update cascade
            on delete restrict
    );

    create table "role" (
          "id"                          serial not null
        , "id_rateLimit"                int
        , "identifier"                  varchar(50) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "role_pk"
            primary key ("id")
        , constraint "role_unique_identifier"
            unique ("identifier")
        , constraint "role_fk_rateLimit"
            foreign key ("id_rateLimit")
            references "rateLimit"("id")
            on update cascade
            on delete restrict
    );

    create table "group_role" (
          "id_role"                     int not null
        , "id_group"                    int not null
        , constraint "group_role_pk"
            primary key ("id_role", "id_group")
        , constraint "group_role_fk_role"
            foreign key ("id_role")
            references "role"("id")
            on update cascade
            on delete restrict
        , constraint "group_role_fk_group"
            foreign key ("id_group")
            references "group"("id")
            on update cascade
            on delete restrict
    );










    create table "rateLimit" (
          "id"                          serial not null
        , "interval"                    int not null
        , "credits"                     int not null
        , "comment"                     text
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "rateLimit_pk"
            primary key ("id")
    );

    create table "rateLimitBucket" (
          "id"                          serial not null
        , "id_rateLimit"                int not null
        , "id_subject"                  int not null
        , "currentValue"                bigint
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , constraint "rateLimitBucket_pk"
            primary key ("id")
        , constraint "rateLimitBucket_fk_rateLimit"
            foreign key ("id_rateLimit")
            references "rateLimit"("id")
            on update cascade
            on delete restrict
        , constraint "rateLimitBucket_fk_subject"
            foreign key ("id_subject")
            references "subject"("id")
            on update cascade
            on delete restrict
    );








    create table "capability" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "description"                 text
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "capability_pk"
            primary key ("id")
        , constraint "capability_unique_identifier"
            unique ("identifier")
    );

    create table "role_capability" (
          "id_role"                     int not null
        , "id_capability"               int not null
        , constraint "role_capability_pk"
            primary key ("id_role", "id_capability")
        , constraint "role_capability_fk_role"
            foreign key ("id_role")
            references "role"("id")
            on update cascade
            on delete restrict
        , constraint "role_capability_fk_capability"
            foreign key ("id_capability")
            references "capability"("id")
            on update cascade
            on delete restrict
    );








    create table "service" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "service_pk"
            primary key ("id")
        , constraint "service_unique_identifier"
            unique ("identifier")
    );

    create table "resource" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "id_service"                  int not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "resource_pk"
            primary key ("id")
        , constraint "resource_unique_identifier"
            unique ("identifier", "id_service")
        , constraint "resource_capability_fk_service"
            foreign key ("id_service")
            references "service"("id")
            on update cascade
            on delete restrict
    );

    create table "action" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "action_pk"
            primary key ("id")
        , constraint "action_unique_identifier"
            unique ("identifier")
    );

    create table "permission" (
          "id"                          serial not null
        , "id_resource"                 int not null
        , "id_action"                   int not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "permission_pk"
            primary key ("id")
        , constraint "permission_unique_fks"
            unique ("id_resource", "id_action")
        , constraint "permission_capability_fk_resource"
            foreign key ("id_resource")
            references "resource"("id")
            on update cascade
            on delete restrict
        , constraint "permission_capability_fk_action"
            foreign key ("id_action")
            references "action"("id")
            on update cascade
            on delete restrict
    );

    create table "role_permission" (
          "id_role"                     int not null
        , "id_permission"               int not null
        , constraint "role_permission_pk"
            primary key ("id_role", "id_permission")
        , constraint "role_permission_fk_role"
            foreign key ("id_role")
            references "role"("id")
            on update cascade
            on delete restrict
        , constraint "role_permission_fk_permission"
            foreign key ("id_permission")
            references "permission"("id")
            on update cascade
            on delete restrict
    );





    create table "comparator" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "description"                 text
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "comparator_pk"
            primary key ("id")
        , constraint "comparator_unique_identifier"
            unique ("identifier")
    );

    create table "valueType" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "description"                 text
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "valueType_pk"
            primary key ("id")
        , constraint "valueType_unique_identifier"
            unique ("identifier")
    );

    create table "rowRestriction" (
          "id"                          serial not null
        , "id_valueType"                int not null
        , "id_comparator"               int not null
        , "property"                    varchar(200) not null
        , "value"                       json not null
        , "nullable"                    boolean not null default false
        , "global"                      boolean not null default false
        , "name"                        varchar(200) not null
        , "description"                 text
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "rowRestriction_pk"
            primary key ("id")
        , constraint "rowRestriction_capability_fk_valueType"
            foreign key ("id_valueType")
            references "valueType"("id")
            on update cascade
            on delete restrict
        , constraint "rowRestriction_capability_fk_comparator"
            foreign key ("id_comparator")
            references "comparator"("id")
            on update cascade
            on delete restrict
    );

    create table "rowRestriction_resource" (
          "id_rowRestriction"           int not null
        , "id_resource"                 int not null
        , constraint "rowRestriction_resource_pk"
            primary key ("id_rowRestriction", "id_resource")
        , constraint "rowRestriction_resource_fk_rowRestriction"
            foreign key ("id_rowRestriction")
            references "rowRestriction"("id")
            on update cascade
            on delete restrict
        , constraint "rowRestriction_resource_fk_resource"
            foreign key ("id_resource")
            references "resource"("id")
            on update cascade
            on delete restrict
    );

    create table "rowRestriction_action" (
          "id_rowRestriction"           int not null
        , "id_action"                   int not null
        , constraint "rowRestriction_action_pk"
            primary key ("id_rowRestriction", "id_action")
        , constraint "rowRestriction_action_fk_rowRestriction"
            foreign key ("id_rowRestriction")
            references "rowRestriction"("id")
            on update cascade
            on delete restrict
        , constraint "rowRestriction_action_fk_action"
            foreign key ("id_action")
            references "action"("id")
            on update cascade
            on delete restrict
    );

    create table "role_rowRestriction" (
          "id_role"                     int not null
        , "id_rowRestriction"           int not null
        , constraint "role_rowRestriction_pk"
            primary key ("id_role", "id_rowRestriction")
        , constraint "role_rowRestriction_fk_role"
            foreign key ("id_role")
            references "role"("id")
            on update cascade
            on delete restrict
        , constraint "role_rowRestriction_fk_rowRestriction"
            foreign key ("id_rowRestriction")
            references "rowRestriction"("id")
            on update cascade
            on delete restrict
    );




    create table "devAuthentication" (
          "id"                          serial not null
        , "password"                    varchar(100) not null
        , "identifier"                  varchar(199) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "devAuthentication_pk"
            primary key ("id")
        , constraint "devAuthentication_unique_identifier"
            unique ("identifier")
    );