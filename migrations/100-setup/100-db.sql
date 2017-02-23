

    set search_path to "permissions_service";









    create table "subjectType" (
          "id"                          serial not null
        , "identifier"                  varchar(50) not null
        , "service"                     varchar(200)
        , "resource"                    varchar(200)
        , "fetchInfo"                   boolean not null default false
        , constraint "subjectType_pk"
            primary key ("id")
        , constraint "subjectType_unique_identifier"
            unique ("identifier")
    );

    create table "subject" (
          "id"                          serial not null
        , "id_subjectType"              int not null
        , "subjectId"                   int
        , "identifier"                  varchar(50)
        , constraint "subject_pk"
            primary key ("id")
        , constraint "subject_unique_identifier"
            unique ("id_subjectType", "identifier")
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
        , "identifier"                  varchar(50) not null
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , "deleted"                     timestamp without time zone
        , constraint "role_pk"
            primary key ("id")
        , constraint "role_unique_identifier"
            unique ("identifier")
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


