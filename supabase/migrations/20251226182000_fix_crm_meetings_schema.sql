-- Force recreate the table to ensure it exists and has correct columns
drop table if exists public.crm_meetings cascade;

create table public.crm_meetings (
    id uuid not null default gen_random_uuid(),
    title text not null,
    description text null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    created_by uuid not null default auth.uid(),
    status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'canceled')),
    location text null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    
    constraint crm_meetings_pkey primary key (id),
    constraint crm_meetings_created_by_fkey foreign key (created_by) references auth.users(id)
);

-- Enable RLS
alter table public.crm_meetings enable row level security;

-- Create policy for viewing meetings
create policy "Users can view all meetings" on public.crm_meetings
    for select using (true);

-- Create policy for inserting meetings
create policy "Users can create meetings" on public.crm_meetings
    for insert with check (auth.uid() = created_by);

-- Create policy for updating meetings
create policy "Users can update their own meetings" on public.crm_meetings
    for update using (auth.uid() = created_by);

-- Create policy for deleting meetings
create policy "Users can delete their own meetings" on public.crm_meetings
    for delete using (auth.uid() = created_by);

-- Add to publication for realtime
alter publication supabase_realtime add table public.crm_meetings;
