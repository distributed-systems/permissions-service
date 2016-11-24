

    set search_path to "permissions_service";



    drop table "rateLimit" cascade;




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


    alter table "role"
        add constraint "role_fk_rateLimit"
        foreign key ("id_rateLimit")
        references "rateLimit"("id")
        on update cascade
        on delete restrict;


    drop table "rateLimitBucket";
    create table "rateLimitBucket" (
          "id"                          serial not null
        , "currentValue"                bigint
        , "created"                     timestamp without time zone not null default now()
        , "updated"                     timestamp without time zone not null default now()
        , constraint "rateLimitBucket_pk"
            primary key ("id")
    );

    alter table "subject" add column "id_rateLimitBucket" int;
    alter table "subject"
        add constraint "subject_fk_rateLimitBucket"
        foreign key ("id_rateLimitBucket")
        references "rateLimitBucket"("id")
        on update cascade
        on delete restrict;



    drop function if exists "getUpdatedRateLimitBucketValue"("bucket" "rateLimitBucket", "credits" bigint, "usedCredits" bigint, "interval" bigint);

    create function "getUpdatedRateLimitBucketValue"("bucket" "rateLimitBucket", "credits" bigint, "usedCredits" bigint, "interval" bigint) returns bigint AS $$
        select
            case when bucket."currentValue" is null then ("credits"-"usedCredits")
                 else (least("credits", cast(("bucket"."currentValue" + ((extract(epoch from now())-extract(epoch from "bucket"."updated")) * ("credits"/"interval"))) as bigint))-"usedCredits")
            end as "currentValue"
    $$ language SQL;

