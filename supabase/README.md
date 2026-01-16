# Supabase Database Migrations

This folder contains SQL migration files for the UAlberta MSA Iftar Portal.

## How to Run Migrations

1. **Go to your Supabase project dashboard**
2. **Navigate to:** SQL Editor (left sidebar)
3. **Run each migration file in order:**

   - `001_schema.sql` - Creates tables (profiles, days, bookings)
   - `002_rls.sql` - Sets up Row Level Security policies
   - `003_functions.sql` - Creates `reserve_spot()` function and profile trigger
   - `004_triggers.sql` - Creates auto-promote waitlist trigger

4. **Copy and paste** the contents of each file into the SQL Editor
5. **Click "Run"** to execute
6. **Verify success** by checking the "Success" message

## Important Notes

- **Run migrations in order!** Dependencies exist between them.
- **Do not skip migrations.** Each builds on the previous one.
- After migrations, you'll need to seed the `days` table with Ramadan dates (see main README).

## Testing the Functions

After running all migrations, you can test the `reserve_spot` function:

```sql
-- Test reserve_spot function (replace with your user ID)
SELECT public.reserve_spot('2026-03-15');
```

Expected responses:
- `CONFIRMED` - Spot reserved successfully
- `WAITLISTED` - Added to waitlist
- `ALREADY_BOOKED` - User already has a booking for this day
- `DAY_CLOSED` - Bookings are closed for this day
- `FULL` - Both confirmed and waitlist are full
