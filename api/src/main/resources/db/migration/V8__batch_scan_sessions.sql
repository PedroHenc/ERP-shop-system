-- Batch scanning: one phone session sends many codes (each new product of a batch), in order.
alter table tb_scan_sessions add column batch boolean not null default false;

create table tb_scan_session_codes (
    session_id bigint not null,
    position integer not null,
    code varchar(64) not null,
    primary key (session_id, position),
    constraint fk_tb_scan_session_codes_session foreign key (session_id) references tb_scan_sessions (id) on delete cascade
);
