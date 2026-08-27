create policy "Users manage own backgrounds select"
on storage.objects for select to authenticated
using (bucket_id = 'backgrounds' and owner = auth.uid());

create policy "Users manage own backgrounds insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'backgrounds' and owner = auth.uid());

create policy "Users manage own backgrounds update"
on storage.objects for update to authenticated
using (bucket_id = 'backgrounds' and owner = auth.uid());

create policy "Users manage own backgrounds delete"
on storage.objects for delete to authenticated
using (bucket_id = 'backgrounds' and owner = auth.uid());