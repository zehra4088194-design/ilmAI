-- Institution events are written into the existing global notifications inbox.
-- SECURITY DEFINER keeps this server-side automation independent of the caller's RLS context.

create or replace function public.notify_school_event() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_title text;
  v_message text;
  v_link text;
  v_type public.notification_type := 'SYSTEM'::public.notification_type;
begin
  if tg_table_name = 'school_announcements' then
    if new.published_at is null then return new; end if;
    if tg_op = 'UPDATE' and old.published_at is not null
       and old.title is not distinct from new.title
       and old.body is not distinct from new.body
       and old.priority is not distinct from new.priority
       and old.campus_id is not distinct from new.campus_id then return new; end if;
    v_title := case when new.priority = 'urgent' then 'Urgent school notice' else 'New school notice' end;
    v_message := new.title;
    v_link := '/school/student-hub#notices';
    insert into public.notifications(user_id,type,title,message,link)
    select distinct m.profile_id,v_type,v_title,v_message,v_link
    from public.school_memberships m
    where m.organization_id=new.organization_id and m.status='active'
      and m.member_role = any(new.audience_roles)
      and (new.campus_id is null or m.campus_id=new.campus_id);
    return new;
  end if;

  if tg_table_name = 'school_homework' then
    v_title := 'New assignment'; v_message := new.title; v_link := '/school/student-hub#assignments';
    insert into public.notifications(user_id,type,title,message,link)
    select distinct e.student_id,v_type,v_title,v_message,v_link
    from public.school_enrollments e
    where e.organization_id=new.organization_id and e.section_id=new.section_id and e.status='active'
    union
    select distinct g.guardian_id,v_type,v_title,v_message,v_link
    from public.school_guardians g
    where g.organization_id=new.organization_id and g.receives_alerts=true
      and exists (select 1 from public.school_enrollments e2 where e2.organization_id=new.organization_id and e2.section_id=new.section_id and e2.student_id=g.student_id and e2.status='active');
    return new;
  end if;

  if tg_table_name = 'school_fee_invoices' then
    if tg_op='INSERT' then
      v_title := 'New fee voucher'; v_type := 'REMINDER'::public.notification_type;
      v_message := format('Voucher %s is due on %s.',new.voucher_number,to_char(new.due_date,'DD Mon YYYY'));
    elsif new.status='overdue' and old.status is distinct from new.status then
      v_title := 'Fee overdue'; v_type := 'REMINDER'::public.notification_type;
      v_message := format('Voucher %s is overdue.',new.voucher_number);
    elsif new.paid_amount is distinct from old.paid_amount then
      v_title := 'Fee account updated';
      v_message := format('Payment status for voucher %s has been updated.',new.voucher_number);
    else return new; end if;
    v_link := '/school/student-hub#fees';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link)
    union
    select g.guardian_id,v_type,v_title,v_message,v_link from public.school_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'school_attendance_records' then
    if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
    v_title := 'Attendance updated';
    v_message := format('Your attendance for %s is marked %s.',to_char(new.attendance_date,'DD Mon YYYY'),new.status);
    v_link := '/school/student-hub#attendance';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link);
    insert into public.notifications(user_id,type,title,message,link)
    select g.guardian_id,v_type,v_title,format('Attendance for your child on %s is marked %s.',to_char(new.attendance_date,'DD Mon YYYY'),new.status),v_link
    from public.school_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'school_report_cards' then
    if new.published_at is null then return new; end if;
    if tg_op='UPDATE' and old.published_at is not null and old.percentage is not distinct from new.percentage and old.grade is not distinct from new.grade and old.gpa is not distinct from new.gpa then return new; end if;
    v_title := 'Result published';
    v_message := format('Your %s result is now available.',coalesce((select name from public.school_exams where id=new.exam_id),'exam'));
    v_link := '/school/student-hub#results';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link);
    insert into public.notifications(user_id,type,title,message,link)
    select g.guardian_id,v_type,v_title,v_message,v_link from public.school_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'school_timetable_entries' then
    if tg_op='UPDATE' and old.subject_name is not distinct from new.subject_name and old.day_of_week is not distinct from new.day_of_week and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at and old.room is not distinct from new.room and old.teacher_id is not distinct from new.teacher_id then return new; end if;
    v_title := case when tg_op='INSERT' then 'New timetable class' else 'Timetable updated' end;
    v_message := format('%s — %s to %s.',new.subject_name,to_char(new.starts_at,'HH24:MI'),to_char(new.ends_at,'HH24:MI'));
    v_link := '/school/student-hub#timetable';
    insert into public.notifications(user_id,type,title,message,link)
    select distinct e.student_id,v_type,v_title,v_message,v_link from public.school_enrollments e where e.organization_id=new.organization_id and e.section_id=new.section_id and e.status='active'
    union
    select distinct g.guardian_id,v_type,v_title,v_message,v_link from public.school_guardians g where g.organization_id=new.organization_id and g.receives_alerts=true and exists(select 1 from public.school_enrollments e2 where e2.organization_id=new.organization_id and e2.section_id=new.section_id and e2.student_id=g.student_id and e2.status='active');
    return new;
  end if;
  return new;
end; $$;

create or replace function public.notify_college_event() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  v_title text;
  v_message text;
  v_link text;
  v_type public.notification_type := 'SYSTEM'::public.notification_type;
begin
  if tg_table_name = 'college_announcements' then
    if new.published_at is null then return new; end if;
    if tg_op='UPDATE' and old.published_at is not null and old.title is not distinct from new.title and old.body is not distinct from new.body and old.priority is not distinct from new.priority and old.campus_id is not distinct from new.campus_id then return new; end if;
    v_title := case when new.priority='urgent' then 'Urgent college notice' else 'New college notice' end; v_message := new.title; v_link := '/college/student-hub#notices';
    insert into public.notifications(user_id,type,title,message,link)
    select distinct m.profile_id,v_type,v_title,v_message,v_link from public.college_memberships m where m.organization_id=new.organization_id and m.status='active' and m.member_role=any(new.audience_roles) and (new.campus_id is null or m.campus_id=new.campus_id);
    return new;
  end if;

  if tg_table_name = 'college_assignments' then
    v_title := 'New assignment'; v_message := new.title; v_link := '/college/student-hub#assignments';
    insert into public.notifications(user_id,type,title,message,link)
    select distinct e.student_id,v_type,v_title,v_message,v_link from public.college_enrollments e where e.organization_id=new.organization_id and e.section_id=new.section_id and e.status='active'
    union
    select distinct g.guardian_id,v_type,v_title,v_message,v_link from public.college_guardians g where g.organization_id=new.organization_id and g.receives_alerts=true and exists(select 1 from public.college_enrollments e2 where e2.organization_id=new.organization_id and e2.section_id=new.section_id and e2.student_id=g.student_id and e2.status='active');
    return new;
  end if;

  if tg_table_name = 'college_fee_invoices' then
    if tg_op='INSERT' then v_title:='New fee voucher'; v_type:='REMINDER'::public.notification_type; v_message:=format('Voucher %s is due on %s.',new.voucher_number,to_char(new.due_date,'DD Mon YYYY'));
    elsif new.status='overdue' and old.status is distinct from new.status then v_title:='Fee overdue'; v_type:='REMINDER'::public.notification_type; v_message:=format('Voucher %s is overdue.',new.voucher_number);
    elsif new.paid_amount is distinct from old.paid_amount then v_title:='Fee account updated'; v_message:=format('Payment status for voucher %s has been updated.',new.voucher_number);
    else return new; end if;
    v_link:='/college/student-hub#fees';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link)
    union
    select g.guardian_id,v_type,v_title,v_message,v_link from public.college_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'college_attendance_records' then
    if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
    v_title:='Attendance updated'; v_message:=format('Your attendance for %s is marked %s.',to_char(new.attendance_date,'DD Mon YYYY'),new.status); v_link:='/college/student-hub#attendance';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link);
    insert into public.notifications(user_id,type,title,message,link) select g.guardian_id,v_type,v_title,v_message,v_link from public.college_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'college_report_cards' then
    if new.published_at is null then return new; end if;
    if tg_op='UPDATE' and old.published_at is not null and old.percentage is not distinct from new.percentage and old.grade is not distinct from new.grade and old.gpa is not distinct from new.gpa then return new; end if;
    v_title:='Result published'; v_message:=format('Your %s result is now available.',coalesce((select name from public.college_exams where id=new.exam_id),'exam')); v_link:='/college/student-hub#results';
    insert into public.notifications(user_id,type,title,message,link) values(new.student_id,v_type,v_title,v_message,v_link);
    insert into public.notifications(user_id,type,title,message,link) select g.guardian_id,v_type,v_title,v_message,v_link from public.college_guardians g where g.organization_id=new.organization_id and g.student_id=new.student_id and g.receives_alerts=true;
    return new;
  end if;

  if tg_table_name = 'college_timetable_slots' then
    if tg_op='UPDATE' and old.course_name is not distinct from new.course_name and old.day_of_week is not distinct from new.day_of_week and old.starts_at is not distinct from new.starts_at and old.ends_at is not distinct from new.ends_at and old.room is not distinct from new.room then return new; end if;
    v_title:=case when tg_op='INSERT' then 'New timetable class' else 'Timetable updated' end; v_message:=format('%s — %s to %s.',new.course_name,to_char(new.starts_at,'HH24:MI'),to_char(new.ends_at,'HH24:MI')); v_link:='/college/student-hub#timetable';
    insert into public.notifications(user_id,type,title,message,link) select distinct e.student_id,v_type,v_title,v_message,v_link from public.college_enrollments e where e.organization_id=new.organization_id and e.section_id=new.section_id and e.status='active'
    union select distinct g.guardian_id,v_type,v_title,v_message,v_link from public.college_guardians g where g.organization_id=new.organization_id and g.receives_alerts=true and exists(select 1 from public.college_enrollments e2 where e2.organization_id=new.organization_id and e2.section_id=new.section_id and e2.student_id=g.student_id and e2.status='active');
    return new;
  end if;
  return new;
end; $$;

drop trigger if exists school_announcements_notify on public.school_announcements;
create trigger school_announcements_notify after insert or update of published_at,title,body,priority,campus_id on public.school_announcements for each row execute function public.notify_school_event();
drop trigger if exists school_homework_notify on public.school_homework;
create trigger school_homework_notify after insert on public.school_homework for each row execute function public.notify_school_event();
drop trigger if exists school_fee_invoices_notify on public.school_fee_invoices;
create trigger school_fee_invoices_notify after insert or update of status,paid_amount,due_date,total_amount on public.school_fee_invoices for each row execute function public.notify_school_event();
drop trigger if exists school_attendance_notify on public.school_attendance_records;
create trigger school_attendance_notify after insert or update of status on public.school_attendance_records for each row execute function public.notify_school_event();
drop trigger if exists school_report_cards_notify on public.school_report_cards;
create trigger school_report_cards_notify after insert or update of published_at,percentage,grade,gpa on public.school_report_cards for each row execute function public.notify_school_event();
drop trigger if exists school_timetable_notify on public.school_timetable_entries;
create trigger school_timetable_notify after insert or update of subject_name,day_of_week,starts_at,ends_at,room,teacher_id on public.school_timetable_entries for each row execute function public.notify_school_event();

drop trigger if exists college_announcements_notify on public.college_announcements;
create trigger college_announcements_notify after insert or update of published_at,title,body,priority,campus_id on public.college_announcements for each row execute function public.notify_college_event();
drop trigger if exists college_assignments_notify on public.college_assignments;
create trigger college_assignments_notify after insert on public.college_assignments for each row execute function public.notify_college_event();
drop trigger if exists college_fee_invoices_notify on public.college_fee_invoices;
create trigger college_fee_invoices_notify after insert or update of status,paid_amount,due_date,total_amount on public.college_fee_invoices for each row execute function public.notify_college_event();
drop trigger if exists college_attendance_notify on public.college_attendance_records;
create trigger college_attendance_notify after insert or update of status on public.college_attendance_records for each row execute function public.notify_college_event();
drop trigger if exists college_report_cards_notify on public.college_report_cards;
create trigger college_report_cards_notify after insert or update of published_at,percentage,grade,gpa on public.college_report_cards for each row execute function public.notify_college_event();
drop trigger if exists college_timetable_notify on public.college_timetable_slots;
create trigger college_timetable_notify after insert or update of course_name,day_of_week,starts_at,ends_at,room on public.college_timetable_slots for each row execute function public.notify_college_event();
