-- Coach Note V1 seed data.
-- Reference data (categories/muscle groups/equipment) + ~60 system exercises
-- so a coach can actually use the app meaningfully on day one.
-- Applied automatically by `supabase db reset --local`.

begin;

-- ---------------------------------------------------------------------------
-- exercise_categories (PRD §7.4)
-- ---------------------------------------------------------------------------
insert into public.exercise_categories (code, name_zh_tw, name_en, sort_order) values
  ('chest', '胸部', 'Chest', 1),
  ('back', '背部', 'Back', 2),
  ('shoulders', '肩部', 'Shoulders', 3),
  ('legs', '腿部', 'Legs', 4),
  ('glutes', '臀部', 'Glutes', 5),
  ('biceps', '二頭肌', 'Biceps', 6),
  ('triceps', '三頭肌', 'Triceps', 7),
  ('core', '核心', 'Core', 8),
  ('cardio', '有氧', 'Cardio', 9),
  ('full_body', '全身', 'Full Body', 10),
  ('stretching', '伸展', 'Stretching', 11),
  ('other', '其他', 'Other', 12);

-- ---------------------------------------------------------------------------
-- muscle_groups (PRD §10.6, with parent/child examples)
-- ---------------------------------------------------------------------------
insert into public.muscle_groups (code, name_zh_tw, name_en, parent_id, sort_order) values
  ('chest', '胸部', 'Chest', null, 1),
  ('back', '背部', 'Back', null, 2),
  ('shoulders', '肩部', 'Shoulders', null, 3),
  ('legs', '腿部', 'Legs', null, 4),
  ('glutes', '臀部', 'Glutes', null, 5),
  ('biceps', '二頭肌', 'Biceps', null, 6),
  ('triceps', '三頭肌', 'Triceps', null, 7),
  ('core', '核心', 'Core', null, 8),
  ('full_body', '全身', 'Full Body', null, 9);

insert into public.muscle_groups (code, name_zh_tw, name_en, parent_id, sort_order)
select 'quadriceps', '股四頭肌', 'Quadriceps', id, 1 from public.muscle_groups where code = 'legs'
union all
select 'hamstrings', '腿後肌', 'Hamstrings', id, 2 from public.muscle_groups where code = 'legs'
union all
select 'calves', '小腿', 'Calves', id, 3 from public.muscle_groups where code = 'legs'
union all
select 'lats', '背闊肌', 'Lats', id, 1 from public.muscle_groups where code = 'back'
union all
select 'traps', '斜方肌', 'Trapezius', id, 2 from public.muscle_groups where code = 'back';

-- ---------------------------------------------------------------------------
-- equipment_types (PRD §7.4)
-- ---------------------------------------------------------------------------
insert into public.equipment_types (code, name_zh_tw, name_en, sort_order) values
  ('bodyweight', '徒手', 'Bodyweight', 1),
  ('barbell', '槓鈴', 'Barbell', 2),
  ('dumbbell', '啞鈴', 'Dumbbell', 3),
  ('kettlebell', '壺鈴', 'Kettlebell', 4),
  ('machine', '固定式器材', 'Machine', 5),
  ('cable', '滑輪', 'Cable', 6),
  ('resistance_band', '彈力帶', 'Resistance Band', 7),
  ('trx', 'TRX', 'TRX', 8),
  ('cardio_machine', '有氧器材', 'Cardio Machine', 9),
  ('other', '其他', 'Other', 10);

-- ---------------------------------------------------------------------------
-- exercises: system exercises (organization_id = null, is_system = true)
-- ---------------------------------------------------------------------------
insert into public.exercises (
  organization_id, category_id, primary_muscle_group_id, equipment_type_id,
  name_zh_tw, name_en, tracking_type, default_unit, is_system, is_active
)
select
  null, cat.id, mg.id, eq.id,
  v.name_zh_tw, v.name_en, v.tracking_type, v.default_unit, true, true
from (values
  -- 胸部 chest
  ('chest', 'chest', 'barbell', '槓鈴臥推', 'Barbell Bench Press', 'weight_reps', 'kg'),
  ('chest', 'chest', 'dumbbell', '啞鈴臥推', 'Dumbbell Bench Press', 'weight_reps', 'kg'),
  ('chest', 'chest', 'dumbbell', '上斜啞鈴臥推', 'Incline Dumbbell Press', 'weight_reps', 'kg'),
  ('chest', 'chest', 'cable', '滑輪夾胸', 'Cable Fly', 'weight_reps', 'kg'),
  ('chest', 'chest', 'bodyweight', '伏地挺身', 'Push Up', 'bodyweight_reps', 'kg'),
  ('chest', 'chest', 'machine', '坐姿胸推機', 'Chest Press Machine', 'weight_reps', 'kg'),
  ('chest', 'chest', 'bodyweight', '雙槓臂屈伸', 'Dips', 'bodyweight_reps', 'kg'),
  -- 背部 back
  ('back', 'back', 'barbell', '硬舉', 'Deadlift', 'weight_reps', 'kg'),
  ('back', 'lats', 'barbell', '槓鈴划船', 'Barbell Row', 'weight_reps', 'kg'),
  ('back', 'lats', 'cable', '滑輪下拉', 'Lat Pulldown', 'weight_reps', 'kg'),
  ('back', 'lats', 'bodyweight', '引體向上', 'Pull Up', 'bodyweight_reps', 'kg'),
  ('back', 'lats', 'cable', '坐姿划船', 'Seated Cable Row', 'weight_reps', 'kg'),
  ('back', 'lats', 'barbell', 'T槓划船', 'T-Bar Row', 'weight_reps', 'kg'),
  ('back', 'lats', 'dumbbell', '啞鈴單臂划船', 'Dumbbell Row', 'weight_reps', 'kg'),
  ('back', 'traps', 'cable', '臉拉', 'Face Pull', 'weight_reps', 'kg'),
  ('back', 'traps', 'barbell', '聳肩', 'Shrug', 'weight_reps', 'kg'),
  ('back', 'lats', 'trx', 'TRX划船', 'TRX Row', 'bodyweight_reps', 'kg'),
  -- 肩部 shoulders
  ('shoulders', 'shoulders', 'barbell', '站姿肩推', 'Overhead Press', 'weight_reps', 'kg'),
  ('shoulders', 'shoulders', 'dumbbell', '啞鈴肩推', 'Dumbbell Shoulder Press', 'weight_reps', 'kg'),
  ('shoulders', 'shoulders', 'dumbbell', '側平舉', 'Lateral Raise', 'weight_reps', 'kg'),
  ('shoulders', 'shoulders', 'dumbbell', '前平舉', 'Front Raise', 'weight_reps', 'kg'),
  ('shoulders', 'shoulders', 'dumbbell', '反向飛鳥', 'Rear Delt Fly', 'weight_reps', 'kg'),
  ('shoulders', 'shoulders', 'cable', '滑輪側平舉', 'Cable Lateral Raise', 'weight_reps', 'kg'),
  -- 腿部 legs
  ('legs', 'quadriceps', 'barbell', '槓鈴深蹲', 'Barbell Back Squat', 'weight_reps', 'kg'),
  ('legs', 'quadriceps', 'machine', '腿推機', 'Leg Press', 'weight_reps', 'kg'),
  ('legs', 'quadriceps', 'machine', '腿伸屈機', 'Leg Extension', 'weight_reps', 'kg'),
  ('legs', 'hamstrings', 'machine', '腿彎舉機', 'Leg Curl', 'weight_reps', 'kg'),
  ('legs', 'hamstrings', 'barbell', '羅馬尼亞硬舉', 'Romanian Deadlift', 'weight_reps', 'kg'),
  ('legs', 'quadriceps', 'dumbbell', '走動弓箭步', 'Walking Lunge', 'weight_reps', 'kg'),
  ('legs', 'quadriceps', 'dumbbell', '保加利亞分腿蹲', 'Bulgarian Split Squat', 'weight_reps', 'kg'),
  ('legs', 'calves', 'machine', '站姿提踵', 'Standing Calf Raise', 'weight_reps', 'kg'),
  ('legs', 'calves', 'machine', '坐姿提踵', 'Seated Calf Raise', 'weight_reps', 'kg'),
  ('legs', 'quadriceps', 'kettlebell', '高腳杯深蹲', 'Goblet Squat', 'weight_reps', 'kg'),
  -- 臀部 glutes
  ('glutes', 'glutes', 'barbell', '臀推', 'Hip Thrust', 'weight_reps', 'kg'),
  ('glutes', 'glutes', 'bodyweight', '橋式', 'Glute Bridge', 'bodyweight_reps', 'kg'),
  ('glutes', 'glutes', 'cable', '滑輪後踢腿', 'Cable Kickback', 'weight_reps', 'kg'),
  ('glutes', 'glutes', 'barbell', '相撲硬舉', 'Sumo Deadlift', 'weight_reps', 'kg'),
  -- 二頭肌 biceps
  ('biceps', 'biceps', 'barbell', '槓鈴彎舉', 'Barbell Curl', 'weight_reps', 'kg'),
  ('biceps', 'biceps', 'dumbbell', '啞鈴彎舉', 'Dumbbell Curl', 'weight_reps', 'kg'),
  ('biceps', 'biceps', 'dumbbell', '錘式彎舉', 'Hammer Curl', 'weight_reps', 'kg'),
  ('biceps', 'biceps', 'cable', '滑輪彎舉', 'Cable Curl', 'weight_reps', 'kg'),
  ('biceps', 'biceps', 'barbell', '牧師椅彎舉', 'Preacher Curl', 'weight_reps', 'kg'),
  -- 三頭肌 triceps
  ('triceps', 'triceps', 'cable', '三頭肌下壓', 'Triceps Pushdown', 'weight_reps', 'kg'),
  ('triceps', 'triceps', 'barbell', '臥推三頭肌伸展', 'Skull Crusher', 'weight_reps', 'kg'),
  ('triceps', 'triceps', 'dumbbell', '過頭三頭肌伸展', 'Overhead Triceps Extension', 'weight_reps', 'kg'),
  ('triceps', 'triceps', 'barbell', '窄握臥推', 'Close Grip Bench Press', 'weight_reps', 'kg'),
  -- 核心 core
  ('core', 'core', 'bodyweight', '平板支撐', 'Plank', 'duration', 'sec'),
  ('core', 'core', 'bodyweight', '捲腹', 'Crunch', 'bodyweight_reps', 'kg'),
  ('core', 'core', 'bodyweight', '懸吊抬腿', 'Hanging Leg Raise', 'bodyweight_reps', 'kg'),
  ('core', 'core', 'bodyweight', '俄羅斯轉體', 'Russian Twist', 'bodyweight_reps', 'kg'),
  ('core', 'core', 'cable', '滑輪捲腹', 'Cable Crunch', 'weight_reps', 'kg'),
  -- 有氧 cardio
  ('cardio', 'full_body', 'cardio_machine', '跑步機慢跑', 'Treadmill Run', 'duration', 'min'),
  ('cardio', 'full_body', 'cardio_machine', '飛輪腳踏車', 'Stationary Bike', 'duration', 'min'),
  ('cardio', 'full_body', 'cardio_machine', '划船機', 'Rowing Machine', 'duration', 'min'),
  ('cardio', 'full_body', 'bodyweight', '跳繩', 'Jump Rope', 'duration', 'min'),
  ('cardio', 'full_body', 'cardio_machine', '爬階機', 'Stair Climber', 'duration', 'min'),
  -- 全身 full body / other compound
  ('full_body', 'glutes', 'kettlebell', '壺鈴擺盪', 'Kettlebell Swing', 'weight_reps', 'kg'),
  ('full_body', 'full_body', 'bodyweight', '波比跳', 'Burpee', 'bodyweight_reps', 'kg'),
  ('full_body', 'full_body', 'barbell', '上膊挺舉', 'Clean and Press', 'weight_reps', 'kg'),
  ('full_body', 'full_body', 'other', '戰繩', 'Battle Rope', 'duration', 'sec')
) as v(category_code, muscle_code, equipment_code, name_zh_tw, name_en, tracking_type, default_unit)
join public.exercise_categories cat on cat.code = v.category_code
join public.muscle_groups mg on mg.code = v.muscle_code
join public.equipment_types eq on eq.code = v.equipment_code;

commit;
