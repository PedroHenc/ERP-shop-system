-- Cost and margin: what a product costs the store, and what each sold unit cost at the time of the sale
-- (so a later change of cost does not rewrite past profit). Both optional: unknown cost stays null.
alter table tb_products add column cost_price numeric(19, 2);
alter table tb_sale_items add column unit_cost numeric(19, 2);
