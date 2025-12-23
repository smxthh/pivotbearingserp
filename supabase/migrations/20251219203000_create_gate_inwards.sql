
-- Create gate_inwards table
create table public.gate_inwards (
    id uuid not null default gen_random_uuid(),
    distributor_id uuid not null references public.distributor_profiles(id),
    gi_number text not null,
    gi_date timestamptz not null default now(),
    party_id uuid not null references public.parties(id),
    invoice_number text,
    invoice_date date,
    challan_number text,
    challan_date date,
    purchase_order_id uuid references public.purchase_orders(id),
    status text not null default 'pending', -- 'pending', 'completed'
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id),
    
    constraint gate_inwards_pkey primary key (id),
    constraint gate_inwards_gi_number_unique unique (distributor_id, gi_number)
);

-- Create gate_inward_items table
create table public.gate_inward_items (
    id uuid not null default gen_random_uuid(),
    gate_inward_id uuid not null references public.gate_inwards(id) on delete cascade,
    item_id uuid not null references public.items(id),
    location_id uuid references public.store_locations(id), -- Nullable if not stored yet? Image shows it as required '*'
    batch_number text,
    quantity numeric not null default 0,
    discount_percent numeric,
    price numeric,
    remark text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    constraint gate_inward_items_pkey primary key (id)
);

-- Enable RLS
alter table public.gate_inwards enable row level security;
alter table public.gate_inward_items enable row level security;

-- RLS Policies for gate_inwards
create policy "Users can view their own gate inwards"
on public.gate_inwards for select
using (
    distributor_id in (
        select id from public.distributor_profiles
        where user_id = auth.uid()
    )
);

create policy "Users can insert their own gate inwards"
on public.gate_inwards for insert
with check (
    distributor_id in (
        select id from public.distributor_profiles
        where user_id = auth.uid()
    )
);

create policy "Users can update their own gate inwards"
on public.gate_inwards for update
using (
    distributor_id in (
        select id from public.distributor_profiles
        where user_id = auth.uid()
    )
);

create policy "Users can delete their own gate inwards"
on public.gate_inwards for delete
using (
    distributor_id in (
        select id from public.distributor_profiles
        where user_id = auth.uid()
    )
);

-- RLS Policies for gate_inward_items
-- Assuming access to items depends on access to the parent gate_inward
create policy "Users can view items of their gate inwards"
on public.gate_inward_items for select
using (
    gate_inward_id in (
        select id from public.gate_inwards
        where distributor_id in (
            select id from public.distributor_profiles
            where user_id = auth.uid()
        )
    )
);

create policy "Users can insert items to their gate inwards"
on public.gate_inward_items for insert
with check (
    gate_inward_id in (
        select id from public.gate_inwards
        where distributor_id in (
            select id from public.distributor_profiles
            where user_id = auth.uid()
        )
    )
);

create policy "Users can update items of their gate inwards"
on public.gate_inward_items for update
using (
    gate_inward_id in (
        select id from public.gate_inwards
        where distributor_id in (
            select id from public.distributor_profiles
            where user_id = auth.uid()
        )
    )
);

create policy "Users can delete items of their gate inwards"
on public.gate_inward_items for delete
using (
    gate_inward_id in (
        select id from public.gate_inwards
        where distributor_id in (
            select id from public.distributor_profiles
            where user_id = auth.uid()
        )
    )
);

-- Function to generate GI Number
create or replace function public.get_next_gi_number(p_distributor_id uuid)
returns text
language plpgsql
as $$
declare
    v_fiscal_year text;
    v_count integer;
    v_next_number text;
begin
    -- Determine fiscal year (Assuming April-March cycle like typical Indian FY)
    if extract(month from current_date) >= 4 then
        v_fiscal_year := to_char(current_date, 'YY') || '-' || to_char(current_date + interval '1 year', 'YY');
    else
        v_fiscal_year := to_char(current_date - interval '1 year', 'YY') || '-' || to_char(current_date, 'YY');
    end if;

    -- Get count for this FY
    -- Format: GI/YY-YY/Count
    -- We can just count all documents or parse the Max one. Counting is safer for concurrency if we use sequences but for simple logic:
    
    select count(*) + 1 into v_count
    from public.gate_inwards
    where distributor_id = p_distributor_id
    and gi_number like 'GI/' || v_fiscal_year || '/%';

    v_next_number := 'GI/' || v_fiscal_year || '/' || v_count;
    
    return v_next_number;
end;
$$;
